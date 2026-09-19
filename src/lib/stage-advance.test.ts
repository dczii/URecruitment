import { describe, expect, it } from "vitest";

import { nextStage, planStageAdvance } from "./stage-advance";

/** Fictional pipeline_entries ids — never real candidate-on-job rows. */
const A = "00000000-0000-0000-0000-0000000005a1";
const B = "00000000-0000-0000-0000-0000000005b2";
const C = "00000000-0000-0000-0000-0000000005c3";

describe("nextStage", () => {
  it("returns the following stage in the pipeline order", () => {
    expect(nextStage("Sourced")).toBe("Screening");
    expect(nextStage("Screening")).toBe("Shortlisted");
    expect(nextStage("Submitted to client")).toBe("Client interview");
    expect(nextStage("Client interview")).toBe("Offer");
    expect(nextStage("Offer")).toBe("Placed");
  });

  it("returns null at the end of the pipeline: Placed has nowhere to advance", () => {
    expect(nextStage("Placed")).toBeNull();
  });

  it("returns null for an end state, which is left rather than advanced", () => {
    expect(nextStage("Rejected by agency")).toBeNull();
    expect(nextStage("Rejected by client")).toBeNull();
    expect(nextStage("Withdrawn")).toBeNull();
  });

  it("returns null for a stage it does not recognise", () => {
    expect(nextStage("Interviewing")).toBeNull();
    expect(nextStage("")).toBeNull();
  });
});

describe("planStageAdvance", () => {
  it("names the current and target stage for every entry it can move", () => {
    const plan = planStageAdvance([
      { pipelineEntryId: A, stage: "Sourced" },
      { pipelineEntryId: B, stage: "Client interview" },
    ]);

    expect(plan.movable).toEqual([
      { pipelineEntryId: A, fromStage: "Sourced", toStage: "Screening" },
      { pipelineEntryId: B, fromStage: "Client interview", toStage: "Offer" },
    ]);
    expect(plan.blocked).toEqual([]);
  });

  it("blocks entries that cannot advance, with a reason, instead of dropping them", () => {
    const plan = planStageAdvance([
      { pipelineEntryId: A, stage: "Offer" },
      { pipelineEntryId: B, stage: "Placed" },
      { pipelineEntryId: C, stage: "Withdrawn" },
    ]);

    expect(plan.movable).toEqual([
      { pipelineEntryId: A, fromStage: "Offer", toStage: "Placed" },
    ]);
    expect(plan.blocked).toEqual([
      { pipelineEntryId: B, stage: "Placed", reason: "Already placed" },
      { pipelineEntryId: C, stage: "Withdrawn", reason: "Left the pipeline" },
    ]);
  });

  it("groups the plan by target stage so the recruiter sees what a bulk move does", () => {
    const plan = planStageAdvance([
      { pipelineEntryId: A, stage: "Sourced" },
      { pipelineEntryId: B, stage: "Sourced" },
      { pipelineEntryId: C, stage: "Offer" },
    ]);

    expect(plan.summary).toEqual([
      { toStage: "Screening", count: 2 },
      { toStage: "Placed", count: 1 },
    ]);
  });

  it("keeps a stable, deduplicated selection: the same entry twice counts once", () => {
    const plan = planStageAdvance([
      { pipelineEntryId: A, stage: "Sourced" },
      { pipelineEntryId: A, stage: "Sourced" },
    ]);

    expect(plan.movable).toHaveLength(1);
    expect(plan.summary).toEqual([{ toStage: "Screening", count: 1 }]);
  });

  it("returns empty results for an empty selection", () => {
    expect(planStageAdvance([])).toEqual({
      movable: [],
      blocked: [],
      summary: [],
    });
  });
});
