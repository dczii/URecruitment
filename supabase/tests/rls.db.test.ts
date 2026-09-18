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
 * **The skip decision is based on whether a stack is reachable, never on which
 * environment variables happen to be set.** An earlier version keyed off env
 * vars, which meant `supabase start && npm run test:db` without exporting them
 * reported "no tests" and exited 0 even with unprotected tables on the running
 * stack — exactly the vacuous pass this file exists to prevent.
 *
 * Discovery uses a direct Postgres connection rather than an HTTP catalogue.
 * `information_schema` is not exposed through PostgREST, and asking PostgREST
 * what the *publishable* key can see is self-defeating: a correctly revoked
 * table disappears from that view.
 *
 * Local stack only. `supabase status` prints every value.
 */

const LOCAL_STACK_REQUIRED =
  "Start the local stack with `supabase start`, then export SUPABASE_URL (API_URL) and SUPABASE_PUBLISHABLE_KEY (PUBLISHABLE_KEY) from `SUPABASE_AUTH_ENABLED=true supabase status -o env` — auth is disabled in config.toml, so plain `supabase status` omits the keys. DB tests never run against a remote project.";

/** The local stack's default Postgres port, from supabase/config.toml [db]. */
const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

const dbUrl = process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;

/**
 * Refuse to touch anything but the local stack. A stray SUPABASE_DB_URL would
 * otherwise open a direct Postgres connection to a remote project.
 */
function assertLocal(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`SUPABASE_DB_URL is not a valid URL. ${LOCAL_STACK_REQUIRED}`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run DB tests against host "${host}". These tests are local-stack only; agents and CI never point them at a remote Supabase project.`,
    );
  }
}

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `A local stack is running but ${name} is not set. ${LOCAL_STACK_REQUIRED}`,
    );
  }
  return value;
}

if (!process.env.SKIP_DB_TESTS) {
  assertLocal(dbUrl);
}

const sql = process.env.SKIP_DB_TESTS
  ? undefined
  : postgres(dbUrl, { max: 1, idle_timeout: 2, connect_timeout: 5 });

type TableGrant = {
  table_name: string;
  anon_select: boolean;
  authenticated_select: boolean;
};

/**
 * @returns the tables to assert on, or `undefined` when no stack is running.
 * A connection error means "no stack"; anything else is re-thrown, so a broken
 * stack fails loudly instead of looking like an empty schema.
 */
async function discover(): Promise<TableGrant[] | undefined> {
  if (!sql) {
    return undefined;
  }
  try {
    return await sql<TableGrant[]>`
      select
        c.relname as table_name,
        has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
        has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p', 'f')
      order by c.relname
    `;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "CONNECT_TIMEOUT") {
      // No local stack. `npm run test:db` reports zero tests and exits 0, which
      // is what #87 AC6 asks for on a machine without Docker.
      return undefined;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read the table catalogue. ${LOCAL_STACK_REQUIRED} (${detail})`);
  }
}

const tables = await discover();

afterAll(async () => {
  await sql?.end({ timeout: 5 });
});

describe.skipIf(tables === undefined)("AC3: RLS lock-down", () => {
  it.each(tables ?? [])(
    "neither anon nor authenticated holds SELECT on public.$table_name",
    ({ table_name, anon_select, authenticated_select }) => {
      // The authoritative check: `revoke all … from anon, authenticated` means
      // the grant is gone. Asserted for BOTH roles — a table revoked from anon
      // but left granted to authenticated still breaks the rule.
      expect(
        anon_select,
        `anon holds SELECT on public.${table_name}; supabase-db requires \`revoke all on table public.${table_name} from anon, authenticated\``,
      ).toBe(false);
      expect(
        authenticated_select,
        `authenticated holds SELECT on public.${table_name}; the same revoke covers both roles`,
      ).toBe(false);
    },
  );

  it.each(tables ?? [])(
    "the publishable key reads nothing over HTTP from public.$table_name",
    async ({ table_name }) => {
      const url = requireEnv("SUPABASE_URL").replace(/\/$/, "");
      const publishableKey = requireEnv("SUPABASE_PUBLISHABLE_KEY");

      const response = await fetch(
        `${url}/rest/v1/${encodeURIComponent(table_name)}?select=*&limit=1`,
        {
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${publishableKey}`,
            Accept: "application/json",
          },
        },
      );

      // A revoked or unexposed table shows up as 401/403/404. This is the
      // second signal only: 404 is also what an un-exposed-but-granted table
      // returns, so the privilege assertion above is the one that decides.
      if ([401, 403, 404].includes(response.status)) {
        return;
      }

      expect(
        response.ok,
        `public.${table_name} answered ${response.status}; expected 401/403/404 or an empty 200`,
      ).toBe(true);

      const payload: unknown = await response.json();
      expect(
        Array.isArray(payload) ? payload.length : -1,
        `the publishable key must read an error or zero rows from public.${table_name}`,
      ).toBe(0);
    },
  );
});
