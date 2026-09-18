import "server-only";

import type { ParseCvOutput } from "../ai/prompts/parse-cv";

/**
 * Candidate fields the scorer is allowed to see. Extra keys on a runtime
 * profile (name, contact, protected attributes, stray `nationality`) are
 * ignored because this module copies only the named fields below.
 */
export type ScoringCandidateProfile = Pick<
  ParseCvOutput,
  | "work_history"
  | "education"
  | "certifications"
  | "skills"
  | "languages_spoken"
> & {
  total_years: number;
};

/** Job-version columns that gate whether language may reach the scorer. */
export type ScoringJobVersion = {
  requires_language: boolean;
  language_reason: string | null;
};

/**
 * Allow-listed model input. `languages_spoken` is omitted entirely when the
 * language gate is closed — never present as `[]`.
 */
export type ScoringProfile = {
  work_history: ScoringCandidateProfile["work_history"];
  education: ScoringCandidateProfile["education"];
  certifications: ScoringCandidateProfile["certifications"];
  skills: ScoringCandidateProfile["skills"];
  total_years: number;
  languages_spoken?: ScoringCandidateProfile["languages_spoken"];
};

function isLanguageGateOpen(jobVersion: ScoringJobVersion): boolean {
  return (
    jobVersion.requires_language === true &&
    jobVersion.language_reason != null &&
    jobVersion.language_reason.trim() !== ""
  );
}

/**
 * Builds the scoring-model input from a candidate profile. Every output
 * field is picked by name; the input is never spread, so unexpected
 * properties cannot leak through.
 */
export function buildScoringProfile(
  candidateProfile: ScoringCandidateProfile,
  jobVersion: ScoringJobVersion,
): ScoringProfile {
  const profile: ScoringProfile = {
    work_history: candidateProfile.work_history,
    education: candidateProfile.education,
    certifications: candidateProfile.certifications,
    skills: candidateProfile.skills,
    total_years: candidateProfile.total_years,
  };

  if (isLanguageGateOpen(jobVersion)) {
    profile.languages_spoken = candidateProfile.languages_spoken;
  }

  return profile;
}
