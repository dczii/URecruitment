import "server-only";

import type { Json } from "@/lib/database.types";
import { getDb } from "../db";
import { getFlaggedPlacements, type GuaranteeFlag } from "./guarantee";

export type PlacementListItem = {
  pipelineEntryId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  clientName: string;
  placementId: string | null;
  startDate: string | null;
  guaranteePeriodDays: number | null;
  guaranteeEndDate: string | null;
  daysUsed: number | null;
  flag: GuaranteeFlag | null;
};

type PlacementRow = {
  id: string;
  pipeline_entry_id: string;
  start_date: string;
  guarantee_period_days: number;
  guarantee_end_date: string;
};

type PlacementsClient = {
  from: (table: "placements") => {
    select: (columns: "*") => {
      in: (
        column: "pipeline_entry_id",
        values: string[],
      ) => Promise<{
        data: PlacementRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

/** SGT calendar date (YYYY-MM-DD) for "today", used for the guarantee flag and days-used math. */
function todaySgtDate(): string {
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  return new Date(Date.now() + SGT_OFFSET_MS).toISOString().slice(0, 10);
}

function calendarDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    ...(fromIso.split("-").map(Number) as [number, number, number]),
  );
  const to = Date.UTC(
    ...(toIso.split("-").map(Number) as [number, number, number]),
  );
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

/**
 * Every candidate whose current pipeline stage is Placed, with their
 * confirmed start date (if any), guarantee countdown, and the
 * ending-soon/ended flag. Ordered so flagged rows surface first, matching
 * #161's dashboard guarantee section shape.
 */
export async function listPlacements(): Promise<PlacementListItem[]> {
  const db = getDb();

  const { data: entries, error: entriesError } = await db
    .from("pipeline_entries")
    .select(
      "id, job_id, candidate_id, candidates(full_name), jobs(client_id, current_version_id, clients(name))",
    )
    .eq("stage", "Placed");

  if (entriesError) {
    throw new Error(
      `Failed to load placed pipeline entries: ${entriesError.message}`,
    );
  }

  const rows = entries ?? [];
  if (rows.length === 0) {
    return [];
  }

  const versionIds = [
    ...new Set(
      rows
        .map((row) => row.jobs?.current_version_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const entryIds = rows.map((row) => row.id);

  const [versionsResult, placementsResult, flaggedPlacements] =
    await Promise.all([
      versionIds.length > 0
        ? db.from("job_versions").select("id, fields").in("id", versionIds)
        : Promise.resolve({
            data: [] as { id: string; fields: Json }[],
            error: null,
          }),
      (db as unknown as PlacementsClient)
        .from("placements")
        .select("*")
        .in("pipeline_entry_id", entryIds),
      getFlaggedPlacements(),
    ]);

  if (versionsResult.error) {
    throw new Error(
      `Failed to load job titles for placements: ${versionsResult.error.message}`,
    );
  }
  if (placementsResult.error) {
    throw new Error(
      `Failed to load placement records: ${placementsResult.error.message}`,
    );
  }

  const flagByPlacementId = new Map(
    flaggedPlacements.map((flagged) => [flagged.placementId, flagged.flag]),
  );

  const titleByVersion = new Map(
    (versionsResult.data ?? []).map((version) => [
      version.id,
      typeof (version.fields as { title?: unknown })?.title === "string"
        ? ((version.fields as { title: string }).title as string)
        : "Untitled job",
    ]),
  );

  const placementByEntry = new Map(
    (placementsResult.data ?? []).map((p) => [p.pipeline_entry_id, p]),
  );

  const today = todaySgtDate();

  return rows
    .map((row): PlacementListItem => {
      const placement = placementByEntry.get(row.id) ?? null;
      const jobTitle = row.jobs?.current_version_id
        ? (titleByVersion.get(row.jobs.current_version_id) ?? "Untitled job")
        : "Untitled job";

      if (!placement) {
        return {
          pipelineEntryId: row.id,
          candidateId: row.candidate_id,
          candidateName: row.candidates?.full_name ?? "Unknown candidate",
          jobId: row.job_id,
          jobTitle,
          clientName: row.jobs?.clients?.name ?? "Unknown client",
          placementId: null,
          startDate: null,
          guaranteePeriodDays: null,
          guaranteeEndDate: null,
          daysUsed: null,
          flag: null,
        };
      }

      const daysUsed = Math.max(
        0,
        calendarDaysBetween(placement.start_date, today),
      );
      // The flag comes from placements_guarantee_flag (#163) — the same
      // security-invoker view the dashboard reads — rather than being
      // recomputed here, so both screens always agree. A placement absent
      // from that view (not flagged) reads as "ok".
      const flag = flagByPlacementId.get(placement.id) ?? "ok";

      return {
        pipelineEntryId: row.id,
        candidateId: row.candidate_id,
        candidateName: row.candidates?.full_name ?? "Unknown candidate",
        jobId: row.job_id,
        jobTitle,
        clientName: row.jobs?.clients?.name ?? "Unknown client",
        placementId: placement.id,
        startDate: placement.start_date,
        guaranteePeriodDays: placement.guarantee_period_days,
        guaranteeEndDate: placement.guarantee_end_date,
        daysUsed,
        flag,
      };
    })
    .sort((a, b) => {
      const rank = (flag: GuaranteeFlag | null) =>
        flag === "ended" ? 0 : flag === "ending-soon" ? 1 : 2;
      return rank(a.flag) - rank(b.flag);
    });
}
