import "server-only";

/**
 * The only place to switch the active parse-cv prompt version (ai-prompts skill).
 */
export {
  parseCvOutputSchema,
  buildParseCvInput,
  PARSE_CV_EXAMPLES,
  PARSE_CV_PROMPT_ID,
  PARSE_CV_PROMPT_VERSION,
} from "./v1";
export type { ParseCvOutput } from "./v1";
