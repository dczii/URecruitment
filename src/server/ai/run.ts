import "server-only";

import { z } from "zod";
import type { AiModel, AiPrompt, AiRunRecord, AiRunsWriter } from "./types";

export type RunAiArgs<S extends z.ZodType> = {
  prompt: AiPrompt;
  schema: S;
  inputRef: string;
  model: AiModel;
  runs: AiRunsWriter;
};

/**
 * The one wrapper every AI call goes through. Calls the injected `AiModel`,
 * validates the result against `schema`, and writes one `ai_runs` row on both
 * success and failure before returning or throwing.
 */
export async function runAi<S extends z.ZodType>({
  prompt,
  schema,
  inputRef,
  model,
  runs,
}: RunAiArgs<S>): Promise<z.infer<S>> {
  const startedAt = performance.now();
  let costUsd = 0;

  try {
    const result = await model.generateObject(prompt.text);
    costUsd = costFromUsage(result.costUsd);

    const parsed = schema.safeParse(result.object);
    if (!parsed.success) {
      throw new Error(schemaErrorMessage(parsed.error));
    }

    await runs.write(
      runRecord({
        inputRef,
        model,
        prompt,
        status: "succeeded",
        output: parsed.data,
        error: null,
        costUsd,
        durationMs: elapsedMs(startedAt),
      }),
    );
    return parsed.data;
  } catch (error) {
    await runs.write(
      runRecord({
        inputRef,
        model,
        prompt,
        status: "failed",
        output: null,
        error: errorMessage(error),
        costUsd,
        durationMs: elapsedMs(startedAt),
      }),
    );
    throw error;
  }
}

function runRecord(fields: {
  inputRef: string;
  model: AiModel;
  prompt: AiPrompt;
  status: "succeeded" | "failed";
  output: unknown | null;
  error: string | null;
  costUsd: number;
  durationMs: number;
}): AiRunRecord {
  return {
    input_ref: fields.inputRef,
    model_id: fields.model.modelId,
    model_version: fields.model.modelVersion,
    prompt_version: fields.prompt.version,
    output: fields.output,
    status: fields.status,
    error: fields.error,
    cost_usd: fields.costUsd,
    duration_ms: fields.durationMs,
    // Prompt id is the pipeline step (`parse-cv`, `match`, …).
    step: fields.prompt.id,
    // Provider is not chosen yet (ADR-0003). Record a stable placeholder so
    // `public.ai_runs.provider` (NOT NULL) can be written.
    provider: "unspecified",
  };
}

function costFromUsage(costUsd: number | undefined): number {
  if (typeof costUsd === "number" && Number.isFinite(costUsd) && costUsd >= 0) {
    return costUsd;
  }
  return 0;
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "unknown error";
}

/** Path + code only — never the invalid payload (ADR-0003 C10). */
function schemaErrorMessage(error: z.ZodError): string {
  const details = error.issues.map((issue) => {
    const path =
      issue.path.length > 0 ? issue.path.map(String).join(".") : "root";
    const expected =
      "expected" in issue && typeof issue.expected === "string"
        ? ` (expected ${issue.expected})`
        : "";
    return `${path}: ${issue.code ?? "invalid"}${expected}`;
  });
  return `schema validation failed: ${details.join("; ")}`;
}
