import "server-only";

/**
 * Shared contract for `runAi` tests (S1a) and the wrapper (S1b).
 * Field names on `AiRunRecord` match `public.ai_runs`.
 */

export type AiPrompt = {
  id: string;
  version: string;
  text: string;
};

export type AiModelGenerateResult = {
  object: unknown;
  costUsd?: number;
};

/** Provider-agnostic model. `fake-model.ts` implements this; `provider.ts` returns it. */
export type AiModel = {
  readonly modelId: string;
  readonly modelVersion: string;
  generateObject(promptText: string): Promise<AiModelGenerateResult>;
  /**
   * Optional file-input capability for the Chinese PDF fallback.
   * Text-only models (including `createFakeModel`) omit these fields.
   */
  readonly supportsFileInput?: boolean;
  generateObjectFromFile?(
    fileBytes: Uint8Array,
  ): Promise<AiModelGenerateResult>;
};

/** Options the test-facing `createFakeModel` factory accepts. */
export type FakeModelOptions = {
  modelId: string;
  modelVersion: string;
  /** Structured output the fake model returns. Ignored when `error` is set. */
  object?: unknown;
  /** Simulated provider failure: `generateObject` throws this error. */
  error?: Error;
  costUsd?: number;
};

export type AiRunStatus = "pending" | "succeeded" | "failed";

export type AiRunRecord = {
  input_ref: string;
  model_id: string;
  model_version: string;
  prompt_version: string;
  output: unknown | null;
  status: AiRunStatus;
  error: string | null;
  cost_usd: number;
  duration_ms: number;
  /** Pipeline step (e.g. `parse-cv`). Not null on `public.ai_runs`. */
  step: string;
  /** Vendor id (e.g. `openai`). Not null on `public.ai_runs`. */
  provider: string;
};

/** Injectable `ai_runs` writer. Unit tests pass an in-memory implementation. */
export type AiRunsWriter = {
  write(row: AiRunRecord): Promise<void> | void;
};
