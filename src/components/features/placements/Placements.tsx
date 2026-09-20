"use client";

import { useId, useState, useTransition } from "react";

import { savePlacementAction } from "@/app/placements/actions";
import { TypedNameDialog } from "@/components/patterns/TypedNameDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Table, TableBody, TableHead } from "@/components/ui/table";
import {
  getStoredRecruiterName,
  setStoredRecruiterName,
} from "@/lib/recruiter-name";
import type { PlacementListItem } from "@/server/placements/list";

function todaySgtDateInput(): string {
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  return new Date(Date.now() + SGT_OFFSET_MS).toISOString().slice(0, 10);
}

function flagText(startDate: string | null, flag: string | null): string | null {
  if (startDate === null) {
    return "Waiting on start-date confirmation";
  }
  if (flag === "ending-soon") {
    return "Guarantee ending soon";
  }
  if (flag === "ended") {
    return "Guarantee period has ended";
  }
  return null;
}

export function Placements({ items }: { items: PlacementListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        No placements yet — nothing to follow up on.
      </p>
    );
  }

  return (
    <Table>
      <caption className="sr-only">
        Placements with start date, client, job, guarantee countdown and
        the 5-working-day-before-end flag.
      </caption>
      <TableHead>
        <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Job</th>
            <th scope="col">Client</th>
            <th scope="col">Start date</th>
            <th scope="col">Guarantee</th>
            <th scope="col">Flag</th>
        </tr>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <PlacementRow key={item.pipelineEntryId} item={item} />
        ))}
      </TableBody>
    </Table>
  );
}

function PlacementRow({ item }: { item: PlacementListItem }) {
  const [startDate, setStartDate] = useState(
    item.startDate ?? todaySgtDateInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedStartDate, setSavedStartDate] = useState(item.startDate);
  const [savedDaysUsed, setSavedDaysUsed] = useState(item.daysUsed);
  const [savedPeriod, setSavedPeriod] = useState(item.guaranteePeriodDays);
  const [savedFlag, setSavedFlag] = useState(item.flag);
  const inputId = useId();

  const flag = flagText(savedStartDate, savedFlag);
  const isDueSoon = savedFlag === "ending-soon" && savedStartDate !== null;
  const isEnded = savedFlag === "ended" && savedStartDate !== null;

  function performSave(typedName: string) {
    startTransition(async () => {
      const result = await savePlacementAction(
        item.pipelineEntryId,
        startDate,
        typedName,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setSavedStartDate(result.placement.startDate);
      setSavedPeriod(result.placement.guaranteePeriodDays);
      setSavedFlag(result.placement.flag);
      const daysUsed = Math.max(
        0,
        Math.round(
          (Date.now() -
            new Date(`${result.placement.startDate}T00:00:00Z`).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );
      setSavedDaysUsed(Math.min(daysUsed, result.placement.guaranteePeriodDays));
    });
  }

  function requestSave() {
    setError(null);
    const stored = getStoredRecruiterName();
    if (stored === null) {
      setNameDialogOpen(true);
      return;
    }
    performSave(stored);
  }

  return (
    <tr>
      <td className="align-top">{item.candidateName}</td>
      <td className="align-top">{item.jobTitle}</td>
      <td className="align-top">{item.clientName}</td>
      <td className="align-top">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor={`${inputId}-date`} className="sr-only">
            Start date for {item.candidateName}
          </label>
          <Input
            id={`${inputId}-date`}
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="sm:w-44"
            disabled={isPending}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={requestSave}
            disabled={isPending}
          >
            {savedStartDate === null ? "Confirm" : "Update"}
          </Button>
        </div>
        {savedStartDate === null && (
          <p className="mt-1 text-caption text-muted-foreground">
            Start date not confirmed
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-caption text-destructive">
            {error}
          </p>
        )}
      </td>
      <td className="align-top font-mono tabular-nums text-muted-foreground">
        {savedStartDate !== null && savedPeriod !== null
          ? `Guarantee: ${savedDaysUsed ?? 0} of ${savedPeriod} days used`
          : "—"}
      </td>
      <td className="align-top">
        {flag ? (
          <Badge
            tone={isDueSoon ? "due-soon" : isEnded ? "ended" : "neutral"}
          >
            {flag}
          </Badge>
        ) : null}
      </td>
      <TypedNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        onSubmit={(name) => {
          setStoredRecruiterName(name);
          setNameDialogOpen(false);
          performSave(name);
        }}
      />
    </tr>
  );
}
