import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { listMatchScoresForJob } from "./read";
import type { MatchScoreCurrent, MatchScoreStale } from "./read";
import { getRankedMatches } from "./matches";

vi.mock("../db", () => ({ getDb: vi.fn() }));

vi.mock("./read", () => ({
  listMatchScoresForJob: vi.fn(),
}));

/**
 * T1a contract — implement `getRankedMatches` in `src/server/matching/matches.ts`
 * (T1b). Read path only: stored `match_scores` via #49's `listMatchScoresForJob`,
 * plus a `candidates` name lookup and the skill-evidence columns already on
 * each `match_scores` row. No AI call. No network.
 *
 * ---------------------------------------------------------------------------
 * getRankedMatches({ jobId, currentModelVersion })
 *   → Promise<RankedMatchesResult>
 *
 * Mirrors `listMatchScoresForJob`'s args object so this module never imports
 * `src/server/ai/**` (no `getModel`) to learn the active matcher version.
 *
 * RankedMatchesResult
 *   { status: "not_scored" }
 *     — `listMatchScoresForJob` returned `{ status: "not_scored" }`.
 *       Must not be `[]` or `{ status: "ready", matches: [] }`. Those look
 *       like "we scored candidates and none qualified."
 *   | { status: "ready"; matches: Array<RankedMatchCurrent | RankedMatchStale> }
 *     — at least one listed score. `matches.length >= 1`.
 *
 * RankedMatchCurrent
 *   { status: "current";          // reuse #49's per-score status
 *     candidateId: string;
 *     candidateName: string;      // candidates.full_name
 *     jobVersionId: string;
 *     score: number;              // post-cap 0–100, used for ranking
 *     matched: SkillEvidence[];
 *     missing: SkillEvidence[];
 *     uncertain: SkillEvidence[];
 *     modelVersion: string;       // match_scores.model_version
 *     createdAt: string;          // match_scores.created_at, ISO UTC
 *   }
 *
 * RankedMatchStale
 *   { status: "stale";            // reuse #49's per-score status
 *     candidateId: string;
 *     candidateName: string;
 *     jobVersionId: string;
 *     // NO `score`. A stale row must never be shown as a current ranked
 *     // score (CLAUDE.md hard rule 4 / #49). Do not copy match_scores.score
 *     // onto this object.
 *     matched: SkillEvidence[];   // stored evidence from the old model
 *     missing: SkillEvidence[];
 *     uncertain: SkillEvidence[];
 *     storedModelVersion: string;
 *     storedCreatedAt: string;
 *   }
 *
 * SkillEvidence — as persisted on match_scores.matched/missing/uncertain
 *   { requirement_id: string; source_text: string; note: string }
 *
 * Resolution rules
 *   1. Call `listMatchScoresForJob({ jobId, currentModelVersion })` (mocked
 *      here; T1b imports it from `./read`). Do not re-query ranking/status.
 *   2. `not_scored` → return `{ status: "not_scored" }` immediately.
 *   3. `ready` → join display data via `getDb()`:
 *        - `candidates`: `id`, `full_name` → `candidateName`
 *        - `match_scores`: `matched` / `missing` / `uncertain` (and the
 *          candidate_id + model_version needed to join). Do **not** filter
 *          that evidence query by current model version — a stale list
 *          entry still needs its stored evidence.
 *   4. Order: every `status: "current"` match first, by `score` descending;
 *      every `status: "stale"` match after that, never interleaved as if
 *      its stored (hidden) score were current.
 *   5. `matches.ts` starts with `import "server-only"` and must not import
 *      `src/server/ai/**`, the Vercel AI SDK (`ai` / `@ai-sdk/*`), or a
 *      provider SDK.
 */

const MATCHES_SOURCE_PATH = join(
  process.cwd(),
  "src/server/matching/matches.ts",
);

/** Fictional ids — never a real candidate or client job. */
const JOB_ID = "00000000-0000-0000-0000-000000000701";
const VERSION_ID = "00000000-0000-0000-0000-000000000721";

const CANDIDATE_HIGH = "00000000-0000-0000-0000-000000000711";
const CANDIDATE_MID = "00000000-0000-0000-0000-000000000712";
const CANDIDATE_LOW = "00000000-0000-0000-0000-000000000713";
const CANDIDATE_STALE = "00000000-0000-0000-0000-000000000714";

const CURRENT_MODEL = "matcher-v1.3";
const OLD_MODEL = "matcher-v1.2";

const SCORED_AT = "2026-09-15T01:12:00.000Z";
const OLD_SCORED_AT = "2026-09-01T04:00:00.000Z";

const NAME_HIGH = "Jamie Tan";
const NAME_MID = "Priya Rao";
const NAME_LOW = "Alex Rivera";
const NAME_STALE = "Wei Ming";

type SkillEvidence = {
  requirement_id: string;
  source_text: string;
  note: string;
};

type Row = Record<string, unknown>;

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: readonly unknown[] };

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type QueryChain = {
  select: (columns?: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: readonly unknown[]) => QueryChain;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => QueryChain;
  limit: (count: number) => QueryChain;
  maybeSingle: () => Promise<QueryResult>;
  single: () => Promise<QueryResult>;
  then: Promise<QueryResult>["then"];
};

type TableStore = Record<string, Row[]>;

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

const HIGH_MATCHED: SkillEvidence[] = [
  {
    requirement_id: "r2",
    source_text: "Led backend development using Python and Django",
    note: "Python is the main language in the current role.",
  },
];
const HIGH_MISSING: SkillEvidence[] = [
  {
    requirement_id: "r3",
    source_text: "",
    note: "No mention of Kubernetes in the profile.",
  },
];
const HIGH_UNCERTAIN: SkillEvidence[] = [
  {
    requirement_id: "r4",
    source_text: "exposure to SAP during a finance-system migration",
    note: "Hints at SAP, does not claim FICO experience.",
  },
];

const STALE_MATCHED: SkillEvidence[] = [
  {
    requirement_id: "r1",
    source_text: "Five years as a backend engineer at Meridian Trading",
    note: "Stored evidence from the previous matcher version.",
  },
];

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

/** True when the specifier is `src/server/ai/**` or an AI/provider SDK. */
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
  return false;
}

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const value = row[filter.column];
    if (filter.kind === "eq") {
      return value === filter.value;
    }
    return filter.values.includes(value);
  });
}

function createQuery(rows: Row[]): QueryChain {
  const filters: Filter[] = [];

  function matchingRows(): Row[] {
    return rows.filter((row) => matchesFilters(row, filters));
  }

  const query: QueryChain = {
    select() {
      return query;
    },
    eq(column, value) {
      filters.push({ kind: "eq", column, value });
      return query;
    },
    in(column, values) {
      filters.push({ kind: "in", column, values });
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    async maybeSingle() {
      const matched = matchingRows();
      return { data: matched[0] ?? null, error: null };
    },
    async single() {
      const matched = matchingRows();
      const row = matched[0];
      if (!row) {
        return { data: null, error: { message: "not found" } };
      }
      return { data: row, error: null };
    },
    then(onfulfilled, onrejected) {
      return Promise.resolve({ data: matchingRows(), error: null }).then(
        onfulfilled,
        onrejected,
      );
    },
  };

  return query;
}

function mockJoinDb(tables: TableStore) {
  const store: TableStore = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [
      table,
      rows.map((row) => ({ ...row })),
    ]),
  );

  const from = vi.fn((table: string) => createQuery(store[table] ?? []));
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, store };
}

function candidateRow(id: string, fullName: string): Row {
  return { id, full_name: fullName };
}

function matchScoreRow(args: {
  candidateId: string;
  modelVersion: string;
  score: number;
  createdAt: string;
  matched?: SkillEvidence[];
  missing?: SkillEvidence[];
  uncertain?: SkillEvidence[];
}): Row {
  return {
    candidate_id: args.candidateId,
    job_version_id: VERSION_ID,
    model_version: args.modelVersion,
    score: args.score,
    matched: args.matched ?? [],
    missing: args.missing ?? [],
    uncertain: args.uncertain ?? [],
    created_at: args.createdAt,
  };
}

function currentListEntry(
  overrides: Pick<MatchScoreCurrent, "candidateId" | "score"> &
    Partial<MatchScoreCurrent>,
): MatchScoreCurrent {
  return {
    status: "current",
    jobVersionId: VERSION_ID,
    modelVersion: CURRENT_MODEL,
    createdAt: SCORED_AT,
    ...overrides,
  };
}

function staleListEntry(
  overrides: Pick<MatchScoreStale, "candidateId"> & Partial<MatchScoreStale>,
): MatchScoreStale {
  return {
    status: "stale",
    jobVersionId: VERSION_ID,
    storedModelVersion: OLD_MODEL,
    storedCreatedAt: OLD_SCORED_AT,
    ...overrides,
  };
}

function mockReadyList(
  scores: Array<MatchScoreCurrent | MatchScoreStale>,
) {
  vi.mocked(listMatchScoresForJob).mockResolvedValue({
    status: "ready",
    scores,
  });
}

function seedDefaultJoin(rows: {
  candidates: Row[];
  matchScores: Row[];
}) {
  return mockJoinDb({
    candidates: rows.candidates,
    match_scores: rows.matchScores,
  });
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
  vi.mocked(listMatchScoresForJob).mockReset();
});

describe("getRankedMatches (AC1, AC4)", () => {
  it("AC1: current scores are returned ordered by score descending", async () => {
    mockReadyList([
      currentListEntry({ candidateId: CANDIDATE_LOW, score: 40 }),
      currentListEntry({ candidateId: CANDIDATE_HIGH, score: 91 }),
      currentListEntry({ candidateId: CANDIDATE_MID, score: 76 }),
    ]);
    seedDefaultJoin({
      candidates: [
        candidateRow(CANDIDATE_LOW, NAME_LOW),
        candidateRow(CANDIDATE_HIGH, NAME_HIGH),
        candidateRow(CANDIDATE_MID, NAME_MID),
      ],
      matchScores: [
        matchScoreRow({
          candidateId: CANDIDATE_LOW,
          modelVersion: CURRENT_MODEL,
          score: 40,
          createdAt: SCORED_AT,
        }),
        matchScoreRow({
          candidateId: CANDIDATE_HIGH,
          modelVersion: CURRENT_MODEL,
          score: 91,
          createdAt: SCORED_AT,
        }),
        matchScoreRow({
          candidateId: CANDIDATE_MID,
          modelVersion: CURRENT_MODEL,
          score: 76,
          createdAt: SCORED_AT,
        }),
      ],
    });

    const result = await getRankedMatches({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(listMatchScoresForJob).toHaveBeenCalledWith({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });
    expect(result).toEqual({
      status: "ready",
      matches: [
        {
          status: "current",
          candidateId: CANDIDATE_HIGH,
          candidateName: NAME_HIGH,
          jobVersionId: VERSION_ID,
          score: 91,
          matched: [],
          missing: [],
          uncertain: [],
          modelVersion: CURRENT_MODEL,
          createdAt: SCORED_AT,
        },
        {
          status: "current",
          candidateId: CANDIDATE_MID,
          candidateName: NAME_MID,
          jobVersionId: VERSION_ID,
          score: 76,
          matched: [],
          missing: [],
          uncertain: [],
          modelVersion: CURRENT_MODEL,
          createdAt: SCORED_AT,
        },
        {
          status: "current",
          candidateId: CANDIDATE_LOW,
          candidateName: NAME_LOW,
          jobVersionId: VERSION_ID,
          score: 40,
          matched: [],
          missing: [],
          uncertain: [],
          modelVersion: CURRENT_MODEL,
          createdAt: SCORED_AT,
        },
      ],
    });
  });

  it("AC1: a stale list entry is included and marked distinctly, never as a current ranked score", async () => {
    mockReadyList([
      currentListEntry({ candidateId: CANDIDATE_LOW, score: 40 }),
      staleListEntry({ candidateId: CANDIDATE_STALE }),
      currentListEntry({ candidateId: CANDIDATE_MID, score: 76 }),
    ]);
    seedDefaultJoin({
      candidates: [
        candidateRow(CANDIDATE_LOW, NAME_LOW),
        candidateRow(CANDIDATE_STALE, NAME_STALE),
        candidateRow(CANDIDATE_MID, NAME_MID),
      ],
      matchScores: [
        matchScoreRow({
          candidateId: CANDIDATE_LOW,
          modelVersion: CURRENT_MODEL,
          score: 40,
          createdAt: SCORED_AT,
        }),
        matchScoreRow({
          candidateId: CANDIDATE_STALE,
          modelVersion: OLD_MODEL,
          // Stored score is higher than any current row. Must not rank this
          // candidate as if 99 were a current score, and must not appear on
          // the stale result object.
          score: 99,
          createdAt: OLD_SCORED_AT,
          matched: STALE_MATCHED,
        }),
        matchScoreRow({
          candidateId: CANDIDATE_MID,
          modelVersion: CURRENT_MODEL,
          score: 76,
          createdAt: SCORED_AT,
        }),
      ],
    });

    const result = await getRankedMatches({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      throw new Error(`expected ready, got ${result.status}`);
    }

    expect(result.matches.map((entry) => entry.candidateId)).toEqual([
      CANDIDATE_MID,
      CANDIDATE_LOW,
      CANDIDATE_STALE,
    ]);

    const stale = result.matches[2];
    expect(stale).toEqual({
      status: "stale",
      candidateId: CANDIDATE_STALE,
      candidateName: NAME_STALE,
      jobVersionId: VERSION_ID,
      matched: STALE_MATCHED,
      missing: [],
      uncertain: [],
      storedModelVersion: OLD_MODEL,
      storedCreatedAt: OLD_SCORED_AT,
    });
    expect(stale).not.toHaveProperty("score");
    expect(result.matches.find((entry) => "score" in entry && entry.score === 99)).toBeUndefined();
    expect(result.matches[0]).toMatchObject({
      status: "current",
      candidateId: CANDIDATE_MID,
      score: 76,
    });
  });

  it("AC1, AC4: each current match carries matched/missing/uncertain source_text plus modelVersion and createdAt", async () => {
    mockReadyList([
      currentListEntry({ candidateId: CANDIDATE_HIGH, score: 91 }),
    ]);
    seedDefaultJoin({
      candidates: [candidateRow(CANDIDATE_HIGH, NAME_HIGH)],
      matchScores: [
        matchScoreRow({
          candidateId: CANDIDATE_HIGH,
          modelVersion: CURRENT_MODEL,
          score: 91,
          createdAt: SCORED_AT,
          matched: HIGH_MATCHED,
          missing: HIGH_MISSING,
          uncertain: HIGH_UNCERTAIN,
        }),
      ],
    });

    const result = await getRankedMatches({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({
      status: "ready",
      matches: [
        {
          status: "current",
          candidateId: CANDIDATE_HIGH,
          candidateName: NAME_HIGH,
          jobVersionId: VERSION_ID,
          score: 91,
          matched: HIGH_MATCHED,
          missing: HIGH_MISSING,
          uncertain: HIGH_UNCERTAIN,
          modelVersion: CURRENT_MODEL,
          createdAt: SCORED_AT,
        },
      ],
    });

    if (result.status !== "ready") {
      throw new Error(`expected ready, got ${result.status}`);
    }
    const entry = result.matches[0];
    expect(entry?.matched[0]?.source_text).toBe(
      "Led backend development using Python and Django",
    );
    expect(entry?.missing[0]?.source_text).toBe("");
    expect(entry?.uncertain[0]?.source_text).toBe(
      "exposure to SAP during a finance-system migration",
    );
    expect(entry).toMatchObject({
      modelVersion: CURRENT_MODEL,
      createdAt: SCORED_AT,
    });
  });

  it('AC1: not_scored is an explicit result, not an empty array indistinguishable from "scored zero"', async () => {
    vi.mocked(listMatchScoresForJob).mockResolvedValue({
      status: "not_scored",
    });
    seedDefaultJoin({ candidates: [], matchScores: [] });

    const result = await getRankedMatches({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(listMatchScoresForJob).toHaveBeenCalledWith({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });
    expect(result).toEqual({ status: "not_scored" });
    expect(result).not.toEqual([]);
    expect(result).not.toEqual({ status: "ready", matches: [] });
    expect(result).not.toEqual({ status: "ready", scores: [] });
  });
});

describe("no AI call on ranked-match read (AC2)", () => {
  it('starts with import "server-only"', () => {
    const source = readFileSync(MATCHES_SOURCE_PATH, "utf8");
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });

  it("AC2: matches.ts does not import src/server/ai/** or any AI SDK", () => {
    const source = readFileSync(MATCHES_SOURCE_PATH, "utf8");
    expect(moduleSpecifiers(source).filter(isForbiddenAiImport)).toEqual([]);
  });
});
