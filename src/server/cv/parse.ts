import "server-only";

import type { Json } from "@/lib/database.types";
import {
  PARSE_CV_PROMPT_ID,
  PARSE_CV_PROMPT_VERSION,
  buildParseCvInput,
  parseCvOutputSchema,
  type ParseCvOutput,
} from "../ai/prompts/parse-cv";
import { runAi } from "../ai/run";
import type { AiModel, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import { computeTotalYears } from "./total-years";

const EVIDENCE_NOT_VERBATIM =
  "source_text is not a verbatim substring of the CV";

export type ParseCvArgs = {
  candidateId: string;
  cvFileId: string;
  cvText: string;
  model: AiModel;
  runs: AiRunsWriter;
};

export type ParsedCandidateProfile = ParseCvOutput & {
  total_years: number;
};

/**
 * One `runAi` call per CV: schema-validate, verify every evidence quote is a
 * verbatim substring of `cvText`, compute total years from work history, then
 * persist `candidate_profiles` + `candidate_skills`.
 */
export async function parseCv({
  candidateId,
  cvFileId,
  cvText,
  model,
  runs,
}: ParseCvArgs): Promise<ParsedCandidateProfile> {
  const output = await runAi({
    prompt: {
      id: PARSE_CV_PROMPT_ID,
      version: PARSE_CV_PROMPT_VERSION,
      text: buildParseCvInput(cvText),
    },
    schema: parseCvOutputSchema,
    inputRef: `cv_files:${cvFileId}`,
    model,
    runs,
  });

  if (hasUnverifiableQuote(output, cvText)) {
    throw new Error(EVIDENCE_NOT_VERBATIM);
  }

  const parsed: ParsedCandidateProfile = {
    ...output,
    total_years: computeTotalYears(output.work_history),
  };

  await persistProfile(candidateId, cvFileId, parsed);
  await persistSkills(candidateId, output.skills);

  return parsed;
}

function hasUnverifiableQuote(output: ParseCvOutput, cvText: string): boolean {
  return collectEvidenceQuotes(output).some((quote) => !cvText.includes(quote));
}

/** Every `source_text` and `*_source_text` string in the model output. */
function collectEvidenceQuotes(value: unknown): string[] {
  const quotes: string[] = [];

  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }
    if (node === null || typeof node !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (isEvidenceKey(key) && typeof child === "string") {
        quotes.push(child);
      }
      visit(child);
    }
  }

  visit(value);
  return quotes;
}

function isEvidenceKey(key: string): boolean {
  return key === "source_text" || key.endsWith("_source_text");
}

async function persistProfile(
  candidateId: string,
  cvFileId: string,
  parsed: ParsedCandidateProfile,
): Promise<void> {
  const { error } = await getDb()
    .from("candidate_profiles")
    .insert({
      candidate_id: candidateId,
      cv_file_id: cvFileId,
      parsed: toJson(parsed),
    });

  if (error) {
    throw new Error(
      `Failed to persist candidate profile for ${candidateId}: ${error.message}`,
    );
  }
}

async function persistSkills(
  candidateId: string,
  skills: ParseCvOutput["skills"],
): Promise<void> {
  if (skills.length === 0) {
    return;
  }

  const { error } = await getDb()
    .from("candidate_skills")
    .insert(
      skills.map((entry) => ({
        candidate_id: candidateId,
        skill: entry.skill,
        source_text: entry.source_text,
      })),
    );

  if (error) {
    throw new Error(
      `Failed to persist candidate skills for ${candidateId}: ${error.message}`,
    );
  }
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
