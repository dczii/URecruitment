import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFakeModel } from "./fake-model";
import { runAi } from "./run";
import type { AiPrompt, AiRunRecord, AiRunsWriter } from "./types";

/**
 * Failure mode: throw. Schema-invalid output and provider errors both throw
 * after the failed `ai_runs` row is written, so callers cannot miss a failure.
 */

const OUTPUT_SCHEMA = z.object({
  title: z.string(),
  years: z.number(),
});

const VALID_OUTPUT = {
  title: "Software Engineer",
  years: 5,
} as const;

const PROMPT: AiPrompt = {
  id: "parse-cv",
  version: "1.0.0",
  text: "Extract the job title and years of experience from this fictional CV.",
};

const INPUT_REF = "cv_files:00000000-0000-0000-0000-000000000001";
const MODEL_ID = "fake-parse";
const MODEL_VERSION = "test-1";

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

async function expectRunAiThrows(
  run: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("expected runAi to throw");
}

describe("runAi (AC1, AC2)", () => {
  it("AC1: writes ai_runs row on success", async () => {
    const runs = createMemoryRuns();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      object: VALID_OUTPUT,
      costUsd: 0.002,
    });

    const output = await runAi({
      prompt: PROMPT,
      schema: OUTPUT_SCHEMA,
      inputRef: INPUT_REF,
      model,
      runs,
    });

    expect(output).toEqual(VALID_OUTPUT);

    const completed = completedRows(runs);
    expect(completed).toHaveLength(1);
    const row = completed[0];
    expect(row.input_ref).toBe(INPUT_REF);
    expect(row.model_id).toBe(MODEL_ID);
    expect(row.model_version).toBe(MODEL_VERSION);
    expect(row.prompt_version).toBe(PROMPT.version);
    expect(row.output).toEqual(VALID_OUTPUT);
    expect(row.status).toBe("succeeded");
    expect(row.error).toBeNull();
    expectNumericCostAndDuration(row);
    expect(row.cost_usd).toBe(0.002);
  });

  it("AC2: rejects schema-invalid output and still logs a failed run", async () => {
    const runs = createMemoryRuns();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      object: { title: "Software Engineer", years: "five" },
    });

    const error = await expectRunAiThrows(() =>
      runAi({
        prompt: PROMPT,
        schema: OUTPUT_SCHEMA,
        inputRef: INPUT_REF,
        model,
        runs,
      }),
    );

    expect(error).toBeInstanceOf(Error);

    const completed = completedRows(runs);
    expect(completed).toHaveLength(1);
    const row = completed[0];
    expect(row.status).toBe("failed");
    expect(typeof row.error).toBe("string");
    expect(row.error).toBeTruthy();
    expect(row.input_ref).toBe(INPUT_REF);
    expect(row.model_id).toBe(MODEL_ID);
    expect(row.model_version).toBe(MODEL_VERSION);
    expect(row.prompt_version).toBe(PROMPT.version);
    expectNumericCostAndDuration(row);
  });

  it("AC1: writes ai_runs row on provider error", async () => {
    const runs = createMemoryRuns();
    const providerError = new Error("provider unavailable");
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      error: providerError,
    });

    const error = await expectRunAiThrows(() =>
      runAi({
        prompt: PROMPT,
        schema: OUTPUT_SCHEMA,
        inputRef: INPUT_REF,
        model,
        runs,
      }),
    );

    expect(error).toBe(providerError);

    const completed = completedRows(runs);
    expect(completed).toHaveLength(1);
    const row = completed[0];
    expect(row.status).toBe("failed");
    expect(row.error).toContain("provider unavailable");
    expect(row.input_ref).toBe(INPUT_REF);
    expect(row.model_id).toBe(MODEL_ID);
    expect(row.model_version).toBe(MODEL_VERSION);
    expect(row.prompt_version).toBe(PROMPT.version);
    expectNumericCostAndDuration(row);
  });

  it("AC1: cost and duration are always present and numeric on success and failure", async () => {
    const successRuns = createMemoryRuns();
    await runAi({
      prompt: PROMPT,
      schema: OUTPUT_SCHEMA,
      inputRef: INPUT_REF,
      model: createFakeModel({
        modelId: MODEL_ID,
        modelVersion: MODEL_VERSION,
        object: VALID_OUTPUT,
      }),
      runs: successRuns,
    });
    const successRow = completedRows(successRuns)[0];
    expect(successRow.status).toBe("succeeded");
    expectNumericCostAndDuration(successRow);

    const failureRuns = createMemoryRuns();
    await expectRunAiThrows(() =>
      runAi({
        prompt: PROMPT,
        schema: OUTPUT_SCHEMA,
        inputRef: INPUT_REF,
        model: createFakeModel({
          modelId: MODEL_ID,
          modelVersion: MODEL_VERSION,
          error: new Error("simulated timeout"),
        }),
        runs: failureRuns,
      }),
    );
    const failureRow = completedRows(failureRuns)[0];
    expect(failureRow.status).toBe("failed");
    expectNumericCostAndDuration(failureRow);
  });
});
