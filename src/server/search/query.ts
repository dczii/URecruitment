import "server-only";

import type { Json } from "@/lib/database.types";
import { getDb } from "../db";

/**
 * Hard-filter jsonb for `search_candidates`. Keys match
 * `SearchQueryOutput["filters"]` (skills, years, locations, languages,
 * cv_updated_after) so a later search-screen caller (#53) can pass the
 * prompt output through without renaming.
 */
export type SearchCandidatesFilters = {
  skills: string[];
  min_years: number | null;
  max_years: number | null;
  locations: string[];
  languages: string[];
  cv_updated_after: string | null;
};

export type SearchCandidatesInput = {
  filters: SearchCandidatesFilters;
  keyword: string | null;
  embedding: number[] | null;
  jobVersionId?: string | null;
  limit?: number;
  offset?: number;
};

/**
 * One row from `public.search_candidates`. Column names match the SQL
 * `returns table (...)` exactly. This wrapper does not rename, filter,
 * or re-sort — fusion and ranking already happened in SQL.
 */
export type SearchCandidateRow = {
  candidate_id: string;
  full_name: string;
  headline: string | null;
  total_years: number;
  location: string | null;
  languages: string[];
  cv_updated_at: string | null;
  keyword_score: number;
  vector_score: number | null;
  fused_score: number;
  match_score: number | null;
  matched: Json | null;
  missing: Json | null;
  uncertain: Json | null;
  highlight: string | null;
};

/**
 * RPC args matching `public.search_candidates(filters, keyword, embedding,
 * job_version_id, lim, off)`.
 *
 * `src/lib/database.types.ts` does not yet list this function. Run
 * `npm run db:types` once Docker/local Supabase is available so the
 * generator picks it up; until then this local interface is the typed
 * contract, and `searchCandidates` casts `getDb().rpc(...)` around it
 * rather than fighting the generator.
 */
type SearchCandidatesRpcArgs = {
  filters: SearchCandidatesFilters;
  keyword: string | null;
  embedding: number[] | null;
  job_version_id: string | null;
  lim: number;
  off: number;
};

type SearchCandidatesRpc = {
  rpc(
    fn: "search_candidates",
    args: SearchCandidatesRpcArgs,
  ): Promise<{
    data: SearchCandidateRow[] | null;
    error: { message: string } | null;
  }>;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

/**
 * Thin pass-through to `search_candidates`. Filtering, PGroonga keyword
 * scoring, vector similarity, and reciprocal rank fusion all live in SQL.
 */
export async function searchCandidates({
  filters,
  keyword,
  embedding,
  jobVersionId = null,
  limit = DEFAULT_LIMIT,
  offset = DEFAULT_OFFSET,
}: SearchCandidatesInput): Promise<SearchCandidateRow[]> {
  const db = getDb() as unknown as SearchCandidatesRpc;
  const { data, error } = await db.rpc("search_candidates", {
    filters,
    keyword,
    embedding,
    job_version_id: jobVersionId,
    lim: limit,
    off: offset,
  });

  if (error) {
    throw new Error(`Failed to search candidates: ${error.message}`);
  }

  return data ?? [];
}
