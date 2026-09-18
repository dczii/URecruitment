import { notFound } from "next/navigation";
import { z } from "zod";

import {
  JobScopedResults,
  type JobScopedFilterValues,
} from "@/components/features/search/JobScopedResults";
import { SearchScreen } from "@/components/features/search/SearchScreen";
import { getJobDetail } from "@/server/jobs/list";
import { getJobScopedResults } from "@/server/search/job-scoped";
import type { SearchCandidatesFilters } from "@/server/search/query";

export const dynamic = "force-dynamic";

const jobIdSchema = z.uuid();

type SearchParamRecord = Record<string, string | string[] | undefined>;

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const jobId = firstString(params.jobId);
  if (jobId == null || jobId.trim() === "") {
    return <SearchScreen />;
  }
  if (!jobIdSchema.safeParse(jobId).success) {
    notFound();
  }

  const job = await getJobDetail(jobId);
  if (!job) {
    notFound();
  }

  const filters = filtersFromSearchParams(params);
  const data = await getJobScopedResults({
    jobId,
    filters: toSearchFilters(filters),
  });

  return (
    <JobScopedResults
      jobId={job.id}
      jobTitle={job.title}
      data={data}
      filters={filters}
    />
  );
}

function filtersFromSearchParams(
  params: SearchParamRecord,
): JobScopedFilterValues {
  return {
    skills: parseCommaList(firstString(params.skills)),
    minYears: parseOptionalNumber(firstString(params.minYears)),
    maxYears: parseOptionalNumber(firstString(params.maxYears)),
    locations: parseCommaList(firstString(params.locations)),
    languages: parseCommaList(firstString(params.languages)),
    cvUpdatedAfter: parseOptionalDate(firstString(params.cvUpdatedAfter)),
  };
}

function toSearchFilters(
  filters: JobScopedFilterValues,
): SearchCandidatesFilters {
  return {
    skills: filters.skills,
    min_years: filters.minYears,
    max_years: filters.maxYears,
    locations: filters.locations,
    languages: filters.languages,
    cv_updated_after: filters.cvUpdatedAfter,
  };
}

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseCommaList(value: string | undefined): string[] {
  if (value == null) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseOptionalNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: string | undefined): string | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : null;
}
