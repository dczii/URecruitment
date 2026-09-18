import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { getCurrentJobVersion } from "../jobs/versions";
import { getMatchScore, listMatchScoresForJob } from "./read";

vi.mock("../db", () => ({ getDb: vi.fn() }));

vi.mock("../jobs/versions", () => ({
  getCurrentJobVersion: vi.fn(),
}));

/**
 * T5a contract — implement these in `src/server/matching/read.ts` (T5b).
 * Chosen API: both functions, one shared result shape. `getMatchScore` is
 * the single candidate×job read (the only place a caller resolves "the"
 * score). `listMatchScoresForJob` is the ranked-list read (#51 will
 * display it). Both resolve against `getCurrentJobVersion(jobId)` — never
 * against a caller-supplied version id, never against a superseded
 * `job_versions` row.
 *
 * ---------------------------------------------------------------------------
 * getMatchScore({ candidateId, jobId, currentModelVersion })
 *   → Promise<MatchScoreRead>
 *
 * listMatchScoresForJob({ jobId, currentModelVersion })
 *   → Promise<ListMatchScoresResult>
 *
 * MatchScoreRead
 *   { status: "current";
 *     candidateId: string;
 *     jobVersionId: string;   // the job's *current* version id
 *     score: number;          // post-cap 0–100 from match_scores.score
 *     modelVersion: string;   // match_scores.model_version
 *     createdAt: string;      // match_scores.created_at, ISO UTC
 *   }
 *   | { status: "stale";
 *       candidateId: string;
 *       jobVersionId: string; // still the job's *current* version id
 *       storedModelVersion: string;
 *       storedCreatedAt: string;
 *       // NO `score`. A stale row must never be displayed as current.
 *     }
 *   | { status: "not_scored" }
 *
 * ListMatchScoresResult
 *   { status: "not_scored" }
 *     — the current job version has zero match_scores rows (any model).
 *       Must not be `[]`. An empty array is indistinguishable from
 *       "we scored candidates and none qualified / all scored 0".
 *   | { status: "ready"; scores: Array<MatchScoreCurrent | MatchScoreStale> }
 *     — at least one current-version row. `scores.length >= 1`.
 *       Each entry is `current` or `stale`. `not_scored` is never an
 *       array item — candidates with no row simply do not appear.
 *
 * Resolution rules (both functions)
 *   1. Call `getCurrentJobVersion(jobId)` (mocked in these tests; T5b
 *      imports it from `../jobs/versions`). That row's `id` is the only
 *      job_version_id that may be shown.
 *   2. Query `match_scores` via `getDb()`. Filter to that current
 *      version. Do **not** return a row whose `job_version_id` is an
 *      older, superseded version — treat that as "no score for the
 *      current version" (`not_scored` for getMatchScore; omit from the
 *      list). Do **not** classify an old-job-version row as `stale`
 *      (stale is reserved for old *model* versions on the current job
 *      version).
 *   3. Classify remaining rows by `model_version` vs `currentModelVersion`
 *      in application code. Do not `.eq("model_version", current)` as the
 *      only query: that would collapse `stale` into `not_scored`.
 *        model_version === currentModelVersion → `current`
 *        any other model_version on the current job version → `stale`
 *      If both a current-model row and older-model rows exist for the
 *      same candidate × current version, return `current` (the unique
 *      key allows both). Do not put `score` on a `stale` result.
 *   4. No row at all for that candidate × current version →
 *      `{ status: "not_scored" }`. Never `null`, `undefined`, or
 *      `{ status: "current", score: 0 }` for a missing row. A stored
 *      score of 0 is a real current score and must come back as
 *      `{ status: "current", score: 0, modelVersion, createdAt, ... }`.
 *   5. Every `current` result carries `modelVersion` and `createdAt` so
 *      a caller can render "Scored by matcher v1.3 on 15 Sep 2026"
 *      (UI itself is #51).
 *
 * `getCurrentJobVersion` returning null (job has no saved version yet)
 * is `not_scored` — there is no current version to key a score to.
 */

/** Fictional ids — never a real candidate or client job. */
const JOB_ID = "00000000-0000-0000-0000-000000000601";
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000611";
const CANDIDATE_TWO = "00000000-0000-0000-0000-000000000612";
const CANDIDATE_THREE = "00000000-0000-0000-0000-000000000613";

const VERSION_A = "00000000-0000-0000-0000-000000000621";
const VERSION_B = "00000000-0000-0000-0000-000000000622";

const CURRENT_MODEL = "matcher-v1.3";
const OLD_MODEL = "matcher-v1.2";

const SCORED_AT = "2026-09-15T04:00:00.000Z";
const OLD_SCORED_AT = "2026-09-01T04:00:00.000Z";

const CURRENT_VERSION = {
  id: VERSION_B,
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

type MatchScoreRow = {
  id: string;
  candidate_id: string;
  job_version_id: string;
  model_version: string;
  score: number;
  raw_score: number | null;
  matched: unknown[];
  missing: unknown[];
  uncertain: unknown[];
  ai_run_id: string | null;
  created_at: string;
};

type EqCall = { column: string; value: unknown };

const QUERY_METHODS = [
  "select",
  "eq",
  "neq",
  "in",
  "filter",
  "not",
  "or",
  "is",
  "order",
  "limit",
  "maybeSingle",
  "single",
] as const;

type QueryMethod = (typeof QUERY_METHODS)[number];

type QueryChain = Record<QueryMethod, ReturnType<typeof vi.fn>> & {
  then: Promise<{ data: MatchScoreRow[]; error: null }>["then"];
};

function matchScoreRow(
  overrides: Partial<MatchScoreRow> &
    Pick<MatchScoreRow, "candidate_id" | "job_version_id" | "model_version" | "score">,
): MatchScoreRow {
  return {
    id: overrides.id ?? "00000000-0000-0000-0000-000000000690",
    raw_score: overrides.raw_score ?? overrides.score,
    matched: overrides.matched ?? [],
    missing: overrides.missing ?? [],
    uncertain: overrides.uncertain ?? [],
    ai_run_id: overrides.ai_run_id ?? null,
    created_at: overrides.created_at ?? SCORED_AT,
    ...overrides,
  };
}

function matchesFilters(row: MatchScoreRow, eqs: EqCall[]): boolean {
  const record = row as unknown as Record<string, unknown>;
  return eqs.every((filter) => record[filter.column] === filter.value);
}

function createMatchScoresChain(rows: MatchScoreRow[]): QueryChain {
  const eqs: EqCall[] = [];
  const chain = {} as QueryChain;

  const matching = () => rows.filter((row) => matchesFilters(row, eqs));

  for (const method of QUERY_METHODS) {
    chain[method] = vi.fn(() => chain);
  }

  chain.eq = vi.fn((column: string, value: unknown) => {
    eqs.push({ column, value });
    return chain;
  });

  chain.maybeSingle = vi.fn(async () => {
    const matched = matching();
    return { data: matched[0] ?? null, error: null };
  });

  chain.single = vi.fn(async () => {
    const matched = matching();
    const row = matched[0];
    if (!row) {
      return { data: null, error: { message: "not found" } };
    }
    return { data: row, error: null };
  });

  chain.then = (onfulfilled, onrejected) =>
    Promise.resolve({ data: matching(), error: null }).then(
      onfulfilled,
      onrejected,
    );

  return chain;
}

function mockMatchScoresDb(rows: MatchScoreRow[]) {
  const chain = createMatchScoresChain(rows);
  const from = vi.fn((table: string) => {
    if (table === "match_scores") {
      return chain;
    }
    return createMatchScoresChain([]);
  });
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, chain };
}

function mockCurrentVersion(
  version: typeof CURRENT_VERSION | null = CURRENT_VERSION,
) {
  vi.mocked(getCurrentJobVersion).mockResolvedValue(version as never);
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
  vi.mocked(getCurrentJobVersion).mockReset();
  mockCurrentVersion();
});

describe("getMatchScore (AC4)", () => {
  it("AC4: a score keyed to a superseded job version is not returned", async () => {
    const oldVersionScore = matchScoreRow({
      candidate_id: CANDIDATE_ID,
      job_version_id: VERSION_A,
      model_version: CURRENT_MODEL,
      score: 87,
      created_at: SCORED_AT,
    });
    mockMatchScoresDb([oldVersionScore]);

    const result = await getMatchScore({
      candidateId: CANDIDATE_ID,
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(getCurrentJobVersion).toHaveBeenCalledWith(JOB_ID);
    expect(result).toEqual({ status: "not_scored" });
    expect(result).not.toEqual(
      expect.objectContaining({ status: "current", score: 87 }),
    );
    expect(result).not.toEqual(expect.objectContaining({ status: "stale" }));
  });

  it("AC4: a score from an older model version is stale, not current", async () => {
    mockMatchScoresDb([
      matchScoreRow({
        candidate_id: CANDIDATE_ID,
        job_version_id: VERSION_B,
        model_version: OLD_MODEL,
        score: 91,
        created_at: OLD_SCORED_AT,
      }),
    ]);

    const result = await getMatchScore({
      candidateId: CANDIDATE_ID,
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({
      status: "stale",
      candidateId: CANDIDATE_ID,
      jobVersionId: VERSION_B,
      storedModelVersion: OLD_MODEL,
      storedCreatedAt: OLD_SCORED_AT,
    });
    expect(result).not.toHaveProperty("score");
    expect(result).not.toEqual(
      expect.objectContaining({ status: "current", score: 91 }),
    );
  });

  it("AC4: a job/candidate pair with no match_scores row is not_scored, not a zero score", async () => {
    mockMatchScoresDb([]);

    const result = await getMatchScore({
      candidateId: CANDIDATE_ID,
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({ status: "not_scored" });
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect(result).not.toEqual(
      expect.objectContaining({ status: "current", score: 0 }),
    );
  });

  it("AC4: a stored score of 0 is current with score 0, not not_scored", async () => {
    mockMatchScoresDb([
      matchScoreRow({
        candidate_id: CANDIDATE_ID,
        job_version_id: VERSION_B,
        model_version: CURRENT_MODEL,
        score: 0,
        created_at: SCORED_AT,
      }),
    ]);

    const result = await getMatchScore({
      candidateId: CANDIDATE_ID,
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({
      status: "current",
      candidateId: CANDIDATE_ID,
      jobVersionId: VERSION_B,
      score: 0,
      modelVersion: CURRENT_MODEL,
      createdAt: SCORED_AT,
    });
  });

  it("AC4: a current score carries model_version and created_at", async () => {
    mockMatchScoresDb([
      matchScoreRow({
        candidate_id: CANDIDATE_ID,
        job_version_id: VERSION_B,
        model_version: CURRENT_MODEL,
        score: 76,
        created_at: SCORED_AT,
      }),
    ]);

    const result = await getMatchScore({
      candidateId: CANDIDATE_ID,
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({
      status: "current",
      candidateId: CANDIDATE_ID,
      jobVersionId: VERSION_B,
      score: 76,
      modelVersion: CURRENT_MODEL,
      createdAt: SCORED_AT,
    });
  });

  it("AC4: when current-model and old-model rows both exist, the current-model row is returned", async () => {
    mockMatchScoresDb([
      matchScoreRow({
        id: "00000000-0000-0000-0000-000000000691",
        candidate_id: CANDIDATE_ID,
        job_version_id: VERSION_B,
        model_version: OLD_MODEL,
        score: 91,
        created_at: OLD_SCORED_AT,
      }),
      matchScoreRow({
        id: "00000000-0000-0000-0000-000000000692",
        candidate_id: CANDIDATE_ID,
        job_version_id: VERSION_B,
        model_version: CURRENT_MODEL,
        score: 76,
        created_at: SCORED_AT,
      }),
    ]);

    const result = await getMatchScore({
      candidateId: CANDIDATE_ID,
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({
      status: "current",
      candidateId: CANDIDATE_ID,
      jobVersionId: VERSION_B,
      score: 76,
      modelVersion: CURRENT_MODEL,
      createdAt: SCORED_AT,
    });
  });
});

describe("listMatchScoresForJob (AC4)", () => {
  it("AC4: scores for a superseded job version are omitted from the list", async () => {
    mockMatchScoresDb([
      matchScoreRow({
        candidate_id: CANDIDATE_THREE,
        job_version_id: VERSION_A,
        model_version: CURRENT_MODEL,
        score: 87,
        created_at: SCORED_AT,
      }),
    ]);

    const result = await listMatchScoresForJob({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(getCurrentJobVersion).toHaveBeenCalledWith(JOB_ID);
    expect(result).toEqual({ status: "not_scored" });
    expect(result).not.toEqual([]);
    expect(JSON.stringify(result)).not.toContain("87");
  });

  it("AC4: an older model version is listed as stale, not as a current score", async () => {
    mockMatchScoresDb([
      matchScoreRow({
        id: "00000000-0000-0000-0000-000000000693",
        candidate_id: CANDIDATE_ID,
        job_version_id: VERSION_B,
        model_version: CURRENT_MODEL,
        score: 76,
        created_at: SCORED_AT,
      }),
      matchScoreRow({
        id: "00000000-0000-0000-0000-000000000694",
        candidate_id: CANDIDATE_TWO,
        job_version_id: VERSION_B,
        model_version: OLD_MODEL,
        score: 91,
        created_at: OLD_SCORED_AT,
      }),
      matchScoreRow({
        id: "00000000-0000-0000-0000-000000000695",
        candidate_id: CANDIDATE_THREE,
        job_version_id: VERSION_A,
        model_version: CURRENT_MODEL,
        score: 87,
        created_at: SCORED_AT,
      }),
    ]);

    const result = await listMatchScoresForJob({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({
      status: "ready",
      scores: expect.arrayContaining([
        {
          status: "current",
          candidateId: CANDIDATE_ID,
          jobVersionId: VERSION_B,
          score: 76,
          modelVersion: CURRENT_MODEL,
          createdAt: SCORED_AT,
        },
        {
          status: "stale",
          candidateId: CANDIDATE_TWO,
          jobVersionId: VERSION_B,
          storedModelVersion: OLD_MODEL,
          storedCreatedAt: OLD_SCORED_AT,
        },
      ]),
    });

    if (result.status !== "ready") {
      throw new Error(`expected ready, got ${result.status}`);
    }
    expect(result.scores).toHaveLength(2);
    expect(result.scores.find((entry) => "score" in entry && entry.score === 91)).toBeUndefined();
    expect(
      result.scores.find((entry) => "score" in entry && entry.score === 87),
    ).toBeUndefined();
    expect(
      result.scores.find((entry) => entry.candidateId === CANDIDATE_THREE),
    ).toBeUndefined();
  });

  it("AC4: a job with no scores for the current version is not_scored, not an empty array", async () => {
    mockMatchScoresDb([]);

    const result = await listMatchScoresForJob({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({ status: "not_scored" });
    expect(result).not.toEqual([]);
    expect(result).not.toEqual({ status: "ready", scores: [] });
  });

  it("AC4: every listed current score carries model_version and created_at", async () => {
    mockMatchScoresDb([
      matchScoreRow({
        candidate_id: CANDIDATE_ID,
        job_version_id: VERSION_B,
        model_version: CURRENT_MODEL,
        score: 76,
        created_at: SCORED_AT,
      }),
    ]);

    const result = await listMatchScoresForJob({
      jobId: JOB_ID,
      currentModelVersion: CURRENT_MODEL,
    });

    expect(result).toEqual({
      status: "ready",
      scores: [
        {
          status: "current",
          candidateId: CANDIDATE_ID,
          jobVersionId: VERSION_B,
          score: 76,
          modelVersion: CURRENT_MODEL,
          createdAt: SCORED_AT,
        },
      ],
    });
  });
});
