import Link from "next/link";

import { EmptyState } from "@/components/patterns/states";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/field";
import type {
  JobScopedResult,
  JobScopedResults as JobScopedResultsData,
} from "@/server/search/job-scoped";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

export type JobScopedFilterValues = {
  skills: string[];
  minYears: number | null;
  maxYears: number | null;
  locations: string[];
  languages: string[];
  cvUpdatedAfter: string | null;
};

type JobScopedResultsProps = {
  jobId: string;
  jobTitle: string;
  data: JobScopedResultsData;
  filters: JobScopedFilterValues;
};

export function JobScopedResults({
  jobId,
  jobTitle,
  data,
  filters,
}: JobScopedResultsProps) {
  const titleLang = sourceLang(jobTitle);
  const languageApplied = filters.languages.length > 0;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="font-heading text-title font-semibold">Find candidates</h1>
        <p className="text-body text-muted-foreground">
          Filter the talent database for this job.{" "}
          <Link
            href={`/jobs/${jobId}`}
            lang={titleLang === "zh-Hans" ? "zh-Hans" : undefined}
            className="font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Back to {jobTitle}
          </Link>
        </p>
      </header>

      <Card as="form" method="GET" action="/search">
        <input type="hidden" name="jobId" value={jobId} />
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField
            id="job-scoped-skills"
            name="skills"
            label="Skills"
            defaultValue={joinList(filters.skills)}
          />
          <FilterField
            id="job-scoped-min-years"
            name="minYears"
            label="Minimum years"
            type="number"
            min="0"
            defaultValue={nullableNumber(filters.minYears)}
          />
          <FilterField
            id="job-scoped-max-years"
            name="maxYears"
            label="Maximum years"
            type="number"
            min="0"
            defaultValue={nullableNumber(filters.maxYears)}
          />
          <FilterField
            id="job-scoped-locations"
            name="locations"
            label="Location"
            defaultValue={joinList(filters.locations)}
          />
          <FilterField
            id="job-scoped-languages"
            name="languages"
            label="Language"
            defaultValue={joinList(filters.languages)}
          />
          <FilterField
            id="job-scoped-cv-date"
            name="cvUpdatedAfter"
            label="CV updated after"
            type="date"
            defaultValue={dateInputValue(filters.cvUpdatedAfter)}
          />
        </div>
        <div>
          <Button type="submit">Apply filters</Button>
        </div>
        {languageApplied ? (
          <p className="text-caption text-muted-foreground">
            Language is in this search because you asked for it. On a job it
            counts only when you mark it as a real requirement and write why.
          </p>
        ) : null}
      </Card>

      {data.status === "not_ready" ? (
        <p className="text-body text-muted-foreground">
          This job has no saved version yet, so there is nothing to browse.
        </p>
      ) : (
        <ResultsList results={data.results} />
      )}
    </section>
  );
}

function ResultsList({ results }: { results: JobScopedResult[] }) {
  if (results.length === 0) {
    return (
      <Card className="p-0 lg:p-0">
        <EmptyState title="No candidates match these filters yet." />
      </Card>
    );
  }

  return (
    <Card as="section" aria-labelledby="job-scoped-results-heading" className="gap-3">
      <CardTitle id="job-scoped-results-heading">Candidates</CardTitle>
      <ul className="flex min-w-0 flex-col">
        {results.map((result) => (
          <ResultCard key={result.candidateId} result={result} />
        ))}
      </ul>
    </Card>
  );
}

function ResultCard({ result }: { result: JobScopedResult }) {
  const headingId = `job-scoped-${result.candidateId}`;
  const nameLang = sourceLang(result.fullName);
  const summary = roleSummary(result);
  const summaryLang = sourceLang(summary);

  return (
    <li className="-mx-2 rounded-md border-b border-border/20 px-2 py-3 transition-colors last:border-b-0 hover:bg-muted/50">
      <article
        aria-labelledby={headingId}
        className="flex min-w-0 flex-col gap-1"
      >
        <h3
          id={headingId}
          className="min-w-0 text-label font-semibold text-foreground break-words"
          lang={nameLang === "zh-Hans" ? "zh-Hans" : undefined}
        >
          <Link
            href={`/candidates/${result.candidateId}`}
            className="rounded-sm text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {result.fullName}
          </Link>
        </h3>
        <p
          className="text-body text-muted-foreground break-words"
          lang={summaryLang === "zh-Hans" ? "zh-Hans" : undefined}
        >
          {summary}
        </p>
      </article>
    </li>
  );
}

function FilterField({
  id,
  name,
  label,
  type = "text",
  min,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  type?: "text" | "number" | "date";
  min?: string;
  defaultValue: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        min={min}
        defaultValue={defaultValue}
        autoComplete="off"
      />
    </div>
  );
}

function roleSummary(result: JobScopedResult): string {
  const parts: string[] = [];
  if (result.headline && result.headline.trim().length > 0) {
    parts.push(result.headline.trim());
  }
  parts.push(
    result.totalYears === 1 ? "1 year" : `${result.totalYears} years`,
  );
  if (result.location && result.location.trim().length > 0) {
    parts.push(result.location.trim());
  }
  return parts.join(" · ");
}

function sourceLang(text: string): "en" | "zh-Hans" {
  return CJK_CHAR.test(text) ? "zh-Hans" : "en";
}

function joinList(values: string[]): string {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(", ");
}

function nullableNumber(value: number | null): string {
  return value == null ? "" : String(value);
}

function dateInputValue(iso: string | null): string {
  if (iso == null || iso.trim() === "") {
    return "";
  }
  return iso.slice(0, 10);
}
