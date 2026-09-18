import "server-only";

/**
 * The only place to switch the active extract-jd prompt version (ai-prompts skill).
 */
export {
  extractJdOutputSchema,
  buildExtractJdInput,
  EXTRACT_JD_EXAMPLES,
  EXTRACT_JD_PROMPT_ID,
  EXTRACT_JD_PROMPT_VERSION,
} from "./v1";
export type { ExtractJdOutput } from "./v1";
