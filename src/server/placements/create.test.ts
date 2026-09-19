import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { createPlacement } from "./create";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/** Fictional pipeline_entries.id — never a real candidate-on-job row. */
const PIPELINE_ENTRY_ID = "00000000-0000-0000-0000-000000000601";
const CLIENT_ID = "00000000-0000-0000-0000-000000000602";
const JOB_ID = "00000000-0000-0000-0000-000000000603";
const PLACEMENT_ID = "00000000-0000-0000-0000-000000000604";

/** Fictional recruiter typed name (CLAUDE.md hard rule 8). */
const TYPED_NAME = "Priya Rao";

const PLACED_AT = "2026-09-01T04:00:00.000Z";

type EntryRow = {
  id: string;
  job_id: string;
  stage: string;
  entered_at: string;
};

function mockClient(opts: {
  entry: EntryRow | null;
  guaranteePeriodDays: number;
  existingPlacement: { id: string } | null;
}) {
  const entrySingle = vi
    .fn()
    .mockResolvedValue({ data: opts.entry, error: null });
  const entryEq = vi.fn().mockReturnValue({ maybeSingle: entrySingle });
  const entrySelect = vi.fn().mockReturnValue({ eq: entryEq });

  const jobSingle = vi
    .fn()
    .mockResolvedValue({ data: { client_id: CLIENT_ID }, error: null });
  const jobEq = vi.fn().mockReturnValue({ maybeSingle: jobSingle });
  const jobSelect = vi.fn().mockReturnValue({ eq: jobEq });

  const clientSingle = vi.fn().mockResolvedValue({
    data: { guarantee_period_days: opts.guaranteePeriodDays },
    error: null,
  });
  const clientEq = vi.fn().mockReturnValue({ maybeSingle: clientSingle });
  const clientSelect = vi.fn().mockReturnValue({ eq: clientEq });

  const existingSingle = vi
    .fn()
    .mockResolvedValue({ data: opts.existingPlacement, error: null });
  const existingEq = vi.fn().mockReturnValue({ maybeSingle: existingSingle });
  const existingSelect = vi.fn().mockReturnValue({ eq: existingEq });

  const upsertSingle = vi.fn().mockResolvedValue({
    data: { id: opts.existingPlacement?.id ?? PLACEMENT_ID },
    error: null,
  });
  const upsertSelect = vi.fn().mockReturnValue({ single: upsertSingle });
  const insert = vi.fn().mockReturnValue({ select: upsertSelect });
  const updateEq = vi.fn().mockReturnValue({ select: upsertSelect });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  let placementsSelectCalls = 0;
  const from = vi.fn((table: string) => {
    if (table === "pipeline_entries") {
      return { select: entrySelect };
    }
    if (table === "jobs") {
      return { select: jobSelect };
    }
    if (table === "clients") {
      return { select: clientSelect };
    }
    if (table === "placements") {
      placementsSelectCalls += 1;
      if (placementsSelectCalls === 1) {
        return { select: existingSelect, insert, update };
      }
      return { select: existingSelect, insert, update };
    }
    return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
  });
  vi.mocked(getDb).mockReturnValue({ from } as never);

  return { from, insert, update, updateEq };
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-19T01:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createPlacement", () => {
  it("AC1: the client's own guarantee period is used when set", async () => {
    const mocks = mockClient({
      entry: {
        id: PIPELINE_ENTRY_ID,
        job_id: JOB_ID,
        stage: "Placed",
        entered_at: PLACED_AT,
      },
      guaranteePeriodDays: 60,
      existingPlacement: null,
    });

    const result = await createPlacement({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      startDate: "2026-09-05",
      recruiterName: TYPED_NAME,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.placement.guaranteePeriodDays).toBe(60);
      expect(result.placement.guaranteeEndDate).toBe("2026-11-04");
      expect(result.placement.startDate).toBe("2026-09-05");
    }
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const payload = mocks.insert.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(payload.recruiter_name).toBe(TYPED_NAME);
    expect(payload.guarantee_period_days).toBe(60);
    expect(payload.guarantee_end_date).toBe("2026-11-04");
  });

  it("AC2: the 30-day default applies when the client has no period", async () => {
    const mocks = mockClient({
      entry: {
        id: PIPELINE_ENTRY_ID,
        job_id: JOB_ID,
        stage: "Placed",
        entered_at: PLACED_AT,
      },
      guaranteePeriodDays: 30,
      existingPlacement: null,
    });

    const result = await createPlacement({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      startDate: "2026-09-05",
      recruiterName: TYPED_NAME,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.placement.guaranteePeriodDays).toBe(30);
      expect(result.placement.guaranteeEndDate).toBe("2026-10-05");
    }
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("AC3: a start date before the placed date is refused, no write", async () => {
    mockClient({
      entry: {
        id: PIPELINE_ENTRY_ID,
        job_id: JOB_ID,
        stage: "Placed",
        entered_at: PLACED_AT, // 2026-09-01 SGT
      },
      guaranteePeriodDays: 30,
      existingPlacement: null,
    });

    const result = await createPlacement({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      startDate: "2026-08-01",
      recruiterName: TYPED_NAME,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.trim().length).toBeGreaterThan(0);
    }
  });

  it("AC4: changing the start date recomputes the end date on the existing placement", async () => {
    const mocks = mockClient({
      entry: {
        id: PIPELINE_ENTRY_ID,
        job_id: JOB_ID,
        stage: "Placed",
        entered_at: PLACED_AT,
      },
      guaranteePeriodDays: 30,
      existingPlacement: { id: PLACEMENT_ID },
    });

    const result = await createPlacement({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      startDate: "2026-09-10",
      recruiterName: TYPED_NAME,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.placement.guaranteeEndDate).toBe("2026-10-10");
      expect(result.placement.id).toBe(PLACEMENT_ID);
    }
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("a move without a name is refused, no DB write", async () => {
    const result = await createPlacement({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      startDate: "2026-09-05",
      recruiterName: "   ",
    });

    expect(result.ok).toBe(false);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("refuses a pipeline entry that is not in the Placed stage", async () => {
    mockClient({
      entry: {
        id: PIPELINE_ENTRY_ID,
        job_id: JOB_ID,
        stage: "Offer",
        entered_at: PLACED_AT,
      },
      guaranteePeriodDays: 30,
      existingPlacement: null,
    });

    const result = await createPlacement({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      startDate: "2026-09-05",
      recruiterName: TYPED_NAME,
    });

    expect(result.ok).toBe(false);
  });
});
