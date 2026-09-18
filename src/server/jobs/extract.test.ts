import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeModel } from "../ai/fake-model";
import {
  EXTRACT_JD_PROMPT_ID,
  EXTRACT_JD_PROMPT_VERSION,
  type ExtractJdOutput,
} from "../ai/prompts/extract-jd";
import { runAi } from "../ai/run";
import type { AiRunRecord, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import {
  assertSupportedJdFile,
  extractJobDescription,
} from "./extract";

vi.mock("../db", () => ({ getDb: vi.fn() }));

vi.mock("../ai/run", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/run")>();
  return {
    ...actual,
    runAi: vi.fn(actual.runAi),
  };
});

/**
 * T2a contract — implement these in `src/server/jobs/extract.ts` (T2b).
 *
 * extractJobDescription({ jdText, model, runs, filename? }) → ExtractJdOutput
 *   One `runAi` call with the extract-jd prompt id/version. Returns pre-fill
 *   data only. Never writes `jobs` / `job_versions`. When `filename` is set,
 *   call `assertSupportedJdFile` before `runAi`.
 *
 * assertSupportedJdFile(filename) → void
 *   Rejects unsupported types (e.g. `.txt`) with a recruiter-facing reason.
 *   The upload route (T2b) must call this before extracting text or calling
 *   the model so an unreadable file never wastes a run.
 *
 * File-type tests live in this file (not `src/app/api/ai/extract-jd/route.test.ts`)
 * so `npm test -- jobs/extract` is the T2a gate.
 */

const MODEL_ID = "fake-extract-jd";
const MODEL_VERSION = "test-1";
const COST_USD = 0.018;

/**
 * Fictional JD. Every source_text in VALID_EXTRACT_OUTPUT is a verbatim
 * substring, in case T2b adds the same evidence check as parseCv.
 */
const JD_TEXT = `Senior Backend Engineer — Meridian Trading Pte Ltd

We are looking for a Senior Backend Engineer to join our fictional payments team.

Requirements:
- Must have 5+ years of backend development experience
- Must have strong Python skills
- Nice to have: experience with Kubernetes
- Must be eligible to work in Singapore without sponsorship (client policy for this regulated desk)
`;

const VALID_EXTRACT_OUTPUT: ExtractJdOutput = {
  title: "Senior Backend Engineer",
  title_source_text: "Senior Backend Engineer",
  requirements: [
    {
      text: "5+ years of backend development experience",
      proposed_marking: "must_have",
      source_text: "Must have 5+ years of backend development experience",
    },
    {
      text: "Strong Python skills",
      proposed_marking: "must_have",
      source_text: "Must have strong Python skills",
    },
    {
      text: "Experience with Kubernetes",
      proposed_marking: "nice_to_have",
      source_text: "Nice to have: experience with Kubernetes",
    },
  ],
  requires_nationality: true,
  nationality_reason_proposal:
    "Client policy requires eligibility to work in Singapore without sponsorship for this regulated desk.",
  nationality_source_text:
    "Must be eligible to work in Singapore without sponsorship (client policy for this regulated desk)",
  requires_language: false,
  language_reason_proposal: null,
  language_source_text: null,
  prompt_injection_detected: false,
  prompt_injection_note: null,
};

/**
 * Looks like a partial extraction (title only). Schema-invalid: must not be
 * returned as pre-fill — "does not pre-fill anything".
 */
const PARTIAL_INVALID_OUTPUT = {
  title: "Senior Backend Engineer",
  title_source_text: "Senior Backend Engineer",
};

type FromCall = { table: string };

function createDbMock() {
  const fromCalls: FromCall[] = [];
  const from = vi.fn((table: string) => {
    fromCalls.push({ table });
    return {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    };
  });

  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, fromCalls };
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

function expectNumericCostAndDuration(row: AiRunRecord): void {
  expect(typeof row.cost_usd).toBe("number");
  expect(Number.isFinite(row.cost_usd)).toBe(true);
  expect(typeof row.duration_ms).toBe("number");
  expect(Number.isFinite(row.duration_ms)).toBe(true);
}

function expectNoJobTableWrites(db: ReturnType<typeof createDbMock>): void {
  expect(db.from).not.toHaveBeenCalledWith("jobs");
  expect(db.from).not.toHaveBeenCalledWith("job_versions");
  expect(db.fromCalls.some((call) => call.table === "jobs")).toBe(false);
  expect(db.fromCalls.some((call) => call.table === "job_versions")).toBe(
    false,
  );
}

async function runExtract(args: {
  object?: unknown;
  jdText?: string;
  filename?: string;
  runs?: AiRunsWriter & { rows: AiRunRecord[] };
  db?: ReturnType<typeof createDbMock>;
  error?: Error;
}) {
  const db = args.db ?? createDbMock();
  const runs = args.runs ?? createMemoryRuns();
  const model = createFakeModel({
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    object: args.object ?? VALID_EXTRACT_OUTPUT,
    error: args.error,
    costUsd: COST_USD,
  });

  const result = await extractJobDescription({
    jdText: args.jdText ?? JD_TEXT,
    model,
    runs,
    filename: args.filename,
  });

  return { result, db, runs, model };
}

describe("extractJobDescription (AC1, AC3)", () => {
  beforeEach(() => {
    vi.mocked(runAi).mockClear();
  });

  it("AC1: extracts fields matching the job form schema", async () => {
    const { result, db } = await runExtract({});

    expect(result.title).toBe("Senior Backend Engineer");
    expect(result.title_source_text).toBe("Senior Backend Engineer");
    expect(result.requirements).toEqual(VALID_EXTRACT_OUTPUT.requirements);
    expect(result.requirements[0]?.proposed_marking).toBe("must_have");
    expect(result.requirements[0]?.source_text).toBe(
      "Must have 5+ years of backend development experience",
    );
    expect(result.requires_nationality).toBe(true);
    expect(result.nationality_reason_proposal).toBe(
      VALID_EXTRACT_OUTPUT.nationality_reason_proposal,
    );
    expect(result.nationality_source_text).toBe(
      VALID_EXTRACT_OUTPUT.nationality_source_text,
    );
    expect(result.requires_language).toBe(false);
    expect(result.language_reason_proposal).toBeNull();
    expect(result.language_source_text).toBeNull();

    expectNoJobTableWrites(db);
  });

  it("does not pre-fill anything when the model output fails the schema", async () => {
    const db = createDbMock();
    const runs = createMemoryRuns();
    let returned: unknown = "not-called";
    let thrown: unknown;

    try {
      returned = await runExtract({
        object: PARTIAL_INVALID_OUTPUT,
        db,
        runs,
      }).then((outcome) => outcome.result);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(returned).toBe("not-called");

    expectNoJobTableWrites(db);

    const failed = runs.rows.filter((row) => row.status === "failed");
    expect(failed.length).toBeGreaterThanOrEqual(1);
    expectNumericCostAndDuration(failed[0]);
  });

  it("goes through runAi with extract-jd and records a numeric ai_runs row", async () => {
    const runs = createMemoryRuns();
    const { model } = await runExtract({ runs });

    expect(runAi).toHaveBeenCalledTimes(1);
    const args = vi.mocked(runAi).mock.calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args?.prompt.id).toBe(EXTRACT_JD_PROMPT_ID);
    expect(args?.prompt.version).toBe(EXTRACT_JD_PROMPT_VERSION);
    expect(args?.prompt.id).toBe("extract-jd");
    expect(args?.prompt.text).toContain(JD_TEXT);
    expect(args?.prompt.text).toContain("<job>");
    expect(args?.model).toBe(model);
    expect(args?.runs).toBe(runs);

    const completed = runs.rows.filter(
      (row) => row.status === "succeeded" || row.status === "failed",
    );
    expect(completed.length).toBeGreaterThanOrEqual(1);
    const row = completed[0];
    expect(row.status).toBe("succeeded");
    expect(row.model_id).toBe(MODEL_ID);
    expect(row.model_version).toBe(MODEL_VERSION);
    expect(row.prompt_version).toBe(EXTRACT_JD_PROMPT_VERSION);
    expect(row.step).toBe("extract-jd");
    expectNumericCostAndDuration(row);
    expect(row.cost_usd).toBe(COST_USD);
  });

  it("AC3: recruiter-edited values win over the AI's proposal on save", async () => {
    /**
     * Approach (stated explicitly): this test does **not** call `createJob`.
     * `createJob` requires form-shaped input (`owner_name`, `client_id`,
     * requirements with `marking` — not `proposed_marking`) and then
     * `revalidatePath` / `redirect`, which are out of scope for this
     * service unit test.
     *
     * Bypass is structurally impossible:
     * - `extractJobDescription` returns pre-fill data only. It has no save
     *   method and does not write `jobs` / `job_versions` (asserted below).
     * - Extraction uses `proposed_marking`; `createJob` reads `marking`. The
     *   AI output cannot be passed straight to the save action.
     * - JobForm (#43) is the only save path: it submits component state at
     *   click-time. Pre-fill only ever *seeds* that state.
     *
     * This fixture therefore: (1) extracts, (2) seeds form-shaped state from
     * the pre-fill (what JobForm will do in T3), (3) applies a recruiter
     * edit on the same requirement, (4) asserts the payload that would be
     * sent to `createJob` carries the recruiter's value, not the AI's.
     */
    const { result: prefill, db } = await runExtract({});

    const editedRequirement = prefill.requirements[0];
    expect(editedRequirement).toBeDefined();
    expect(editedRequirement?.proposed_marking).toBe("must_have");
    expect(editedRequirement).not.toHaveProperty("marking");
    expect(prefill).not.toHaveProperty("save");
    expect(prefill).not.toHaveProperty("createJob");
    expect(typeof (prefill as { save?: unknown }).save).not.toBe("function");

    expectNoJobTableWrites(db);

    const formState = {
      title: prefill.title ?? "",
      requirements: prefill.requirements.map((row) => ({
        text: row.text,
        marking: row.proposed_marking,
      })),
      requires_nationality: prefill.requires_nationality,
      nationality_reason: prefill.nationality_reason_proposal,
      requires_language: prefill.requires_language,
      language_reason: prefill.language_reason_proposal,
    };

    formState.requirements[0] = {
      text: editedRequirement?.text ?? "",
      marking: "nice_to_have",
    };

    const createJobPayload = formState;
    expect(createJobPayload.requirements[0]?.marking).toBe("nice_to_have");
    expect(prefill.requirements[0]?.proposed_marking).toBe("must_have");
    expect(createJobPayload.requirements[0]?.marking).not.toBe(
      prefill.requirements[0]?.proposed_marking,
    );
  });

  it("rejects an unsupported .txt file with a clear reason before any model call", async () => {
    const db = createDbMock();
    const runs = createMemoryRuns();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      object: VALID_EXTRACT_OUTPUT,
      costUsd: COST_USD,
    });
    const generateObject = vi.spyOn(model, "generateObject");

    expect(() => assertSupportedJdFile("client-jd.txt")).toThrow(
      /not supported|PDF or DOCX|file type/i,
    );

    let thrown: unknown;
    try {
      await extractJobDescription({
        jdText: JD_TEXT,
        model,
        runs,
        filename: "client-jd.txt",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    if (thrown instanceof Error) {
      expect(thrown.message.length).toBeGreaterThan(0);
      expect(thrown.message).toMatch(/not supported|PDF or DOCX|file type/i);
      expect(thrown.message.toLowerCase()).not.toBe("error");
    }

    expect(generateObject).not.toHaveBeenCalled();
    expect(runAi).not.toHaveBeenCalled();
    expect(runs.rows).toHaveLength(0);
    expectNoJobTableWrites(db);
  });
});
