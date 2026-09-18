import "server-only";

import type { AiModel, AiModelGenerateResult } from "../ai/types";
import type { CvExtractionQuality } from "./extract";

/**
 * Text-path bar: average non-whitespace characters per page.
 * Distinct from `MIN_CHARS_PER_PAGE` (the scanned/image-only rejection bar).
 * Below this — and still above the scanned bar — extraction is usable enough
 * not to reject, but too thin/garbled (typical of some Chinese PDFs), so the
 * PDF itself is sent to a file-reading model. This is not OCR; scanned files
 * are still rejected by `extract.ts` / `rejections.ts`.
 */
export const MIN_CHARS_PER_PAGE_FOR_TEXT_PATH = 200;

export type ParsePath = "text" | "file";

export type ExecuteParsePathArgs = {
  quality: CvExtractionQuality;
  cvText: string;
  fileBytes: Uint8Array;
  model: AiModel;
};

export type ExecuteParsePathResult = {
  path: ParsePath;
  object: unknown;
  costUsd?: number;
};

type FileCapableModel = AiModel & {
  supportsFileInput: true;
  generateObjectFromFile: (
    fileBytes: Uint8Array,
  ) => Promise<AiModelGenerateResult>;
};

export function decideParsePath(quality: CvExtractionQuality): ParsePath {
  if (
    quality.avgCharsPerPage === null ||
    quality.avgCharsPerPage >= MIN_CHARS_PER_PAGE_FOR_TEXT_PATH
  ) {
    return "text";
  }
  return "file";
}

/**
 * Dispatch to the text or file `AiModel` method for the chosen path.
 * Records which path ran. An unsupported file-input model fails clearly
 * instead of silently falling back to text.
 */
export async function executeParsePath({
  quality,
  cvText,
  fileBytes,
  model,
}: ExecuteParsePathArgs): Promise<ExecuteParsePathResult> {
  const path = decideParsePath(quality);

  if (path === "text") {
    const result = await model.generateObject(cvText);
    return toPathResult(path, result);
  }

  if (!modelSupportsFileInput(model)) {
    throw new Error(
      "File parse path is unavailable: this model does not support file input",
    );
  }

  const result = await model.generateObjectFromFile(fileBytes);
  return toPathResult(path, result);
}

function modelSupportsFileInput(model: AiModel): model is FileCapableModel {
  return (
    model.supportsFileInput === true &&
    typeof model.generateObjectFromFile === "function"
  );
}

function toPathResult(
  path: ParsePath,
  result: AiModelGenerateResult,
): ExecuteParsePathResult {
  return {
    path,
    object: result.object,
    costUsd: result.costUsd,
  };
}
