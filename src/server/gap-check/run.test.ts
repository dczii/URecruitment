import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeModel } from "../ai/fake-model";
import {
  GAP_CHECK_EXAMPLES,
  GAP_CHECK_PROMPT_ID,
  GAP_CHECK_PROMPT_VERSION,
  type GapCheckOutput,
} from "../ai/prompts/gap-check";
import type { AiRunRecord, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import {
  checkMissingFields,
  type GapCheckFields,
  type MustHave,
} from "./missing-fields";
import { runGapCheck } from "./run";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * T2a contract — implement these in `src/server/gap-check/run.ts` (T2b).
 *
 * runGapCheck({ jobVersionId, fields, mustHaves, formText, jdText, model, runs })
 *   → Promise<void>
 *
 *   Orchestrates the save-path gap check. Never rejects: a model / schema /
 *   evidence failure is swallowed after `runAi` has written the `ai_runs` row,
 *   so `createJob` can still `redirect()`. Missing-field flags from #45 still
 *   persist on that path.
 *
 *   1. `checkMissingFields({ fields, must_haves: mustHaves })` then
 *      `persistMissingFieldFlags(jobVersionId, missingFlags)` — always, even
 *      when the model fails.
 *   2. One `runAi` call with `gapCheckOutputSchema`, prompt id/version
 *      `GAP_CHECK_PROMPT_ID` / `GAP_CHECK_PROMPT_VERSION`, and
 *      `buildGapCheckInput(formText, jdText ?? null)`.
 *      `inputRef` is `job_versions:${jobVersionId}`.
 *   3. Per-flag verbatim evidence (drop the flag, not the run):
 *        uncertain / fair-employment: `source_text` is a substring of
 *          `formText` or `jdText` (when present).
 *        conflicting: `form_source_text` is a substring of `formText` AND
 *          `jd_source_text` is a substring of `jdText`. Missing jdText → drop.
 *   4. Dedup (successful schema-valid response only): DELETE previous open
 *      AI-sourced flags for this job version, then INSERT the verified set.
 *        .from("gap_flags").delete()
 *        .eq("job_version_id", jobVersionId)
 *        .eq("resolution_state", "open")
 *        .in("flag_type", ["uncertain", "conflicting", "fair-employment"])
 *      Do not delete `flag_type: "missing"` rows. Do not delete on model
 *      failure / schema-invalid output (leave any previous AI flags alone).
 *
 * Persisted AI-sourced `gap_flags` row (table has no quote column):
 *   job_version_id, flag_type, reason, suggested_question, resolution_state
 *   flag_type:        "uncertain" | "conflicting" | "fair-employment"
 *   suggested_question: the model's `client_question`
 *   resolution_state: "open"
 *   reason encodes quotes + why_it_matters (see formatters below). Fair-
 *   employment flags are informational only — a recruiter question, not a
 *   decision about the job or any candidate.
 */

const MODEL_ID = "fake-gap";
const MODEL_VERSION = "test-1";
const COST_USD = 0.012;

/** Fictional job_versions.id — never a real client job. */
const JOB_VERSION_ID = "00000000-0000-0000-0000-000000000301";

const INVENTED_QUOTE = "INVENTED_QUOTE_NOT_IN_SOURCE";

const COMPLETE_FIELDS: GapCheckFields = {
  salary_range: "SGD 8,000–12,000 per month",
  location: "Singapore",
  work_arrangement: "Hybrid, three days in the office",
  employment_type: "Permanent",
  headcount: 2,
  start_date: "2026-11-03",
  interview_steps:
    "Recruiter screen, hiring-manager interview, client final round",
};

const COMPLETE_MUST_HAVES: MustHave[] = [
  {
    text: "Five years of Python in a backend role",
    marking: "must_have",
  },
];

/**
 * Fictional form dump. Every AC1–AC3 quote from GAP_CHECK_EXAMPLES[0] is a
 * verbatim substring of this text.
 */
const FORM_TEXT = `Title: Senior Backend Engineer
Salary: Competitive salary
Location: Singapore
Requirements: 5+ years Python; must be under 35 years old for team fit`;

const JD_TEXT = `Senior Backend Engineer — Meridian Trading Pte Ltd
Salary: SGD 9,000 - 11,000 per month
Location: Remote (Singapore-based)
Requirements: 5+ years Python, strong system design skills.`;

const EN_EXAMPLE = GAP_CHECK_EXAMPLES[0]?.output;
if (!EN_EXAMPLE) {
  throw new Error("GAP_CHECK_EXAMPLES[0] is required for gap-check fixtures");
}

const UNCERTAIN = EN_EXAMPLE.uncertain_flags[0];
const CONFLICTING = EN_EXAMPLE.conflicting_flags[0];
const FAIR_EMPLOYMENT = EN_EXAMPLE.fair_employment_flags[0];
if (!UNCERTAIN || !CONFLICTING || !FAIR_EMPLOYMENT) {
  throw new Error("GAP_CHECK_EXAMPLES[0] is missing flag fixtures");
}

const AI_SOURCED_FLAG_TYPES = [
  "uncertain",
  "conflicting",
  "fair-employment",
] as const;

const GAP_FLAGS_INSERT_COLUMNS = [
  "job_version_id",
  "flag_type",
  "reason",
  "suggested_question",
  "resolution_state",
  "resolution_note",
  "id",
  "created_at",
] as const;

type DbFilter = {
  method: "eq" | "in";
  column: string;
  value: unknown;
};

type InsertCall = { table: string; payload: unknown };
type DeleteCall = { table: string; filters: DbFilter[] };

/**
 * Uncertain / fair-employment `reason`: quote on line 1, why_it_matters after.
 * Conflicting `reason`: labeled Form / JD quotes, then why_it_matters.
 * `gap_flags` has no dedicated two-quote column, so both quotes live here.
 */
function uncertainReason(sourceText: string, whyItMatters: string): string {
  return `"${sourceText}"\n${whyItMatters}`;
}

function conflictingReason(
  formSourceText: string,
  jdSourceText: string,
  whyItMatters: string,
): string {
  return `Form: "${formSourceText}"\nJD: "${jdSourceText}"\n${whyItMatters}`;
}

function emptyOutput(
  overrides: Partial<GapCheckOutput> = {},
): GapCheckOutput {
  return {
    uncertain_flags: [],
    conflicting_flags: [],
    fair_employment_flags: [],
    prompt_injection_detected: false,
    prompt_injection_note: null,
    ...overrides,
  };
}

function isAiSourcedFlagType(flagType: unknown): boolean {
  return (
    flagType === "uncertain" ||
    flagType === "conflicting" ||
    flagType === "fair-employment"
  );
}

function thenable(result: { data: unknown; error: null }) {
  return {
    then: (
      onfulfilled?: (value: typeof result) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
}

function rowMatchesFilters(
  row: Record<string, unknown>,
  filters: DbFilter[],
): boolean {
  for (const filter of filters) {
    if (filter.method === "eq" && row[filter.column] !== filter.value) {
      return false;
    }
    if (filter.method === "in") {
      const allowed = filter.value;
      if (!Array.isArray(allowed) || !allowed.includes(row[filter.column])) {
        return false;
      }
    }
  }
  return true;
}

function createGapFlagsDb() {
  const stored: Record<string, unknown>[] = [];
  const inserts: InsertCall[] = [];
  const deletes: DeleteCall[] = [];

  const from = vi.fn((table: string) => {
    const insert = vi.fn((payload: unknown) => {
      inserts.push({ table, payload });
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows) {
        stored.push({ ...(row as Record<string, unknown>) });
      }
      return thenable({ data: rows, error: null });
    });

    const deleteFn = vi.fn(() => {
      const filters: DbFilter[] = [];
      const chain = {
        eq(column: string, value: unknown) {
          filters.push({ method: "eq", column, value });
          return chain;
        },
        in(column: string, value: unknown) {
          filters.push({ method: "in", column, value });
          return chain;
        },
        select() {
          return chain;
        },
        then(
          onfulfilled?: (value: { data: null; error: null }) => unknown,
          onrejected?: (reason: unknown) => unknown,
        ) {
          deletes.push({ table, filters: [...filters] });
          for (let index = stored.length - 1; index >= 0; index -= 1) {
            const row = stored[index];
            if (row && rowMatchesFilters(row, filters)) {
              stored.splice(index, 1);
            }
          }
          return Promise.resolve({ data: null, error: null }).then(
            onfulfilled,
            onrejected,
          );
        },
      };
      return chain;
    });

    return { insert, delete: deleteFn };
  });

  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, stored, inserts, deletes };
}

function createMemoryRuns(): AiRunsWriter & { rows: AiRunRecord[] } {
  const rows: AiRunRecord[] = [];
  return {
    rows,
    write(row) {
      rows.push({ ...row });
    },
  };
}

function completedRows(runs: { rows: AiRunRecord[] }): AiRunRecord[] {
  return runs.rows.filter(
    (row) => row.status === "succeeded" || row.status === "failed",
  );
}

function expectNumericCostAndDuration(row: AiRunRecord): void {
  expect(typeof row.cost_usd).toBe("number");
  expect(Number.isFinite(row.cost_usd)).toBe(true);
  expect(row.cost_usd).toBeGreaterThanOrEqual(0);
  expect(typeof row.duration_ms).toBe("number");
  expect(Number.isFinite(row.duration_ms)).toBe(true);
  expect(row.duration_ms).toBeGreaterThanOrEqual(0);
}

function aiFlagRows(
  stored: Record<string, unknown>[],
): Record<string, unknown>[] {
  return stored.filter((row) => isAiSourcedFlagType(row.flag_type));
}

function assertAllowedGapFlagColumns(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(GAP_FLAGS_INSERT_COLUMNS).toContain(key);
  }
}

async function runCheck(args: {
  object?: unknown;
  error?: Error;
  fields?: GapCheckFields;
  mustHaves?: MustHave[];
  formText?: string;
  jdText?: string | null;
  runs?: AiRunsWriter & { rows: AiRunRecord[] };
  db?: ReturnType<typeof createGapFlagsDb>;
  jobVersionId?: string;
}) {
  const db = args.db ?? createGapFlagsDb();
  const runs = args.runs ?? createMemoryRuns();
  const model = createFakeModel({
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    object: args.object ?? emptyOutput(),
    error: args.error,
    costUsd: COST_USD,
  });

  await runGapCheck({
    jobVersionId: args.jobVersionId ?? JOB_VERSION_ID,
    fields: args.fields ?? { ...COMPLETE_FIELDS },
    mustHaves: args.mustHaves ?? [...COMPLETE_MUST_HAVES],
    formText: args.formText ?? FORM_TEXT,
    jdText: args.jdText,
    model,
    runs,
  });

  return { db, runs, model };
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("runGapCheck (AC1, AC2, AC3, AC4)", () => {
  it("AC1: vague salary wording raises an uncertain flag with the quote and a question", async () => {
    const { db } = await runCheck({
      object: emptyOutput({ uncertain_flags: [UNCERTAIN] }),
    });

    const flags = aiFlagRows(db.stored);
    expect(flags).toHaveLength(1);
    const flag = flags[0];
    expect(flag).toEqual(
      expect.objectContaining({
        job_version_id: JOB_VERSION_ID,
        flag_type: "uncertain",
        resolution_state: "open",
        reason: uncertainReason(UNCERTAIN.source_text, UNCERTAIN.why_it_matters),
        suggested_question: UNCERTAIN.client_question,
      }),
    );
    expect(flag?.reason).toContain("Competitive salary");
    expect(String(flag?.suggested_question)).toMatch(/\?/);
    expect(FORM_TEXT).toContain("Competitive salary");
    if (flag) {
      assertAllowedGapFlagColumns(flag);
    }
  });

  it("AC2: JD/form contradiction raises a conflicting flag quoting both sources", async () => {
    const { db } = await runCheck({
      object: emptyOutput({ conflicting_flags: [CONFLICTING] }),
      jdText: JD_TEXT,
    });

    const flags = aiFlagRows(db.stored);
    expect(flags).toHaveLength(1);
    const flag = flags[0];
    expect(flag).toEqual(
      expect.objectContaining({
        job_version_id: JOB_VERSION_ID,
        flag_type: "conflicting",
        resolution_state: "open",
        reason: conflictingReason(
          CONFLICTING.form_source_text,
          CONFLICTING.jd_source_text,
          CONFLICTING.why_it_matters,
        ),
        suggested_question: CONFLICTING.client_question,
      }),
    );
    expect(flag?.reason).toContain(CONFLICTING.form_source_text);
    expect(flag?.reason).toContain(CONFLICTING.jd_source_text);
    expect(String(flag?.reason)).toMatch(/Form:/);
    expect(String(flag?.reason)).toMatch(/JD:/);
    expect(FORM_TEXT).toContain(CONFLICTING.form_source_text);
    expect(JD_TEXT).toContain(CONFLICTING.jd_source_text);
    if (flag) {
      assertAllowedGapFlagColumns(flag);
    }
  });

  it("AC3: an age/gender/race/religion preference raises a fair-employment flag", async () => {
    const { db } = await runCheck({
      object: emptyOutput({ fair_employment_flags: [FAIR_EMPLOYMENT] }),
    });

    const flags = aiFlagRows(db.stored);
    expect(flags).toHaveLength(1);
    const flag = flags[0];
    expect(flag).toEqual(
      expect.objectContaining({
        job_version_id: JOB_VERSION_ID,
        flag_type: "fair-employment",
        resolution_state: "open",
        reason: uncertainReason(
          FAIR_EMPLOYMENT.source_text,
          FAIR_EMPLOYMENT.why_it_matters,
        ),
        suggested_question: FAIR_EMPLOYMENT.client_question,
      }),
    );
    expect(flag?.reason).toContain(FAIR_EMPLOYMENT.source_text);
    expect(String(flag?.reason)).toMatch(/TAFEP/i);
    expect(String(flag?.suggested_question)).toMatch(/\?/);
    expect(FORM_TEXT).toContain(FAIR_EMPLOYMENT.source_text);
    if (flag) {
      assertAllowedGapFlagColumns(flag);
    }
  });

  it("AC4: an invented quote is dropped and the verifiable flag is still persisted", async () => {
    expect(FORM_TEXT.includes(INVENTED_QUOTE)).toBe(false);
    expect((JD_TEXT ?? "").includes(INVENTED_QUOTE)).toBe(false);

    const { db } = await runCheck({
      object: emptyOutput({
        uncertain_flags: [
          {
            type: "uncertain",
            source_text: INVENTED_QUOTE,
            why_it_matters: "This quote was invented and must be dropped.",
            client_question: "Please ignore this invented flag?",
          },
          UNCERTAIN,
        ],
      }),
    });

    const flags = aiFlagRows(db.stored);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.flag_type).toBe("uncertain");
    expect(flags[0]?.reason).toContain(UNCERTAIN.source_text);
    expect(flags[0]?.reason).not.toContain(INVENTED_QUOTE);
    expect(flags[0]?.suggested_question).toBe(UNCERTAIN.client_question);
  });

  it("a schema-invalid model response persists missing-field flags and zero AI-sourced flags", async () => {
    const fields: GapCheckFields = {
      location: COMPLETE_FIELDS.location,
      work_arrangement: COMPLETE_FIELDS.work_arrangement,
      employment_type: COMPLETE_FIELDS.employment_type,
      headcount: COMPLETE_FIELDS.headcount,
      start_date: COMPLETE_FIELDS.start_date,
      interview_steps: COMPLETE_FIELDS.interview_steps,
    };
    const mustHaves = [...COMPLETE_MUST_HAVES];
    const expectedMissing = checkMissingFields({
      fields,
      must_haves: mustHaves,
    });
    expect(expectedMissing.length).toBeGreaterThan(0);

    const { db, runs } = await runCheck({
      object: { garbage: true },
      fields,
      mustHaves,
    });

    expect(aiFlagRows(db.stored)).toHaveLength(0);

    const missingRows = db.stored.filter((row) => row.flag_type === "missing");
    expect(missingRows).toHaveLength(expectedMissing.length);
    expect(missingRows).toEqual(
      expect.arrayContaining(
        expectedMissing.map((flag) =>
          expect.objectContaining({
            job_version_id: JOB_VERSION_ID,
            flag_type: "missing",
            resolution_state: "open",
            reason: flag.reason,
            suggested_question: flag.suggested_question,
          }),
        ),
      ),
    );

    const completed = completedRows(runs);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.status).toBe("failed");
  });

  it("saving the same job twice does not duplicate AI-sourced flags", async () => {
    const db = createGapFlagsDb();

    await runCheck({
      db,
      object: emptyOutput({ uncertain_flags: [UNCERTAIN] }),
    });
    await runCheck({
      db,
      object: emptyOutput({ fair_employment_flags: [FAIR_EMPLOYMENT] }),
    });

    const targetedDeletes = db.deletes.filter((call) => {
      if (call.table !== "gap_flags") {
        return false;
      }
      const jobVersion = call.filters.find(
        (filter) =>
          filter.method === "eq" &&
          filter.column === "job_version_id" &&
          filter.value === JOB_VERSION_ID,
      );
      const openOnly = call.filters.find(
        (filter) =>
          filter.method === "eq" &&
          filter.column === "resolution_state" &&
          filter.value === "open",
      );
      const aiTypes = call.filters.find((filter) => {
        if (filter.method !== "in" || filter.column !== "flag_type") {
          return false;
        }
        if (!Array.isArray(filter.value)) {
          return false;
        }
        const allowed = filter.value;
        return AI_SOURCED_FLAG_TYPES.every((type) => allowed.includes(type));
      });
      return Boolean(jobVersion && openOnly && aiTypes);
    });
    expect(targetedDeletes.length).toBeGreaterThanOrEqual(1);

    const flags = aiFlagRows(db.stored);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.flag_type).toBe("fair-employment");
    expect(flags[0]?.reason).toContain(FAIR_EMPLOYMENT.source_text);
    expect(flags.some((row) => row.flag_type === "uncertain")).toBe(false);
  });

  it("a gap-check model failure does not throw", async () => {
    const db = createGapFlagsDb();
    const runs = createMemoryRuns();

    await expect(
      runGapCheck({
        jobVersionId: JOB_VERSION_ID,
        fields: { ...COMPLETE_FIELDS },
        mustHaves: [...COMPLETE_MUST_HAVES],
        formText: FORM_TEXT,
        model: createFakeModel({
          modelId: MODEL_ID,
          modelVersion: MODEL_VERSION,
          error: new Error("provider unavailable"),
        }),
        runs,
      }),
    ).resolves.toBeUndefined();

    expect(aiFlagRows(db.stored)).toHaveLength(0);
  });

  it("every run writes one ai_runs row with numeric cost and duration on success and failure", async () => {
    createGapFlagsDb();

    const successRuns = createMemoryRuns();
    await runGapCheck({
      jobVersionId: JOB_VERSION_ID,
      fields: { ...COMPLETE_FIELDS },
      mustHaves: [...COMPLETE_MUST_HAVES],
      formText: FORM_TEXT,
      model: createFakeModel({
        modelId: MODEL_ID,
        modelVersion: MODEL_VERSION,
        object: emptyOutput(),
        costUsd: COST_USD,
      }),
      runs: successRuns,
    });

    const successCompleted = completedRows(successRuns);
    expect(successCompleted).toHaveLength(1);
    const successRow = successCompleted[0];
    expect(successRow.status).toBe("succeeded");
    expect(successRow.input_ref).toBe(`job_versions:${JOB_VERSION_ID}`);
    expect(successRow.model_id).toBe(MODEL_ID);
    expect(successRow.model_version).toBe(MODEL_VERSION);
    expect(successRow.prompt_version).toBe(GAP_CHECK_PROMPT_VERSION);
    expect(successRow.step).toBe(GAP_CHECK_PROMPT_ID);
    expectNumericCostAndDuration(successRow);
    expect(successRow.cost_usd).toBe(COST_USD);

    const failureRuns = createMemoryRuns();
    await runGapCheck({
      jobVersionId: JOB_VERSION_ID,
      fields: { ...COMPLETE_FIELDS },
      mustHaves: [...COMPLETE_MUST_HAVES],
      formText: FORM_TEXT,
      model: createFakeModel({
        modelId: MODEL_ID,
        modelVersion: MODEL_VERSION,
        error: new Error("simulated timeout"),
      }),
      runs: failureRuns,
    });

    const failureCompleted = completedRows(failureRuns);
    expect(failureCompleted).toHaveLength(1);
    const failureRow = failureCompleted[0];
    expect(failureRow.status).toBe("failed");
    expect(failureRow.input_ref).toBe(`job_versions:${JOB_VERSION_ID}`);
    expect(failureRow.model_id).toBe(MODEL_ID);
    expect(failureRow.model_version).toBe(MODEL_VERSION);
    expect(failureRow.prompt_version).toBe(GAP_CHECK_PROMPT_VERSION);
    expect(failureRow.step).toBe(GAP_CHECK_PROMPT_ID);
    expect(typeof failureRow.error).toBe("string");
    expect(failureRow.error).toBeTruthy();
    expectNumericCostAndDuration(failureRow);
  });
});
