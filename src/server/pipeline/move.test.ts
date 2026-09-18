import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { movePipelineStage } from "./move";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * S3a/S3b contract — implement this signature in `src/server/pipeline/move.ts`
 * (S3c). Do not create that file in this step.
 *
 * movePipelineStage({ pipelineEntryId, toStage, recruiterName })
 *   → Promise<
 *       | { ok: true; entry: { id: string; stage: string; entered_at: string } }
 *       | { ok: false; error: string }
 *     >
 *
 *   Zod-validate a known `toStage` (`isValidPipelineStage`) and a non-empty
 *   typed name (trim, 1–80). On success: read the single `pipeline_entries`
 *   row by id; update that row's `stage` and reset `entered_at`; append one
 *   `stage_events` row (`from_stage` = previous stage, `to_stage`,
 *   `recruiter_name` = trimmed name). Never read or write `stage_limits`.
 *   Never insert a second `pipeline_entries` row. A backwards move is the
 *   same write path as a forwards move.
 */

/** Fictional pipeline_entries.id — never a real candidate-on-job row. */
const PIPELINE_ENTRY_ID = "00000000-0000-0000-0000-000000000501";

/** Fictional recruiter typed name (CLAUDE.md hard rule 8). */
const TYPED_NAME = "Priya Rao";

/** Frozen UTC instant so `entered_at` is deterministic. */
const FROZEN_AT = "2026-09-19T04:00:00.000Z";

/** Previous clock, distinct from FROZEN_AT, so a reset is observable. */
const PREVIOUS_ENTERED_AT = "2026-09-01T04:00:00.000Z";

const END_STATES = [
  "Rejected by agency",
  "Rejected by client",
  "Withdrawn",
] as const;

type PipelineEntryRow = {
  id: string;
  stage: string;
  entered_at: string;
};

type UpdatePayload = {
  stage?: unknown;
  entered_at?: unknown;
};

type StageEventPayload = {
  pipeline_entry_id?: unknown;
  from_stage?: unknown;
  to_stage?: unknown;
  recruiter_name?: unknown;
  updated_at?: unknown;
};

function entryIn(stage: string): PipelineEntryRow {
  return {
    id: PIPELINE_ENTRY_ID,
    stage,
    entered_at: PREVIOUS_ENTERED_AT,
  };
}

function mockMoveClient(row: PipelineEntryRow) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const selectEq = vi.fn().mockReturnValue({ maybeSingle, single });
  const select = vi.fn().mockReturnValue({ eq: selectEq });

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const entriesInsert = vi.fn();

  const eventsInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "pipeline_entries") {
      return { select, update, insert: entriesInsert };
    }
    if (table === "stage_events") {
      return { insert: eventsInsert };
    }
    return { select: vi.fn(), update: vi.fn(), insert: vi.fn() };
  });
  vi.mocked(getDb).mockReturnValue({ from } as never);

  return {
    from,
    select,
    selectEq,
    update,
    updateEq,
    entriesInsert,
    eventsInsert,
  };
}

function updatePayload(update: ReturnType<typeof vi.fn>): UpdatePayload {
  expect(update).toHaveBeenCalledTimes(1);
  const payload = update.mock.calls[0]?.[0] as UpdatePayload | undefined;
  expect(payload).toEqual(expect.any(Object));
  return payload as UpdatePayload;
}

function insertedEvent(
  insert: ReturnType<typeof vi.fn>,
): StageEventPayload {
  expect(insert).toHaveBeenCalledTimes(1);
  const raw = insert.mock.calls[0]?.[0];
  if (Array.isArray(raw)) {
    expect(raw).toHaveLength(1);
    expect(raw[0]).toEqual(expect.any(Object));
    expect(raw[0]).not.toBeNull();
    return raw[0] as StageEventPayload;
  }
  expect(raw).toEqual(expect.any(Object));
  expect(raw).not.toBeNull();
  return raw as StageEventPayload;
}

function expectSuccessfulMoveWrites(opts: {
  from: ReturnType<typeof vi.fn>;
  selectEq: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateEq: ReturnType<typeof vi.fn>;
  entriesInsert: ReturnType<typeof vi.fn>;
  eventsInsert: ReturnType<typeof vi.fn>;
  fromStage: string;
  toStage: string;
  recruiterName: string;
}) {
  expect(opts.selectEq).toHaveBeenCalledWith("id", PIPELINE_ENTRY_ID);
  expect(opts.updateEq).toHaveBeenCalledWith("id", PIPELINE_ENTRY_ID);
  expect(opts.entriesInsert).not.toHaveBeenCalled();

  const payload = updatePayload(opts.update);
  expect(payload.stage).toBe(opts.toStage);
  expect(payload.entered_at).toEqual(expect.any(String));
  expect(payload.entered_at).toBe(FROZEN_AT);
  expect(payload.entered_at).not.toBe(PREVIOUS_ENTERED_AT);

  const event = insertedEvent(opts.eventsInsert);
  expect(event.pipeline_entry_id).toBe(PIPELINE_ENTRY_ID);
  expect(event.from_stage).toBe(opts.fromStage);
  expect(event.to_stage).toBe(opts.toStage);
  expect(event.recruiter_name).toBe(opts.recruiterName);
  expect(event).not.toHaveProperty("updated_at");

  expect(opts.from).toHaveBeenCalledWith("pipeline_entries");
  expect(opts.from).toHaveBeenCalledWith("stage_events");
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_AT));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("movePipelineStage", () => {
  it("AC1: move writes one stage_events row with the name and time", async () => {
    const fromStage = "Screening";
    const toStage = "Shortlisted";
    const mocks = mockMoveClient(entryIn(fromStage));

    const result = await movePipelineStage({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      toStage,
      recruiterName: `  ${TYPED_NAME}  `,
    });

    expect(result).toEqual({
      ok: true,
      entry: {
        id: PIPELINE_ENTRY_ID,
        stage: toStage,
        entered_at: FROZEN_AT,
      },
    });
    expectSuccessfulMoveWrites({
      ...mocks,
      fromStage,
      toStage,
      recruiterName: TYPED_NAME,
    });
  });

  it("AC1: a backwards move also resets entered_at and writes a stage_events row", async () => {
    const fromStage = "Shortlisted";
    const toStage = "Screening";
    const mocks = mockMoveClient(entryIn(fromStage));

    const result = await movePipelineStage({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      toStage,
      recruiterName: TYPED_NAME,
    });

    expect(result).toEqual({
      ok: true,
      entry: {
        id: PIPELINE_ENTRY_ID,
        stage: toStage,
        entered_at: FROZEN_AT,
      },
    });
    expectSuccessfulMoveWrites({
      ...mocks,
      fromStage,
      toStage,
      recruiterName: TYPED_NAME,
    });
  });

  it("AC2: a candidate never occupies two stages (single stage column, unique constraint)", async () => {
    const fromStage = "Sourced";
    const toStage = "Screening";
    const { from, selectEq, update, updateEq, entriesInsert, eventsInsert } =
      mockMoveClient(entryIn(fromStage));

    const result = await movePipelineStage({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      toStage,
      recruiterName: TYPED_NAME,
    });

    expect(result.ok).toBe(true);

    expect(selectEq).toHaveBeenCalledTimes(1);
    expect(selectEq).toHaveBeenCalledWith("id", PIPELINE_ENTRY_ID);
    expect(updateEq).toHaveBeenCalledTimes(1);
    expect(updateEq).toHaveBeenCalledWith("id", PIPELINE_ENTRY_ID);
    for (const call of [...selectEq.mock.calls, ...updateEq.mock.calls]) {
      expect(call[0]).toBe("id");
      expect(call[1]).toBe(PIPELINE_ENTRY_ID);
    }

    expect(update).toHaveBeenCalledTimes(1);
    expect(entriesInsert).not.toHaveBeenCalled();
    expect(eventsInsert).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("pipeline_entries");
    expect(from).toHaveBeenCalledWith("stage_events");
  });

  it.each([...END_STATES])(
    "AC3: moving into %s succeeds and never touches stage_limits",
    async (toStage) => {
      const fromStage = "Screening";
      const { from, update, updateEq, entriesInsert, eventsInsert } =
        mockMoveClient(entryIn(fromStage));

      const result = await movePipelineStage({
        pipelineEntryId: PIPELINE_ENTRY_ID,
        toStage,
        recruiterName: TYPED_NAME,
      });

      expect(result).toEqual({
        ok: true,
        entry: {
          id: PIPELINE_ENTRY_ID,
          stage: toStage,
          entered_at: FROZEN_AT,
        },
      });

      expect(update).toHaveBeenCalledTimes(1);
      expect(updateEq).toHaveBeenCalledWith("id", PIPELINE_ENTRY_ID);
      expect(entriesInsert).not.toHaveBeenCalled();

      const payload = updatePayload(update);
      expect(payload.stage).toBe(toStage);
      expect(payload.entered_at).toBe(FROZEN_AT);

      const event = insertedEvent(eventsInsert);
      expect(event.from_stage).toBe(fromStage);
      expect(event.to_stage).toBe(toStage);
      expect(event.recruiter_name).toBe(TYPED_NAME);
      expect(event).not.toHaveProperty("updated_at");

      expect(from.mock.calls.length).toBeGreaterThan(0);
      for (const [table] of from.mock.calls) {
        expect(["pipeline_entries", "stage_events"]).toContain(table);
      }
      expect(from).not.toHaveBeenCalledWith("stage_limits");
    },
  );

  it("AC4: a move without a name is refused, no DB write", async () => {
    const result = await movePipelineStage({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      toStage: "Screening",
      recruiterName: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.trim().length).toBeGreaterThan(0);
    }
    expect(getDb).not.toHaveBeenCalled();
  });

  it("AC4: a whitespace-only recruiter name is refused, no DB write", async () => {
    const result = await movePipelineStage({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      toStage: "Screening",
      recruiterName: "   ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.trim().length).toBeGreaterThan(0);
    }
    expect(getDb).not.toHaveBeenCalled();
  });

  it("AC4: an unknown target stage is refused, no DB write", async () => {
    const result = await movePipelineStage({
      pipelineEntryId: PIPELINE_ENTRY_ID,
      toStage: "Not A Real Stage",
      recruiterName: TYPED_NAME,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.trim().length).toBeGreaterThan(0);
    }
    expect(getDb).not.toHaveBeenCalled();
  });
});
