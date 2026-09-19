import "server-only";

import { getDb } from "../db";

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
  limit?: number;
  offset?: number;
};

export type SearchCandidateRow = {
  candidate_id: string;
  full_name: string;
  headline: string | null;
  total_years: number;
  location: string | null;
  languages: string[];
  cv_updated_at: string | null;
  keyword_score: number;
  highlight: string | null;
};

type SearchCandidatesRpcArgs = {
  filters: SearchCandidatesFilters;
  keyword: string | null;
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

export async function searchCandidates({
  filters,
  keyword,
  limit = DEFAULT_LIMIT,
  offset = DEFAULT_OFFSET,
}: SearchCandidatesInput): Promise<SearchCandidateRow[]> {
  const db = getDb() as unknown as SearchCandidatesRpc;
  const { data, error } = await db.rpc("search_candidates", {
    filters,
    keyword,
    lim: limit,
    off: offset,
  });

  if (error) {
    throw new Error(`Failed to search candidates: ${error.message}`);
  }

  return data ?? [];
}
