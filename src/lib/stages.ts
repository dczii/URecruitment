export const STAGES = [
  "Sourced",
  "Screening",
  "Shortlisted",
  "Submitted to client",
  "Client interview",
  "Offer",
  "Placed",
] as const;

export type Stage = (typeof STAGES)[number];

export const END_STATES = [
  "Rejected by agency",
  "Rejected by client",
  "Withdrawn",
] as const;

export type EndState = (typeof END_STATES)[number];

export const ALL_PIPELINE_STAGES = [...STAGES, ...END_STATES] as const;

export type PipelineStage = (typeof ALL_PIPELINE_STAGES)[number];

export const STAGE_WAITING_ON: Record<Stage, string> = {
  Sourced: "Recruiter",
  Screening: "Recruiter",
  Shortlisted: "Recruiter",
  "Submitted to client": "Client",
  "Client interview": "Client / candidate",
  Offer: "Candidate",
  Placed: "—",
};

export function isEndState(value: string): value is EndState {
  return (END_STATES as readonly string[]).includes(value);
}

export function isValidPipelineStage(value: string): value is PipelineStage {
  return (ALL_PIPELINE_STAGES as readonly string[]).includes(value);
}
