import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * AC3 — the RLS lock-down harness.
 *
 * `supabase-db` §Security: "**Required test:** with the publishable key,
 * `select` on each table returns an error or 0 rows. Add a check for each new
 * table." This file is that check, written once so E03 cannot add a table
 * without it.
 *
 * It discovers tables over a **direct Postgres connection** rather than an HTTP
 * catalogue endpoint. Two reasons: `information_schema` is not exposed through
 * PostgREST, and asking PostgREST what the publishable key can see would be
 * self-defeating — a properly revoked table disappears from that view, so the
 * harness would find nothing and pass vacuously, which is the exact failure it
 * exists to prevent.
 *
 * Local stack only (`testing` §Layers). `supabase status` prints all three
 * values. Never point this at a remote project.
 */

const LOCAL_STACK_REQUIRED =
  "The local Supabase stack must be running (`supabase start`). Set SUPABASE_DB_URL, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from `supabase status`. DB tests never run against a remote project.";

/** The local stack's default Postgres port, from supabase/config.toml [db]. */
const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * Any one of these being set means someone intended to run against a stack, so
 * a missing sibling is a configuration error and must fail rather than skip.
 */
const configured =
  Boolean(process.env.SUPABASE_DB_URL) ||
  Boolean(process.env.SUPABASE_URL) ||
  Boolean(process.env.SUPABASE_PUBLISHABLE_KEY);

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. ${LOCAL_STACK_REQUIRED}`);
  }
  return value;
}

const sql = configured
  ? postgres(process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL, {
      max: 1,
      idle_timeout: 2,
      connect_timeout: 10,
    })
  : undefined;

async function listPublicBaseTables(): Promise<string[]> {
  if (!sql) {
    return [];
  }
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
    // Never swallow this: a failed discovery must not look like "no tables".
    throw new Error(`Could not list public tables. ${LOCAL_STACK_REQUIRED} (${detail})`);
  }
}

// Registers zero tests on an empty schema, which is today and is what makes
// `npm run test:db` report "no tests" rather than fail (#87 AC6). It starts
// asserting the moment E03 adds a public table.
const tables = await listPublicBaseTables();

afterAll(async () => {
  await sql?.end({ timeout: 5 });
});

describe("AC3: RLS lock-down", () => {
  it.each(tables)(
    "the publishable key reads nothing from public.%s",
    async (tableName) => {
      const url = requireEnv("SUPABASE_URL").replace(/\/$/, "");
      const publishableKey = requireEnv("SUPABASE_PUBLISHABLE_KEY");

      const response = await fetch(
        `${url}/rest/v1/${encodeURIComponent(tableName)}?select=*&limit=1`,
        {
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${publishableKey}`,
            Accept: "application/json",
          },
        },
      );

      // A revoked table is the goal, and PostgREST reports that as 401/403, or
      // as 404 when the grant is gone so the table is not exposed at all.
      if ([401, 403, 404].includes(response.status)) {
        return;
      }

      // Anything else must be a readable response with zero rows. A 5xx is a
      // broken stack, not a passing lock-down, so let it fail loudly.
      expect(
        response.ok,
        `public.${tableName} answered ${response.status}; expected 401/403/404 or an empty 200`,
      ).toBe(true);

      const payload: unknown = await response.json();
      expect(
        Array.isArray(payload) ? payload.length : -1,
        `the publishable key must read an error or zero rows from public.${tableName}`,
      ).toBe(0);
    },
  );
});
