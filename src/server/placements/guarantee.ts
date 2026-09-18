import "server-only";

import { addWorkingDays } from "@/lib/working-days";
import { getDb } from "../db";

export type GuaranteeFlag = "ok" | "ending-soon" | "ended";

/**
 * The guarantee-ending flag (#163, PRD "proposed"): 5 SG working days
 * before `guaranteeEndDate`, derived at read time — no scheduled job.
 *
 * `today` and `guaranteeEndDate` are SGT calendar dates (YYYY-MM-DD),
 * matching `placements.start_date`/`guarantee_end_date`'s `date` columns.
 * Flags "ending-soon" once today's SGT midnight, walked forward 5 SG
 * working days (`addWorkingDays`, #116), reaches or passes the end date —
 * equivalently, 5 or fewer working days remain before it. Already-past end
 * dates are "ended" regardless of the working-day math.
 */
export function resolveGuaranteeFlag(
  today: string,
  guaranteeEndDate: string,
  holidays: Iterable<string>,
): GuaranteeFlag {
  if (guaranteeEndDate < today) {
    return "ended";
  }

  const todayMidnightUtc = `${today}T00:00:00.000Z`;
  const landing = addWorkingDays(todayMidnightUtc, 5, holidays);
  // addWorkingDays returns SGT midnight as a UTC instant — that's 16:00 UTC
  // the *previous* day, so reading it back with a plain
  // toISOString().slice(0, 10) would lose a day. Shift by +8h first.
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const landingDate = new Date(landing.getTime() + SGT_OFFSET_MS)
    .toISOString()
    .slice(0, 10);

  if (landingDate >= guaranteeEndDate) {
    return "ending-soon";
  }
  return "ok";
}

export type FlaggedPlacement = {
  placementId: string;
  pipelineEntryId: string;
  startDate: string;
  guaranteeEndDate: string;
  flag: GuaranteeFlag;
};

type FlaggedPlacementDbRow = {
  placement_id: string;
  pipeline_entry_id: string;
  start_date: string;
  guarantee_end_date: string;
  flag: GuaranteeFlag;
};

type GuaranteeFlagsClient = {
  from: (table: "placements_guarantee_flag") => {
    select: (columns: "*") => Promise<{
      data: FlaggedPlacementDbRow[] | null;
      error: { message: string } | null;
    }>;
  };
};

/**
 * Reads the `placements_guarantee_flag` view (already excludes `ok` rows —
 * see the migration). Shaped for the dashboard's guarantee section (#161).
 */
export async function getFlaggedPlacements(): Promise<FlaggedPlacement[]> {
  const db = getDb() as unknown as GuaranteeFlagsClient;
  const { data, error } = await db
    .from("placements_guarantee_flag")
    .select("*");

  if (error) {
    throw new Error(`Failed to load guarantee flags: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    placementId: row.placement_id,
    pipelineEntryId: row.pipeline_entry_id,
    startDate: row.start_date,
    guaranteeEndDate: row.guarantee_end_date,
    flag: row.flag,
  }));
}
