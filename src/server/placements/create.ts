import "server-only";

import { z } from "zod";

import { getDb } from "../db";
import { getGuaranteeFlagForPlacement, type GuaranteeFlag } from "./guarantee";

const NAME_REQUIRED = "Enter your name to continue.";
const CREATE_FAILED = "The placement could not be saved.";
const NOT_PLACED = "This candidate is not in the Placed stage.";
const START_BEFORE_PLACED =
  "The start date cannot be before the date this candidate was placed.";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createPlacementSchema = z.object({
  pipelineEntryId: z.string().min(1),
  startDate: isoDate,
  recruiterName: z.string().trim().min(1).max(80),
});

export type CreatePlacementInput = {
  pipelineEntryId: string;
  startDate: string;
  recruiterName: string;
};

export type Placement = {
  id: string;
  startDate: string;
  guaranteePeriodDays: number;
  guaranteeEndDate: string;
  flag: GuaranteeFlag;
};

export type CreatePlacementResult =
  | { ok: true; placement: Placement }
  | { ok: false; error: string };

/** Singapore has no DST; SGT is a fixed UTC+8 offset (matches src/lib/working-days.ts). */
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** The SGT calendar date (YYYY-MM-DD) of a UTC instant. */
function sgtDateString(utcInstant: string): string {
  const shifted = new Date(new Date(utcInstant).getTime() + SGT_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Add `days` calendar days to an ISO date string. The guarantee period is a
 * calendar-day count ("a 30-day guarantee"), not a working-day count — the
 * working-day clock (#116) governs pipeline stage limits and the guarantee
 * flag's 5-working-day lead time (#163), not the guarantee's own length.
 * Stated once here per the #162 "calendar or working days" requirement.
 */
function addCalendarDays(isoDate_: string, days: number): string {
  const [year, month, day] = isoDate_.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type PlacementRow = {
  id: string;
  pipeline_entry_id: string;
  start_date: string;
  guarantee_period_days: number;
  guarantee_end_date: string;
  recruiter_name: string;
};

// The generated Database types don't include `recruiter_name` yet (needs a
// local Supabase stack to regenerate; CI's db:types:check catches drift and
// the fix commit adds it — same pattern as src/server/pipeline/status.ts).
type PlacementsClient = {
  from: (table: "placements") => {
    select: (columns: "id") => {
      eq: (
        column: "pipeline_entry_id",
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
    insert: (row: Omit<PlacementRow, "id">) => {
      select: (columns: "id") => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (row: Omit<PlacementRow, "id">) => {
      eq: (
        column: "id",
        value: string,
      ) => {
        select: (columns: "id") => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

/**
 * Confirm or change a placement's start date. Computes the guarantee end
 * date from the client's own `guarantee_period_days` (defaults to 30 at the
 * DB column level — see 20260918000001_clients_jobs.sql). One placement per
 * pipeline entry: a second call for the same entry updates the existing row
 * rather than inserting a duplicate, recomputing the end date each time.
 *
 * Only ever called from a recruiter-initiated Server Action.
 */
export async function createPlacement(
  input: CreatePlacementInput,
): Promise<CreatePlacementResult> {
  const recruiterName = input.recruiterName.trim();
  if (recruiterName.length === 0) {
    return { ok: false, error: NAME_REQUIRED };
  }

  const parsed = createPlacementSchema.safeParse({
    ...input,
    recruiterName,
  });
  if (!parsed.success) {
    return { ok: false, error: CREATE_FAILED };
  }

  const { pipelineEntryId, startDate } = parsed.data;

  const db = getDb();
  const placementsDb = db as unknown as PlacementsClient;

  const { data: entry, error: entryError } = await db
    .from("pipeline_entries")
    .select("id, job_id, stage, entered_at")
    .eq("id", pipelineEntryId)
    .maybeSingle();

  if (entryError || !entry) {
    return { ok: false, error: CREATE_FAILED };
  }
  if (entry.stage !== "Placed") {
    return { ok: false, error: NOT_PLACED };
  }

  const placedDate = sgtDateString(entry.entered_at);
  if (startDate < placedDate) {
    return { ok: false, error: START_BEFORE_PLACED };
  }

  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("client_id")
    .eq("id", entry.job_id)
    .maybeSingle();

  if (jobError || !job) {
    return { ok: false, error: CREATE_FAILED };
  }

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("guarantee_period_days")
    .eq("id", job.client_id)
    .maybeSingle();

  if (clientError || !client) {
    return { ok: false, error: CREATE_FAILED };
  }

  const guaranteePeriodDays = client.guarantee_period_days;
  const guaranteeEndDate = addCalendarDays(startDate, guaranteePeriodDays);

  const { data: existing, error: existingError } = await placementsDb
    .from("placements")
    .select("id")
    .eq("pipeline_entry_id", pipelineEntryId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: CREATE_FAILED };
  }

  const row = {
    pipeline_entry_id: pipelineEntryId,
    start_date: startDate,
    guarantee_period_days: guaranteePeriodDays,
    guarantee_end_date: guaranteeEndDate,
    recruiter_name: recruiterName,
  };

  if (existing) {
    const { data: updated, error: updateError } = await placementsDb
      .from("placements")
      .update(row)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError || !updated) {
      return { ok: false, error: CREATE_FAILED };
    }

    return {
      ok: true,
      placement: {
        id: updated.id,
        startDate,
        guaranteePeriodDays,
        guaranteeEndDate,
        flag: await getGuaranteeFlagForPlacement(updated.id),
      },
    };
  }

  const { data: inserted, error: insertError } = await placementsDb
    .from("placements")
    .insert(row)
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: CREATE_FAILED };
  }

  return {
    ok: true,
    placement: {
      id: inserted.id,
      startDate,
      guaranteePeriodDays,
      guaranteeEndDate,
      flag: await getGuaranteeFlagForPlacement(inserted.id),
    },
  };
}
