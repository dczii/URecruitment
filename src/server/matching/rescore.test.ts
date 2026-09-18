import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { createFakeModel } from "../ai/fake-model";
import type { AiRunRecord, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import { startRescoreRun } from "./rescore";
import { retrieveCandidates } from "./retrieve";
import { scoreCandidate } from "./score";
import type { ScoreCandidateArgs } from "./score";

vi.mock("../db", () => ({ getDb: vi.fn() }));

vi.mock("./retrieve", () => ({
  retrieveCandidates: vi.fn(),
}));

vi.mock("./score", () => ({
  scoreCandidate: vi.fn(),
}));

/**
 * T1a contract — implement `startRescoreRun` in `src/server/matching/rescore.ts`
 * (T1b). Orchestration only: these tests mock `../db`, `./retrieve`, and
 * `./score`. Do not re-test retrieval or scoring logic.
 *
 * startRescoreRun({ jobVersionId, model, runs }) → Promise<void>
 *
 *   Fire-and-forget safe: an async function. The caller (T1b: `after()` in
 *   `createJob`) may choose not to await it. Nothing about the signature
 *   requires the caller to wait before doing other work.
 *
 *   Real "does the HTTP response actually return first" behaviour is
 *   `after()`'s own job (Next.js) and is not testable at this unit level.
 *   This file proves the function is safe to fire-and-forget.
 *
 * Pipeline (sequential — never `Promise.all` the scoring loop)
 *   1. Dedup: if a `rescore_runs` row for this `job_version_id` already
 *      has `status` `"pending"` or `"running"`, return immediately.
 *      Do not insert a second row. Do not call `retrieveCandidates` or
 *      `scoreCandidate`.
 *   2. Resume or insert:
 *        existing `status: "failed"` row for this version → reuse it
 *          (do not insert; do not truncate `candidate_ids_scored`)
 *        otherwise → insert one `rescore_runs` row
 *      Set `status` to `"running"` before scoring.
 *   3. `retrieveCandidates(...)` once. Pass `jobVersionId` through on the
 *      input object. Extra RetrieveCandidatesInput fields (must-haves,
 *      nationality/language gates, embedding) may be loaded via `getDb`
 *      from `job_versions` / `embeddings`; this test does not assert them.
 *   4. For each retrieved candidate, in retrieve order, skip any id already
 *      in `candidate_ids_scored`. Call `scoreCandidate` with at least
 *      `{ candidateId, jobVersionId, model, runs }`. Extra score args
 *      (profile, job version, requirements) may be loaded via `getDb`;
 *      this test does not assert them.
 *   5. After each successful `scoreCandidate`, persist progress: UPDATE
 *      the same `rescore_runs` row so `candidate_ids_scored` *appends*
 *      that candidate id. Never replace the list with `[]` or with only
 *      the new id. A crash mid-run must leave an accurate resume point.
 *   6. All remaining candidates scored → `status: "complete"`,
 *      `candidate_ids_scored` contains every retrieved candidate id.
 *   7. `scoreCandidate` throws → UPDATE `status: "failed"` and leave
 *      `candidate_ids_scored` as the ids that succeeded (not the one
 *      that threw, not all 3, not empty). The function may reject or
 *      resolve; the row is the source of truth.
 *
 * `rescore_runs` write shape (column names from the migration)
 *   job_version_id        uuid
 *   status                "pending" | "running" | "failed" | "complete"
 *   candidate_ids_scored  jsonb array of candidate uuid strings
 *   error                 text | null
 *
 * Dedup check
 *   SELECT from `rescore_runs` WHERE job_version_id = :id AND
 *   status IN ("pending", "running"). Any match → no-op.
 */

const JOB_ID = "00000000-0000-0000-0000-000000000600";
const JOB_VERSION_ID = "00000000-0000-0000-0000-000000000601";
const CANDIDATE_1 = "00000000-0000-0000-0000-000000000611";
const CANDIDATE_2 = "00000000-0000-0000-0000-000000000612";
const CANDIDATE_3 = "00000000-0000-0000-0000-000000000613";
const EXISTING_RUN_ID = "00000000-0000-0000-0000-000000000621";
const NOW = "2026-09-19T01:00:00.000Z";

const MODEL_ID = "fake-match";
const MODEL_VERSION = "test-1";

const RETRIEVED = [
  { candidateId: CANDIDATE_1, similarity: 0.91 },
  { candidateId: CANDIDATE_2, similarity: 0.82 },
  { candidateId: CANDIDATE_3, similarity: 0.73 },
] as const;

type Row = Record<string, unknown>;

type RescoreStatus = "pending" | "running" | "failed" | "complete";

type RescoreRunRow = {
  id: string;
  job_version_id: string;
  status: RescoreStatus;
  candidate_ids_scored: string[];
  error: string | null;
  created_at: string;
  updated_at: string;
};

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: readonly unknown[] };

type InsertCall = { table: string; payload: unknown };

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const value = row[filter.column];
    if (filter.kind === "eq") {
      return value === filter.value;
    }
    return filter.values.includes(value);
  });
}

function sortRows(
  rows: Row[],
  order: { column: string; ascending: boolean } | null,
): Row[] {
  if (!order) {
    return rows;
  }
  return [...rows].sort((left, right) => {
    const av = String(left[order.column] ?? "");
    const bv = String(right[order.column] ?? "");
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return order.ascending ? cmp : -cmp;
  });
}

function asRecord(value: unknown): Row {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected a row object");
  }
  return value as Row;
}

function scoredIds(row: Row): string[] {
  const value = row.candidate_ids_scored;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(String);
}

function createTableApi(
  rows: Row[],
  table: string,
  inserts: InsertCall[],
  nextId: { n: number },
) {
  function matching(filters: Filter[], order: { column: string; ascending: boolean } | null, limit: number | null) {
    let matched = sortRows(
      rows.filter((row) => matchesFilters(row, filters)),
      order,
    );
    if (limit != null) {
      matched = matched.slice(0, limit);
    }
    return matched;
  }

  function selectChain() {
    const filters: Filter[] = [];
    let order: { column: string; ascending: boolean } | null = null;
    let limit: number | null = null;

    const chain = {
      select() {
        return chain;
      },
      eq(column: string, value: unknown) {
        filters.push({ kind: "eq", column, value });
        return chain;
      },
      in(column: string, values: readonly unknown[]) {
        filters.push({ kind: "in", column, values });
        return chain;
      },
      order(column: string, options?: { ascending?: boolean }) {
        order = { column, ascending: options?.ascending ?? true };
        return chain;
      },
      limit(count: number) {
        limit = count;
        return chain;
      },
      async maybeSingle(): Promise<QueryResult> {
        const matched = matching(filters, order, limit);
        return { data: matched[0] ?? null, error: null };
      },
      async single(): Promise<QueryResult> {
        const matched = matching(filters, order, limit);
        const row = matched[0];
        if (!row) {
          return { data: null, error: { message: "not found" } };
        }
        return { data: row, error: null };
      },
      then(
        onfulfilled?: (value: QueryResult) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({
          data: matching(filters, order, limit),
          error: null,
        }).then(onfulfilled, onrejected);
      },
    };
    return chain;
  }

  function mutateChain(apply: (filters: Filter[]) => Row[]) {
    const filters: Filter[] = [];
    const chain = {
      eq(column: string, value: unknown) {
        filters.push({ kind: "eq", column, value });
        return chain;
      },
      in(column: string, values: readonly unknown[]) {
        filters.push({ kind: "in", column, values });
        return chain;
      },
      select() {
        return chain;
      },
      async maybeSingle(): Promise<QueryResult> {
        const updated = apply(filters);
        return { data: updated[0] ?? null, error: null };
      },
      async single(): Promise<QueryResult> {
        const updated = apply(filters);
        const row = updated[0];
        if (!row) {
          return { data: null, error: { message: "not found" } };
        }
        return { data: row, error: null };
      },
      then(
        onfulfilled?: (value: QueryResult) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({
          data: apply(filters),
          error: null,
        }).then(onfulfilled, onrejected);
      },
    };
    return chain;
  }

  return {
    select: () => selectChain(),
    eq: (column: string, value: unknown) => selectChain().eq(column, value),
    in: (column: string, values: readonly unknown[]) =>
      selectChain().in(column, values),
    insert(payload: unknown) {
      inserts.push({ table, payload });
      const incoming = Array.isArray(payload) ? payload : [payload];
      const inserted: Row[] = incoming.map((item) => {
        nextId.n += 1;
        const row = asRecord(item);
        const full: Row = {
          id: `00000000-0000-0000-0000-0000000007${String(nextId.n).padStart(2, "0")}`,
          status: "pending",
          candidate_ids_scored: [],
          error: null,
          created_at: NOW,
          updated_at: NOW,
          ...row,
        };
        if (Array.isArray(full.candidate_ids_scored)) {
          full.candidate_ids_scored = [...full.candidate_ids_scored];
        }
        rows.push(full);
        return full;
      });
      return mutateChain(() => inserted);
    },
    update(payload: unknown) {
      const patch = asRecord(payload);
      return mutateChain((filters) => {
        const updated: Row[] = [];
        for (const row of rows) {
          if (!matchesFilters(row, filters)) {
            continue;
          }
          Object.assign(row, patch, { updated_at: NOW });
          if (Array.isArray(row.candidate_ids_scored)) {
            row.candidate_ids_scored = [...row.candidate_ids_scored];
          }
          updated.push(row);
        }
        return updated;
      });
    },
  };
}

function relatedRows(): Record<string, Row[]> {
  return {
    job_versions: [
      {
        id: JOB_VERSION_ID,
        job_id: JOB_ID,
        fields: {},
        must_haves: [{ text: "Python", marking: "must_have" }],
        nice_to_haves: [],
        requires_nationality: false,
        nationality_reason: null,
        requires_language: false,
        language_reason: null,
        created_at: NOW,
      },
    ],
    embeddings: [
      {
        owner_type: "job_version",
        owner_id: JOB_VERSION_ID,
        embedding: [0.11, 0.22, 0.33],
        embedding_model: "fake-embed",
      },
    ],
    candidate_profiles: RETRIEVED.map((candidate, index) => ({
      id: `00000000-0000-0000-0000-0000000008${String(index + 1).padStart(2, "0")}`,
      candidate_id: candidate.candidateId,
      parsed: {
        work_history: [],
        education: [],
        certifications: [],
        skills: [{ skill: "Python", source_text: "Python" }],
        languages_spoken: [],
        total_years: 5,
      },
      overrides: {},
    })),
  };
}

function createRescoreDb(seedRuns: RescoreRunRow[] = []) {
  const inserts: InsertCall[] = [];
  const nextId = { n: 0 };
  const store: Record<string, Row[]> = {
    ...relatedRows(),
    rescore_runs: seedRuns.map((row) => ({
      ...row,
      candidate_ids_scored: [...row.candidate_ids_scored],
    })),
  };

  const from = vi.fn((table: string) => {
    if (!store[table]) {
      store[table] = [];
    }
    return createTableApi(store[table], table, inserts, nextId);
  });

  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, store, inserts };
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

function seedRun(
  overrides: Partial<RescoreRunRow> = {},
): RescoreRunRow {
  return {
    id: EXISTING_RUN_ID,
    job_version_id: JOB_VERSION_ID,
    status: "failed",
    candidate_ids_scored: [],
    error: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function latestRun(db: ReturnType<typeof createRescoreDb>): Row {
  const runs = db.store.rescore_runs ?? [];
  const row = runs[runs.length - 1];
  expect(row).toBeDefined();
  return row as Row;
}

function runForVersion(db: ReturnType<typeof createRescoreDb>): Row[] {
  return (db.store.rescore_runs ?? []).filter(
    (row) => row.job_version_id === JOB_VERSION_ID,
  );
}

function rescoreInserts(db: ReturnType<typeof createRescoreDb>): InsertCall[] {
  return db.inserts.filter((call) => call.table === "rescore_runs");
}

function scoredCandidateIds(
  mock: ReturnType<typeof vi.mocked<typeof scoreCandidate>>,
): string[] {
  return mock.mock.calls.map((call) => {
    const args = call[0] as ScoreCandidateArgs;
    return args.candidateId;
  });
}

async function settle(run: Promise<void>): Promise<void> {
  await run.then(
    () => undefined,
    () => undefined,
  );
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
  vi.mocked(retrieveCandidates).mockReset();
  vi.mocked(scoreCandidate).mockReset();
  vi.mocked(retrieveCandidates).mockResolvedValue([...RETRIEVED]);
  vi.mocked(scoreCandidate).mockResolvedValue(undefined);
});

describe("startRescoreRun (AC1, AC3)", () => {
  it("AC1: startRescoreRun returns a Promise the caller can fire-and-forget", async () => {
    // Real "does the HTTP response actually return first" behaviour is
    // `after()`'s own job (Next.js), not testable at this unit level.
    // This test proves the function is safe to fire-and-forget: it
    // returns a Promise immediately, and nothing about its signature
    // forces the caller to await it before doing something else.
    createRescoreDb();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
    });
    const runs = createMemoryRuns();

    let releaseScore: () => void = () => {};
    const scoreGate = new Promise<void>((resolve) => {
      releaseScore = resolve;
    });
    vi.mocked(scoreCandidate).mockImplementation(async () => {
      await scoreGate;
    });

    const returned = startRescoreRun({
      jobVersionId: JOB_VERSION_ID,
      model,
      runs,
    });

    expect(returned).toBeInstanceOf(Promise);
    expectTypeOf(returned).toEqualTypeOf<Promise<void>>();
    expectTypeOf(startRescoreRun).returns.toEqualTypeOf<Promise<void>>();

    const winner = await Promise.race([
      returned.then(() => "run-finished"),
      Promise.resolve("caller-continued"),
    ]);
    expect(winner).toBe("caller-continued");

    releaseScore();
    await returned;
  });

  it("AC3: a failure partway records the position and marks the run failed", async () => {
    const db = createRescoreDb();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
    });
    const runs = createMemoryRuns();

    let idsWhenThirdCalled: string[] | undefined;
    vi.mocked(scoreCandidate).mockImplementation(
      async ({ candidateId }: ScoreCandidateArgs) => {
        if (candidateId === CANDIDATE_3) {
          idsWhenThirdCalled = scoredIds(latestRun(db));
          throw new Error("scoring failed for candidate 3");
        }
      },
    );

    await settle(
      startRescoreRun({
        jobVersionId: JOB_VERSION_ID,
        model,
        runs,
      }),
    );

    expect(idsWhenThirdCalled).toEqual([CANDIDATE_1, CANDIDATE_2]);

    const row = latestRun(db);
    expect(row.status).toBe("failed");
    expect(scoredIds(row)).toEqual([CANDIDATE_1, CANDIDATE_2]);
    expect(scoredIds(row)).not.toContain(CANDIDATE_3);
    expect(scoredIds(row)).toHaveLength(2);
  });

  it("AC3: a retried run resumes from its recorded position, does not re-score already-scored candidates", async () => {
    const db = createRescoreDb([
      seedRun({
        status: "failed",
        candidate_ids_scored: [CANDIDATE_1, CANDIDATE_2],
        error: "scoring failed for candidate 3",
      }),
    ]);
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
    });
    const runs = createMemoryRuns();

    await settle(
      startRescoreRun({
        jobVersionId: JOB_VERSION_ID,
        model,
        runs,
      }),
    );

    expect(retrieveCandidates).toHaveBeenCalledTimes(1);
    expect(retrieveCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ jobVersionId: JOB_VERSION_ID }),
    );

    expect(scoreCandidate).toHaveBeenCalledTimes(1);
    expect(scoredCandidateIds(vi.mocked(scoreCandidate))).toEqual([
      CANDIDATE_3,
    ]);
    expect(scoreCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: CANDIDATE_3,
        jobVersionId: JOB_VERSION_ID,
        model,
        runs,
      }),
    );

    expect(rescoreInserts(db)).toHaveLength(0);
    expect(runForVersion(db)).toHaveLength(1);

    const row = latestRun(db);
    expect(scoredIds(row).slice(0, 2)).toEqual([CANDIDATE_1, CANDIDATE_2]);
    expect(scoredIds(row)).toEqual([CANDIDATE_1, CANDIDATE_2, CANDIDATE_3]);
    expect(row.status).toBe("complete");
  });

  it.each(["pending", "running"] as const)(
    "does not start a second run when one is already %s for the same version",
    async (status) => {
      const db = createRescoreDb([
        seedRun({
          status,
          candidate_ids_scored: [],
        }),
      ]);
      const model = createFakeModel({
        modelId: MODEL_ID,
        modelVersion: MODEL_VERSION,
      });
      const runs = createMemoryRuns();

      await settle(
        startRescoreRun({
          jobVersionId: JOB_VERSION_ID,
          model,
          runs,
        }),
      );

      expect(rescoreInserts(db)).toHaveLength(0);
      expect(runForVersion(db)).toHaveLength(1);
      expect(retrieveCandidates).not.toHaveBeenCalled();
      expect(scoreCandidate).not.toHaveBeenCalled();
    },
  );

  it("a successful full run marks status complete with every retrieved candidate", async () => {
    const db = createRescoreDb();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
    });
    const runs = createMemoryRuns();

    await settle(
      startRescoreRun({
        jobVersionId: JOB_VERSION_ID,
        model,
        runs,
      }),
    );

    expect(retrieveCandidates).toHaveBeenCalledTimes(1);
    expect(scoreCandidate).toHaveBeenCalledTimes(3);
    expect(scoredCandidateIds(vi.mocked(scoreCandidate))).toEqual([
      CANDIDATE_1,
      CANDIDATE_2,
      CANDIDATE_3,
    ]);

    const row = latestRun(db);
    expect(row.status).toBe("complete");
    expect(scoredIds(row)).toEqual([CANDIDATE_1, CANDIDATE_2, CANDIDATE_3]);
    expect(row.job_version_id).toBe(JOB_VERSION_ID);
  });
});
