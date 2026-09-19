import { STAGES } from "./stages";

export type StageLimitScope = "default" | "client" | "job";

export type StageLimitRow = {
  scope: StageLimitScope;
  client_id: string | null;
  job_id: string | null;
  stage: string;
  limit_days: number;
};

export function resolveStageLimit(
  rows: StageLimitRow[],
  params: { jobId: string; clientId: string; stage: string },
): number | null {
  if (!(STAGES as readonly string[]).includes(params.stage)) {
    throw new Error(`Unrecognised stage: ${params.stage}`);
  }

  // Look up the row, then read limit_days. A 0-day limit is a real value, so
  // never coalesce with `||` / truthiness on the number itself.
  const job = rows.find(
    (row) =>
      row.scope === "job" && row.job_id === params.jobId && row.stage === params.stage,
  );
  if (job !== undefined) {
    return job.limit_days;
  }

  const client = rows.find(
    (row) =>
      row.scope === "client" &&
      row.client_id === params.clientId &&
      row.stage === params.stage,
  );
  if (client !== undefined) {
    return client.limit_days;
  }

  const fallback = rows.find(
    (row) => row.scope === "default" && row.stage === params.stage,
  );
  if (fallback !== undefined) {
    return fallback.limit_days;
  }

  return null;
}
