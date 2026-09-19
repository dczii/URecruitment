/**
 * `npm run seed:demo` — write fictional demo rows so every screen has data.
 *
 * Needs only SUPABASE_URL and SUPABASE_SECRET_KEY (server-side secret key;
 * it bypasses RLS, which is why this never runs in the browser). No AI
 * provider and no Blob token: unlike the sample-data seed, the rows here are
 * ready-made rather than parsed and scored.
 *
 * Idempotent: every row carries a fixed id and is upserted, so re-running
 * converges on the same data. `--reset` deletes the demo rows first, in
 * dependency order.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildDemoSeed,
  DEMO_TABLE_ORDER,
  type DemoRow,
  type DemoSeed,
} from "./demo-data.mts";

type Table = (typeof DEMO_TABLE_ORDER)[number];

const TABLE_ROWS: Array<[Table, (seed: DemoSeed) => DemoRow[]]> = [
  ["clients", (s) => s.clients],
  ["jobs", (s) => s.jobs],
  ["job_versions", (s) => s.jobVersions],
  ["gap_flags", (s) => s.gapFlags],
  ["stage_limits", (s) => s.stageLimits],
  ["candidates", (s) => s.candidates],
  ["cv_files", (s) => s.cvFiles],
  ["candidate_profiles", (s) => s.candidateProfiles],
  ["candidate_skills", (s) => s.candidateSkills],
  ["ai_runs", (s) => s.aiRuns],
  ["match_scores", (s) => s.matchScores],
  ["pipeline_entries", (s) => s.pipelineEntries],
  ["stage_events", (s) => s.stageEvents],
  ["placements", (s) => s.placements],
  ["settings_log", (s) => s.settingsLog],
];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in, or export it before running.`,
    );
  }
  return value;
}

async function loadHolidays(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from("sg_public_holidays").select("date");
  if (error) {
    throw new Error(`Failed to read sg_public_holidays: ${error.message}`);
  }
  return (data ?? []).map((row) => String((row as { date: string }).date));
}

/** Rows already present, per table, before anything is written. */
async function countRows(
  db: SupabaseClient,
  tables: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const table of tables) {
    const { count, error } = await db
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) {
      throw new Error(
        `Failed to count rows in ${table}: ${error.message}. ` +
          "Check SUPABASE_URL / SUPABASE_SECRET_KEY and that the migrations have been applied.",
      );
    }
    counts.set(table, count ?? 0);
  }
  return counts;
}

async function deleteSeed(db: SupabaseClient, seed: DemoSeed): Promise<void> {
  for (const [table, rowsOf] of [...TABLE_ROWS].reverse()) {
    const ids = rowsOf(seed).map((row) => String(row.id));
    if (ids.length === 0) {
      continue;
    }
    if (table === "jobs") {
      // A job points at its current version, and job_versions is deleted
      // after jobs here — drop the pointer first so neither FK blocks.
      const { error } = await db
        .from("jobs")
        .update({ current_version_id: null })
        .in("id", ids);
      if (error) {
        throw new Error(`Failed to clear job current_version_id: ${error.message}`);
      }
    }
    const { error } = await db.from(table).delete().in("id", ids);
    if (error) {
      throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
  }
}

async function upsertSeed(db: SupabaseClient, seed: DemoSeed): Promise<void> {
  for (const [table, rowsOf] of TABLE_ROWS) {
    const rows = rowsOf(seed);
    if (rows.length === 0) {
      continue;
    }
    const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
    if (error) {
      throw new Error(`Failed to seed ${table}: ${error.message}`);
    }
    if (table === "job_versions") {
      // Set after the versions exist, so jobs.current_version_id resolves.
      for (const pointer of seed.jobCurrentVersions) {
        const { error: pointerError } = await db
          .from("jobs")
          .update({ current_version_id: pointer.current_version_id })
          .eq("id", pointer.id);
        if (pointerError) {
          throw new Error(
            `Failed to point job ${pointer.id} at its current version: ${pointerError.message}`,
          );
        }
      }
    }
  }
}

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");
  const checkOnly = process.argv.includes("--check");

  const db = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false } },
  );

  const tables = [...DEMO_TABLE_ORDER];
  const before = await countRows(db, tables);
  const total = [...before.values()].reduce<number>((sum, count) => sum + count, 0);

  console.log("Rows currently in Supabase:");
  for (const table of tables) {
    console.log(`  ${table.padEnd(20)} ${before.get(table) ?? 0}`);
  }
  console.log(`  ${"total".padEnd(20)} ${total}`);

  if (checkOnly) {
    console.log(
      total === 0
        ? "\nEmpty. Run `npm run seed:demo` to add the fictional demo data."
        : "\nData is present. `npm run seed:demo` would update the demo rows in place.",
    );
    return;
  }

  const matchModelVersion = process.env.AI_MODEL_MATCH?.trim() || "demo-match-model";
  if (!process.env.AI_MODEL_MATCH?.trim()) {
    console.warn(
      `\nAI_MODEL_MATCH is not set. Seeding match scores as "${matchModelVersion}"; ` +
        "set AI_MODEL_MATCH to the same value or the app will read every score as stale.",
    );
  }

  const holidays = await loadHolidays(db);
  const seed = buildDemoSeed({
    today: new Date(),
    holidays,
    matchModelVersion,
  });

  if (reset) {
    console.log("\nClearing previously seeded demo rows…");
    await deleteSeed(db, seed);
  }

  console.log("\nWriting demo data…");
  await upsertSeed(db, seed);

  console.log("\nSeeded:");
  for (const [table, rowsOf] of TABLE_ROWS) {
    console.log(`  ${table.padEnd(20)} ${rowsOf(seed).length}`);
  }
  console.log(
    "\nAll fictional. Match scores use model_version " +
      `"${matchModelVersion}". Stage limits are demo values, not the PRD's.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
