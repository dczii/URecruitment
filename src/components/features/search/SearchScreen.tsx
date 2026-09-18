"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { AiSuggestion } from "@/components/patterns/AiSuggestion";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from "@/components/patterns/states";
import { Button } from "@/components/ui/button";
import { AI_FAILED_MESSAGE, aiFailureMessage } from "@/lib/ai-routes";
import { cn } from "@/lib/utils";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const PLACEHOLDER =
  "ZH-speaking QA engineers in Singapore, 3+ years, CV updated this year";

const sgtDateFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Singapore",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-SG", {
  numeric: "always",
});

const ignoredTermSchema = z.object({
  term: z.string(),
  reason: z.string(),
});

const searchFiltersSchema = z.object({
  skills: z.array(z.string()),
  minYears: z.number().nullable(),
  maxYears: z.number().nullable(),
  locations: z.array(z.string()),
  languages: z.array(z.string()),
  cvUpdatedAfter: z.string().nullable(),
});

const searchHitSchema = z.object({
  candidateId: z.string(),
  fullName: z.string(),
  headline: z.string().nullable(),
  totalYears: z.number(),
  location: z.string().nullable(),
  languages: z.array(z.string()),
  cvUpdatedAt: z.string().nullable(),
});

const searchResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    results: z.array(searchHitSchema),
    ignoredTerms: z.array(ignoredTermSchema),
    filters: searchFiltersSchema,
  }),
  z.object({ status: z.literal("could_not_understand") }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

type SearchResponse = z.infer<typeof searchResponseSchema>;
type SearchFilters = z.infer<typeof searchFiltersSchema>;
type SearchHit = z.infer<typeof searchHitSchema>;
type IgnoredTerm = z.infer<typeof ignoredTermSchema>;

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; results: SearchHit[]; filters: SearchFilters; ignoredTerms: IgnoredTerm[] }
  | { kind: "could_not_understand" }
  | { kind: "error"; message: string };

const EMPTY_FILTERS: SearchFilters = {
  skills: [],
  minYears: null,
  maxYears: null,
  locations: [],
  languages: [],
  cvUpdatedAfter: null,
};

const inputClassName =
  "min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-label text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewState>({ kind: "idle" });

  const displayedFilters =
    view.kind === "ok" ? view.filters : EMPTY_FILTERS;
  const ignoredTerms = view.kind === "ok" ? view.ignoredTerms : [];
  const languageApplied = displayedFilters.languages.length > 0;

  async function runQuery(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (trimmed === "") {
      setView({ kind: "error", message: "Enter a search query." });
      return;
    }

    setView({ kind: "loading" });
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      const statusMessage = aiFailureMessage(response.status);
      if (statusMessage) {
        setView({
          kind: "error",
          message:
            response.status === 429
              ? statusMessage
              : "Search failed. Try again.",
        });
        return;
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        setView({ kind: "error", message: "Search failed. Try again." });
        return;
      }

      const parsed = searchResponseSchema.safeParse(json);
      if (!parsed.success) {
        setView({ kind: "error", message: AI_FAILED_MESSAGE });
        return;
      }

      setView(toViewState(parsed.data));
    } catch {
      setView({ kind: "error", message: "Search failed. Try again." });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery(query);
  }

  function retry() {
    void runQuery(query);
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="font-heading text-title font-semibold">Find candidates</h1>
        <p className="text-body text-muted-foreground">
          Search the talent database. Results are a list to review — nothing is
          shortlisted or contacted from here.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4"
      >
        <div className="flex min-w-0 flex-row items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="candidate-search" className="text-label text-foreground">
              Search candidates
            </label>
            <input
              id="candidate-search"
              name="query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={PLACEHOLDER}
              disabled={view.kind === "loading"}
              autoComplete="off"
              className={inputClassName}
            />
          </div>
          <Button type="submit" disabled={view.kind === "loading"}>
            Search
          </Button>
        </div>

        <FilterChips
          filters={displayedFilters}
          parsed={view.kind === "ok"}
        />

        {languageApplied ? (
          <p className="text-caption text-muted-foreground">
            Language is in this search because you asked for it. On a job it
            counts only when you mark it as a real requirement and write why.
          </p>
        ) : null}

        {ignoredTerms.length > 0 ? (
          <p
            role="status"
            className="inline-flex max-w-full flex-wrap rounded-md border border-border bg-muted px-3 py-2 text-caption text-muted-foreground"
          >
            <span className="font-semibold text-foreground">Ignored: </span>
            {formatIgnoredTerms(ignoredTerms)}
          </p>
        ) : null}
      </form>

      <div aria-live="polite" aria-busy={view.kind === "loading"}>
        <SearchOutcome view={view} onRetry={retry} />
      </div>
    </section>
  );
}

function FilterChips({
  filters,
  parsed,
}: {
  filters: SearchFilters;
  parsed: boolean;
}) {
  const chips = [
    { label: "Skills", value: joinList(filters.skills) },
    { label: "Years", value: formatYears(filters.minYears, filters.maxYears) },
    { label: "Location", value: joinList(filters.locations) },
    { label: "Language", value: joinList(filters.languages) },
    {
      label: "CV date",
      value: filters.cvUpdatedAfter
        ? `since ${formatSgtDate(filters.cvUpdatedAfter)}`
        : null,
    },
  ];

  const list = (
    <ul
      aria-label="Search filters"
      className="flex min-w-0 flex-wrap gap-2"
    >
      {chips.map((chip) => (
        <li
          key={chip.label}
          className={cn(
            "inline-flex max-w-full items-center rounded-md border border-border bg-secondary px-3 py-1 text-caption text-secondary-foreground",
            chip.value ? "font-semibold" : "text-muted-foreground",
          )}
        >
          {chip.value ? `${chip.label}: ${chip.value}` : chip.label}
        </li>
      ))}
    </ul>
  );

  if (!parsed) {
    return list;
  }

  return (
    <AiSuggestion variant="value">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-caption text-muted-foreground">
          Filters read from your search. They narrowed this result set; they
          are not editable on this screen.
        </p>
        {list}
      </div>
    </AiSuggestion>
  );
}

function SearchOutcome({
  view,
  onRetry,
}: {
  view: ViewState;
  onRetry: () => void;
}) {
  if (view.kind === "idle") {
    return null;
  }

  if (view.kind === "loading") {
    return (
      <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <p className="text-body text-muted-foreground">
          Searching the talent database…
        </p>
        <SkeletonRows count={4} />
      </div>
    );
  }

  if (view.kind === "could_not_understand") {
    return (
      <div className="rounded-lg border border-border bg-card">
        <ErrorState
          title="Couldn't understand that search"
          description="Try rephrasing. Mention skills, years, location, language, or how recently the CV was updated."
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="rounded-lg border border-border bg-card">
        <ErrorState
          title="Search failed. Try again."
          description={
            view.message === "Search failed. Try again."
              ? undefined
              : view.message
          }
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (view.results.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState title="No candidates match these filters yet." />
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full border-collapse text-label">
        <caption className="sr-only">
          Matching candidates with role, experience, location, and when each
          CV was last updated. Review only — nothing is shortlisted from this
          list.
        </caption>
        <thead>
          <tr className="border-b border-border text-caption text-muted-foreground">
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              Candidate
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              Role, experience, location
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              CV last updated
            </th>
          </tr>
        </thead>
        <tbody>
          {view.results.map((hit) => (
            <ResultRow key={hit.candidateId} hit={hit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultRow({ hit }: { hit: SearchHit }) {
  const nameLang = CJK_CHAR.test(hit.fullName) ? "zh-Hans" : undefined;
  const summaryLang = CJK_CHAR.test(roleSummary(hit)) ? "zh-Hans" : undefined;

  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="px-4 py-3 text-left font-semibold">
        <Link
          href={`/candidates/${hit.candidateId}`}
          lang={nameLang}
          className="text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {hit.fullName}
        </Link>
      </th>
      <td className="px-4 py-3 text-muted-foreground" lang={summaryLang}>
        {roleSummary(hit)}
      </td>
      <td className="px-4 py-3">
        <CvUpdatedDate iso={hit.cvUpdatedAt} />
      </td>
    </tr>
  );
}

function CvUpdatedDate({ iso }: { iso: string | null }) {
  if (iso == null || Number.isNaN(new Date(iso).getTime())) {
    return <span className="text-muted-foreground">No update date</span>;
  }

  const exact = formatSgtDate(iso);
  const relative = formatRelativeUpdated(iso);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <time dateTime={iso} title={exact}>
        {relative}
      </time>
      <span className="text-caption text-muted-foreground">{exact}</span>
    </div>
  );
}

function toViewState(result: SearchResponse): ViewState {
  if (result.status === "ok") {
    return {
      kind: "ok",
      results: result.results,
      filters: result.filters,
      ignoredTerms: result.ignoredTerms,
    };
  }
  if (result.status === "could_not_understand") {
    return { kind: "could_not_understand" };
  }
  return { kind: "error", message: result.message };
}

function roleSummary(hit: SearchHit): string {
  const parts: string[] = [];
  if (hit.headline && hit.headline.trim().length > 0) {
    parts.push(hit.headline.trim());
  }
  parts.push(formatExperience(hit.totalYears));
  if (hit.location && hit.location.trim().length > 0) {
    parts.push(hit.location.trim());
  }
  return parts.join(" · ");
}

function formatExperience(years: number): string {
  return years === 1 ? "1 year" : `${years} years`;
}

function joinList(values: string[]): string | null {
  const filled = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return filled.length > 0 ? filled.join(", ") : null;
}

function formatYears(min: number | null, max: number | null): string | null {
  if (min != null && max != null) {
    return `${min}–${max}`;
  }
  if (min != null) {
    return `${min}+`;
  }
  if (max != null) {
    return `under ${max}`;
  }
  return null;
}

function formatIgnoredTerms(terms: IgnoredTerm[]): string {
  return terms
    .map((term) => `${term.term} — ${term.reason}`)
    .join("; ");
}

function formatSgtDate(iso: string): string {
  return sgtDateFormatter.format(new Date(iso)).replace("Sept", "Sep");
}

function formatRelativeUpdated(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const diffMs = then.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (absMs < minute) {
    return "Updated just now";
  }

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (absMs < hour) {
    value = Math.round(diffMs / minute);
    unit = "minute";
  } else if (absMs < day) {
    value = Math.round(diffMs / hour);
    unit = "hour";
  } else if (absMs < month) {
    value = Math.round(diffMs / day);
    unit = "day";
  } else if (absMs < year) {
    value = Math.round(diffMs / month);
    unit = "month";
  } else {
    value = Math.round(diffMs / year);
    unit = "year";
  }

  return `Updated ${relativeTimeFormatter.format(value, unit)}`;
}
