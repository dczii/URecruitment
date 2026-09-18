import "server-only";

import { getDb } from "../db";
import { getCurrentJobVersion } from "../jobs/versions";

export type MatchScoreCurrent = {
  status: "current";
  candidateId: string;
  jobVersionId: string;
  score: number;
  modelVersion: string;
  createdAt: string;
};

export type MatchScoreStale = {
  status: "stale";
  candidateId: string;
  jobVersionId: string;
  storedModelVersion: string;
  storedCreatedAt: string;
};

export type MatchScoreRead =
  | MatchScoreCurrent
  | MatchScoreStale
  | { status: "not_scored" };

export type ListMatchScoresResult =
  | { status: "not_scored" }
  | { status: "ready"; scores: Array<MatchScoreCurrent | MatchScoreStale> };

export type GetMatchScoreArgs = {
  candidateId: string;
  jobId: string;
  currentModelVersion: string;
};

export type ListMatchScoresForJobArgs = {
  jobId: string;
  currentModelVersion: string;
};

type MatchScoreRow = {
  candidate_id: string;
  job_version_id: string;
  model_version: string;
  score: number;
  created_at: string;
};

/**
 * The only place a caller resolves "the" score for a candidate×job.
 * Keys off the job's current version; never a caller-supplied version id.
 */
export async function getMatchScore({
  candidateId,
  jobId,
  currentModelVersion,
}: GetMatchScoreArgs): Promise<MatchScoreRead> {
  const loaded = await loadScoresForCurrentJobVersion(jobId);
  if (!loaded) {
    return { status: "not_scored" };
  }

  const forCandidate = loaded.rows.filter(
    (row) => row.candidate_id === candidateId,
  );
  if (forCandidate.length === 0) {
    return { status: "not_scored" };
  }

  return pickPreferred(
    forCandidate.map((row) =>
      classifyRow(row, loaded.jobVersionId, currentModelVersion),
    ),
  );
}

/**
 * Ranked-list read for a job. Zero current-version rows is `not_scored`,
 * never an empty array (that would look like "scored, none qualified").
 */
export async function listMatchScoresForJob({
  jobId,
  currentModelVersion,
}: ListMatchScoresForJobArgs): Promise<ListMatchScoresResult> {
  const loaded = await loadScoresForCurrentJobVersion(jobId);
  if (!loaded || loaded.rows.length === 0) {
    return { status: "not_scored" };
  }

  const byCandidate = new Map<string, MatchScoreCurrent | MatchScoreStale>();
  for (const row of loaded.rows) {
    const classified = classifyRow(
      row,
      loaded.jobVersionId,
      currentModelVersion,
    );
    const existing = byCandidate.get(row.candidate_id);
    byCandidate.set(
      row.candidate_id,
      existing ? preferCurrent(existing, classified) : classified,
    );
  }

  return { status: "ready", scores: [...byCandidate.values()] };
}

/**
 * Load every `match_scores` row for the job's current version. Do **not**
 * filter by `model_version` here — that would collapse stale into
 * not-scored. Classification happens in application code.
 */
async function loadScoresForCurrentJobVersion(
  jobId: string,
): Promise<{ jobVersionId: string; rows: MatchScoreRow[] } | null> {
  const version = await getCurrentJobVersion(jobId);
  if (!version) {
    return null;
  }

  const { data, error } = await getDb()
    .from("match_scores")
    .select("candidate_id, job_version_id, model_version, score, created_at")
    .eq("job_version_id", version.id);

  if (error) {
    throw new Error(
      `Failed to load match scores for job version ${version.id}: ${error.message}`,
    );
  }

  return { jobVersionId: version.id, rows: data ?? [] };
}

function classifyRow(
  row: MatchScoreRow,
  jobVersionId: string,
  currentModelVersion: string,
): MatchScoreCurrent | MatchScoreStale {
  if (row.model_version === currentModelVersion) {
    return {
      status: "current",
      candidateId: row.candidate_id,
      jobVersionId,
      score: row.score,
      modelVersion: row.model_version,
      createdAt: row.created_at,
    };
  }

  return {
    status: "stale",
    candidateId: row.candidate_id,
    jobVersionId,
    storedModelVersion: row.model_version,
    storedCreatedAt: row.created_at,
  };
}

function pickPreferred(
  classified: Array<MatchScoreCurrent | MatchScoreStale>,
): MatchScoreCurrent | MatchScoreStale {
  return classified.reduce(preferCurrent);
}

function preferCurrent(
  a: MatchScoreCurrent | MatchScoreStale,
  b: MatchScoreCurrent | MatchScoreStale,
): MatchScoreCurrent | MatchScoreStale {
  if (a.status === "current") {
    return a;
  }
  if (b.status === "current") {
    return b;
  }
  return a;
}
