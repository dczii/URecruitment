import { CircleCheck } from "lucide-react";

import { DelayStatusBadge } from "@/components/patterns/DelayStatusBadge";
import type { DashboardData, FilterOptions } from "@/server/dashboard/data";
import { FilterBar } from "./FilterBar";

const tableClassName =
  "overflow-x-auto rounded-md border border-border bg-card";

export function Dashboard({
  data,
  filterOptions,
}: {
  data: DashboardData;
  filterOptions: FilterOptions;
}) {
  const isEmpty =
    data.overdue.length === 0 &&
    data.dueSoon.length === 0 &&
    data.guarantee.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <FilterBar options={filterOptions} />

      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card p-8 text-center">
          <CircleCheck className="size-6 text-status-on-track-foreground" aria-hidden="true" />
          <p className="text-body text-muted-foreground">
            No one is overdue, due soon or ending guarantee right now.
          </p>
        </div>
      ) : (
        <>
          <OverdueSection rows={data.overdue} />
          <DueSoonSection rows={data.dueSoon} />
          <GuaranteeSection rows={data.guarantee} />
        </>
      )}
    </div>
  );
}

function OverdueSection({ rows }: { rows: DashboardData["overdue"] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="overdue-heading" className="flex flex-col gap-3">
      <h2 id="overdue-heading" className="font-heading text-heading font-semibold">
        Overdue · ordered by days over
      </h2>
      <div className={tableClassName}>
        <table className="w-full border-collapse text-label">
          <caption className="sr-only">
            Overdue candidates, most overdue first, with who the delay is waiting on.
          </caption>
          <thead>
            <tr className="border-b border-border text-caption text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-left font-semibold">Candidate</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Job</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Stage</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Waiting on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pipelineEntryId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{row.candidateName}</td>
                <td className="px-4 py-3">
                  {row.jobTitle} · {row.clientName}
                </td>
                <td className="px-4 py-3">{row.stage}</td>
                <td className="px-4 py-3">
                  <DelayStatusBadge status="overdue" daysOverdue={row.daysOver} />
                </td>
                <td className="px-4 py-3">{row.waitingOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DueSoonSection({ rows }: { rows: DashboardData["dueSoon"] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="due-soon-heading" className="flex flex-col gap-3">
      <h2 id="due-soon-heading" className="font-heading text-heading font-semibold">
        Due soon · 80% of the stage limit used
      </h2>
      <div className={tableClassName}>
        <table className="w-full border-collapse text-label">
          <caption className="sr-only">
            Candidates approaching their stage limit, soonest first.
          </caption>
          <thead>
            <tr className="border-b border-border text-caption text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-left font-semibold">Candidate</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Job</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Stage</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Working days used</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pipelineEntryId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{row.candidateName}</td>
                <td className="px-4 py-3">
                  {row.jobTitle} · {row.clientName}
                </td>
                <td className="px-4 py-3">{row.stage}</td>
                <td className="px-4 py-3">
                  <DelayStatusBadge status="due-soon" />
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">
                  {row.workingDaysUsed} of {row.limitDays} days
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GuaranteeSection({ rows }: { rows: DashboardData["guarantee"] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="guarantee-heading" className="flex flex-col gap-3">
      <h2 id="guarantee-heading" className="font-heading text-heading font-semibold">
        Guarantee ending
      </h2>
      <div className={tableClassName}>
        <table className="w-full border-collapse text-label">
          <caption className="sr-only">
            Placements whose replacement guarantee is ending soon or has ended.
          </caption>
          <thead>
            <tr className="border-b border-border text-caption text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-left font-semibold">Candidate</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Job</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Guarantee</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Ends</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.placementId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{row.candidateName}</td>
                <td className="px-4 py-3">
                  {row.jobTitle} · {row.clientName}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm bg-status-overdue px-2 py-1 text-label text-status-overdue-foreground">
                    {row.flag === "ended" ? "Guarantee ended" : "Guarantee ending soon"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">{row.guaranteeEndDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
