import "server-only";

import {
  EXTRACT_JD_PROMPT_ID,
  EXTRACT_JD_PROMPT_VERSION,
  buildExtractJdInput,
  extractJdOutputSchema,
  type ExtractJdOutput,
} from "../ai/prompts/extract-jd";
import { runAi } from "../ai/run";
import type { AiModel, AiRunsWriter } from "../ai/types";

const UNSUPPORTED_JD_FILE =
  "This file type is not supported. Upload a PDF or DOCX job description.";

export type ExtractJobDescriptionArgs = {
  jdText: string;
  model: AiModel;
  runs: AiRunsWriter;
  filename?: string;
};

/**
 * Rejects anything other than PDF/DOCX before text extraction or a model
 * call. Extension only — magic-byte and size checks live in `uploadCvFile`.
 */
export function assertSupportedJdFile(filename: string): void {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
    throw new Error(UNSUPPORTED_JD_FILE);
  }
}

/**
 * One `runAi` call with the extract-jd prompt. Returns schema-validated
 * pre-fill data only — never writes `jobs` / `job_versions`.
 */
export async function extractJobDescription({
  jdText,
  model,
  runs,
  filename,
}: ExtractJobDescriptionArgs): Promise<ExtractJdOutput> {
  if (filename !== undefined) {
    assertSupportedJdFile(filename);
  }

  return runAi({
    prompt: {
      id: EXTRACT_JD_PROMPT_ID,
      version: EXTRACT_JD_PROMPT_VERSION,
      text: buildExtractJdInput(jdText),
    },
    schema: extractJdOutputSchema,
    inputRef: filename !== undefined ? `jd:${filename}` : "jd-text",
    model,
    runs,
  });
}
