import "server-only";

import type { Json } from "@/lib/database.types";
import { getDb } from "../db";
import {
  listMatchScoresForJob,
  type ListMatchScoresForJobArgs,
  type MatchScoreCurrent,
  type MatchScoreStale,
} from "./read";

export type SkillEvidence = {
  requirement_id: string;
  source_text: string;
  note: string;
};

export type RankedMatchCurrent = {
  status: "current";
  candidateId: string;
  candidateName: string;
  jobVersionId: string;
  score: number;
  matched: SkillEvidence[];
  missing: SkillEvidence[];
  uncertain: SkillEvidence[];
  modelVersion: string;
  createdAt: string;
};

export type RankedMatchStale = {
  status: "stale";
  candidateId: string;
  candidateName: string;
  jobVersionId: string;
  matched: SkillEvidence[];
  missing: SkillEvidence[];
  uncertain: SkillEvidence[];
  storedModelVersion: string;
  storedCreatedAt: string;
};

export type RankedMatchesResult =
  | { status: "not_scored" }
  | { status: "ready"; matches: Array<RankedMatchCurrent | RankedMatchStale> };

export type GetRankedMatchesArgs = ListMatchScoresForJobArgs;

type CandidateNameRow = {
  id: string;
  full_name: string;
};

type MatchScoreEvidenceRow = {
  candidate_id: string;
  model_version: string;
  matched: Json;
  missing: Json;
  uncertain: Json;
};

/**
 * Ranked-list read for a job. Stored scores only — never calls a model.
 * A stale row is included distinctly and never carries `score`.
 */
export async function getRankedMatches({
  jobId,
  currentModelVersion,
}: GetRankedMatchesArgs): Promise<RankedMatchesResult> {
  const listed = await listMatchScoresForJob({ jobId, currentModelVersion });
  if (listed.status === "not_scored") {
    return { status: "not_scored" };
  }

  const { names, evidence } = await loadJoinData(listed.scores);
  const current = listed.scores
    .filter((score): score is MatchScoreCurrent => score.status === "current")
    .sort((a, b) => b.score - a.score)
    .map((score) => toCurrentMatch(score, names, evidence));
  const stale = listed.scores
    .filter((score): score is MatchScoreStale => score.status === "stale")
    .map((score) => toStaleMatch(score, names, evidence));

  return { status: "ready", matches: [...current, ...stale] };
}

async function loadJoinData(
  scores: Array<MatchScoreCurrent | MatchScoreStale>,
): Promise<{
  names: Map<string, string>;
  evidence: Map<string, SkillEvidenceBuckets>;
}> {
  const candidateIds = [...new Set(scores.map((score) => score.candidateId))];
  const jobVersionId = scores[0]?.jobVersionId;
  const db = getDb();

  const [candidatesResult, evidenceResult] = await Promise.all([
    db.from("candidates").select("id, full_name").in("id", candidateIds),
    db
      .from("match_scores")
      .select("candidate_id, model_version, matched, missing, uncertain")
      .in("candidate_id", candidateIds)
      // Current job version only — never filter by model version, or stale
      // rows lose their stored evidence.
      .eq("job_version_id", jobVersionId ?? ""),
  ]);

  if (candidatesResult.error) {
    throw new Error(
      `Failed to load candidate names for ranked matches: ${candidatesResult.error.message}`,
    );
  }
  if (evidenceResult.error) {
    throw new Error(
      `Failed to load match evidence for ranked matches: ${evidenceResult.error.message}`,
    );
  }

  const names = new Map<string, string>();
  for (const row of (candidatesResult.data ?? []) as CandidateNameRow[]) {
    names.set(row.id, row.full_name);
  }

  const evidence = new Map<string, SkillEvidenceBuckets>();
  for (const row of (evidenceResult.data ?? []) as MatchScoreEvidenceRow[]) {
    evidence.set(evidenceKey(row.candidate_id, row.model_version), {
      matched: asSkillEvidenceList(row.matched),
      missing: asSkillEvidenceList(row.missing),
      uncertain: asSkillEvidenceList(row.uncertain),
    });
  }

  return { names, evidence };
}

type SkillEvidenceBuckets = {
  matched: SkillEvidence[];
  missing: SkillEvidence[];
  uncertain: SkillEvidence[];
};

const EMPTY_EVIDENCE: SkillEvidenceBuckets = {
  matched: [],
  missing: [],
  uncertain: [],
};

function toCurrentMatch(
  score: MatchScoreCurrent,
  names: Map<string, string>,
  evidence: Map<string, SkillEvidenceBuckets>,
): RankedMatchCurrent {
  const buckets =
    evidence.get(evidenceKey(score.candidateId, score.modelVersion)) ??
    EMPTY_EVIDENCE;
  return {
    status: "current",
    candidateId: score.candidateId,
    candidateName: names.get(score.candidateId) ?? "",
    jobVersionId: score.jobVersionId,
    score: score.score,
    matched: buckets.matched,
    missing: buckets.missing,
    uncertain: buckets.uncertain,
    modelVersion: score.modelVersion,
    createdAt: score.createdAt,
  };
}

function toStaleMatch(
  score: MatchScoreStale,
  names: Map<string, string>,
  evidence: Map<string, SkillEvidenceBuckets>,
): RankedMatchStale {
  const buckets =
    evidence.get(evidenceKey(score.candidateId, score.storedModelVersion)) ??
    EMPTY_EVIDENCE;
  return {
    status: "stale",
    candidateId: score.candidateId,
    candidateName: names.get(score.candidateId) ?? "",
    jobVersionId: score.jobVersionId,
    matched: buckets.matched,
    missing: buckets.missing,
    uncertain: buckets.uncertain,
    storedModelVersion: score.storedModelVersion,
    storedCreatedAt: score.storedCreatedAt,
  };
}

function evidenceKey(candidateId: string, modelVersion: string): string {
  return `${candidateId}:${modelVersion}`;
}

function asSkillEvidenceList(value: Json): SkillEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: SkillEvidence[] = [];
  for (const item of value) {
    const parsed = asSkillEvidence(item);
    if (parsed) {
      entries.push(parsed);
    }
  }
  return entries;
}

function asSkillEvidence(value: Json): SkillEvidence | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const requirementId = value.requirement_id;
  const sourceText = value.source_text;
  const note = value.note;
  if (
    typeof requirementId !== "string" ||
    typeof sourceText !== "string" ||
    typeof note !== "string"
  ) {
    return null;
  }
  return {
    requirement_id: requirementId,
    source_text: sourceText,
    note,
  };
}
