import { afterAll, afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import {
  PARSE_CV_DURATION_LIMIT_MS,
  fetchSucceededParseCvRuns,
  formatParseTimingReport,
  parseTimingExitCode,
  summarizeParseTiming,
} from "../../scripts/checks/parse-timing";

/**
 * AC4 — succeeded parse-cv runs record duration_ms, and the timing check
 * fails when the slowest exceeds 30s, naming its input_ref.
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

let fixtureIds: string[] = [];

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
  const ids = fixtureIds;
  fixtureIds = [];
  try {
    if (ids.length > 0) {
      await sql`delete from public.ai_runs where id in ${sql(ids)}`;
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

const SLOW_INPUT_REF =
  "cv_files:00000000-0000-4000-a000-parse00000099#parse_path=text";
const MID_INPUT_REF =
  "cv_files:00000000-0000-4000-a000-parse00000050#parse_path=text";
const FAST_INPUT_REF =
  "cv_files:00000000-0000-4000-a000-parse00000001#parse_path=text";
const FAST_B_INPUT_REF =
  "cv_files:00000000-0000-4000-a000-parse00000002#parse_path=text";
const FAST_C_INPUT_REF =
  "cv_files:00000000-0000-4000-a000-parse00000003#parse_path=text";
const FAILED_INPUT_REF =
  "cv_files:00000000-0000-4000-a000-parse00000fail#parse_path=text";
const OTHER_STEP_INPUT_REF =
  "cv_files:00000000-0000-4000-a000-parse0000match#parse_path=text";

async function insertAiRun(args: {
  step: string;
  status: string;
  durationMs: number;
  inputRef: string;
}): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into public.ai_runs (
      step,
      provider,
      model_id,
      model_version,
      prompt_version,
      input_ref,
      status,
      duration_ms,
      cost_usd
    )
    values (
      ${args.step},
      'unspecified',
      'fake-timing-model',
      'test',
      'v1',
      ${args.inputRef},
      ${args.status},
      ${args.durationMs},
      0
    )
    returning id
  `;
  fixtureIds.push(row.id);
  return row.id;
}

describe("AC4: parse-cv duration under 30s", () => {
  it("AC4: fails if the slowest parse exceeds 30s, naming its input_ref", async () => {
    const fastId = await insertAiRun({
      step: "parse-cv",
      status: "succeeded",
      durationMs: 1_000,
      inputRef: FAST_INPUT_REF,
    });
    const midId = await insertAiRun({
      step: "parse-cv",
      status: "succeeded",
      durationMs: 5_000,
      inputRef: MID_INPUT_REF,
    });
    const slowId = await insertAiRun({
      step: "parse-cv",
      status: "succeeded",
      durationMs: 45_000,
      inputRef: SLOW_INPUT_REF,
    });
    const failedId = await insertAiRun({
      step: "parse-cv",
      status: "failed",
      durationMs: 99_000,
      inputRef: FAILED_INPUT_REF,
    });
    const otherStepId = await insertAiRun({
      step: "match",
      status: "succeeded",
      durationMs: 99_000,
      inputRef: OTHER_STEP_INPUT_REF,
    });

    const fetched = await fetchSucceededParseCvRuns(sql);
    const fetchedIds = fetched.map((run) => run.id);

    expect(fetchedIds).toEqual(
      expect.arrayContaining([fastId, midId, slowId]),
    );
    expect(fetchedIds).not.toContain(failedId);
    expect(fetchedIds).not.toContain(otherStepId);

    const fixtureRuns = fetched.filter((run) =>
      [fastId, midId, slowId].includes(run.id),
    );
    const report = summarizeParseTiming(fixtureRuns);

    expect(report.count).toBe(3);
    expect(report.medianDurationMs).toBe(5_000);
    expect(report.slowest?.duration_ms).toBe(45_000);
    expect(report.slowest?.input_ref).toBe(SLOW_INPUT_REF);
    expect(report.exceedsTarget).toBe(true);
    expect(report.slowest!.duration_ms).toBeGreaterThan(
      PARSE_CV_DURATION_LIMIT_MS,
    );
    expect(parseTimingExitCode(report)).toBe(1);
    expect(formatParseTimingReport(report)).toContain(SLOW_INPUT_REF);
  });

  it("AC4: reports success when every parse-cv run is under 30s", async () => {
    const aId = await insertAiRun({
      step: "parse-cv",
      status: "succeeded",
      durationMs: 100,
      inputRef: FAST_INPUT_REF,
    });
    const bId = await insertAiRun({
      step: "parse-cv",
      status: "succeeded",
      durationMs: 2_000,
      inputRef: FAST_B_INPUT_REF,
    });
    const cId = await insertAiRun({
      step: "parse-cv",
      status: "succeeded",
      durationMs: 15_000,
      inputRef: FAST_C_INPUT_REF,
    });

    const fetched = await fetchSucceededParseCvRuns(sql);
    const fixtureRuns = fetched.filter((run) =>
      [aId, bId, cId].includes(run.id),
    );
    const report = summarizeParseTiming(fixtureRuns);

    expect(report.count).toBe(3);
    expect(report.medianDurationMs).toBe(2_000);
    expect(report.slowest?.duration_ms).toBe(15_000);
    expect(report.slowest?.input_ref).toBe(FAST_C_INPUT_REF);
    expect(report.exceedsTarget).toBe(false);
    expect(parseTimingExitCode(report)).toBe(0);
    expect(formatParseTimingReport(report)).not.toContain("FAIL:");
  });

  it("AC4: no parse-cv runs is a pass (nothing to fail on yet)", () => {
    const report = summarizeParseTiming([]);
    expect(report.count).toBe(0);
    expect(report.medianDurationMs).toBeNull();
    expect(report.slowest).toBeNull();
    expect(report.exceedsTarget).toBe(false);
    expect(formatParseTimingReport(report)).toBe("no parse-cv runs found");
    expect(parseTimingExitCode(report)).toBe(0);
  });
});
