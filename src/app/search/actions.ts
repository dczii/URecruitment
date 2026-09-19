"use server";

import { z } from "zod";

import {
  searchCandidates,
  type SearchCandidateRow,
  type SearchCandidatesFilters,
} from "@/server/search/query";

const querySchema = z.string();

const filtersSchema = z.object({
  skills: z.array(z.string()).optional(),
  minYears: z.number().nullable().optional(),
  maxYears: z.number().nullable().optional(),
  locations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  cvUpdatedAfter: z.string().nullable().optional(),
});

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
      filters: SearchFilters;
    }
  | { status: "error"; message: string };

export async function search(
  query: string,
  filtersInput: unknown = {},
): Promise<SearchActionResult> {
  const parsedQuery = querySchema.safeParse(query);
  const trimmed = parsedQuery.success ? parsedQuery.data.trim() : "";
  const parsedFilters = filtersSchema.safeParse(filtersInput);
  if (!parsedFilters.success) {
    return { status: "error", message: "Search failed. Try again." };
  }

  const filters = toSearchFilters(parsedFilters.data);

  try {
    const rows = await searchCandidates({
      filters: toSqlFilters(filters),
      keyword: trimmed.length > 0 ? trimmed : null,
    });

    return {
      status: "ok",
      results: rows.map(toSearchHit),
      filters,
    };
  } catch {
    return { status: "error", message: "Search failed. Try again." };
  }
}

function toSearchFilters(
  data: z.infer<typeof filtersSchema>,
): SearchFilters {
  return {
    skills: data.skills ?? [],
    minYears: data.minYears ?? null,
    maxYears: data.maxYears ?? null,
    locations: data.locations ?? [],
    languages: data.languages ?? [],
    cvUpdatedAfter: data.cvUpdatedAfter ?? null,
  };
}

function toSqlFilters(filters: SearchFilters): SearchCandidatesFilters {
  return {
    skills: filters.skills,
    min_years: filters.minYears,
    max_years: filters.maxYears,
    locations: filters.locations,
    languages: filters.languages,
    cv_updated_after: filters.cvUpdatedAfter,
  };
}

function toSearchHit(row: SearchCandidateRow): SearchHit {
  return {
    candidateId: row.candidate_id,
    fullName: row.full_name,
    headline: row.headline,
    totalYears: row.total_years,
    location: row.location,
    languages: row.languages,
    cvUpdatedAt: row.cv_updated_at,
  };
}
