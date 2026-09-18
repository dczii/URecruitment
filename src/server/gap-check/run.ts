import "server-only";

import {
  GAP_CHECK_PROMPT_ID,
  GAP_CHECK_PROMPT_VERSION,
  buildGapCheckInput,
  gapCheckOutputSchema,
  type GapCheckOutput,
} from "../ai/prompts/gap-check";
import { runAi } from "../ai/run";
import type { AiModel, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import {
  checkMissingFields,
  persistMissingFieldFlags,
  type GapCheckFields,
  type MustHave,
} from "./missing-fields";

const AI_SOURCED_FLAG_TYPES = [
  "uncertain",
  "conflicting",
  "fair-employment",
] as const;

type AiSourcedFlagType = (typeof AI_SOURCED_FLAG_TYPES)[number];

export type RunGapCheckArgs = {
  jobVersionId: string;
  fields: GapCheckFields;
  mustHaves: MustHave[];
  formText: string;
  jdText?: string | null;
  model: AiModel;
  runs: AiRunsWriter;
};

type AiGapFlagRow = {
  job_version_id: string;
  flag_type: AiSourcedFlagType;
  reason: string;
  suggested_question: string;
  resolution_state: "open";
};

/**
 * Save-path gap check: missing-field code rules first, then one model call
 * for uncertain / conflicting / fair-employment flags. Never rejects — a
 * model, schema or evidence failure is swallowed after `runAi` has written
 * the `ai_runs` row, so `createJob` can still `redirect()`.
 */
export async function runGapCheck({
  jobVersionId,
  fields,
  mustHaves,
  formText,
  jdText,
  model,
  runs,
}: RunGapCheckArgs): Promise<void> {
  try {
    const missingFlags = checkMissingFields({
      fields,
      must_haves: mustHaves,
    });
    await persistMissingFieldFlags(jobVersionId, missingFlags);
  } catch {
    // Missing-field persistence must never block the model call or the save.
  }

  try {
    const output = await runAi({
      prompt: {
        id: GAP_CHECK_PROMPT_ID,
        version: GAP_CHECK_PROMPT_VERSION,
        text: buildGapCheckInput(formText, jdText ?? null),
      },
      schema: gapCheckOutputSchema,
      inputRef: `job_versions:${jobVersionId}`,
      model,
      runs,
    });

    const verified = verifiedAiFlags(jobVersionId, output, formText, jdText);
    await replaceOpenAiSourcedFlags(jobVersionId, verified);
  } catch {
    // Model / schema / persistence failures are swallowed so the job save
    // still succeeds. `runAi` has already recorded the `ai_runs` row.
  }
}

function verifiedAiFlags(
  jobVersionId: string,
  output: GapCheckOutput,
  formText: string,
  jdText: string | null | undefined,
): AiGapFlagRow[] {
  const rows: AiGapFlagRow[] = [];

  for (const flag of output.uncertain_flags) {
    if (!quoteInSources(flag.source_text, formText, jdText)) {
      continue;
    }
    rows.push({
      job_version_id: jobVersionId,
      flag_type: "uncertain",
      reason: quotedReason(flag.source_text, flag.why_it_matters),
      suggested_question: flag.client_question,
      resolution_state: "open",
    });
  }

  for (const flag of output.conflicting_flags) {
    if (
      jdText == null ||
      !formText.includes(flag.form_source_text) ||
      !jdText.includes(flag.jd_source_text)
    ) {
      continue;
    }
    rows.push({
      job_version_id: jobVersionId,
      flag_type: "conflicting",
      reason: conflictingReason(
        flag.form_source_text,
        flag.jd_source_text,
        flag.why_it_matters,
      ),
      suggested_question: flag.client_question,
      resolution_state: "open",
    });
  }

  for (const flag of output.fair_employment_flags) {
    if (!quoteInSources(flag.source_text, formText, jdText)) {
      continue;
    }
    rows.push({
      job_version_id: jobVersionId,
      flag_type: "fair-employment",
      reason: quotedReason(flag.source_text, flag.why_it_matters),
      suggested_question: flag.client_question,
      resolution_state: "open",
    });
  }

  return rows;
}

function quoteInSources(
  quote: string,
  formText: string,
  jdText: string | null | undefined,
): boolean {
  if (formText.includes(quote)) {
    return true;
  }
  return jdText != null && jdText.includes(quote);
}

function quotedReason(sourceText: string, whyItMatters: string): string {
  return `"${sourceText}"\n${whyItMatters}`;
}

function conflictingReason(
  formSourceText: string,
  jdSourceText: string,
  whyItMatters: string,
): string {
  return `Form: "${formSourceText}"\nJD: "${jdSourceText}"\n${whyItMatters}`;
}

async function replaceOpenAiSourcedFlags(
  jobVersionId: string,
  rows: AiGapFlagRow[],
): Promise<void> {
  const { error: deleteError } = await getDb()
    .from("gap_flags")
    .delete()
    .eq("job_version_id", jobVersionId)
    .eq("resolution_state", "open")
    .in("flag_type", [...AI_SOURCED_FLAG_TYPES]);

  if (deleteError) {
    throw new Error(
      `Failed to clear previous AI gap flags for ${jobVersionId}: ${deleteError.message}`,
    );
  }

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await getDb().from("gap_flags").insert(rows);

  if (insertError) {
    throw new Error(
      `Failed to persist AI gap flags for ${jobVersionId}: ${insertError.message}`,
    );
  }
}
