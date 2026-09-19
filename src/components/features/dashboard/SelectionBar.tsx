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
 * Appears only once something is selected. It states what a bulk move would
 * do — how many go to each stage, and how many cannot move — before the
 * recruiter types a name to record it.
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

  if (selected.length === 0) {
    return null;
  }

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
    <div className="sticky bottom-4 z-30 mt-2 flex min-w-0 flex-col gap-3 rounded-lg border border-border/20 bg-card p-4 shadow-md lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-label font-semibold">
          {selected.length === 1
            ? "1 candidate selected"
            : `${selected.length} candidates selected`}
        </p>
        <p className="text-caption text-muted-foreground">
          {plan.summary.length > 0
            ? plan.summary
                .map(({ toStage, count }) => `${count} to ${toStage}`)
                .join(" · ")
            : "None of these can advance."}
          {plan.blocked.length > 0
            ? ` · ${plan.blocked.length} cannot move (${plan.blocked[0].reason.toLowerCase()})`
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        <Button variant="ghost" onClick={onClear} disabled={pending}>
          Clear
        </Button>
        <Button
          onClick={requestRun}
          disabled={pending || plan.movable.length === 0}
          aria-busy={pending}
        >
          Move each to next stage
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-center gap-2 text-label text-destructive lg:order-last lg:w-full"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {outcome ? (
        <p className="text-caption text-muted-foreground lg:order-last lg:w-full">
          {outcome}
        </p>
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
    </div>
  );
}
