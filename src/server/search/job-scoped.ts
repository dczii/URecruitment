import "server-only";

import { getCurrentJobVersion } from "../jobs/versions";
import {
  searchCandidates,
  type SearchCandidateRow,
  type SearchCandidatesFilters,
} from "./query";

export type GetJobScopedResultsArgs = {
  jobId: string;
  filters: SearchCandidatesFilters;
};

export type JobScopedResult = {
  candidateId: string;
  fullName: string;
  headline: string | null;
  totalYears: number;
  location: string | null;
  languages: string[];
  cvUpdatedAt: string | null;
};

export type JobScopedResults =
  | { status: "not_ready" }
  | { status: "ready"; jobVersionId: string; results: JobScopedResult[] };

export async function getJobScopedResults({
  jobId,
  filters,
}: GetJobScopedResultsArgs): Promise<JobScopedResults> {
  const version = await getCurrentJobVersion(jobId);
  if (version === null) {
    return { status: "not_ready" };
  }

  const rows = await searchCandidates({
    filters,
    keyword: null,
  });

  return {
    status: "ready",
    jobVersionId: version.id,
    results: rows.map(toJobScopedResult),
  };
}

function toJobScopedResult(row: SearchCandidateRow): JobScopedResult {
  return {
    candidateId: row.candidate_id,
    fullName: row.full_name,
    headline: row.headline,
    totalYears: row.total_years,
    location: row.location,
    languages: row.languages,
    cvUpdatedAt: row.cv_updated_at,
  };
}
