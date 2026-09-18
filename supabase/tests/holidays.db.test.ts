import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * sg_public_holidays table shape, RLS lock-down, seeded counts, and
 * idempotent re-seed (#115 / Story #36).
 *
 * Catalogue queries and seed inserts use a direct Postgres connection
 * (local `postgres` role, the privileged equivalent of SUPABASE_SECRET_KEY).
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

/** Must match the seed in `20260918000006_sg_public_holidays.sql`. */
const SEEDED_COUNT_BY_YEAR: Record<number, number> = {
  2025: 11,
  2026: 14,
  2027: 12,
};

describe("sg_public_holidays", () => {
  it("rejects a duplicate date (primary key on date)", async () => {
    await expect(
      sql`
        insert into public.sg_public_holidays (date, name, year)
        values ('2025-01-01', 'New Year''s Day', 2025)
      `,
    ).rejects.toMatchObject({
      code: "23505",
      constraint_name: "sg_public_holidays_pkey",
    });
  });

  it("has RLS enabled and grants nothing to anon or authenticated", async () => {
    const [pgTable] = await sql<{ rowsecurity: boolean }[]>`
      select rowsecurity
      from pg_tables
      where schemaname = 'public'
        and tablename = 'sg_public_holidays'
    `;
    expect(
      pgTable?.rowsecurity,
      "pg_tables.rowsecurity must be true for public.sg_public_holidays",
    ).toBe(true);

    const [rel] = await sql<{ relrowsecurity: boolean }[]>`
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'sg_public_holidays'
        and c.relkind = 'r'
    `;
    expect(
      rel?.relrowsecurity,
      "public.sg_public_holidays must have relrowsecurity = true",
    ).toBe(true);

    const grants = await sql<{ grantee: string; privilege_type: string }[]>`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'sg_public_holidays'
        and grantee in ('anon', 'authenticated')
    `;
    expect(
      grants,
      "anon and authenticated must have zero table privileges on public.sg_public_holidays",
    ).toEqual([]);
  });

  it("has the seeded holiday count for 2025, 2026 and 2027", async () => {
    for (const [year, expected] of Object.entries(SEEDED_COUNT_BY_YEAR)) {
      const [row] = await sql<{ count: number }[]>`
        select count(*)::int as count
        from public.sg_public_holidays
        where year = ${Number(year)}
      `;
      expect(
        row?.count,
        `sg_public_holidays year ${year} count`,
      ).toBe(expected);
    }
  });

  it("does not create duplicates when the seed insert is run again", async () => {
    const [before] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from public.sg_public_holidays
    `;

    await sql`
      insert into public.sg_public_holidays (date, name, year) values
        ('2025-01-01', 'New Year''s Day', 2025),
        ('2025-01-29', 'Chinese New Year', 2025),
        ('2025-01-30', 'Chinese New Year', 2025),
        ('2025-03-31', 'Hari Raya Puasa', 2025),
        ('2025-04-18', 'Good Friday', 2025),
        ('2025-05-01', 'Labour Day', 2025),
        ('2025-05-12', 'Vesak Day', 2025),
        ('2025-06-06', 'Hari Raya Haji', 2025),
        ('2025-08-09', 'National Day', 2025),
        ('2025-10-20', 'Deepavali', 2025),
        ('2025-12-25', 'Christmas Day', 2025),
        ('2026-01-01', 'New Year''s Day', 2026),
        ('2026-02-17', 'Chinese New Year', 2026),
        ('2026-02-18', 'Chinese New Year', 2026),
        ('2026-03-21', 'Hari Raya Puasa', 2026),
        ('2026-04-03', 'Good Friday', 2026),
        ('2026-05-01', 'Labour Day', 2026),
        ('2026-05-27', 'Hari Raya Haji', 2026),
        ('2026-05-31', 'Vesak Day', 2026),
        ('2026-06-01', 'Vesak Day (in lieu)', 2026),
        ('2026-08-09', 'National Day', 2026),
        ('2026-08-10', 'National Day (in lieu)', 2026),
        ('2026-11-08', 'Deepavali', 2026),
        ('2026-11-09', 'Deepavali (in lieu)', 2026),
        ('2026-12-25', 'Christmas Day', 2026),
        ('2027-01-01', 'New Year''s Day', 2027),
        ('2027-02-06', 'Chinese New Year', 2027),
        ('2027-02-07', 'Chinese New Year', 2027),
        ('2027-02-08', 'Chinese New Year (in lieu)', 2027),
        ('2027-03-10', 'Hari Raya Puasa', 2027),
        ('2027-03-26', 'Good Friday', 2027),
        ('2027-05-01', 'Labour Day', 2027),
        ('2027-05-17', 'Hari Raya Haji', 2027),
        ('2027-05-20', 'Vesak Day', 2027),
        ('2027-08-09', 'National Day', 2027),
        ('2027-10-29', 'Deepavali', 2027),
        ('2027-12-25', 'Christmas Day', 2027)
      on conflict (date) do nothing
    `;

    const [after] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from public.sg_public_holidays
    `;

    expect(after?.count).toBe(before?.count);
  });
});
