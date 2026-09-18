import "server-only";

import type { Json } from "@/lib/database.types";
import {
  MATCH_SCORE_PROMPT_ID,
  MATCH_SCORE_PROMPT_VERSION,
  buildMatchScoreInput,
  matchScoreOutputSchema,
  type MatchScoreOutput,
} from "../ai/prompts/match-score";
import { runAi } from "../ai/run";
import type { AiModel, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import {
  buildScoringProfile,
  type ScoringCandidateProfile,
  type ScoringJobVersion,
} from "./redact";

/** PRD example. Cap lowers a score; it never raises one. Multiple missing must-haves do not stack. */
export const MUST_HAVE_CAP = 50;

export type ScoringRequirement = {
  id: string;
  text: string;
  marking: "must_have" | "nice_to_have";
};

export type ScoreCandidateArgs = {
  candidateId: string;
  jobVersionId: string;
  candidateProfile: ScoringCandidateProfile;
  jobVersion: ScoringJobVersion;
  requirements: ScoringRequirement[];
  model: AiModel;
  runs: AiRunsWriter;
};

type EvidenceEntry = MatchScoreOutput["matched"][number];

/**
 * One scoring call per candidate: redact → `runAi` → verify evidence
 * verbatim → must-have cap in code → persist `match_scores`.
 */
export async function scoreCandidate({
  candidateId,
  jobVersionId,
  candidateProfile,
  jobVersion,
  requirements,
  model,
  runs,
}: ScoreCandidateArgs): Promise<void> {
  const scoringProfile = buildScoringProfile(candidateProfile, jobVersion);
  const profileText = JSON.stringify(scoringProfile);

  const output = await runAi({
    prompt: {
      id: MATCH_SCORE_PROMPT_ID,
      version: MATCH_SCORE_PROMPT_VERSION,
      text: buildMatchScoreInput(renderRequirements(requirements), profileText),
    },
    schema: matchScoreOutputSchema,
    inputRef: `candidates:${candidateId}#job_versions:${jobVersionId}`,
    model,
    runs,
  });

  const matched = verifiedEvidence(output.matched, profileText);
  const uncertain = verifiedEvidence(output.uncertain, profileText);
  const missing = output.missing.map((entry) =>
    isAllowedMissingQuote(entry.source_text, profileText)
      ? entry
      : { ...entry, source_text: "" },
  );

  const rawScore = output.score;
  const score = applyMustHaveCap(
    rawScore,
    hasMissingMustHave(requirements, matched, missing),
  );

  await persistMatchScore({
    candidate_id: candidateId,
    job_version_id: jobVersionId,
    model_version: model.modelVersion,
    raw_score: rawScore,
    score,
    matched: toJson(matched),
    missing: toJson(missing),
    uncertain: toJson(uncertain),
  });
}

function renderRequirements(requirements: ScoringRequirement[]): string {
  return requirements
    .map((requirement) => {
      return `[${requirement.marking}:${requirement.id}] ${requirement.text}`;
    })
    .join("\n");
}

function verifiedEvidence(
  entries: EvidenceEntry[],
  profileText: string,
): EvidenceEntry[] {
  return entries.filter((entry) => isVerbatimQuote(entry.source_text, profileText));
}

function isVerbatimQuote(sourceText: string, profileText: string): boolean {
  return sourceText.length > 0 && profileText.includes(sourceText);
}

function isAllowedMissingQuote(
  sourceText: string,
  profileText: string,
): boolean {
  return sourceText.length === 0 || profileText.includes(sourceText);
}

function hasMissingMustHave(
  requirements: ScoringRequirement[],
  verifiedMatched: EvidenceEntry[],
  missing: EvidenceEntry[],
): boolean {
  const matchedIds = new Set(
    verifiedMatched.map((entry) => entry.requirement_id),
  );
  const missingIds = new Set(missing.map((entry) => entry.requirement_id));

  return requirements.some((requirement) => {
    if (requirement.marking !== "must_have") {
      return false;
    }
    return (
      missingIds.has(requirement.id) || !matchedIds.has(requirement.id)
    );
  });
}

function applyMustHaveCap(rawScore: number, missingMustHave: boolean): number {
  if (!missingMustHave) {
    return rawScore;
  }
  return Math.min(rawScore, MUST_HAVE_CAP);
}

async function persistMatchScore(row: {
  candidate_id: string;
  job_version_id: string;
  model_version: string;
  raw_score: number;
  score: number;
  matched: Json;
  missing: Json;
  uncertain: Json;
}): Promise<void> {
  const { error } = await getDb()
    .from("match_scores")
    .upsert(row, {
      onConflict: "candidate_id,job_version_id,model_version",
    });

  if (error) {
    throw new Error(
      `Failed to persist match score for ${row.candidate_id} / ${row.job_version_id}: ${error.message}`,
    );
  }
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
