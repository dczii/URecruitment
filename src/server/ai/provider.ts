import "server-only";

import { serverEnv, type ServerEnv } from "../env";
import type { Embedder } from "./embeddings";
import type { AiModel, AiModelGenerateResult } from "./types";

/**
 * Models are requested by role (ADR-0003 C2). Ids come from env, never from
 * callers. This file is the only place that may import a provider package
 * (C1) — none is chosen yet, so `generateObject` is a stub that throws.
 *
 * When a provider is recorded in ADR-0004, swap the body of
 * `generateWithConfiguredProvider` (Vercel AI SDK + one `@ai-sdk/*` import).
 * Callers keep asking for a model by role.
 */
export const AI_ROLES = [
  "parse",
  "match",
  "gap",
  "search",
  "jd",
  "embed",
] as const;

export type AiRole = (typeof AI_ROLES)[number];

const ROLE_ENV_KEY = {
  parse: "AI_MODEL_PARSE",
  match: "AI_MODEL_MATCH",
  gap: "AI_MODEL_GAP",
  search: "AI_MODEL_SEARCH",
  jd: "AI_MODEL_JD",
  embed: "AI_EMBED_MODEL",
} as const satisfies Record<AiRole, keyof ServerEnv>;

export function getModel(role: AiRole): AiModel {
  const envKey = ROLE_ENV_KEY[role];
  const modelId = serverEnv()[envKey];
  if (!modelId) {
    throw new Error(
      `No model configured for role "${role}". Set ${envKey}. The AI provider is not chosen yet (ADR-0003).`,
    );
  }

  // Until a real SDK reports a version string, the env model id is the version.
  const modelVersion = modelId;

  return {
    modelId,
    modelVersion,
    generateObject() {
      return generateWithConfiguredProvider();
    },
  };
}

/**
 * Role-aware embedder. The model id comes from `AI_EMBED_MODEL`, never from
 * callers. Until ADR-0003/ADR-0004 pick a provider, `embed` throws.
 */
export function getEmbedder(): Embedder {
  const model = getModel("embed");
  return {
    modelId: model.modelId,
    embed(text: string) {
      return embedWithConfiguredProvider(text);
    },
  };
}

/**
 * The single function to replace when a provider is chosen. Do not call a
 * vendor SDK from `run.ts` or any other module. The real implementation will
 * take the role's model id and the prompt text and call the Vercel AI SDK.
 */
async function generateWithConfiguredProvider(): Promise<AiModelGenerateResult> {
  throw new Error(
    "AI provider is not chosen yet (ADR-0003). Implement generateWithConfiguredProvider in src/server/ai/provider.ts when a provider is selected.",
  );
}

/**
 * The single embedding function to replace when a provider is chosen. Do not
 * call a vendor SDK from `embeddings.ts` or any other module. Reach this only
 * through `getEmbedder()`.
 */
async function embedWithConfiguredProvider(
  _text: string,
): Promise<{ vector: number[]; costUsd?: number }> {
  throw new Error(
    "AI provider is not chosen yet (ADR-0003). Implement embedWithConfiguredProvider in src/server/ai/provider.ts when a provider is selected.",
  );
}
