import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

/**
 * Report the duration distribution of succeeded `parse-cv` runs in
 * `public.ai_runs`, and fail if the slowest exceeds the PRD 30s target.
 *
 * Run against local Supabase:
 *   npx tsx scripts/checks/parse-timing.ts
 *   node --experimental-strip-types scripts/checks/parse-timing.ts
 */

const LOCAL_STACK_REQUIRED =
  "Start the local stack with `supabase start`. This check uses SUPABASE_DB_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres). It never runs against a remote project.";

const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

export const PARSE_CV_STEP = "parse-cv";
export const PARSE_CV_SUCCEEDED_STATUS = "succeeded";
/** PRD non-functional speed target: under 30 seconds per CV (`duration_ms`). */
export const PARSE_CV_DURATION_LIMIT_MS = 30_000;

export type ParseTimingSql = ReturnType<typeof postgres>;

export type ParseTimingRun = {
  id: string;
  input_ref: string | null;
  duration_ms: number;
};

export type ParseTimingReport = {
  count: number;
  medianDurationMs: number | null;
  slowest: ParseTimingRun | null;
  exceedsTarget: boolean;
};

function assertLocal(url: string, name: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`${name} is not a valid URL. ${LOCAL_STACK_REQUIRED}`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to query host "${host}" (${name}). This check is local-stack only; it never points at a remote Supabase project.`,
    );
  }
}

export function parseTimingDbUrl(
  env: NodeJS.Dict<string> = process.env,
): string {
  const url = env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;
  assertLocal(url, "SUPABASE_DB_URL");
  return url;
}

export function medianDurationMs(values: number[]): number {
  if (values.length === 0) {
    throw new Error("medianDurationMs requires at least one value");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function summarizeParseTiming(
  runs: ParseTimingRun[],
): ParseTimingReport {
  if (runs.length === 0) {
    return {
      count: 0,
      medianDurationMs: null,
      slowest: null,
      exceedsTarget: false,
    };
  }

  const slowest = [...runs].sort((a, b) => {
    if (b.duration_ms !== a.duration_ms) {
      return b.duration_ms - a.duration_ms;
    }
    return a.id.localeCompare(b.id);
  })[0]!;

  return {
    count: runs.length,
    medianDurationMs: medianDurationMs(runs.map((run) => run.duration_ms)),
    slowest,
    exceedsTarget: slowest.duration_ms > PARSE_CV_DURATION_LIMIT_MS,
  };
}

export function formatParseTimingReport(report: ParseTimingReport): string {
  if (report.count === 0) {
    return "no parse-cv runs found";
  }

  const slowestRef = report.slowest?.input_ref ?? "(none)";
  const lines = [
    `parse-cv runs: ${report.count}`,
    `median duration_ms: ${report.medianDurationMs}`,
    `slowest duration_ms: ${report.slowest!.duration_ms}`,
    `slowest input_ref: ${slowestRef}`,
  ];

  if (report.exceedsTarget) {
    lines.push(
      `FAIL: slowest parse exceeds ${PARSE_CV_DURATION_LIMIT_MS}ms: ${slowestRef}`,
    );
  }

  return lines.join("\n");
}

export function parseTimingExitCode(report: ParseTimingReport): 0 | 1 {
  return report.exceedsTarget ? 1 : 0;
}

export async function fetchSucceededParseCvRuns(
  sql: ParseTimingSql,
): Promise<ParseTimingRun[]> {
  const rows = await sql<{
    id: string;
    input_ref: string | null;
    duration_ms: number | string;
  }[]>`
    select id, input_ref, duration_ms
    from public.ai_runs
    where step = ${PARSE_CV_STEP}
      and status = ${PARSE_CV_SUCCEEDED_STATUS}
      and duration_ms is not null
    order by duration_ms desc, id asc
  `;

  return rows.map((row) => ({
    id: row.id,
    input_ref: row.input_ref,
    duration_ms: Number(row.duration_ms),
  }));
}

export async function reportParseCvTiming(
  sql: ParseTimingSql,
): Promise<ParseTimingReport> {
  const runs = await fetchSucceededParseCvRuns(sql);
  return summarizeParseTiming(runs);
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

async function main(): Promise<void> {
  const sql = postgres(parseTimingDbUrl(), {
    max: 1,
    idle_timeout: 2,
    connect_timeout: 5,
  });

  try {
    const report = await reportParseCvTiming(sql);
    console.log(formatParseTimingReport(report));
    process.exitCode = parseTimingExitCode(report);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (isCliEntry()) {
  main().catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(detail);
    process.exitCode = 1;
  });
}
