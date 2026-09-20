import { beforeEach, describe, expect, it, vi } from "vitest";

import { movePipelineStage } from "./move";
import { moveManyPipelineStages } from "./move-many";

vi.mock("./move", () => ({ movePipelineStage: vi.fn() }));

const moveMock = vi.mocked(movePipelineStage);

/** Fictional pipeline_entries ids — never real candidate-on-job rows. */
const A = "00000000-0000-0000-0000-0000000005a1";
const B = "00000000-0000-0000-0000-0000000005b2";
const C = "00000000-0000-0000-0000-0000000005c3";

/** Fictional recruiter typed name (CLAUDE.md hard rule 8). */
const TYPED_NAME = "Priya Rao";

const ok = (id: string, stage: string) => ({
  ok: true as const,
  entry: { id, stage, entered_at: "2026-09-20T02:00:00.000Z" },
});

beforeEach(() => {
  moveMock.mockReset();
});

describe("moveManyPipelineStages", () => {
  it("moves every selected entry to its own next stage, carrying the typed name", async () => {
    moveMock.mockImplementation(async ({ pipelineEntryId, toStage }) =>
      ok(pipelineEntryId, toStage),
    );

    const result = await moveManyPipelineStages({
      entries: [
        { pipelineEntryId: A, stage: "Sourced" },
        { pipelineEntryId: B, stage: "Client interview" },
      ],
      recruiterName: TYPED_NAME,
    });

    expect(moveMock).toHaveBeenCalledTimes(2);
    expect(moveMock).toHaveBeenCalledWith({
      pipelineEntryId: A,
      toStage: "Screening",
      recruiterName: TYPED_NAME,
    });
    expect(moveMock).toHaveBeenCalledWith({
      pipelineEntryId: B,
      toStage: "Offer",
      recruiterName: TYPED_NAME,
    });
    expect(result.moved).toEqual([
      { pipelineEntryId: A, toStage: "Screening" },
      { pipelineEntryId: B, toStage: "Offer" },
    ]);
    expect(result.failed).toEqual([]);
  });

  it("refuses the whole batch without a typed name, writing nothing", async () => {
    const result = await moveManyPipelineStages({
      entries: [{ pipelineEntryId: A, stage: "Sourced" }],
      recruiterName: "   ",
    });

    expect(moveMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Enter your name to continue.");
  });

  it("never writes an entry that cannot advance, and reports it as blocked", async () => {
    moveMock.mockImplementation(async ({ pipelineEntryId, toStage }) =>
      ok(pipelineEntryId, toStage),
    );

    const result = await moveManyPipelineStages({
      entries: [
        { pipelineEntryId: A, stage: "Sourced" },
        { pipelineEntryId: B, stage: "Placed" },
      ],
      recruiterName: TYPED_NAME,
    });

    expect(moveMock).toHaveBeenCalledTimes(1);
    expect(moveMock).toHaveBeenCalledWith({
      pipelineEntryId: A,
      toStage: "Screening",
      recruiterName: TYPED_NAME,
    });
    expect(result.blocked).toEqual([
      { pipelineEntryId: B, stage: "Placed", reason: "Already placed" },
    ]);
  });

  it("keeps going when one entry fails, and reports which one", async () => {
    moveMock.mockImplementation(async ({ pipelineEntryId, toStage }) =>
      pipelineEntryId === B
        ? { ok: false as const, error: "The candidate could not be moved." }
        : ok(pipelineEntryId, toStage),
    );

    const result = await moveManyPipelineStages({
      entries: [
        { pipelineEntryId: A, stage: "Sourced" },
        { pipelineEntryId: B, stage: "Sourced" },
        { pipelineEntryId: C, stage: "Sourced" },
      ],
      recruiterName: TYPED_NAME,
    });

    expect(result.moved.map((m) => m.pipelineEntryId)).toEqual([A, C]);
    expect(result.failed).toEqual([
      { pipelineEntryId: B, error: "The candidate could not be moved." },
    ]);
    expect(result.ok).toBe(true);
  });

  it("refuses an empty selection rather than reporting a successful no-op", async () => {
    const result = await moveManyPipelineStages({
      entries: [],
      recruiterName: TYPED_NAME,
    });

    expect(moveMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Select at least one candidate.");
  });
});
