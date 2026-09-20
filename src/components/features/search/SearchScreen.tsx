"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { search, type SearchFilters, type SearchHit } from "@/app/search/actions";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from "@/components/patterns/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/field";
import { Table, TableBody, TableHead } from "@/components/ui/table";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const sgtDateFormatter = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Singapore",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-SG", {
  numeric: "always",
});

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; results: SearchHit[]; filters: SearchFilters }
  | { kind: "error"; message: string };

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState("");
  const [minYears, setMinYears] = useState("");
  const [maxYears, setMaxYears] = useState("");
  const [locations, setLocations] = useState("");
  const [languages, setLanguages] = useState("");
  const [cvUpdatedAfter, setCvUpdatedAfter] = useState("");
  const [view, setView] = useState<ViewState>({ kind: "idle" });

  const formFilters: SearchFilters = {
    skills: parseCommaList(skills),
    minYears: parseOptionalNumber(minYears),
    maxYears: parseOptionalNumber(maxYears),
    locations: parseCommaList(locations),
    languages: parseCommaList(languages),
    cvUpdatedAfter: cvUpdatedAfter.trim() === "" ? null : cvUpdatedAfter,
  };

  async function runQuery() {
    setView({ kind: "loading" });
    try {
      const result = await search(query, formFilters);
      if (result.status === "ok") {
        setView({
          kind: "ok",
          results: result.results,
          filters: result.filters,
        });
        return;
      }
      setView({ kind: "error", message: result.message });
    } catch {
      setView({ kind: "error", message: "Search failed. Try again." });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery();
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

      <Card as="form" onSubmit={handleSubmit}>
        <div className="flex min-w-0 flex-col gap-2">
          <FieldLabel htmlFor="candidate-search">Keyword</FieldLabel>
          <Input
            id="candidate-search"
            name="query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Skills, titles, employers"
            disabled={view.kind === "loading"}
            autoComplete="off"
          />
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterInput
            id="search-skills"
            label="Skills"
            value={skills}
            disabled={view.kind === "loading"}
            onChange={setSkills}
          />
          <FilterInput
            id="search-min-years"
            label="Minimum years"
            type="number"
            value={minYears}
            disabled={view.kind === "loading"}
            onChange={setMinYears}
          />
          <FilterInput
            id="search-max-years"
            label="Maximum years"
            type="number"
            value={maxYears}
            disabled={view.kind === "loading"}
            onChange={setMaxYears}
          />
          <FilterInput
            id="search-locations"
            label="Location"
            value={locations}
            disabled={view.kind === "loading"}
            onChange={setLocations}
          />
          <FilterInput
            id="search-languages"
            label="Language"
            value={languages}
            disabled={view.kind === "loading"}
            onChange={setLanguages}
          />
          <FilterInput
            id="search-cv-date"
            label="CV updated after"
            type="date"
            value={cvUpdatedAfter}
            disabled={view.kind === "loading"}
            onChange={setCvUpdatedAfter}
          />
        </div>
        <div>
          <Button type="submit" disabled={view.kind === "loading"}>
            Search
          </Button>
        </div>
        {formFilters.languages.length > 0 ? (
          <p className="text-caption text-muted-foreground">
            Language is in this search because you asked for it. On a job it
            counts only when you mark it as a real requirement and write why.
          </p>
        ) : null}
      </Card>

      <div aria-live="polite" aria-busy={view.kind === "loading"}>
        <SearchOutcome view={view} onRetry={() => void runQuery()} />
      </div>
    </section>
  );
}

function FilterInput({
  id,
  label,
  value,
  type = "text",
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: "text" | "number" | "date";
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        disabled={disabled}
        autoComplete="off"
        min={type === "number" ? "0" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
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
      <Card className="p-0 lg:p-0">
        <EmptyState title="No candidates match these filters yet." />
      </Card>
    );
  }

  return (
    <Table>
      <caption className="sr-only">
        Matching candidates with role, experience, location, and when each
        CV was last updated. Review only — nothing is shortlisted from this
        list.
      </caption>
      <TableHead>
        <tr>
          <th scope="col">Candidate</th>
          <th scope="col">Role, experience, location</th>
          <th scope="col">CV last updated</th>
        </tr>
      </TableHead>
      <TableBody>
        {view.results.map((hit) => (
          <ResultRow key={hit.candidateId} hit={hit} />
        ))}
      </TableBody>
    </Table>
  );
}

function ResultRow({ hit }: { hit: SearchHit }) {
  const nameLang = CJK_CHAR.test(hit.fullName) ? "zh-Hans" : undefined;
  const summaryLang = CJK_CHAR.test(roleSummary(hit)) ? "zh-Hans" : undefined;

  return (
    <tr>
      <th scope="row" className="text-left font-semibold">
        <Link
          href={`/candidates/${hit.candidateId}`}
          lang={nameLang}
          className="rounded-sm text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {hit.fullName}
        </Link>
      </th>
      <td className="text-muted-foreground" lang={summaryLang}>
        {roleSummary(hit)}
      </td>
      <td>
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

function roleSummary(hit: SearchHit): string {
  const parts: string[] = [];
  if (hit.headline && hit.headline.trim().length > 0) {
    parts.push(hit.headline.trim());
  }
  parts.push(hit.totalYears === 1 ? "1 year" : `${hit.totalYears} years`);
  if (hit.location && hit.location.trim().length > 0) {
    parts.push(hit.location.trim());
  }
  return parts.join(" · ");
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
