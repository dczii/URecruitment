import "server-only";

import type { Json } from "@/lib/database.types";
import {
  SEARCH_QUERY_PROMPT_ID,
  SEARCH_QUERY_PROMPT_VERSION,
  buildSearchQueryInput,
  searchQueryOutputSchema,
} from "../ai/prompts/search-query";
import { runAi } from "../ai/run";
import type { AiModel, AiRunsWriter } from "../ai/types";
import {
  searchCandidates,
  type SearchCandidateRow,
  type SearchCandidatesFilters,
} from "./query";

export type RunSearchArgs = {
  query: string;
  model: AiModel;
  runs: AiRunsWriter;
};

export type IgnoredTerm = {
  term: string;
  reason: string;
};

export type SearchResult = {
  candidateId: string;
  fullName: string;
  headline: string | null;
  totalYears: number;
  location: string | null;
  languages: string[];
  cvUpdatedAt: string | null;
  keywordScore: number;
  vectorScore: number | null;
  fusedScore: number;
  matchScore: number | null;
  matched: Json | null;
  missing: Json | null;
  uncertain: Json | null;
  highlight: string | null;
};

export type RunSearchResult =
  | {
      status: "ok";
      results: SearchResult[];
      ignoredTerms: IgnoredTerm[];
      /** Parsed filters that actually narrowed the SQL query (AC1). */
      filters: SearchCandidatesFilters;
    }
  | { status: "could_not_understand" };

/**
 * Parse a plain-language query via `runAi`, then search. Embedding is
 * always `null` until a generic `embedText` exists (#48 follow-up).
 * Protected terms stay in `ignoredTerms` and never become filters.
 */
export async function runSearch({
  query,
  model,
  runs,
}: RunSearchArgs): Promise<RunSearchResult> {
  const trimmed = query.trim();
  if (trimmed === "") {
    throw new Error("Query must not be empty");
  }

  let parsed;
  try {
    parsed = await runAi({
      prompt: {
        id: SEARCH_QUERY_PROMPT_ID,
        version: SEARCH_QUERY_PROMPT_VERSION,
        text: buildSearchQueryInput(trimmed),
      },
      schema: searchQueryOutputSchema,
      inputRef: "search-query",
      model,
      runs,
    });
  } catch {
    // Schema-invalid or provider failure: `runAi` already wrote the
    // failed `ai_runs` row. Distinct from a successful search with no hits.
    return { status: "could_not_understand" };
  }

  const rows = await searchCandidates({
    filters: parsed.filters,
    keyword: parsed.keyword_text,
    embedding: null,
  });

  return {
    status: "ok",
    results: rows.map(toSearchResult),
    ignoredTerms: parsed.ignored_terms,
    filters: parsed.filters,
  };
}

function toSearchResult(row: SearchCandidateRow): SearchResult {
  return {
    candidateId: row.candidate_id,
    fullName: row.full_name,
    headline: row.headline,
    totalYears: row.total_years,
    location: row.location,
    languages: row.languages,
    cvUpdatedAt: row.cv_updated_at,
    keywordScore: row.keyword_score,
    vectorScore: row.vector_score,
    fusedScore: row.fused_score,
    matchScore: row.match_score,
    matched: row.matched,
    missing: row.missing,
    uncertain: row.uncertain,
    highlight: row.highlight,
  };
}
