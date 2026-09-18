"use server";

import { z } from "zod";

import { getModel } from "@/server/ai/provider";
import { createSupabaseAiRunsWriter } from "@/server/ai/run-supabase";
import {
  runSearch,
  type IgnoredTerm,
  type SearchResult,
} from "@/server/search/run-search";
import type { SearchCandidatesFilters } from "@/server/search/query";

const querySchema = z.string();

export type SearchHit = {
  candidateId: string;
  fullName: string;
  headline: string | null;
  totalYears: number;
  location: string | null;
  languages: string[];
  cvUpdatedAt: string | null;
};

export type SearchFilters = {
  skills: string[];
  minYears: number | null;
  maxYears: number | null;
  locations: string[];
  languages: string[];
  cvUpdatedAfter: string | null;
};

export type SearchActionResult =
  | {
      status: "ok";
      results: SearchHit[];
      ignoredTerms: IgnoredTerm[];
      filters: SearchFilters;
    }
  | { status: "could_not_understand" }
  | { status: "error"; message: string };

/**
 * Parse a plain-language query and search. The browser must not call this
 * Server Action directly — that POSTs to `/search` and skips the Vercel
 * firewall. `POST /api/ai/search` is the page's entry point.
 */
export async function search(query: string): Promise<SearchActionResult> {
  const parsed = querySchema.safeParse(query);
  const trimmed = parsed.success ? parsed.data.trim() : "";
  if (trimmed === "") {
    return { status: "error", message: "Enter a search query." };
  }

  try {
    const result = await runSearch({
      query: trimmed,
      model: getModel("search"),
      runs: createSupabaseAiRunsWriter(),
    });

    if (result.status === "could_not_understand") {
      return result;
    }

    return {
      status: "ok",
      results: result.results.map(toSearchHit),
      ignoredTerms: result.ignoredTerms,
      filters: toClientFilters(result.filters),
    };
  } catch {
    return { status: "error", message: "Search failed. Try again." };
  }
}

function toSearchHit(row: SearchResult): SearchHit {
  return {
    candidateId: row.candidateId,
    fullName: row.fullName,
    headline: row.headline,
    totalYears: row.totalYears,
    location: row.location,
    languages: row.languages,
    cvUpdatedAt: row.cvUpdatedAt,
  };
}

function toClientFilters(filters: SearchCandidatesFilters): SearchFilters {
  return {
    skills: filters.skills,
    minYears: filters.min_years,
    maxYears: filters.max_years,
    locations: filters.locations,
    languages: filters.languages,
    cvUpdatedAfter: filters.cv_updated_after,
  };
}
