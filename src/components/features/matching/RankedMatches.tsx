"use client";

import { useId, useMemo, useState, useTransition } from "react";

import { addCandidateToPipeline } from "@/app/jobs/[id]/pipeline-add-actions";
import { AiSuggestion } from "@/components/patterns/AiSuggestion";
import { SourceQuote } from "@/components/patterns/SourceQuote";
import { TypedNameDialog } from "@/components/patterns/TypedNameDialog";
import { Button } from "@/components/ui/button";
import {
  getStoredRecruiterName,
  setStoredRecruiterName,
} from "@/lib/recruiter-name";
import { cn } from "@/lib/utils";

const CJK_CHAR = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const inputClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-label text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

export type RankedMatchSkillEvidence = {
  requirement_id: string;
  source_text: string;
  note: string;
};

export type RankedMatchCurrent = {
  status: "current";
  candidateId: string;
  candidateName: string;
  jobVersionId: string;
  score: number;
  matched: RankedMatchSkillEvidence[];
  missing: RankedMatchSkillEvidence[];
  uncertain: RankedMatchSkillEvidence[];
  modelVersion: string;
  createdAt: string;
};

export type RankedMatchStale = {
  status: "stale";
  candidateId: string;
  candidateName: string;
  jobVersionId: string;
  matched: RankedMatchSkillEvidence[];
  missing: RankedMatchSkillEvidence[];
  uncertain: RankedMatchSkillEvidence[];
  storedModelVersion: string;
  storedCreatedAt: string;
};

export type RankedMatch = RankedMatchCurrent | RankedMatchStale;

export type RankedMatchesData =
  | { status: "not_scored" }
  | { status: "ready"; matches: RankedMatch[] };

type SortKey = "score-desc" | "score-asc" | "name";

type RankedMatchesProps = {
  jobId: string;
  data: RankedMatchesData;
  isRescoring?: boolean;
};

export function RankedMatches({
  jobId,
  data,
  isRescoring = false,
}: RankedMatchesProps) {
  const filterId = useId();
  const sortId = useId();
  const missingId = useId();
  const [sort, setSort] = useState<SortKey>("score-desc");
  const [nameQuery, setNameQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [addedIds, setAddedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const visibleMatches = useMemo(() => {
    if (data.status !== "ready") {
      return [];
    }
    return filterAndSortMatches(data.matches, {
      nameQuery,
      onlyMissing,
      sort,
    });
  }, [data, nameQuery, onlyMissing, sort]);

  function performAdd(candidateId: string, typedName: string) {
    startTransition(async () => {
      const result = await addCandidateToPipeline(
        jobId,
        candidateId,
        typedName,
      );
      if (!result.ok) {
        setRowError(candidateId, result.error);
        return;
      }
      setAddedIds((current) => new Set(current).add(candidateId));
      clearRowError(candidateId);
    });
  }

  function setRowError(candidateId: string, error: string) {
    setRowErrors((current) => ({ ...current, [candidateId]: error }));
  }

  function clearRowError(candidateId: string) {
    setRowErrors((current) => {
      if (!(candidateId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
  }

  function requestAdd(candidateId: string) {
    clearRowError(candidateId);
    const stored = getStoredRecruiterName();
    if (stored === null) {
      setPendingCandidateId(candidateId);
      setNameDialogOpen(true);
      return;
    }
    performAdd(candidateId, stored);
  }

  return (
    <section
      aria-labelledby="ranked-matches-heading"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="ranked-matches-heading"
        className="font-heading text-heading font-semibold"
      >
        Ranked matches
      </h2>
      {data.status === "not_scored" ? (
        <p className="text-body text-muted-foreground">
          {isRescoring
            ? "Recalculating scores — check back shortly. Matching is not blocked while this runs."
            : "No match scores yet for this job."}
        </p>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <label htmlFor={filterId} className="text-label font-semibold">
                Filter by name
              </label>
              <input
                id={filterId}
                type="search"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor={sortId} className="text-label font-semibold">
                Sort matches
              </label>
              <select
                id={sortId}
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className={inputClassName}
              >
                <option value="score-desc">Highest score</option>
                <option value="score-asc">Lowest score</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-label">
              <input
                id={missingId}
                type="checkbox"
                checked={onlyMissing}
                onChange={(event) => setOnlyMissing(event.target.checked)}
                className="size-4"
              />
              Has missing skills
            </label>
          </div>
          {visibleMatches.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No candidates match this filter.
            </p>
          ) : (
            <ul className="flex min-w-0 flex-col">
              {visibleMatches.map((match) => (
                <MatchCard
                  key={match.candidateId}
                  match={match}
                  added={addedIds.has(match.candidateId)}
                  error={rowErrors[match.candidateId] ?? null}
                  pending={pending}
                  onAdd={() => requestAdd(match.candidateId)}
                />
              ))}
            </ul>
          )}
        </>
      )}
      <TypedNameDialog
        open={nameDialogOpen}
        onOpenChange={(open) => {
          setNameDialogOpen(open);
          if (!open) {
            setPendingCandidateId(null);
          }
        }}
        onSubmit={(name) => {
          setStoredRecruiterName(name);
          setNameDialogOpen(false);
          if (pendingCandidateId === null) {
            return;
          }
          const candidateId = pendingCandidateId;
          setPendingCandidateId(null);
          performAdd(candidateId, name);
        }}
      />
    </section>
  );
}

function MatchCard({
  match,
  added,
  error,
  pending,
  onAdd,
}: {
  match: RankedMatch;
  added: boolean;
  error: string | null;
  pending: boolean;
  onAdd: () => void;
}) {
  const headingId = useId();
  const nameLang = sourceLang(match.candidateName);
  const isStale = match.status === "stale";

  return (
    <li className="border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0">
      <article
        aria-labelledby={headingId}
        className={cn(
          "flex min-w-0 flex-col gap-3",
          isStale && "text-muted-foreground",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <h3
            id={headingId}
            className="min-w-0 text-label font-semibold text-foreground break-words"
            lang={nameLang === "zh-Hans" ? "zh-Hans" : undefined}
          >
            {match.candidateName}
          </h3>
          {added ? (
            <p aria-live="polite" className="text-label text-foreground">
              Added
            </p>
          ) : (
            <Button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={onAdd}
            >
              Add to pipeline
            </Button>
          )}
        </div>
        {match.status === "current" ? (
          <AiSuggestion
            variant="score"
            modelVersion={match.modelVersion}
            generatedAt={match.createdAt}
          >
            <span className="font-mono tabular-nums">Match {match.score}</span>
          </AiSuggestion>
        ) : (
          <p className="text-caption">Score outdated, recalculating</p>
        )}
        <SkillGroup heading="Matched" items={match.matched} />
        <SkillGroup heading="Missing" items={match.missing} />
        <SkillGroup heading="Uncertain" items={match.uncertain} />
        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-caption text-destructive"
          >
            {error}
          </p>
        ) : null}
      </article>
    </li>
  );
}

function SkillGroup({
  heading,
  items,
}: {
  heading: string;
  items: RankedMatchSkillEvidence[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h4 className="text-label font-semibold text-foreground">{heading}</h4>
      <ul className="flex min-w-0 flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={`${item.requirement_id}-${index}`}
            className="flex min-w-0 flex-col gap-1"
          >
            {item.note ? (
              <p
                className="text-body break-words"
                lang={
                  sourceLang(item.note) === "zh-Hans" ? "zh-Hans" : undefined
                }
              >
                {item.note}
              </p>
            ) : null}
            {item.source_text ? (
              <SourceQuote
                text={item.source_text}
                lang={sourceLang(item.source_text)}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function filterAndSortMatches(
  matches: RankedMatch[],
  options: { nameQuery: string; onlyMissing: boolean; sort: SortKey },
): RankedMatch[] {
  const query = options.nameQuery.trim().toLowerCase();
  const filtered = matches.filter((match) => {
    if (query.length > 0 && !match.candidateName.toLowerCase().includes(query)) {
      return false;
    }
    if (options.onlyMissing && match.missing.length === 0) {
      return false;
    }
    return true;
  });

  const current = filtered.filter(
    (match): match is RankedMatchCurrent => match.status === "current",
  );
  const stale = filtered.filter(
    (match): match is RankedMatchStale => match.status === "stale",
  );

  if (options.sort === "score-asc") {
    current.sort((a, b) => a.score - b.score);
  } else if (options.sort === "name") {
    current.sort(compareNames);
    stale.sort(compareNames);
  } else {
    current.sort((a, b) => b.score - a.score);
  }

  return [...current, ...stale];
}

function compareNames(a: RankedMatch, b: RankedMatch): number {
  return a.candidateName.localeCompare(b.candidateName, "en-SG", {
    sensitivity: "base",
  });
}

function sourceLang(text: string): "en" | "zh-Hans" {
  return CJK_CHAR.test(text) ? "zh-Hans" : "en";
}
