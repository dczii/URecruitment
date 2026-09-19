import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { getDb } from "../db";
import {
  getPipelineStatus,
  resolveDelayStatus,
  type DelayStatus,
  type PipelineStatusRow,
} from "./status";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * Contract — implement in `src/server/pipeline/status.ts`.
 *
 * resolveDelayStatus(workingDaysUsed, limitDays) → DelayStatus
 *   Pure; no DB. due-soon when
 *     workingDaysUsed >= Math.ceil(limitDays * 0.8)
 *     AND workingDaysUsed <= limitDays;
 *   overdue when workingDaysUsed > limitDays;
 *   else on-track. The 80% threshold rounds UP.
 *
 * getPipelineStatus() → Promise<PipelineStatusRow[]>
 *   getDb().from("pipeline_status").select("*"), mapping snake_case columns
 *   to camelCase. The view already excludes end states and Placed; this
 *   reader does not filter. No in-memory cache between calls.
 *
 * PipelineStatusRow.status is DelayStatus — there is no nullable / no-status
 * variant of the row shape.
 */

/** Fictional pipeline_entries.id — never a real candidate-on-job row. */
const PIPELINE_ENTRY_ID = "00000000-0000-0000-0000-000000000801";
const PIPELINE_ENTRY_TWO = "00000000-0000-0000-0000-000000000802";
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000811";
const CANDIDATE_TWO = "00000000-0000-0000-0000-000000000812";
const JOB_ID = "00000000-0000-0000-0000-000000000821";

type PipelineStatusDbRow = {
  pipeline_entry_id: string;
  candidate_id: string;
  job_id: string;
  stage: string;
  working_days_used: number;
  limit_days: number;
  status: DelayStatus;
  days_over: number;
  waiting_on: string;
};

function dbRow(
  overrides: Partial<PipelineStatusDbRow> = {},
): PipelineStatusDbRow {
  return {
    pipeline_entry_id: PIPELINE_ENTRY_ID,
    candidate_id: CANDIDATE_ID,
    job_id: JOB_ID,
    stage: "Screening",
    working_days_used: 1,
    limit_days: 5,
    status: "on-track",
    days_over: 0,
    waiting_on: "Recruiter",
    ...overrides,
  };
}

function mapped(row: PipelineStatusDbRow): PipelineStatusRow {
  return {
    pipelineEntryId: row.pipeline_entry_id,
    candidateId: row.candidate_id,
    jobId: row.job_id,
    stage: row.stage,
    workingDaysUsed: row.working_days_used,
    limitDays: row.limit_days,
    status: row.status,
    daysOver: row.days_over,
    waitingOn: row.waiting_on,
  };
}

function mockStatusClient(rows: PipelineStatusDbRow[]) {
  const select = vi.fn().mockResolvedValue({ data: rows, error: null });
  const from = vi.fn().mockReturnValue({ select });
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, select };
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("resolveDelayStatus", () => {
  it("AC2: 79% of the limit is on-track", () => {
    expect(resolveDelayStatus(79, 100)).toBe("on-track"); // 79/100=79%; floor is ceil(100*0.8)=80
    expect(resolveDelayStatus(3, 5)).toBe("on-track"); // 3 < ceil(5*0.8)=4
  });

  it("AC2: exactly 80% of the limit is due-soon", () => {
    expect(resolveDelayStatus(4, 5)).toBe("due-soon"); // 4/5=80%; 5*0.8=4 exactly
    expect(resolveDelayStatus(6, 7)).toBe("due-soon"); // 7*0.8=5.6 → ceil 6
  });

  it("AC2: 81% of the limit is due-soon", () => {
    expect(resolveDelayStatus(81, 100)).toBe("due-soon"); // 81/100=81%; 81<=100 so not overdue
  });

  it("AC2: one working day over the limit is overdue", () => {
    expect(resolveDelayStatus(6, 5)).toBe("overdue"); // 6 > 5
  });

  it("AC2: zero days used against any positive limit is on-track", () => {
    expect(resolveDelayStatus(0, 5)).toBe("on-track");
    expect(resolveDelayStatus(0, 7)).toBe("on-track");
  });
});

describe("getPipelineStatus", () => {
  it("AC3: end states and Placed return no status row", async () => {
    // The view omits Rejected by agency / client, Withdrawn, and Placed.
    const rows = [
      dbRow({
        stage: "Screening",
        status: "on-track",
        working_days_used: 1,
        limit_days: 3,
      }),
      dbRow({
        pipeline_entry_id: PIPELINE_ENTRY_TWO,
        candidate_id: CANDIDATE_TWO,
        stage: "Submitted to client",
        status: "due-soon",
        working_days_used: 4,
        limit_days: 5,
        waiting_on: "Client",
      }),
    ];
    const { from, select } = mockStatusClient(rows);

    const result = await getPipelineStatus();

    expect(from).toHaveBeenCalledWith("pipeline_status");
    expect(select).toHaveBeenCalledWith("*");
    expect(result).toEqual(rows.map(mapped));
    expect(result).toHaveLength(rows.length);

    expectTypeOf<PipelineStatusRow["status"]>().toEqualTypeOf<DelayStatus>();
    expectTypeOf<PipelineStatusRow["status"]>().not.toEqualTypeOf<
      DelayStatus | null
    >();
    expectTypeOf(result[0]!.status).toEqualTypeOf<DelayStatus>();
  });

  it("AC4: a limit changed mid-stage is reflected by a live read, not a cached snapshot", async () => {
    const first = dbRow({
      working_days_used: 4,
      limit_days: 5,
      status: "due-soon",
    });
    const second = dbRow({
      working_days_used: 4,
      limit_days: 10,
      status: "on-track",
    });
    const select = vi
      .fn()
      .mockResolvedValueOnce({ data: [first], error: null })
      .mockResolvedValueOnce({ data: [second], error: null });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(getDb).mockReturnValue({ from } as never);

    const firstRead = await getPipelineStatus();
    const secondRead = await getPipelineStatus();

    expect(firstRead).toEqual([mapped(first)]);
    expect(secondRead).toEqual([mapped(second)]);
    expect(secondRead[0]?.limitDays).toBe(10);
    expect(secondRead[0]?.status).toBe("on-track");
    expect(secondRead[0]?.limitDays).not.toBe(firstRead[0]?.limitDays);
  });
});
