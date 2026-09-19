import { describe, expect, it } from "vitest";

import { workingDaysElapsed } from "@/lib/working-days";
import { resolveStageLimit, type StageLimitRow } from "@/lib/stage-limits";
import { ALL_PIPELINE_STAGES, STAGES } from "@/lib/stages";
import {
  buildDemoSeed,
  DEMO_STAGE_LIMIT_DAYS,
  workingDaysAgo,
  type DemoSeed,
} from "./demo-data.mts";

const HOLIDAYS = ["2026-01-01", "2026-05-01", "2026-08-10", "2026-12-25"];

/** A Wednesday, a Saturday and a day after a holiday: the shape must hold on all three. */
const RUN_DAYS = [
  new Date("2026-09-16T04:00:00.000Z"),
  new Date("2026-09-19T04:00:00.000Z"),
  new Date("2026-12-26T04:00:00.000Z"),
];

function seedFor(today: Date): DemoSeed {
  return buildDemoSeed({
    today,
    holidays: HOLIDAYS,
    matchModelVersion: "demo-match-model",
  });
}

function limitRows(seed: DemoSeed): StageLimitRow[] {
  return seed.stageLimits.map((row) => ({
    scope: row.scope as StageLimitRow["scope"],
    client_id: (row.client_id as string | null) ?? null,
    job_id: (row.job_id as string | null) ?? null,
    stage: row.stage as string,
    limit_days: row.limit_days as number,
  }));
}

/** Mirrors the pipeline_status view's boundaries. */
function delayStatus(
  usedDays: number,
  limitDays: number,
): "overdue" | "due-soon" | "on-track" {
  if (usedDays > limitDays) {
    return "overdue";
  }
  return usedDays >= Math.ceil(limitDays * 0.8) ? "due-soon" : "on-track";
}

describe("workingDaysAgo", () => {
  it.each(RUN_DAYS)("is exactly N working days before %s", (today) => {
    for (const days of [1, 4, 7, 13]) {
      expect(workingDaysElapsed(workingDaysAgo(today, days, HOLIDAYS), today, HOLIDAYS)).toBe(days);
    }
  });
});

describe("buildDemoSeed", () => {
  it.each(RUN_DAYS)("gives every page rows on %s", (today) => {
    const seed = seedFor(today);
    expect(seed.clients.length).toBeGreaterThan(0);
    expect(seed.jobs.length).toBeGreaterThan(0);
    expect(seed.candidates.length).toBeGreaterThan(0);
    expect(seed.candidateProfiles).toHaveLength(seed.candidates.length);
    expect(seed.matchScores.length).toBeGreaterThan(0);
    expect(seed.placements.length).toBeGreaterThan(0);
    expect(seed.gapFlags.some((flag) => flag.resolution_state === "open")).toBe(true);
  });

  it("uses distinct ids within every table", () => {
    const seed = seedFor(RUN_DAYS[0]);
    for (const [name, rows] of Object.entries(seed)) {
      if (!Array.isArray(rows) || name === "jobCurrentVersions") {
        continue;
      }
      const ids = rows.map((row) => String((row as { id: unknown }).id));
      expect(new Set(ids).size, `duplicate id in ${name}`).toBe(ids.length);
    }
  });

  it("is deterministic for the same day", () => {
    expect(seedFor(RUN_DAYS[0])).toEqual(seedFor(RUN_DAYS[0]));
  });

  it("only uses stages the DB constraint allows", () => {
    const seed = seedFor(RUN_DAYS[0]);
    for (const entry of seed.pipelineEntries) {
      expect(ALL_PIPELINE_STAGES).toContain(entry.stage);
    }
    for (const event of seed.stageEvents) {
      expect(ALL_PIPELINE_STAGES).toContain(event.to_stage);
      if (event.from_stage !== null) {
        expect(ALL_PIPELINE_STAGES).toContain(event.from_stage);
      }
    }
    for (const stage of Object.keys(DEMO_STAGE_LIMIT_DAYS)) {
      expect(STAGES).toContain(stage);
    }
  });

  it("covers every stage at least once", () => {
    const seed = seedFor(RUN_DAYS[0]);
    const used = new Set(seed.pipelineEntries.map((entry) => entry.stage));
    for (const stage of ALL_PIPELINE_STAGES) {
      expect(used, `no pipeline entry in ${stage}`).toContain(stage);
    }
  });

  it.each(RUN_DAYS)("shows all three delay statuses on %s", (today) => {
    const seed = seedFor(today);
    const rows = limitRows(seed);
    const jobClient = new Map(
      seed.jobs.map((job) => [String(job.id), String(job.client_id)]),
    );

    const statuses = new Set<string>();
    for (const entry of seed.pipelineEntries) {
      const stage = String(entry.stage);
      if (!(STAGES as readonly string[]).includes(stage) || stage === "Placed") {
        continue;
      }
      const limit = resolveStageLimit(rows, {
        jobId: String(entry.job_id),
        clientId: jobClient.get(String(entry.job_id)) ?? "",
        stage,
      });
      expect(limit).not.toBeNull();
      statuses.add(
        delayStatus(
          workingDaysElapsed(String(entry.entered_at), today, HOLIDAYS),
          limit as number,
        ),
      );
    }

    expect(statuses).toEqual(new Set(["overdue", "due-soon", "on-track"]));
  });

  it.each(RUN_DAYS)("shows both guarantee flags on %s", (today) => {
    const seed = seedFor(today);
    const todaySgt = new Date(today.getTime() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const flags = seed.placements.map((placement) =>
      String(placement.guarantee_end_date) < todaySgt ? "ended" : "ending-soon",
    );
    expect(new Set(flags)).toEqual(new Set(["ended", "ending-soon"]));
  });

  it("keys match scores to the configured match model version", () => {
    const seed = buildDemoSeed({
      today: RUN_DAYS[0],
      holidays: HOLIDAYS,
      matchModelVersion: "some-model-id",
    });
    for (const score of seed.matchScores) {
      expect(score.model_version).toBe("some-model-id");
    }
  });

  it("caps a score when a must-have is missing", () => {
    const seed = seedFor(RUN_DAYS[0]);
    const capped = seed.matchScores.filter(
      (score) => (score.missing as string[]).length > 0,
    );
    expect(capped.length).toBeGreaterThan(0);
    for (const score of capped) {
      expect(score.score).toBe(50);
      expect(score.raw_score as number).toBeGreaterThan(50);
    }
  });

  it("writes a reason wherever language or nationality is a real requirement", () => {
    const seed = seedFor(RUN_DAYS[0]);
    for (const version of seed.jobVersions) {
      if (version.requires_language) {
        expect(String(version.language_reason).trim().length).toBeGreaterThan(0);
      }
      if (version.requires_nationality) {
        expect(String(version.nationality_reason).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("records no protected attributes on a parsed profile", () => {
    const seed = seedFor(RUN_DAYS[0]);
    const banned = ["gender", "age", "race", "religion", "marital", "nationality", "photo"];
    for (const profile of seed.candidateProfiles) {
      const keys = Object.keys(profile.parsed as Record<string, unknown>);
      for (const key of keys) {
        expect(banned).not.toContain(key);
      }
    }
  });

  it("gives every AI run the traceability columns", () => {
    const seed = seedFor(RUN_DAYS[0]);
    expect(seed.aiRuns.length).toBeGreaterThan(0);
    for (const run of seed.aiRuns) {
      expect(run.model_id).toBeTruthy();
      expect(run.model_version).toBeTruthy();
      expect(run.prompt_version).toBeTruthy();
      expect(run.cost_usd).toBeTypeOf("number");
      expect(run.duration_ms).toBeTypeOf("number");
    }
  });
});
