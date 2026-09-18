import "server-only";

import { getDb } from "../db";

export type DelayStatus = "on-track" | "due-soon" | "overdue";

export type PipelineStatusRow = {
  pipelineEntryId: string;
  candidateId: string;
  jobId: string;
  stage: string;
  workingDaysUsed: number;
  limitDays: number;
  status: DelayStatus;
  daysOver: number;
  waitingOn: string;
};

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

type PipelineStatusClient = {
  from: (table: "pipeline_status") => {
    select: (columns: "*") => Promise<{
      data: PipelineStatusDbRow[] | null;
      error: { message: string } | null;
    }>;
  };
};

/** Pure boundary function — no DB. */
export function resolveDelayStatus(
  workingDaysUsed: number,
  limitDays: number,
): DelayStatus {
  if (workingDaysUsed > limitDays) {
    return "overdue";
  }
  // Round the 80% floor up so a 7-day limit flags at 6 days, not 5 (7*0.8=5.6).
  if (workingDaysUsed >= Math.ceil(limitDays * 0.8)) {
    return "due-soon";
  }
  return "on-track";
}

/** Reads the `pipeline_status` view. End states and Placed are already excluded. */
export async function getPipelineStatus(): Promise<PipelineStatusRow[]> {
  // View is added in a later migration; generated Database types don't include it yet.
  const db = getDb() as unknown as PipelineStatusClient;
  const { data, error } = await db.from("pipeline_status").select("*");

  if (error) {
    throw new Error(`Failed to load pipeline status: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    pipelineEntryId: row.pipeline_entry_id,
    candidateId: row.candidate_id,
    jobId: row.job_id,
    stage: row.stage,
    workingDaysUsed: row.working_days_used,
    limitDays: row.limit_days,
    status: row.status,
    daysOver: row.days_over,
    waitingOn: row.waiting_on,
  }));
}
