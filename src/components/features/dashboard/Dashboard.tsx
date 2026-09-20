"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";

import { DelayStatusBadge } from "@/components/patterns/DelayStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead } from "@/components/ui/table";
import type { DashboardData, FilterOptions } from "@/server/dashboard/data";
import { FilterBar } from "./FilterBar";
import { SelectionBar, type SelectableEntry } from "./SelectionBar";

export function Dashboard({
  data,
  filterOptions,
}: {
  data: DashboardData;
  filterOptions: FilterOptions;
}) {
  const [selected, setSelected] = useState<Map<string, SelectableEntry>>(
    () => new Map(),
  );

  function toggle(entry: SelectableEntry) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(entry.pipelineEntryId)) {
        next.delete(entry.pipelineEntryId);
      } else {
        next.set(entry.pipelineEntryId, entry);
      }
      return next;
    });
  }

  const isEmpty =
    data.overdue.length === 0 &&
    data.dueSoon.length === 0 &&
    data.guarantee.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <FilterBar options={filterOptions} />

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border/20 bg-card p-10 text-center shadow-sm">
          <span className="flex size-12 items-center justify-center rounded-full bg-status-on-track" aria-hidden="true">
            <CircleCheck className="size-6 text-status-on-track-foreground" />
          </span>
          <p className="text-body text-muted-foreground">
            No one is overdue, due soon or ending guarantee right now.
          </p>
        </div>
      ) : (
        <>
          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-6">
              <OverdueSection
                rows={data.overdue}
                selected={selected}
                onToggle={toggle}
              />
              <DueSoonSection
                rows={data.dueSoon}
                selected={selected}
                onToggle={toggle}
              />
              <GuaranteeSection rows={data.guarantee} />
            </div>
            <SelectionBar
              selected={[...selected.values()]}
              onClear={() => setSelected(new Map())}
            />
          </div>
        </>
      )}
    </div>
  );
}

function OverdueSection({
  rows,
  selected,
  onToggle,
}: {
  rows: DashboardData["overdue"];
  selected: Map<string, SelectableEntry>;
  onToggle: (entry: SelectableEntry) => void;
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="overdue-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="overdue-heading" className="font-heading text-heading font-semibold tracking-tight">
        Overdue · ordered by days over
      </h2>
      <Table>
        <caption className="sr-only">
          Overdue candidates, most overdue first, with who the delay is waiting on.
        </caption>
        <TableHead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Job</th>
            <th scope="col">Stage</th>
            <th scope="col">Status</th>
            <th scope="col">Waiting on</th>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <tr
              key={row.pipelineEntryId}
              data-selected={selected.has(row.pipelineEntryId) || undefined}
              className="data-[selected]:bg-accent/60"
            >
              <SelectCell
                row={row}
                selected={selected.has(row.pipelineEntryId)}
                onToggle={onToggle}
              />
              <td>{row.candidateName}</td>
              <td>
                {row.jobTitle} · {row.clientName}
              </td>
              <td>{row.stage}</td>
              <td>
                <DelayStatusBadge status="overdue" daysOverdue={row.daysOver} />
              </td>
              <td>{row.waitingOn}</td>
            </tr>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function DueSoonSection({
  rows,
  selected,
  onToggle,
}: {
  rows: DashboardData["dueSoon"];
  selected: Map<string, SelectableEntry>;
  onToggle: (entry: SelectableEntry) => void;
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="due-soon-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="due-soon-heading" className="font-heading text-heading font-semibold tracking-tight">
        Due soon · 80% of the stage limit used
      </h2>
      <Table>
        <caption className="sr-only">
          Candidates approaching their stage limit, soonest first.
        </caption>
        <TableHead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Job</th>
            <th scope="col">Stage</th>
            <th scope="col">Status</th>
            <th scope="col">Working days used</th>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <tr
              key={row.pipelineEntryId}
              data-selected={selected.has(row.pipelineEntryId) || undefined}
              className="data-[selected]:bg-accent/60"
            >
              <SelectCell
                row={row}
                selected={selected.has(row.pipelineEntryId)}
                onToggle={onToggle}
              />
              <td>{row.candidateName}</td>
              <td>
                {row.jobTitle} · {row.clientName}
              </td>
              <td>{row.stage}</td>
              <td>
                <DelayStatusBadge status="due-soon" />
              </td>
              <td className="font-mono tabular-nums">
                {row.workingDaysUsed} of {row.limitDays} days
              </td>
            </tr>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function GuaranteeSection({ rows }: { rows: DashboardData["guarantee"] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="guarantee-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="guarantee-heading" className="font-heading text-heading font-semibold tracking-tight">
        Guarantee ending
      </h2>
      <Table>
        <caption className="sr-only">
          Placements whose replacement guarantee is ending soon or has ended.
        </caption>
        <TableHead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Job</th>
            <th scope="col">Guarantee</th>
            <th scope="col">Ends</th>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <tr key={row.placementId}>
              <td>{row.candidateName}</td>
              <td>
                {row.jobTitle} · {row.clientName}
              </td>
              <td>
                <Badge tone={row.flag === "ended" ? "ended" : "due-soon"}>
                  {row.flag === "ended" ? "Guarantee ended" : "Guarantee ending soon"}
                </Badge>
              </td>
              <td className="font-mono tabular-nums">{row.guaranteeEndDate}</td>
            </tr>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

/** One checkbox per row. The label names the candidate, so the control is not "select" alone. */
function SelectCell({
  row,
  selected,
  onToggle,
}: {
  row: { pipelineEntryId: string; stage: string; candidateName: string };
  selected: boolean;
  onToggle: (entry: SelectableEntry) => void;
}) {
  return (
    <td className="w-10">
      <input
        type="checkbox"
        checked={selected}
        aria-label={`Select ${row.candidateName}`}
        onChange={() =>
          onToggle({
            pipelineEntryId: row.pipelineEntryId,
            stage: row.stage,
            candidateName: row.candidateName,
          })
        }
        className="size-4 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </td>
  );
}
