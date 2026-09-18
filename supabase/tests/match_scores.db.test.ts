import { afterAll, afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * AC3 — match_scores unique key is (candidate_id, job_version_id, model_version).
 *
 * Fixture writes use a direct Postgres connection (local `postgres` role, the
 * privileged equivalent of SUPABASE_SECRET_KEY) because CI's db job exports
 * SUPABASE_DB_URL, and a unique-violation is a Postgres error we assert throws.
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

type FixtureIds = {
  clientId?: string;
  jobId?: string;
  jobVersionId?: string;
  candidateId?: string;
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
  const { candidateId, jobVersionId, jobId, clientId } = fixture;
  fixture = {};
  try {
    // Reverse FK order. match_scores references candidates and job_versions.
    if (candidateId) {
      await sql`delete from public.match_scores where candidate_id = ${candidateId}`;
      await sql`delete from public.candidates where id = ${candidateId}`;
    }
    if (jobVersionId) {
      await sql`delete from public.job_versions where id = ${jobVersionId}`;
    }
    if (jobId) {
      await sql`delete from public.jobs where id = ${jobId}`;
    }
    if (clientId) {
      await sql`delete from public.clients where id = ${clientId}`;
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

describe("AC3: match_scores unique key", () => {
  it("AC3: rejects a duplicate (candidate_id, job_version_id, model_version)", async () => {
    const [client] = await sql<{ id: string }[]>`
      insert into public.clients (name)
      values ('Northwind Fictional Pte Ltd')
      returning id
    `;
    fixture.clientId = client.id;

    const [job] = await sql<{ id: string }[]>`
      insert into public.jobs (client_id, owner_name)
      values (${client.id}, 'Jordan Lee')
      returning id
    `;
    fixture.jobId = job.id;

    const [jobVersion] = await sql<{ id: string }[]>`
      insert into public.job_versions (job_id, fields)
      values (${job.id}, ${sql.json({ title: "Operations associate" })})
      returning id
    `;
    fixture.jobVersionId = jobVersion.id;

    const [candidate] = await sql<{ id: string }[]>`
      insert into public.candidates (full_name)
      values ('Alex Tan')
      returning id
    `;
    fixture.candidateId = candidate.id;

    const modelVersion = "test-model-v1";

    await sql`
      insert into public.match_scores (
        candidate_id, job_version_id, model_version, score
      )
      values (${candidate.id}, ${jobVersion.id}, ${modelVersion}, 80)
    `;

    await expect(
      sql`
        insert into public.match_scores (
          candidate_id, job_version_id, model_version, score
        )
        values (${candidate.id}, ${jobVersion.id}, ${modelVersion}, 40)
      `,
    ).rejects.toMatchObject({
      code: "23505",
      constraint_name: "match_scores_candidate_job_version_model_key",
    });
  });
});
