import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { addWorkingDays, workingDaysElapsed } from "../../src/lib/working-days";

/**
 * AC4 — the SQL working-day functions (`sg_working_days_between`,
 * `sg_add_working_days`) and the TypeScript mirror (`src/lib/working-days.ts`)
 * must agree, using the real seeded `sg_public_holidays` rows as the shared
 * holiday source (#116 / Story #36).
 *
 * Catalogue/function calls use a direct Postgres connection (local `postgres`
 * role, the privileged equivalent of SUPABASE_SECRET_KEY).
 *
 * Local stack only. Never pointed at a remote project.
 */

const LOCAL_STACK_REQUIRED =
  "Start the local stack with `supabase start`. These tests use SUPABASE_DB_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres). DB tests never run against a remote project.";

const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

function assertLocal(url: string, name: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`${name} is not a valid URL. ${LOCAL_STACK_REQUIRED}`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run DB tests against host "${host}" (${name}). These tests are local-stack only; agents and CI never point them at a remote Supabase project.`,
    );
  }
}

const dbUrl = process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;
assertLocal(dbUrl, "SUPABASE_DB_URL");

const sql = postgres(dbUrl, { max: 1, idle_timeout: 2, connect_timeout: 5 });

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

/** A range spanning weekends, single holidays, a consecutive-holiday run, and non-holiday weekdays. */
const DATE_RANGE: readonly string[] = [
  "2025-12-30T02:00:00.000Z", // Tue
  "2025-12-31T02:00:00.000Z", // Wed, eve of NYD
  "2026-01-01T02:00:00.000Z", // Thu, holiday (New Year's Day)
  "2026-01-02T02:00:00.000Z", // Fri
  "2026-01-03T02:00:00.000Z", // Sat
  "2026-01-04T02:00:00.000Z", // Sun
  "2026-01-05T02:00:00.000Z", // Mon
  "2026-05-29T02:00:00.000Z", // Fri, before Vesak run
  "2026-05-30T02:00:00.000Z", // Sat
  "2026-05-31T02:00:00.000Z", // Sun, Vesak Day (holiday)
  "2026-06-01T02:00:00.000Z", // Mon, Vesak Day in lieu (holiday)
  "2026-06-02T02:00:00.000Z", // Tue
  "2026-06-03T02:00:00.000Z", // Wed
];

async function fetchHolidays(): Promise<string[]> {
  const rows = await sql<{ date: string }[]>`
    select date::text as date from public.sg_public_holidays order by date
  `;
  return rows.map((r) => r.date);
}

describe("working-days cross-check (SQL vs TypeScript)", () => {
  it("AC4: sg_working_days_between agrees with workingDaysElapsed across a date range", async () => {
    const holidays = await fetchHolidays();

    for (const from of DATE_RANGE) {
      for (const to of DATE_RANGE) {
        const [row] = await sql<{ elapsed: number }[]>`
          select public.sg_working_days_between(${from}::timestamptz, ${to}::timestamptz) as elapsed
        `;
        const sqlResult = row?.elapsed;
        const tsResult = workingDaysElapsed(from, to, holidays);

        expect(
          sqlResult,
          `sg_working_days_between(${from}, ${to}) vs workingDaysElapsed`,
        ).toBe(tsResult);
      }
    }
  });

  it("AC4: sg_add_working_days agrees with addWorkingDays across a date range and day counts", async () => {
    const holidays = await fetchHolidays();
    const dayCounts = [1, 2, 3, 5];

    for (const from of DATE_RANGE) {
      for (const days of dayCounts) {
        const [row] = await sql<{ landing: string }[]>`
          select public.sg_add_working_days(${from}::timestamptz, ${days}::integer) as landing
        `;
        const sqlResult = row?.landing
          ? new Date(row.landing).toISOString()
          : undefined;
        const tsResult = addWorkingDays(from, days, holidays).toISOString();

        expect(
          sqlResult,
          `sg_add_working_days(${from}, ${days}) vs addWorkingDays`,
        ).toBe(tsResult);
      }
    }
  });
});
