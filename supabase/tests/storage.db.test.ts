import { execFileSync } from "node:child_process";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";

/**
 * AC1 / AC3 — private `cv-files` bucket + expired signed-URL proof (#114).
 *
 * Catalogue queries (storage.buckets, pg_policies) use a direct Postgres
 * connection. The local `postgres` role is the privileged equivalent of
 * `SUPABASE_SECRET_KEY` (it bypasses RLS). Anon list/download uses
 * `createClient` with the publishable key, matching `rls.db.test.ts`.
 * Upload and signing use the secret-key client (Storage HTTP API).
 *
 * Local stack only. Never pointed at a remote project.
 */

const LOCAL_STACK_REQUIRED =
  "Start the local stack with `supabase start`, then export SUPABASE_URL (API_URL), SUPABASE_PUBLISHABLE_KEY (PUBLISHABLE_KEY / ANON_KEY) and SUPABASE_SECRET_KEY (SECRET_KEY / SERVICE_ROLE_KEY) from `supabase status -o env`. Catalogue queries use SUPABASE_DB_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres). DB tests never run against a remote project.";

/** The local stack's default Postgres port, from supabase/config.toml [db]. */
const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

const CV_FILES_BUCKET = "cv-files";

/** Synthetic PDF magic (`%PDF-1.4`) plus a unique marker. Not a real CV. */
const FIXTURE_MARKER = "%urec-cv-files-db-test";
const SYNTHETIC_PDF = new TextEncoder().encode(`%PDF-1.4\n${FIXTURE_MARKER}\n`);

const SIGNED_URL_EXPIRES_IN_SECONDS = 1;
const WAIT_PAST_EXPIRY_MS = 2_500;

function assertLocal(url: string, name: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`${name} is not a valid URL. ${LOCAL_STACK_REQUIRED}`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run DB tests against host "${host}" (${name}). These tests are local-stack only; agents and CI never point them at a remote project.`,
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

function parseStatusEnv(dump: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of dump.split("\n")) {
    const match = /^(?:export )?([A-Za-z_][A-Za-z0-9_]*)="?([^"]*)"?\s*$/.exec(
      line,
    );
    if (match) {
      out[match[1]] = match[2];
    }
  }
  return out;
}

function pickSecretKey(vars: Record<string, string | undefined>): string | undefined {
  return (
    vars.SUPABASE_SECRET_KEY ||
    vars.SECRET_KEY ||
    vars.SERVICE_ROLE_KEY ||
    vars.SUPABASE_SERVICE_ROLE_KEY ||
    undefined
  );
}

function secretKeyFromLocalStatus(): string | undefined {
  try {
    const stdout = execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return pickSecretKey(parseStatusEnv(stdout));
  } catch (error) {
    const stdout =
      error && typeof error === "object" && "stdout" in error
        ? String((error as { stdout?: unknown }).stdout ?? "")
        : "";
    return pickSecretKey(parseStatusEnv(stdout));
  }
}

let cachedSecretKey: string | undefined;

function requireSecretKey(): string {
  if (cachedSecretKey) {
    return cachedSecretKey;
  }
  const fromEnv = pickSecretKey(process.env);
  if (fromEnv) {
    cachedSecretKey = fromEnv;
    return fromEnv;
  }
  const fromStatus = secretKeyFromLocalStatus();
  if (fromStatus) {
    cachedSecretKey = fromStatus;
    return fromStatus;
  }
  throw new Error(`SUPABASE_SECRET_KEY is not set. ${LOCAL_STACK_REQUIRED}`);
}

const dbUrl = process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;
assertLocal(dbUrl, "SUPABASE_DB_URL");

const sql = postgres(dbUrl, { max: 1, idle_timeout: 2, connect_timeout: 5 });

function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "CONNECT_TIMEOUT" ||
    code === "ECONNRESET"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function fixturePath(): string {
  return `cv/${crypto.randomUUID()}/Aisha-Tan-CV.pdf`;
}

function anonClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  assertLocal(url, "SUPABASE_URL");
  return createClient(url, requireEnv("SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function secretClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  assertLocal(url, "SUPABASE_URL");
  return createClient(url, requireSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let uploadedPath: string | undefined;

afterEach(async () => {
  const path = uploadedPath;
  uploadedPath = undefined;
  if (!path) {
    return;
  }
  try {
    await secretClient().storage.from(CV_FILES_BUCKET).remove([path]);
  } catch (error) {
    if (isConnectionError(error)) {
      return;
    }
  }
  try {
    await sql`
      delete from storage.objects
      where bucket_id = ${CV_FILES_BUCKET}
        and name = ${path}
    `;
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

describe("cv-files storage lock-down", () => {
  it("AC1: bucket is private with no public policy", async () => {
    const [bucket] = await sql<{ id: string; public: boolean }[]>`
      select id, public
      from storage.buckets
      where id = ${CV_FILES_BUCKET}
    `;
    expect(
      bucket,
      "cv-files bucket is missing; apply migrations with `supabase db reset --local`",
    ).toBeTruthy();
    expect(
      bucket?.public,
      "cv-files must be a private bucket (storage.buckets.public = false)",
    ).toBe(false);

    const policies = await sql<{ policy_count: number }[]>`
      select count(*)::int as policy_count
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and (
          'anon' = any (roles)
          or 'public' = any (roles)
          or coalesce(qual, '') ilike '%cv-files%'
          or coalesce(with_check, '') ilike '%cv-files%'
        )
    `;
    expect(
      policies[0]?.policy_count,
      "storage.objects must have no anon/public policy and none scoped to cv-files",
    ).toBe(0);

    const path = fixturePath();
    uploadedPath = path;
    const parent = path.slice(0, path.lastIndexOf("/"));
    const filename = path.slice(path.lastIndexOf("/") + 1);

    const uploaded = await secretClient()
      .storage.from(CV_FILES_BUCKET)
      .upload(path, SYNTHETIC_PDF, { contentType: "application/pdf" });
    expect(uploaded.error, uploaded.error?.message).toBeNull();

    const anon = anonClient();
    const listed = await anon.storage.from(CV_FILES_BUCKET).list(parent);
    const listedNames = (listed.data ?? []).map((entry) => entry.name);
    expect(
      listedNames,
      listed.error
        ? `anon list errored (ok) but still returned ${listedNames.length} object(s)`
        : `anon key listed ${listedNames.length} object(s) in cv-files/${parent}; expected an error or zero rows`,
    ).toHaveLength(0);
    expect(listedNames).not.toContain(filename);

    const downloaded = await anon.storage.from(CV_FILES_BUCKET).download(path);
    expect(
      downloaded.data,
      "anon key must not download an object from the private cv-files bucket",
    ).toBeNull();

    const { data: publicUrlData } = anon.storage
      .from(CV_FILES_BUCKET)
      .getPublicUrl(path);
    assertLocal(publicUrlData.publicUrl, "cv-files public URL");
    const publicResponse = await fetch(publicUrlData.publicUrl);
    expect(
      publicResponse.ok,
      `public object URL returned ${publicResponse.status}; private bucket must not serve the file`,
    ).toBe(false);
    const publicBody = await publicResponse.text();
    expect(publicBody).not.toContain(FIXTURE_MARKER);
  });

  it(
    "AC3: an expired signed URL is refused",
    async () => {
      const path = fixturePath();
      uploadedPath = path;
      const secret = secretClient();

      const uploaded = await secret.storage
        .from(CV_FILES_BUCKET)
        .upload(path, SYNTHETIC_PDF, { contentType: "application/pdf" });
      expect(uploaded.error, uploaded.error?.message).toBeNull();

      const fresh = await secret.storage
        .from(CV_FILES_BUCKET)
        .createSignedUrl(path, 60);
      expect(fresh.error, fresh.error?.message).toBeNull();
      const freshUrl = fresh.data?.signedUrl;
      expect(freshUrl, "createSignedUrl must return a signed URL").toBeTruthy();
      if (!freshUrl) {
        throw new Error("createSignedUrl returned no signedUrl");
      }
      assertLocal(freshUrl, "fresh signed URL");
      const freshResponse = await fetch(freshUrl);
      expect(
        freshResponse.ok,
        `control: a still-valid signed URL must serve the file (got ${freshResponse.status})`,
      ).toBe(true);
      const freshBody = await freshResponse.text();
      expect(freshBody).toContain(FIXTURE_MARKER);

      const signed = await secret.storage
        .from(CV_FILES_BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);
      expect(signed.error, signed.error?.message).toBeNull();
      const signedUrl = signed.data?.signedUrl;
      expect(signedUrl, "createSignedUrl must return a signed URL").toBeTruthy();
      if (!signedUrl) {
        throw new Error("createSignedUrl returned no signedUrl");
      }
      assertLocal(signedUrl, "expired signed URL");

      await sleep(WAIT_PAST_EXPIRY_MS);

      const expiredResponse = await fetch(signedUrl);
      expect(
        expiredResponse.ok,
        `expired signed URL returned ${expiredResponse.status}; Storage must not serve the file`,
      ).toBe(false);
      expect(expiredResponse.status).toBeGreaterThanOrEqual(400);
      const expiredBody = await expiredResponse.text();
      expect(expiredBody).not.toContain(FIXTURE_MARKER);
    },
    20_000,
  );
});
