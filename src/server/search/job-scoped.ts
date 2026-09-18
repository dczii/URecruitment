import "server-only";

import type { Json } from "@/lib/database.types";
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

type JobScopedResultIdentity = {
  candidateId: string;
  fullName: string;
  headline: string | null;
  totalYears: number;
  location: string | null;
  languages: string[];
  cvUpdatedAt: string | null;
  matched: Json | null;
  missing: Json | null;
  uncertain: Json | null;
};

export type JobScopedResultScored = JobScopedResultIdentity & {
  matchStatus: "scored";
  score: number;
};

export type JobScopedResultNotScored = JobScopedResultIdentity & {
  matchStatus: "not_scored";
};

export type JobScopedResult = JobScopedResultScored | JobScopedResultNotScored;

export type JobScopedResults =
  | { status: "not_ready" }
  | { status: "ready"; jobVersionId: string; results: JobScopedResult[] };

/**
 * Filter-only browse of candidates for a job, ranked by that job's
 * stored match score. Zero AI calls: no re-scoring, no query parse.
 * Ranking is whatever `searchCandidates` already returned — this
 * wrapper does not re-sort.
 */
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
    embedding: null,
    jobVersionId: version.id,
  });

  return {
    status: "ready",
    jobVersionId: version.id,
    results: rows.map(toJobScopedResult),
  };
}

function toJobScopedResult(row: SearchCandidateRow): JobScopedResult {
  const identity = identityFromRow(row);
  if (row.match_score === null) {
    return { matchStatus: "not_scored", ...identity };
  }
  return {
    matchStatus: "scored",
    score: row.match_score,
    ...identity,
  };
}

function identityFromRow(row: SearchCandidateRow): JobScopedResultIdentity {
  return {
    candidateId: row.candidate_id,
    fullName: row.full_name,
    headline: row.headline,
    totalYears: row.total_years,
    location: row.location,
    languages: row.languages,
    cvUpdatedAt: row.cv_updated_at,
    matched: row.matched,
    missing: row.missing,
    uncertain: row.uncertain,
  };
}
