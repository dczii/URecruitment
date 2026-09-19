import "server-only";

import { getDb } from "../db";
import { getFlaggedPlacements } from "../placements/guarantee";
import { getPipelineStatus } from "../pipeline/status";

export type DashboardFilters = {
  clientName?: string;
  jobTitle?: string;
  stage?: string;
  ownerName?: string;
};

export type OverdueRow = {
  pipelineEntryId: string;
  candidateName: string;
  jobTitle: string;
  clientName: string;
  stage: string;
  ownerName: string;
  daysOver: number;
  waitingOn: string;
};

export type DueSoonRow = {
  pipelineEntryId: string;
  candidateName: string;
  jobTitle: string;
  clientName: string;
  stage: string;
  ownerName: string;
  workingDaysUsed: number;
  limitDays: number;
};

export type GuaranteeRow = {
  placementId: string;
  candidateName: string;
  jobTitle: string;
  clientName: string;
  ownerName: string;
  guaranteeEndDate: string;
  flag: "ending-soon" | "ended";
};

export type DashboardData = {
  overdue: OverdueRow[];
  dueSoon: DueSoonRow[];
  guarantee: GuaranteeRow[];
};

export type FilterOptions = {
  clients: string[];
  jobs: string[];
  stages: string[];
  owners: string[];
};

type EntryContext = {
  candidateName: string;
  jobTitle: string;
  clientName: string;
  ownerName: string;
};

async function loadEntryContexts(
  entryIds: string[],
): Promise<Map<string, EntryContext>> {
  const db = getDb();
  const map = new Map<string, EntryContext>();
  if (entryIds.length === 0) {
    return map;
  }

  const { data: entries, error } = await db
    .from("pipeline_entries")
    .select(
      "id, owner_name, candidates(full_name), jobs(current_version_id, clients(name))",
    )
    .in("id", entryIds);

  if (error) {
    throw new Error(
      `Failed to load pipeline entry context for the dashboard: ${error.message}`,
    );
  }

  const rows = entries ?? [];
  const versionIds = [
    ...new Set(
      rows
        .map((row) => row.jobs?.current_version_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const { data: versions, error: versionsError } =
    versionIds.length > 0
      ? await db.from("job_versions").select("id, fields").in("id", versionIds)
      : { data: [] as { id: string; fields: unknown }[], error: null };

  if (versionsError) {
    throw new Error(
      `Failed to load job titles for the dashboard: ${versionsError.message}`,
    );
  }

  const titleByVersion = new Map(
    (versions ?? []).map((version) => [
      version.id,
      typeof (version.fields as { title?: unknown })?.title === "string"
        ? ((version.fields as { title: string }).title as string)
        : "Untitled job",
    ]),
  );

  for (const row of rows) {
    map.set(row.id, {
      candidateName: row.candidates?.full_name ?? "Unknown candidate",
      jobTitle: row.jobs?.current_version_id
        ? (titleByVersion.get(row.jobs.current_version_id) ?? "Untitled job")
        : "Untitled job",
      clientName: row.jobs?.clients?.name ?? "Unknown client",
      ownerName: row.owner_name,
    });
  }

  return map;
}

function matchesFilters(
  ctx: EntryContext,
  stage: string | undefined,
  filters: DashboardFilters,
): boolean {
  if (filters.clientName && ctx.clientName !== filters.clientName) {
    return false;
  }
  if (filters.jobTitle && ctx.jobTitle !== filters.jobTitle) {
    return false;
  }
  if (filters.ownerName && ctx.ownerName !== filters.ownerName) {
    return false;
  }
  if (filters.stage && stage !== filters.stage) {
    return false;
  }
  return true;
}

/**
 * Overdue, due-soon and guarantee-ending sections for the dashboard (#161).
 * Each section is independently filtered and sorted, per
 * design/specs/dashboard.md: overdue by days over descending, due-soon and
 * guarantee by soonest first.
 */
export async function getDashboardData(
  filters: DashboardFilters = {},
): Promise<DashboardData> {
  const [statusRows, flaggedPlacements] = await Promise.all([
    getPipelineStatus(),
    getFlaggedPlacements(),
  ]);

  const overdueSource = statusRows.filter((row) => row.status === "overdue");
  const dueSoonSource = statusRows.filter((row) => row.status === "due-soon");
  const endingSource = flaggedPlacements.filter(
    (row) => row.flag === "ending-soon" || row.flag === "ended",
  );

  const [statusContexts, placementEntryContexts] = await Promise.all([
    loadEntryContexts([
      ...new Set([...overdueSource, ...dueSoonSource].map((r) => r.pipelineEntryId)),
    ]),
    loadEntryContexts([
      ...new Set(endingSource.map((r) => r.pipelineEntryId)),
    ]),
  ]);

  const overdue: OverdueRow[] = overdueSource
    .filter((row) => {
      const ctx = statusContexts.get(row.pipelineEntryId);
      return ctx && matchesFilters(ctx, row.stage, filters);
    })
    .map((row) => {
      const ctx = statusContexts.get(row.pipelineEntryId)!;
      return {
        pipelineEntryId: row.pipelineEntryId,
        candidateName: ctx.candidateName,
        jobTitle: ctx.jobTitle,
        clientName: ctx.clientName,
        stage: row.stage,
        ownerName: ctx.ownerName,
        daysOver: row.daysOver,
        waitingOn: row.waitingOn,
      };
    })
    .sort((a, b) => b.daysOver - a.daysOver);

  const dueSoon: DueSoonRow[] = dueSoonSource
    .filter((row) => {
      const ctx = statusContexts.get(row.pipelineEntryId);
      return ctx && matchesFilters(ctx, row.stage, filters);
    })
    .map((row) => {
      const ctx = statusContexts.get(row.pipelineEntryId)!;
      return {
        pipelineEntryId: row.pipelineEntryId,
        candidateName: ctx.candidateName,
        jobTitle: ctx.jobTitle,
        clientName: ctx.clientName,
        stage: row.stage,
        ownerName: ctx.ownerName,
        workingDaysUsed: row.workingDaysUsed,
        limitDays: row.limitDays,
      };
    })
    .sort((a, b) => b.workingDaysUsed / b.limitDays - a.workingDaysUsed / a.limitDays);

  const guarantee: GuaranteeRow[] = endingSource
    .filter((row) => {
      const ctx = placementEntryContexts.get(row.pipelineEntryId);
      return ctx && matchesFilters(ctx, undefined, filters);
    })
    .map((row) => {
      const ctx = placementEntryContexts.get(row.pipelineEntryId)!;
      return {
        placementId: row.placementId,
        candidateName: ctx.candidateName,
        jobTitle: ctx.jobTitle,
        clientName: ctx.clientName,
        ownerName: ctx.ownerName,
        guaranteeEndDate: row.guaranteeEndDate,
        flag: row.flag as "ending-soon" | "ended",
      };
    })
    .sort((a, b) => a.guaranteeEndDate.localeCompare(b.guaranteeEndDate));

  return { overdue, dueSoon, guarantee };
}

/** Distinct client/job/stage/owner values across every open pipeline entry, for the filter chips. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const statusRows = await getPipelineStatus();
  const entryIds = [...new Set(statusRows.map((row) => row.pipelineEntryId))];
  const contexts = await loadEntryContexts(entryIds);

  const clients = new Set<string>();
  const jobs = new Set<string>();
  const owners = new Set<string>();
  const stages = new Set<string>();

  for (const row of statusRows) {
    const ctx = contexts.get(row.pipelineEntryId);
    if (!ctx) {
      continue;
    }
    clients.add(ctx.clientName);
    jobs.add(ctx.jobTitle);
    owners.add(ctx.ownerName);
    stages.add(row.stage);
  }

  return {
    clients: [...clients].sort(),
    jobs: [...jobs].sort(),
    stages: [...stages].sort(),
    owners: [...owners].sort(),
  };
}
