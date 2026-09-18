import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentJobVersion } from "../jobs/versions";
import type { Json } from "@/lib/database.types";
import {
  searchCandidates,
  type SearchCandidateRow,
  type SearchCandidatesFilters,
} from "./query";
import { getJobScopedResults } from "./job-scoped";

vi.mock("./query", () => ({
  searchCandidates: vi.fn(),
}));

vi.mock("../jobs/versions", () => ({
  getCurrentJobVersion: vi.fn(),
}));

/**
 * T1a contract — implement `getJobScopedResults` in
 * `src/server/search/job-scoped.ts` (T1b). Filter-only browse of
 * candidates in a job's context, ranked by that job's stored match
 * score. Zero AI calls: no re-scoring, no search-query prompt. No
 * network. Ranking is whatever `searchCandidates` already returned —
 * this wrapper must not re-sort.
 *
 * ---------------------------------------------------------------------------
 * getJobScopedResults({ jobId, filters })
 *   → Promise<JobScopedResults>
 *
 * GetJobScopedResultsArgs
 *   { jobId: string; filters: SearchCandidatesFilters }
 *
 *   `filters` is the same object `searchCandidates` already accepts
 *   (skills / min_years / max_years / locations / languages /
 *   cv_updated_after). Always pass a complete object — empty arrays and
 *   nulls mean "no restriction", not "omit the key".
 *
 * JobScopedResults (discriminated on `status`)
 *   { status: "not_ready" }
 *     — `getCurrentJobVersion(jobId)` returned null (no version saved
 *       yet). Must not call `searchCandidates` (that would send
 *       `jobVersionId: null` and fall off the stored-score ranking
 *       path). Must not be `{ status: "ready", results: [] }`. An empty
 *       ready list means "this version exists and filters matched
 *       nobody."
 *   | { status: "ready";
 *       jobVersionId: string;          // the current version's id
 *       results: JobScopedResult[] }   // SQL order, length may be 0
 *
 * JobScopedResult — camelCase identity fields from SearchCandidateRow,
 * plus a per-row match-status discriminant. Do not pass SQL snake_case
 * through. Do not copy `keyword_score` / `vector_score` / `fused_score`
 * / `highlight` / a raw `matchScore: number | null` onto the result
 * (a nullable `matchScore` is how `null` gets confused with `0`).
 *
 *   JobScopedResultScored
 *     { matchStatus: "scored";
 *       score: number;                 // match_score, including 0
 *       candidateId: string;
 *       fullName: string;
 *       headline: string | null;
 *       totalYears: number;
 *       location: string | null;
 *       languages: string[];
 *       cvUpdatedAt: string | null;    // from cv_updated_at
 *       matched: Json | null;          // pass-through, no remap
 *       missing: Json | null;
 *       uncertain: Json | null }
 *
 *   JobScopedResultNotScored
 *     { matchStatus: "not_scored";
 *       // NO `score`. A missing match_scores row must never render as
 *       // 0 (CLAUDE.md hard rule 4).
 *       candidateId: string;
 *       fullName: string;
 *       headline: string | null;
 *       totalYears: number;
 *       location: string | null;
 *       languages: string[];
 *       cvUpdatedAt: string | null;
 *       matched: Json | null;
 *       missing: Json | null;
 *       uncertain: Json | null }
 *
 * Resolution rules
 *   1. Call `getCurrentJobVersion(jobId)` (mocked here; T1b imports it
 *      from `../jobs/versions`). That row's `id` is the only
 *      `jobVersionId` this function may pass on.
 *   2. null version → return `{ status: "not_ready" }` immediately.
 *      Do not call `searchCandidates`.
 *   3. Otherwise call `searchCandidates` (mocked here; T1b imports it
 *      from `./query`) with:
 *        filters      = the given filters (same object, no rename)
 *        keyword      = null
 *        embedding    = null
 *        jobVersionId = version.id
 *      Never pass a plain-language query. Never call `runAi` /
 *      `getModel` / `runSearch`.
 *   4. Map each SQL row in the order it arrived:
 *        match_score === null → matchStatus: "not_scored" (omit score)
 *        match_score is a number (including 0) → matchStatus: "scored",
 *          score: match_score
 *      `matched` / `missing` / `uncertain` are assigned as-is (same
 *      reference). Do not parse them into SkillEvidence[].
 *   5. Do not re-sort. SQL already ranks by stored match score
 *      (`coalesce(match_score, -1)` descending, nulls last).
 *   6. `job-scoped.ts` starts with `import "server-only"` and must not
 *      import `src/server/ai/**`, the Vercel AI SDK (`ai` / `@ai-sdk/*`),
 *      a provider SDK, `runAi`, `getModel`, or `./run-search`.
 */

const JOB_SCOPED_SOURCE_PATH = join(
  process.cwd(),
  "src/server/search/job-scoped.ts",
);

/** Fictional ids — never a real candidate or client job. */
const JOB_ID = "00000000-0000-0000-0000-000000000801";
const VERSION_ID = "00000000-0000-0000-0000-000000000821";

const CANDIDATE_MID = "00000000-0000-0000-0000-000000000811";
const CANDIDATE_HIGH = "00000000-0000-0000-0000-000000000812";
const CANDIDATE_UNSCORED = "00000000-0000-0000-0000-000000000813";
const CANDIDATE_ZERO = "00000000-0000-0000-0000-000000000814";

const CV_UPDATED_AT = "2026-08-01T00:00:00.000Z";

const FILTERS: SearchCandidatesFilters = {
  skills: ["SAP"],
  min_years: 5,
  max_years: null,
  locations: ["Singapore"],
  languages: ["Mandarin"],
  cv_updated_after: "2026-07-01",
};

const CURRENT_VERSION = {
  id: VERSION_ID,
  job_id: JOB_ID,
  fields: {},
  must_haves: [],
  nice_to_haves: [],
  requires_nationality: false,
  nationality_reason: null,
  requires_language: false,
  language_reason: null,
  created_at: "2026-09-10T02:00:00.000Z",
};

const HIGH_MATCHED: Json = [
  {
    requirement_id: "r2",
    source_text: "Five years of SAP FICO at Meridian Trading",
    note: "SAP FICO is the current role.",
  },
];
const HIGH_MISSING: Json = [
  {
    requirement_id: "r3",
    source_text: "",
    note: "No mention of MAS-regulated client work.",
  },
];
const HIGH_UNCERTAIN: Json = [
  {
    requirement_id: "r4",
    source_text: "exposure to IFRS during a close",
    note: "Hints at IFRS, does not claim month-end ownership.",
  },
];

const MID_MATCHED: Json = [
  {
    requirement_id: "r2",
    source_text: "Used SAP for month-end journals",
    note: "SAP is mentioned, not FICO specifically.",
  },
];
const MID_MISSING: Json = [];
const MID_UNCERTAIN: Json = null;

const ZERO_MATCHED: Json = [];
const ZERO_MISSING: Json = [
  {
    requirement_id: "r1",
    source_text: "",
    note: "No accounting experience on the profile.",
  },
];
const ZERO_UNCERTAIN: Json = [];

const FROM_SPECIFIER = /\bfrom\s+(['"])([^'"]+)\1/g;
const DYNAMIC_IMPORT_SPECIFIER = /\bimport\s*\(\s*(['"])([^'"]+)\1/g;
const REQUIRE_SPECIFIER = /\brequire\s*\(\s*(['"])([^'"]+)\1/g;
const SIDE_EFFECT_IMPORT = /\bimport\s+(['"])([^'"]+)\1/g;

const PROVIDER_PACKAGES = [
  "openai",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "@google/genai",
  "groq-sdk",
  "@mistralai/mistralai",
  "@google-cloud/vertexai",
  "@google-cloud/aiplatform",
] as const;

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function collectSpecifiers(source: string, pattern: RegExp): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const specifier = match[2];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function moduleSpecifiers(source: string): string[] {
  return [
    ...collectSpecifiers(source, FROM_SPECIFIER),
    ...collectSpecifiers(source, DYNAMIC_IMPORT_SPECIFIER),
    ...collectSpecifiers(source, REQUIRE_SPECIFIER),
    ...collectSpecifiers(source, SIDE_EFFECT_IMPORT),
  ];
}

function matchesPackage(specifier: string, pkg: string): boolean {
  return specifier === pkg || specifier.startsWith(`${pkg}/`);
}

function isDirectAiOrProviderImport(specifier: string): boolean {
  if (specifier === "ai" || specifier.startsWith("ai/")) {
    return true;
  }
  if (specifier.startsWith("@ai-sdk/")) {
    return true;
  }
  return PROVIDER_PACKAGES.some((pkg) => matchesPackage(specifier, pkg));
}

/** True when the specifier is `src/server/ai/**`, an AI SDK, or run-search. */
function isForbiddenAiImport(specifier: string): boolean {
  if (isDirectAiOrProviderImport(specifier)) {
    return true;
  }
  if (specifier === "../ai" || specifier.startsWith("../ai/")) {
    return true;
  }
  if (specifier === "@/server/ai" || specifier.startsWith("@/server/ai/")) {
    return true;
  }
  if (
    specifier === "src/server/ai" ||
    specifier.startsWith("src/server/ai/") ||
    specifier.includes("/server/ai/")
  ) {
    return true;
  }
  if (
    specifier === "./run-search" ||
    specifier === "src/server/search/run-search" ||
    specifier.endsWith("/search/run-search")
  ) {
    return true;
  }
  return false;
}

function searchRow(
  overrides: Partial<SearchCandidateRow> &
    Pick<SearchCandidateRow, "candidate_id">,
): SearchCandidateRow {
  return {
    full_name: "Alex Tan",
    headline: "Accountant",
    total_years: 6,
    location: "Singapore",
    languages: ["English", "Mandarin"],
    cv_updated_at: CV_UPDATED_AT,
    keyword_score: 1,
    vector_score: 0.5,
    fused_score: 0.03,
    match_score: null,
    matched: null,
    missing: null,
    uncertain: null,
    highlight: "<span>accountant</span>",
    ...overrides,
  };
}

function mockCurrentVersion(
  version: typeof CURRENT_VERSION | null = CURRENT_VERSION,
) {
  vi.mocked(getCurrentJobVersion).mockResolvedValue(version as never);
}

beforeEach(() => {
  vi.mocked(getCurrentJobVersion).mockReset();
  vi.mocked(searchCandidates).mockReset();
  mockCurrentVersion();
  vi.mocked(searchCandidates).mockResolvedValue([]);
});

describe("getJobScopedResults (AC1, AC2, AC3)", () => {
  it("AC1: results ordered by stored match score (SQL order preserved, no re-sort)", async () => {
    // Deliberately not score-descending. SQL already ranks; a client-side
    // re-sort by match_score would swap MID and HIGH (and pull ZERO
    // ahead of UNSCORED).
    const rows = [
      searchRow({
        candidate_id: CANDIDATE_MID,
        full_name: "Priya Rao",
        match_score: 40,
        matched: MID_MATCHED,
        missing: MID_MISSING,
        uncertain: MID_UNCERTAIN,
      }),
      searchRow({
        candidate_id: CANDIDATE_HIGH,
        full_name: "Jamie Tan",
        match_score: 90,
        matched: HIGH_MATCHED,
        missing: HIGH_MISSING,
        uncertain: HIGH_UNCERTAIN,
      }),
      searchRow({
        candidate_id: CANDIDATE_UNSCORED,
        full_name: "Wei Ming",
        match_score: null,
      }),
      searchRow({
        candidate_id: CANDIDATE_ZERO,
        full_name: "Alex Rivera",
        match_score: 0,
        matched: ZERO_MATCHED,
        missing: ZERO_MISSING,
        uncertain: ZERO_UNCERTAIN,
      }),
    ];
    vi.mocked(searchCandidates).mockResolvedValue(rows);

    const result = await getJobScopedResults({
      jobId: JOB_ID,
      filters: FILTERS,
    });

    expect(getCurrentJobVersion).toHaveBeenCalledTimes(1);
    expect(getCurrentJobVersion).toHaveBeenCalledWith(JOB_ID);

    expect(searchCandidates).toHaveBeenCalledTimes(1);
    const searchArgs = vi.mocked(searchCandidates).mock.calls[0]?.[0];
    expect(searchArgs).toEqual(
      expect.objectContaining({
        filters: FILTERS,
        keyword: null,
        embedding: null,
        jobVersionId: VERSION_ID,
      }),
    );
    expect(searchArgs?.keyword).toBeNull();
    expect(searchArgs?.embedding).toBeNull();
    expect(searchArgs?.jobVersionId).toBe(VERSION_ID);
    expect(searchArgs).not.toHaveProperty("job_version_id");
    expect(searchArgs).not.toHaveProperty("query");

    expect(result).toEqual(
      expect.objectContaining({
        status: "ready",
        jobVersionId: VERSION_ID,
      }),
    );
    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    expect(result.results.map((row) => row.candidateId)).toEqual([
      CANDIDATE_MID,
      CANDIDATE_HIGH,
      CANDIDATE_UNSCORED,
      CANDIDATE_ZERO,
    ]);
    expect(result.results.map((row) => row.fullName)).toEqual([
      "Priya Rao",
      "Jamie Tan",
      "Wei Ming",
      "Alex Rivera",
    ]);
  });

  it("AC2: matched/missing/uncertain match the stored match_scores row", async () => {
    const rows = [
      searchRow({
        candidate_id: CANDIDATE_HIGH,
        full_name: "Jamie Tan",
        match_score: 90,
        matched: HIGH_MATCHED,
        missing: HIGH_MISSING,
        uncertain: HIGH_UNCERTAIN,
      }),
      searchRow({
        candidate_id: CANDIDATE_MID,
        full_name: "Priya Rao",
        match_score: 40,
        matched: MID_MATCHED,
        missing: MID_MISSING,
        uncertain: MID_UNCERTAIN,
      }),
    ];
    vi.mocked(searchCandidates).mockResolvedValue(rows);

    const result = await getJobScopedResults({
      jobId: JOB_ID,
      filters: FILTERS,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    const high = result.results[0];
    const mid = result.results[1];
    expect(high?.matched).toBe(HIGH_MATCHED);
    expect(high?.missing).toBe(HIGH_MISSING);
    expect(high?.uncertain).toBe(HIGH_UNCERTAIN);
    expect(mid?.matched).toBe(MID_MATCHED);
    expect(mid?.missing).toBe(MID_MISSING);
    expect(mid?.uncertain).toBe(MID_UNCERTAIN);

    expect(high?.matched).toEqual(HIGH_MATCHED);
    expect(JSON.stringify(high?.matched)).toContain("requirement_id");
    expect(JSON.stringify(high?.matched)).not.toContain("requirementId");
  });

  it("AC3: null match_score maps to not_scored, never 0", async () => {
    const rows = [
      searchRow({
        candidate_id: CANDIDATE_ZERO,
        full_name: "Alex Rivera",
        match_score: 0,
        matched: ZERO_MATCHED,
        missing: ZERO_MISSING,
        uncertain: ZERO_UNCERTAIN,
      }),
      searchRow({
        candidate_id: CANDIDATE_UNSCORED,
        full_name: "Wei Ming",
        match_score: null,
        matched: null,
        missing: null,
        uncertain: null,
      }),
    ];
    vi.mocked(searchCandidates).mockResolvedValue(rows);

    const result = await getJobScopedResults({
      jobId: JOB_ID,
      filters: FILTERS,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      return;
    }

    const zero = result.results[0];
    const unscored = result.results[1];

    expect(zero).toEqual(
      expect.objectContaining({
        matchStatus: "scored",
        score: 0,
        candidateId: CANDIDATE_ZERO,
        fullName: "Alex Rivera",
        matched: ZERO_MATCHED,
        missing: ZERO_MISSING,
        uncertain: ZERO_UNCERTAIN,
      }),
    );
    expect(zero).toHaveProperty("score", 0);
    expect(zero?.matchStatus).not.toBe("not_scored");

    expect(unscored).toEqual(
      expect.objectContaining({
        matchStatus: "not_scored",
        candidateId: CANDIDATE_UNSCORED,
        fullName: "Wei Ming",
        matched: null,
        missing: null,
        uncertain: null,
      }),
    );
    expect(unscored).not.toHaveProperty("score");
    expect(unscored).not.toEqual(
      expect.objectContaining({ matchStatus: "scored", score: 0 }),
    );
    expect(unscored).not.toEqual(expect.objectContaining({ score: 0 }));
    expect(unscored).not.toEqual(expect.objectContaining({ matchScore: 0 }));
    expect(unscored).not.toEqual(
      expect.objectContaining({ matchScore: null }),
    );
  });

  it("returns not_ready when the job has no current version, and does not search", async () => {
    mockCurrentVersion(null);

    const result = await getJobScopedResults({
      jobId: JOB_ID,
      filters: FILTERS,
    });

    expect(getCurrentJobVersion).toHaveBeenCalledWith(JOB_ID);
    expect(searchCandidates).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "not_ready" });
    expect(result).not.toHaveProperty("results");
    expect(result).not.toEqual({ status: "ready", results: [] });
    expect(result).not.toEqual({ status: "not_scored" });
  });
});

describe("no AI call on job-scoped search", () => {
  it('starts with import "server-only"', () => {
    const source = readFileSync(JOB_SCOPED_SOURCE_PATH, "utf8");
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });

  it("AC1: job-scoped.ts does not import src/server/ai/** or any AI SDK", () => {
    const source = readFileSync(JOB_SCOPED_SOURCE_PATH, "utf8");
    expect(moduleSpecifiers(source).filter(isForbiddenAiImport)).toEqual([]);
    expect(source).not.toMatch(/\brunAi\b/);
    expect(source).not.toMatch(/\bgetModel\b/);
  });
});
