import "server-only";

/**
 * The only place to switch the active gap-check prompt version (ai-prompts skill).
 */
export {
  gapCheckOutputSchema,
  buildGapCheckInput,
  GAP_CHECK_EXAMPLES,
  GAP_CHECK_PROMPT_ID,
  GAP_CHECK_PROMPT_VERSION,
} from "./v1";
export type { GapCheckOutput } from "./v1";
