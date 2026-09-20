"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";

import { moveSelectedToNextStage } from "@/app/dashboard/actions";
import { TypedNameDialog } from "@/components/patterns/TypedNameDialog";
import { Button } from "@/components/ui/button";
import {
  getStoredRecruiterName,
  setStoredRecruiterName,
} from "@/lib/recruiter-name";
import { planStageAdvance } from "@/lib/stage-advance";

export type SelectableEntry = {
  pipelineEntryId: string;
  stage: string;
  candidateName: string;
};

/**
 * The dashboard's right-hand pane. It always occupies the column so the tables
 * do not reflow on selection, and it states what a bulk move would do — how
 * many go to each stage, and how many cannot move — before the recruiter types
 * a name to record it.
 */
export function SelectionBar({
  selected,
  onClear,
}: {
  selected: SelectableEntry[];
  onClear: () => void;
}) {
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const plan = planStageAdvance(selected);

  function run(name: string) {
    setError(null);
    setOutcome(null);
    startTransition(async () => {
      const result = await moveSelectedToNextStage(
        selected.map(({ pipelineEntryId, stage }) => ({
          pipelineEntryId,
          stage,
        })),
        name,
      );

      if (!result.ok) {
        setError(result.error ?? "The candidates could not be moved.");
        return;
      }

      const parts = [`${result.moved.length} moved`];
      if (result.blocked.length > 0) {
        parts.push(`${result.blocked.length} could not move`);
      }
      if (result.failed.length > 0) {
        parts.push(`${result.failed.length} failed`);
      }
      setOutcome(`${parts.join(", ")}. Recorded as ${name}.`);
      onClear();
    });
  }

  function requestRun() {
    const stored = getStoredRecruiterName();
    if (stored === null) {
      setNameDialogOpen(true);
      return;
    }
    run(stored);
  }

  return (
    <aside
      aria-label="Selection"
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-border/20 bg-card p-5 lg:sticky lg:top-24 lg:self-start"
    >
      {selected.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-label font-semibold">Nothing selected</p>
          <p className="text-caption text-muted-foreground">
            Tick candidates in the overdue or due-soon tables to move several of
            them in one action.
          </p>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-heading text-heading font-semibold">
              {selected.length === 1
                ? "1 candidate selected"
                : `${selected.length} selected`}
            </p>
            <p className="text-caption text-muted-foreground">
              One confirmation covers every row below. Nothing moves until you
              confirm.
            </p>
          </div>

          <ul className="flex min-w-0 flex-col gap-2">
            {plan.summary.map(({ toStage, count }) => (
              <li key={toStage} className="flex items-baseline gap-2 text-label">
                <span className="font-semibold tabular-nums">{count}</span>
                <span className="text-muted-foreground">to {toStage}</span>
              </li>
            ))}
            {plan.blocked.map((entry) => (
              <li
                key={entry.pipelineEntryId}
                className="flex items-baseline gap-2 text-label text-muted-foreground"
              >
                <span className="font-semibold tabular-nums">1</span>
                <span>cannot move — {entry.reason.toLowerCase()}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Button
              onClick={requestRun}
              disabled={pending || plan.movable.length === 0}
              aria-busy={pending}
            >
              Move each to next stage
            </Button>
            <Button variant="outline" onClick={onClear} disabled={pending}>
              Clear selection
            </Button>
          </div>
        </>
      )}

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-label text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {outcome ? (
        <p className="text-caption text-muted-foreground">{outcome}</p>
      ) : null}

      <TypedNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        onSubmit={(name) => {
          setStoredRecruiterName(name);
          setNameDialogOpen(false);
          run(name);
        }}
      />
    </aside>
  );
}
