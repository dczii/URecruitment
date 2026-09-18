import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidRecruiterName } from "@/lib/recruiter-name";
import { getDb } from "@/server/db";
import { addCandidateToPipeline } from "./pipeline-add-actions";

vi.mock("@/server/db", () => ({ getDb: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

/**
 * T2a contract — implement `addCandidateToPipeline` in
 * `src/app/jobs/[id]/pipeline-add-actions.ts` (T2b). Deliberately minimal:
 * one `pipeline_entries` insert in `"Sourced"`. Not the #156 stage-move
 * system — no `stage_events`, no move validation, no clock reset.
 *
 * addCandidateToPipeline(jobId, candidateId, typedName)
 *   → Promise<AddCandidateToPipelineResult>
 *
 * AddCandidateToPipelineResult
 *   { ok: true }
 *     — one new `pipeline_entries` row was inserted.
 *   | { ok: false; error: string }
 *     — refused or could not insert. Never throw to the client.
 *
 * Rules
 *   1. `"use server"` file. Import `getDb` from `@/server/db` (same alias
 *      as sibling Server Actions). Validate `typedName` with
 *      `isValidRecruiterName` before any DB call.
 *   2. Blank / whitespace-only `typedName` → `{ ok: false, error }` and
 *      **no** `getDb()` call.
 *   3. Valid call → insert exactly one `pipeline_entries` row:
 *        { job_id: jobId,
 *          candidate_id: candidateId,
 *          stage: "Sourced",
 *          owner_name: typedName.trim() }
 *      `entered_at` / `id` / `created_at` stay on DB defaults.
 *      Touch **only** `pipeline_entries` — `from()` must never receive
 *      another table (no `stage_events`, no jobs, no candidates).
 *   4. Duplicate (candidate_id, job_id) — unique constraint
 *      `pipeline_entries_one_stage_per_job` (Postgres `23505`):
 *      return `{ ok: false, error }` whose message says the candidate is
 *      already on this job. Do not throw. Do not retry or update the row.
 *
 * Duplicate behaviour (chosen): treat the unique-constraint error as a
 * refused add, not as idempotent `{ ok: true }`. A recruiter who clicks
 * "Add to pipeline" a second time should be told the candidate is already
 * there, matching how `closeGapFlag` surfaces an already-closed flag.
 */

/** Fictional jobs.id — never a real client job. */
const JOB_ID = "00000000-0000-0000-0000-000000000201";

/** Fictional candidates.id — never a real person. */
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000301";

/** Fictional recruiter typed name (CLAUDE.md hard rule 8). */
const TYPED_NAME = "Maya Tan";

type InsertResult = {
  data?: unknown;
  error: { message: string; code?: string } | null;
};

function thenableInsert(result: InsertResult) {
  const chain: {
    select: () => typeof chain;
    single: () => Promise<InsertResult>;
    maybeSingle: () => Promise<InsertResult>;
    then: Promise<InsertResult>["then"];
  } = {
    select: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return chain;
}

function mockPipelineInsert(result: InsertResult) {
  const insert = vi.fn().mockReturnValue(thenableInsert(result));
  const from = vi.fn().mockReturnValue({ insert });
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, insert };
}

function insertedRow(insert: ReturnType<typeof vi.fn>): Record<string, unknown> {
  expect(insert).toHaveBeenCalledTimes(1);
  const raw = insert.mock.calls[0]?.[0];
  if (Array.isArray(raw)) {
    expect(raw).toHaveLength(1);
    expect(raw[0]).toEqual(expect.any(Object));
    expect(raw[0]).not.toBeNull();
    return raw[0] as Record<string, unknown>;
  }
  expect(raw).toEqual(expect.any(Object));
  expect(raw).not.toBeNull();
  return raw as Record<string, unknown>;
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("addCandidateToPipeline (AC3)", () => {
  it("AC3: a blank typed name is refused — no DB write", async () => {
    expect(isValidRecruiterName("")).toBe(false);
    const { from, insert } = mockPipelineInsert({ error: null });

    const result = await addCandidateToPipeline(JOB_ID, CANDIDATE_ID, "");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.trim().length).toBeGreaterThan(0);
    }
    expect(getDb).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("AC3: a whitespace-only typed name is refused — no DB write", async () => {
    expect(isValidRecruiterName("   ")).toBe(false);
    const { from, insert } = mockPipelineInsert({ error: null });

    const result = await addCandidateToPipeline(JOB_ID, CANDIDATE_ID, "   ");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.trim().length).toBeGreaterThan(0);
    }
    expect(getDb).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("AC3: a valid call inserts exactly one pipeline_entries row in Sourced", async () => {
    const { from, insert } = mockPipelineInsert({ error: null });

    const result = await addCandidateToPipeline(
      JOB_ID,
      CANDIDATE_ID,
      TYPED_NAME,
    );

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("pipeline_entries");
    for (const call of from.mock.calls) {
      expect(call[0]).toBe("pipeline_entries");
    }

    const row = insertedRow(insert);
    expect(row.job_id).toBe(JOB_ID);
    expect(row.candidate_id).toBe(CANDIDATE_ID);
    expect(row.stage).toBe("Sourced");
    expect(row.owner_name).toBe(TYPED_NAME);
  });

  it("AC3: a unique-constraint conflict (same candidate+job) returns already-added, does not throw", async () => {
    const { from, insert } = mockPipelineInsert({
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "pipeline_entries_one_stage_per_job"',
      },
    });

    const result = await addCandidateToPipeline(
      JOB_ID,
      CANDIDATE_ID,
      TYPED_NAME,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already/i);
    }
    expect(from).toHaveBeenCalledWith("pipeline_entries");
    expect(insert).toHaveBeenCalledTimes(1);
    for (const call of from.mock.calls) {
      expect(call[0]).toBe("pipeline_entries");
    }
  });
});
