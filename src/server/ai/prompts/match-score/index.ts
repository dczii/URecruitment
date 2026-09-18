import "server-only";

/**
 * The only place to switch the active match-score prompt version (ai-prompts skill).
 */
export {
  matchScoreOutputSchema,
  buildMatchScoreInput,
  MATCH_SCORE_EXAMPLES,
  MATCH_SCORE_PROMPT_ID,
  MATCH_SCORE_PROMPT_VERSION,
} from "./v1";
export type { MatchScoreOutput } from "./v1";
