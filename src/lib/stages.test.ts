import { describe, expect, it } from "vitest";
import {
  ALL_PIPELINE_STAGES,
  END_STATES,
  isEndState,
  isValidPipelineStage,
  STAGE_WAITING_ON,
  STAGES,
} from "./stages";

const EXPECTED_STAGES = [
  "Sourced",
  "Screening",
  "Shortlisted",
  "Submitted to client",
  "Client interview",
  "Offer",
  "Placed",
] as const;

const EXPECTED_END_STATES = [
  "Rejected by agency",
  "Rejected by client",
  "Withdrawn",
] as const;

const JUNK_INPUT = ["", "Sourcedx", "placed"] as const;

const EXPECTED_WAITING_ON: Record<(typeof EXPECTED_STAGES)[number], string> = {
  Sourced: "Recruiter",
  Screening: "Recruiter",
  Shortlisted: "Recruiter",
  "Submitted to client": "Client",
  "Client interview": "Client / candidate",
  Offer: "Candidate",
  Placed: "—",
};

describe("stages", () => {
  it("AC2: STAGES lists the seven stages in PRD order", () => {
    expect(STAGES).toEqual([...EXPECTED_STAGES]);
  });

  it("AC2: ALL_PIPELINE_STAGES lists each of the 10 values exactly once", () => {
    expect(ALL_PIPELINE_STAGES).toHaveLength(10);
    expect(new Set(ALL_PIPELINE_STAGES).size).toBe(10);
    expect(ALL_PIPELINE_STAGES).toEqual(
      expect.arrayContaining([...EXPECTED_STAGES, ...EXPECTED_END_STATES]),
    );
  });

  it("AC2: isValidPipelineStage is true for all 10 pipeline values and false for junk", () => {
    for (const stage of EXPECTED_STAGES) {
      expect(isValidPipelineStage(stage)).toBe(true);
    }
    for (const endState of EXPECTED_END_STATES) {
      expect(isValidPipelineStage(endState)).toBe(true);
    }
    for (const junk of JUNK_INPUT) {
      expect(isValidPipelineStage(junk)).toBe(false);
    }
  });

  it("AC3: END_STATES lists the three end states", () => {
    expect(END_STATES).toHaveLength(3);
    expect(new Set(END_STATES)).toEqual(new Set(EXPECTED_END_STATES));
  });

  it("AC3: isEndState is true for all three end states and false for the seven stages", () => {
    for (const endState of EXPECTED_END_STATES) {
      expect(isEndState(endState)).toBe(true);
    }
    for (const stage of EXPECTED_STAGES) {
      expect(isEndState(stage)).toBe(false);
    }
    for (const junk of JUNK_INPUT) {
      expect(isEndState(junk)).toBe(false);
    }
  });

  it("AC3: STAGE_WAITING_ON maps every stage to who the delay is on", () => {
    for (const stage of EXPECTED_STAGES) {
      expect(STAGE_WAITING_ON[stage]).toBe(EXPECTED_WAITING_ON[stage]);
    }
    for (const stage of STAGES) {
      expect(STAGE_WAITING_ON).toHaveProperty(stage);
    }
  });
});
