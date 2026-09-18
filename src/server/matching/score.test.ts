import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeModel } from "../ai/fake-model";
import {
  MATCH_SCORE_PROMPT_ID,
  MATCH_SCORE_PROMPT_VERSION,
  type MatchScoreOutput,
} from "../ai/prompts/match-score";
import { runAi } from "../ai/run";
import type { AiRunRecord, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import { buildScoringProfile } from "./redact";
import { scoreCandidate } from "./score";

vi.mock("../db", () => ({ getDb: vi.fn() }));

vi.mock("../ai/run", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/run")>();
  return {
    ...actual,
    runAi: vi.fn(actual.runAi),
  };
});

/**
 * T4a contract — implement `scoreCandidate` in `src/server/matching/score.ts`
 * (T4b). One `runAi` call per candidate. No network.
 *
 * scoreCandidate({
 *   candidateId,
 *   jobVersionId,
 *   candidateProfile,
 *   jobVersion,
 *   requirements,
 *   model,
 *   runs,
 * }) → Promise<void>
 *
 *   candidateProfile
 *     ScoringCandidateProfile (work_history, education, certifications,
 *     skills, languages_spoken, total_years). Extra keys (name, contact,
 *     protected attributes) may be present at runtime; they must never
 *     reach the model — call `buildScoringProfile` first.
 *
 *   jobVersion — nationality/language gate fields `redact.ts` needs:
 *     requires_nationality: boolean
 *     nationality_reason: string | null
 *     requires_language: boolean
 *     language_reason: string | null
 *
 *   requirements — the list the prompt scores against:
 *     { id: string, text: string, marking: "must_have" | "nice_to_have" }[]
 *     Model output references these via `requirement_id` (= `id`).
 *
 * Pipeline
 *   1. `buildScoringProfile(candidateProfile, jobVersion)` — never send
 *      the raw profile to the model.
 *   2. One `runAi` with `matchScoreOutputSchema`, prompt id/version
 *      `MATCH_SCORE_PROMPT_ID` / `MATCH_SCORE_PROMPT_VERSION` ("match-score"
 *      / "v1"), and `buildMatchScoreInput(requirementsText, profileText)`.
 *      `inputRef` contains both `candidateId` and `jobVersionId`
 *      (suggested: `candidates:${candidateId}#job_versions:${jobVersionId}`).
 *   3. Verbatim evidence: each non-empty `source_text` on matched /
 *      missing / uncertain must be a substring of the serialized scoring
 *      profile (`JSON.stringify` of `buildScoringProfile`'s result).
 *      Empty `source_text` on a `missing` entry is allowed (no relevant
 *      text). Do not throw the whole run for one invented quote.
 *   4. An invented (non-verbatim) quote invalidates that skill claim:
 *      it does not count as matched for the cap, and is not persisted as
 *      a trustworthy `matched` entry (drop it, move it to missing /
 *      uncertain, or keep it with `evidence_verified: false`).
 *   5. Must-have cap in code (never from the model). After evidence
 *      verification, if any `must_have` requirement is missing (in
 *      `missing`, or a demoted invented "match"):
 *        score = min(rawScore, MUST_HAVE_CAP)
 *      MUST_HAVE_CAP is 50 (PRD example). The cap never raises a score.
 *      Multiple missing must-haves do not stack below 50.
 *   6. Persist one `match_scores` row via `getDb()` (`.insert` or
 *      `.upsert`). Do not write `ai_runs` through getDb — `runAi` writes
 *      them via the injected `AiRunsWriter`.
 *
 * Persisted `match_scores` row
 *   candidate_id, job_version_id,
 *   model_version  — `model.modelVersion` (not modelId)
 *   score          — post-cap
 *   raw_score      — the model's original score, uncapped
 *   matched / missing / uncertain — jsonb arrays of
 *     { requirement_id, source_text, note } (optional evidence_verified)
 *   ai_run_id      — nullable. `runAi` currently does not return an id;
 *     linkage is the run's `input_ref` (candidate × job version) plus
 *     `model_version`. If you have an id, store it; otherwise null.
 */

const CANDIDATE_ID = "00000000-0000-0000-0000-000000000511";
const JOB_VERSION_ID = "00000000-0000-0000-0000-000000000501";

const MODEL_ID = "fake-match";
const MODEL_VERSION = "test-1";
const COST_USD = 0.012;

/** PRD example / MUST_HAVE_CAP default. Cap lowers a score; it never raises one. */
const MUST_HAVE_CAP = 50;

const REQ_SAP = {
  id: "r1",
  text: "SAP FICO experience",
  marking: "must_have" as const,
};
const REQ_YEARS = {
  id: "r2",
  text: "5+ years of accounting experience",
  marking: "must_have" as const,
};
const REQ_K8S = {
  id: "r3",
  text: "Experience with Kubernetes",
  marking: "nice_to_have" as const,
};

const INVENTED_QUOTE = "INVENTED_QUOTE_NOT_IN_PROFILE";

const WORK_HISTORY = [
  {
    employer: "Meridian Trading Pte Ltd",
    employer_source_text: "Meridian Trading Pte Ltd",
    job_title: "Senior Accountant",
    job_title_source_text: "Senior Accountant",
    start: "2021-01",
    end: null,
    current: true,
    source_text:
      "Senior Accountant, Meridian Trading Pte Ltd, Jan 2021 - Present",
  },
];

const EDUCATION = [
  {
    institution: "Fictional National University",
    qualification: "Bachelor of Accountancy",
    year: "2017",
    source_text:
      "Bachelor of Accountancy, Fictional National University, 2017",
  },
];

const CERTIFICATIONS = [
  {
    name: "CPA",
    issuer: "Fictional Institute of Accountants",
    source_text: "CPA, Fictional Institute of Accountants",
  },
];

const SKILLS = [
  { skill: "SAP FICO", source_text: "SAP FICO" },
  { skill: "Excel", source_text: "Excel" },
];

const SAP_QUOTE = "SAP FICO";
const YEARS_QUOTE =
  "Senior Accountant, Meridian Trading Pte Ltd, Jan 2021 - Present";

type ScoringRequirement = {
  id: string;
  text: string;
  marking: "must_have" | "nice_to_have";
};

type ScoringJobVersion = {
  requires_nationality: boolean;
  nationality_reason: string | null;
  requires_language: boolean;
  language_reason: string | null;
};

type EvidenceEntry = {
  requirement_id: string;
  source_text: string;
  note: string;
  evidence_verified?: boolean;
};

type InsertCall = { table: string; payload: unknown };

function jobVersion(
  overrides: Partial<ScoringJobVersion> = {},
): ScoringJobVersion {
  return {
    requires_nationality: false,
    nationality_reason: null,
    requires_language: false,
    language_reason: null,
    ...overrides,
  };
}

function candidateProfile() {
  return {
    name: "Jamie Tan",
    name_source_text: "Jamie Tan",
    email: "jamie.tan.fictional@example.com",
    work_history: WORK_HISTORY,
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    skills: SKILLS,
    languages_spoken: ["Mandarin"],
    total_years: 5.5,
  };
}

function serializedScoringProfile(): string {
  return JSON.stringify(buildScoringProfile(candidateProfile(), jobVersion()));
}

function evidence(
  requirementId: string,
  sourceText: string,
  note: string,
): EvidenceEntry {
  return {
    requirement_id: requirementId,
    source_text: sourceText,
    note,
  };
}

function matchOutput(
  overrides: Partial<MatchScoreOutput> & Pick<MatchScoreOutput, "score">,
): MatchScoreOutput {
  return {
    matched: [],
    missing: [],
    uncertain: [],
    prompt_injection_detected: false,
    prompt_injection_note: null,
    ...overrides,
  };
}

function thenable(result: { data: unknown; error: null }) {
  const chain: {
    select: () => typeof chain;
    single: () => Promise<typeof result>;
    maybeSingle: () => Promise<typeof result>;
    eq: () => typeof chain;
    then: Promise<typeof result>["then"];
  } = {
    select: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    eq: () => chain,
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
}

function createDbMock() {
  const inserts: InsertCall[] = [];
  const upserts: InsertCall[] = [];

  const from = vi.fn((table: string) => ({
    insert: vi.fn((payload: unknown) => {
      inserts.push({ table, payload });
      const data = Array.isArray(payload)
        ? payload.map((row, index) => ({
            id: `${table}-${index}`,
            ...(row as object),
          }))
        : { id: `${table}-1`, ...(payload as object) };
      return thenable({ data, error: null });
    }),
    upsert: vi.fn((payload: unknown) => {
      upserts.push({ table, payload });
      const data = Array.isArray(payload)
        ? payload.map((row, index) => ({
            id: `${table}-${index}`,
            ...(row as object),
          }))
        : { id: `${table}-1`, ...(payload as object) };
      return thenable({ data, error: null });
    }),
  }));

  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, inserts, upserts };
}

function createMemoryRuns(): AiRunsWriter & { rows: AiRunRecord[] } {
  const rows: AiRunRecord[] = [];
  return {
    rows,
    write(row) {
      rows.push({ ...row });
    },
  };
}

function rowsFor(
  calls: InsertCall[],
  table: string,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const call of calls.filter((item) => item.table === table)) {
    if (Array.isArray(call.payload)) {
      for (const row of call.payload) {
        rows.push(row as Record<string, unknown>);
      }
    } else if (call.payload && typeof call.payload === "object") {
      rows.push(call.payload as Record<string, unknown>);
    }
  }
  return rows;
}

function persistedMatchScores(
  db: ReturnType<typeof createDbMock>,
): Record<string, unknown>[] {
  return [
    ...rowsFor(db.inserts, "match_scores"),
    ...rowsFor(db.upserts, "match_scores"),
  ];
}

function asEvidenceList(value: unknown): EvidenceEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is EvidenceEntry => {
    if (entry === null || typeof entry !== "object") {
      return false;
    }
    const row = entry as Record<string, unknown>;
    return (
      typeof row.requirement_id === "string" &&
      typeof row.source_text === "string" &&
      typeof row.note === "string"
    );
  });
}

function trustworthyMatched(value: unknown): EvidenceEntry[] {
  return asEvidenceList(value).filter(
    (entry) => entry.evidence_verified !== false,
  );
}

function expectNumericCostAndDuration(row: AiRunRecord): void {
  expect(typeof row.cost_usd).toBe("number");
  expect(Number.isFinite(row.cost_usd)).toBe(true);
  expect(typeof row.duration_ms).toBe("number");
  expect(Number.isFinite(row.duration_ms)).toBe(true);
}

async function runScore(args: {
  object: MatchScoreOutput;
  requirements?: ScoringRequirement[];
  runs?: AiRunsWriter & { rows: AiRunRecord[] };
  db?: ReturnType<typeof createDbMock>;
}) {
  const db = args.db ?? createDbMock();
  const runs = args.runs ?? createMemoryRuns();
  const model = createFakeModel({
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    object: args.object,
    costUsd: COST_USD,
  });

  await scoreCandidate({
    candidateId: CANDIDATE_ID,
    jobVersionId: JOB_VERSION_ID,
    candidateProfile: candidateProfile(),
    jobVersion: jobVersion(),
    requirements: args.requirements ?? [REQ_SAP, REQ_YEARS, REQ_K8S],
    model,
    runs,
  });

  return { db, runs, model };
}

describe("scoreCandidate (AC3)", () => {
  beforeEach(() => {
    vi.mocked(runAi).mockClear();
  });

  it("AC3: caps score at 50 when a must-have is missing (raw_score stays 90)", async () => {
    const { db } = await runScore({
      requirements: [REQ_SAP, REQ_K8S],
      object: matchOutput({
        score: 90,
        matched: [
          evidence(REQ_K8S.id, SAP_QUOTE, "Unrelated skill listed as a match."),
        ],
        missing: [
          evidence(REQ_SAP.id, "", "No SAP FICO evidence in the profile."),
        ],
      }),
    });

    const rows = persistedMatchScores(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.candidate_id).toBe(CANDIDATE_ID);
    expect(rows[0]?.job_version_id).toBe(JOB_VERSION_ID);
    expect(rows[0]?.raw_score).toBe(90);
    expect(rows[0]?.score).toBe(MUST_HAVE_CAP);
    expect(rows[0]?.score).toBe(50);
  });

  it("AC3: a score already below the cap is unchanged", async () => {
    const { db } = await runScore({
      requirements: [REQ_SAP],
      object: matchOutput({
        score: 30,
        missing: [
          evidence(REQ_SAP.id, "", "No SAP FICO evidence in the profile."),
        ],
      }),
    });

    const rows = persistedMatchScores(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.raw_score).toBe(30);
    expect(rows[0]?.score).toBe(30);
    expect(rows[0]?.score).not.toBe(MUST_HAVE_CAP);
  });

  it("AC3: multiple missing must-haves do not stack below the cap", async () => {
    const { db } = await runScore({
      requirements: [REQ_SAP, REQ_YEARS],
      object: matchOutput({
        score: 90,
        missing: [
          evidence(REQ_SAP.id, "", "No SAP FICO evidence."),
          evidence(REQ_YEARS.id, "", "No accounting-years evidence."),
        ],
      }),
    });

    const rows = persistedMatchScores(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.raw_score).toBe(90);
    expect(rows[0]?.score).toBe(MUST_HAVE_CAP);
    expect(rows[0]?.score).toBe(50);
    expect(Number(rows[0]?.score)).toBeGreaterThanOrEqual(MUST_HAVE_CAP);
  });

  it("AC3: no missing must-have means no cap (score equals raw_score)", async () => {
    expect(serializedScoringProfile()).toContain(SAP_QUOTE);
    expect(serializedScoringProfile()).toContain(YEARS_QUOTE);

    const { db } = await runScore({
      requirements: [REQ_SAP, REQ_YEARS, REQ_K8S],
      object: matchOutput({
        score: 85,
        matched: [
          evidence(REQ_SAP.id, SAP_QUOTE, "SAP FICO is listed in skills."),
          evidence(
            REQ_YEARS.id,
            YEARS_QUOTE,
            "Current senior accountant role plus total years.",
          ),
        ],
        missing: [
          evidence(REQ_K8S.id, "", "No Kubernetes mention — nice-to-have only."),
        ],
      }),
    });

    const rows = persistedMatchScores(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.raw_score).toBe(85);
    expect(rows[0]?.score).toBe(85);
    expect(trustworthyMatched(rows[0]?.matched).map((e) => e.requirement_id))
      .toEqual(expect.arrayContaining([REQ_SAP.id, REQ_YEARS.id]));
  });

  it("AC3: an invented evidence quote does not count as matched and is not stored as trustworthy", async () => {
    expect(serializedScoringProfile().includes(INVENTED_QUOTE)).toBe(false);
    expect(serializedScoringProfile()).toContain(YEARS_QUOTE);

    const { db } = await runScore({
      requirements: [REQ_SAP, REQ_YEARS],
      object: matchOutput({
        score: 90,
        matched: [
          evidence(
            REQ_SAP.id,
            INVENTED_QUOTE,
            "Model invented a SAP quote that is not in the profile.",
          ),
          evidence(
            REQ_YEARS.id,
            YEARS_QUOTE,
            "Current senior accountant role.",
          ),
        ],
      }),
    });

    const rows = persistedMatchScores(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.raw_score).toBe(90);
    expect(rows[0]?.score).toBe(MUST_HAVE_CAP);

    const trusted = trustworthyMatched(rows[0]?.matched);
    expect(trusted.map((e) => e.requirement_id)).not.toContain(REQ_SAP.id);
    expect(trusted.some((e) => e.source_text === INVENTED_QUOTE)).toBe(false);

    const allBuckets = [
      ...asEvidenceList(rows[0]?.matched),
      ...asEvidenceList(rows[0]?.missing),
      ...asEvidenceList(rows[0]?.uncertain),
    ];
    const inventedStillMatchedTrustworthy = allBuckets.some(
      (entry) =>
        entry.source_text === INVENTED_QUOTE &&
        entry.requirement_id === REQ_SAP.id &&
        entry.evidence_verified !== false &&
        asEvidenceList(rows[0]?.matched).includes(entry),
    );
    expect(inventedStillMatchedTrustworthy).toBe(false);
  });

  it("writes ai_runs via the injected AiRunsWriter with model, prompt version, cost and duration", async () => {
    const runs = createMemoryRuns();
    const { model } = await runScore({
      runs,
      requirements: [REQ_SAP],
      object: matchOutput({
        score: 70,
        matched: [
          evidence(REQ_SAP.id, SAP_QUOTE, "SAP FICO is listed in skills."),
        ],
      }),
    });

    expect(runAi).toHaveBeenCalledTimes(1);
    const args = vi.mocked(runAi).mock.calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args?.prompt.id).toBe(MATCH_SCORE_PROMPT_ID);
    expect(args?.prompt.version).toBe(MATCH_SCORE_PROMPT_VERSION);
    expect(args?.prompt.id).toBe("match-score");
    expect(args?.prompt.version).toBe("v1");
    expect(args?.model).toBe(model);
    expect(args?.runs).toBe(runs);
    expect(args?.inputRef).toContain(CANDIDATE_ID);
    expect(args?.inputRef).toContain(JOB_VERSION_ID);

    const completed = runs.rows.filter(
      (row) => row.status === "succeeded" || row.status === "failed",
    );
    expect(completed.length).toBeGreaterThanOrEqual(1);
    const row = completed[0];
    expect(row.model_id).toBe(MODEL_ID);
    expect(row.model_version).toBe(MODEL_VERSION);
    expect(row.prompt_version).toBe(MATCH_SCORE_PROMPT_VERSION);
    expect(row.prompt_version).toBe("v1");
    expectNumericCostAndDuration(row);
    expect(row.cost_usd).toBe(COST_USD);
  });

  it("persists model_version with score, raw_score, evidence buckets and ai_run linkage", async () => {
    const runs = createMemoryRuns();
    const { db } = await runScore({
      runs,
      requirements: [REQ_SAP, REQ_K8S],
      object: matchOutput({
        score: 85,
        matched: [
          evidence(REQ_SAP.id, SAP_QUOTE, "SAP FICO is listed in skills."),
        ],
        missing: [evidence(REQ_K8S.id, "", "No Kubernetes mention.")],
      }),
    });

    const rows = persistedMatchScores(db);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.candidate_id).toBe(CANDIDATE_ID);
    expect(row?.job_version_id).toBe(JOB_VERSION_ID);
    expect(row?.model_version).toBe(MODEL_VERSION);
    expect(row?.score).toBe(85);
    expect(row?.raw_score).toBe(85);
    expect(Array.isArray(row?.matched)).toBe(true);
    expect(Array.isArray(row?.missing)).toBe(true);
    expect(Array.isArray(row?.uncertain)).toBe(true);
    expect(trustworthyMatched(row?.matched).map((e) => e.requirement_id)).toContain(
      REQ_SAP.id,
    );

    const run = runs.rows[0];
    expect(run).toBeDefined();
    expect(run.model_version).toBe(row?.model_version);
    expect(run.input_ref).toContain(CANDIDATE_ID);
    expect(run.input_ref).toContain(JOB_VERSION_ID);
    if (row?.ai_run_id != null) {
      expect(typeof row.ai_run_id).toBe("string");
      expect(String(row.ai_run_id).length).toBeGreaterThan(0);
    }
  });
});
