import { afterAll, afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * AC4 — candidate_profiles stores parsed (AI) and overrides (recruiter edits)
 * in separate columns. Re-writing `parsed` must leave `overrides` untouched.
 *
 * Fixture writes use a direct Postgres connection (local `postgres` role, the
 * privileged equivalent of SUPABASE_SECRET_KEY). Local stack only.
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

type FixtureIds = {
  candidateId?: string;
  profileId?: string;
};

let fixture: FixtureIds = {};

function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "CONNECT_TIMEOUT" ||
    code === "ECONNRESET"
  );
}

afterEach(async () => {
  const { profileId, candidateId } = fixture;
  fixture = {};
  try {
    if (profileId) {
      await sql`delete from public.candidate_profiles where id = ${profileId}`;
    }
    if (candidateId) {
      await sql`delete from public.candidates where id = ${candidateId}`;
    }
  } catch (error) {
    if (isConnectionError(error)) {
      return;
    }
    throw error;
  }
});

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

describe("AC4: candidate_profiles parsed/overrides split", () => {
  it("AC4: re-writing parsed leaves overrides untouched", async () => {
    const [candidate] = await sql<{ id: string }[]>`
      insert into public.candidates (full_name)
      values ('Alex Tan')
      returning id
    `;
    fixture.candidateId = candidate.id;

    const [profile] = await sql<{ id: string }[]>`
      insert into public.candidate_profiles (candidate_id, parsed, overrides)
      values (
        ${candidate.id},
        ${sql.json({ name: "A" })},
        ${sql.json({})}
      )
      returning id
    `;
    fixture.profileId = profile.id;

    await sql`
      update public.candidate_profiles
      set parsed = ${sql.json({ name: "B" })}
      where id = ${profile.id}
    `;

    const [row] = await sql<{ parsed: unknown; overrides: unknown }[]>`
      select parsed, overrides
      from public.candidate_profiles
      where id = ${profile.id}
    `;

    expect(row.parsed).toEqual({ name: "B" });
    expect(row.overrides).toEqual({});
  });
});
