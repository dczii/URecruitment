import "server-only";

import { getDb } from "../db";
import type { AiRunRecord, AiRunsWriter } from "./types";

/**
 * Placeholder until ADR-0003/ADR-0004 pick the embedding model. Both
 * `embedCvProfile` and `embedJobVersion` reject any vector whose length is
 * not exactly this number, before insert.
 */
export const EXPECTED_EMBEDDING_DIMENSION = 8;

/** Injectable; tests never call a real provider. Production uses `getEmbedder()`. */
export type Embedder = {
  readonly modelId: string;
  embed(text: string): Promise<{ vector: number[]; costUsd?: number }>;
};

type EmbeddingOwnerType = "candidate_profile" | "job_version";

type EmbedOwnerArgs = {
  ownerType: EmbeddingOwnerType;
  ownerId: string;
  text: string;
  embedder: Embedder;
  runs: AiRunsWriter;
};

export async function embedCvProfile(args: {
  candidateId: string;
  text: string;
  embedder: Embedder;
  runs: AiRunsWriter;
}): Promise<string> {
  return embedOwner({
    ownerType: "candidate_profile",
    ownerId: args.candidateId,
    text: args.text,
    embedder: args.embedder,
    runs: args.runs,
  });
}

export async function embedJobVersion(args: {
  jobVersionId: string;
  text: string;
  embedder: Embedder;
  runs: AiRunsWriter;
}): Promise<string> {
  return embedOwner({
    ownerType: "job_version",
    ownerId: args.jobVersionId,
    text: args.text,
    embedder: args.embedder,
    runs: args.runs,
  });
}

async function embedOwner({
  ownerType,
  ownerId,
  text,
  embedder,
  runs,
}: EmbedOwnerArgs): Promise<string> {
  if (await existingEmbedding(ownerType, ownerId, embedder.modelId)) {
    return embedder.modelId;
  }

  const startedAt = performance.now();
  let costUsd = 0;

  try {
    const result = await embedder.embed(text);
    costUsd = costFromUsage(result.costUsd);

    if (result.vector.length !== EXPECTED_EMBEDDING_DIMENSION) {
      throw new Error(
        `Embedding dimension mismatch: got ${result.vector.length}, expected ${EXPECTED_EMBEDDING_DIMENSION}`,
      );
    }

    const { error } = await getDb().from("embeddings").insert({
      owner_type: ownerType,
      owner_id: ownerId,
      embedding_model: embedder.modelId,
      embedding: JSON.stringify(result.vector),
    });

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`);
    }

    await runs.write(
      embedRunRecord({
        ownerType,
        ownerId,
        embedder,
        status: "succeeded",
        output: { dimension: result.vector.length },
        error: null,
        costUsd,
        durationMs: elapsedMs(startedAt),
      }),
    );

    return embedder.modelId;
  } catch (error) {
    await runs.write(
      embedRunRecord({
        ownerType,
        ownerId,
        embedder,
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

async function existingEmbedding(
  ownerType: EmbeddingOwnerType,
  ownerId: string,
  embeddingModel: string,
): Promise<boolean> {
  const { data, error } = await getDb()
    .from("embeddings")
    .select("id")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .eq("embedding_model", embeddingModel)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up existing embedding: ${error.message}`);
  }

  return data !== null;
}

function embedRunRecord(fields: {
  ownerType: EmbeddingOwnerType;
  ownerId: string;
  embedder: Embedder;
  status: "succeeded" | "failed";
  output: unknown | null;
  error: string | null;
  costUsd: number;
  durationMs: number;
}): AiRunRecord {
  return {
    input_ref: `${fields.ownerType}:${fields.ownerId}`,
    model_id: fields.embedder.modelId,
    model_version: fields.embedder.modelId,
    prompt_version: "none",
    output: fields.output,
    status: fields.status,
    error: fields.error,
    cost_usd: fields.costUsd,
    duration_ms: fields.durationMs,
    step: "embed",
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
