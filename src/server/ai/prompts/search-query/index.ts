import "server-only";

/**
 * The only place to switch the active search-query prompt version (ai-prompts skill).
 */
export {
  searchQueryOutputSchema,
  buildSearchQueryInput,
  SEARCH_QUERY_EXAMPLES,
  SEARCH_QUERY_PROMPT_ID,
  SEARCH_QUERY_PROMPT_VERSION,
} from "./v1";
export type { SearchQueryOutput } from "./v1";
