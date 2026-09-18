import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

/**
 * AC1 / AC2 — RLS lock-down proof (#113).
 *
 * Tables are discovered from the live catalogue, never a hard-coded list, so a
 * new public table without RLS fails this file automatically.
 *
 * Catalogue queries (information_schema, pg_class, pg_policies) use a direct
 * Postgres connection. PostgREST does not expose pg_catalog, so a secret-key
 * JWT client cannot `from("pg_policies")`. The local `postgres` role is the
 * privileged equivalent of `SUPABASE_SECRET_KEY` (it bypasses RLS). The anon
 * proof uses `createClient` with the publishable key, matching `src/server/db.ts`.
 *
 * Local stack only. Never pointed at a remote project.
 */

const LOCAL_STACK_REQUIRED =
  "Start the local stack with `supabase start`, then export SUPABASE_URL (API_URL) and SUPABASE_PUBLISHABLE_KEY (PUBLISHABLE_KEY / ANON_KEY) from `supabase status -o env`. Catalogue queries use SUPABASE_DB_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres). DB tests never run against a remote project.";

/** The local stack's default Postgres port, from supabase/config.toml [db]. */
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

function requireEnv(
  name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY",
): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. ${LOCAL_STACK_REQUIRED}`);
  }
  return value;
}

const dbUrl = process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;
assertLocal(dbUrl, "SUPABASE_DB_URL");

const sql = postgres(dbUrl, { max: 1, idle_timeout: 2, connect_timeout: 5 });

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

async function discoverPublicTables(): Promise<string[]> {
  try {
    const rows = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `;
    return rows.map((row) => row.table_name);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not list public tables from information_schema. ${LOCAL_STACK_REQUIRED} (${detail})`,
    );
  }
}

const tables = await discoverPublicTables();
const cases = tables.map((table) => ({ table }));

describe("AC1/AC2: RLS lock-down", () => {
  it("AC1: enumerates public tables from the catalogue (not a hard-coded list)", () => {
    expect(
      tables.length,
      "public schema has no BASE TABLEs; apply migrations with `supabase db reset --local`",
    ).toBeGreaterThan(0);
  });

  it.each(cases)(
    "AC1: $table has RLS enabled and no policies",
    async ({ table }) => {
      const [rls] = await sql<{ relrowsecurity: boolean }[]>`
        select c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = ${table}
          and c.relkind = 'r'
      `;
      expect(
        rls?.relrowsecurity,
        `public.${table} must have relrowsecurity = true`,
      ).toBe(true);

      const [policies] = await sql<{ policy_count: number }[]>`
        select count(*)::int as policy_count
        from pg_policies
        where schemaname = 'public'
          and tablename = ${table}
      `;
      expect(
        policies?.policy_count,
        `public.${table} must have zero rows in pg_policies`,
      ).toBe(0);
    },
  );

  it.each(cases)(
    "AC2: anon key reads zero rows from $table",
    async ({ table }) => {
      const url = requireEnv("SUPABASE_URL");
      assertLocal(url, "SUPABASE_URL");
      const publishableKey = requireEnv("SUPABASE_PUBLISHABLE_KEY");

      // Same construction as src/server/db.ts, but with the publishable key.
      // Untyped on purpose: table names come from the catalogue, not Database.
      const anon = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await anon.from(table).select("*").limit(1);
      const rows = data ?? [];
      expect(
        rows,
        error
          ? `anon select errored (ok) but still returned ${rows.length} row(s) from public.${table}`
          : `anon key read ${rows.length} row(s) from public.${table}; expected an error or zero rows`,
      ).toHaveLength(0);
    },
  );
});
