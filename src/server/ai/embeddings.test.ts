import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AiRunRecord, AiRunsWriter } from "./types";
import { getDb } from "../db";
import {
  EXPECTED_EMBEDDING_DIMENSION,
  embedCvProfile,
  embedJobVersion,
  type Embedder,
} from "./embeddings";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * T1a contract — implement these in `src/server/ai/embeddings.ts` (T1b).
 * Do not put a vendor/provider SDK import in that file (AC3).
 *
 * EXPECTED_EMBEDDING_DIMENSION
 *   Positive integer. Placeholder until ADR-0003/ADR-0004 pick the model.
 *   Suggested value: 8. Both `embedCvProfile` and `embedJobVersion` reject
 *   any vector whose `length` is not exactly this number, before insert.
 *
 * Embedder (injectable; tests never call a real provider)
 *   {
 *     readonly modelId: string;
 *     embed(text: string): Promise<{ vector: number[]; costUsd?: number }>;
 *   }
 *
 * embedCvProfile({ candidateId, text, embedder, runs }): Promise<string>
 *   1. Dedup: if `embeddings` already has a row for
 *      (owner_type="candidate_profile", owner_id=candidateId,
 *      embedding_model=embedder.modelId), return embedder.modelId without
 *      calling embedder.embed, without insert, without runs.write.
 *   2. Otherwise call embedder.embed(text), reject on dimension mismatch,
 *      insert one `embeddings` row, write one `ai_runs` row via `runs`,
 *      return embedder.modelId.
 *
 * embedJobVersion({ jobVersionId, text, embedder, runs }): Promise<string>
 *   Same as embedCvProfile with owner_type="job_version" and
 *   owner_id=jobVersionId.
 *
 * Dedup-check strategy (chosen, not content-hash):
 *   The `embeddings` table has no content-hash column. Skip is an existence
 *   check on (owner_type, owner_id, embedding_model) via getDb() — same
 *   owner+model ⇒ treat content as unchanged. A different modelId must
 *   embed and insert. Query shape is not prescribed; the mock supports
 *   chained `.eq()` and `.match()`.
 *
 * ai_runs (injected AiRunsWriter, not runAi — no JSON schema to validate):
 *   Every actual embed (not a skip) calls runs.write with numeric
 *   cost_usd and duration_ms. Success → status "succeeded"; dimension
 *   mismatch still logs status "failed" then throws. step is "embed".
 *   model_id is embedder.modelId. model_version may equal modelId.
 *   prompt_version is any string (no prompt). provider may be
 *   "unspecified" (run.ts placeholder until ADR-0004).
 *
 * Return value: the embedding model id stored on the row (embedder.modelId).
 */

const SERVER_DIR = join(process.cwd(), "src/server");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
const PROVIDER_MODULE = "ai/provider.ts";

const FROM_SPECIFIER = /\bfrom\s+(['"])([^'"]+)\1/g;
const DYNAMIC_IMPORT_SPECIFIER = /\bimport\s*\(\s*(['"])([^'"]+)\1/g;
const REQUIRE_SPECIFIER = /\brequire\s*\(\s*(['"])([^'"]+)\1/g;
const SIDE_EFFECT_IMPORT = /\bimport\s+(['"])([^'"]+)\1/g;

/** Vendor SDKs that can produce embeddings. Only provider.ts may import these. */
const EMBEDDING_PROVIDER_PACKAGES = [
  "openai",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "@google/genai",
  "groq-sdk",
  "@mistralai/mistralai",
  "@google-cloud/vertexai",
  "@google-cloud/aiplatform",
  "voyageai",
  "cohere-ai",
  "@xenova/transformers",
  "@huggingface/inference",
  "@huggingface/transformers",
] as const;

/** Fictional ids — never a real candidate or job. */
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000201";
const JOB_VERSION_ID = "00000000-0000-0000-0000-000000000202";
const FAKE_MODEL_ID = "fake-embed-test";
const COST_USD = 0.001;

const EN_CV_TEXT =
  "Fictional candidate Mei Tan. Five years of Python at Northwind Labs Pte Ltd.";
const ZH_JD_TEXT =
  "虚构职位：后端工程师。要求三年 Java 经验，工作地点新加坡。";

type InsertCall = { table: string; payload: unknown };

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type FakeEmbedder = Embedder & {
  embed: ReturnType<typeof vi.fn<(text: string) => Promise<{
    vector: number[];
    costUsd?: number;
  }>>>;
};

function collectSpecifiers(source: string, pattern: RegExp): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const specifier = match[2];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function moduleSpecifiers(source: string): string[] {
  return [
    ...collectSpecifiers(source, FROM_SPECIFIER),
    ...collectSpecifiers(source, DYNAMIC_IMPORT_SPECIFIER),
    ...collectSpecifiers(source, REQUIRE_SPECIFIER),
    ...collectSpecifiers(source, SIDE_EFFECT_IMPORT),
  ];
}

function matchesPackage(specifier: string, pkg: string): boolean {
  return specifier === pkg || specifier.startsWith(`${pkg}/`);
}

function isEmbeddingProviderImport(specifier: string): boolean {
  if (specifier === "ai" || specifier.startsWith("ai/")) {
    return true;
  }
  if (specifier.startsWith("@ai-sdk/")) {
    return true;
  }
  return EMBEDDING_PROVIDER_PACKAGES.some((pkg) =>
    matchesPackage(specifier, pkg),
  );
}

function serverSourceFiles(): string[] {
  return readdirSync(SERVER_DIR, { recursive: true })
    .map(String)
    .filter((path) => SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext)))
    .filter((path) => !TEST_FILE.test(path))
    .map((path) => path.split(sep).join("/"));
}

function readServerFile(relativePath: string): string {
  return readFileSync(join(SERVER_DIR, relativePath), "utf8");
}

function embeddingProviderOffenders(files: string[]): string[] {
  return files
    .filter((path) => path !== PROVIDER_MODULE)
    .filter((path) =>
      moduleSpecifiers(readServerFile(path)).some(isEmbeddingProviderImport),
    );
}

function validVector(): number[] {
  return Array.from(
    { length: EXPECTED_EMBEDDING_DIMENSION },
    (_, index) => 0.01 * (index + 1),
  );
}

function wrongLengthVector(): number[] {
  return Array.from({ length: EXPECTED_EMBEDDING_DIMENSION + 1 }, () => 0.5);
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).toEqual(expect.any(Object));
  expect(value).not.toBeNull();
  return value as Record<string, unknown>;
}

function insertRow(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload)) {
    expect(payload[0]).toEqual(expect.any(Object));
    expect(payload[0]).not.toBeNull();
    return payload[0] as Record<string, unknown>;
  }
  return asRecord(payload);
}

function asVector(value: unknown): number[] {
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return value;
  }
  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "number")
    ) {
      return parsed;
    }
  }
  throw new Error(`expected a numeric vector, got ${typeof value}`);
}

function thenable(result: QueryResult) {
  const chain: {
    select: () => typeof chain;
    single: () => Promise<QueryResult>;
    maybeSingle: () => Promise<QueryResult>;
    then: Promise<QueryResult>["then"];
  } = {
    select: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return chain;
}

function createEmbeddingsDb(
  seed: Array<Record<string, unknown>> = [],
) {
  const stored = seed.map((row) => ({ ...row }));
  const inserts: InsertCall[] = [];
  let generated = 0;

  const insert = vi.fn((table: string, payload: unknown) => {
    inserts.push({ table, payload });
    const row = insertRow(payload);
    generated += 1;
    const id =
      typeof row.id === "string" ? row.id : `embeddings-generated-${generated}`;
    const storedRow = { ...row, id };
    if (table === "embeddings") {
      stored.push(storedRow);
    }
    return thenable({ data: storedRow, error: null });
  });

  function matchingRows(
    filters: Array<{ column: string; value: unknown }>,
  ): Record<string, unknown>[] {
    return stored.filter((row) =>
      filters.every((filter) => row[filter.column] === filter.value),
    );
  }

  const from = vi.fn((table: string) => {
    const filters: Array<{ column: string; value: unknown }> = [];

    const selectChain = {
      select() {
        return selectChain;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return selectChain;
      },
      match(query: Record<string, unknown>) {
        for (const [column, value] of Object.entries(query)) {
          filters.push({ column, value });
        }
        return selectChain;
      },
      limit() {
        return selectChain;
      },
      async maybeSingle(): Promise<QueryResult> {
        const matched = matchingRows(filters);
        return { data: matched[0] ?? null, error: null };
      },
      async single(): Promise<QueryResult> {
        const matched = matchingRows(filters);
        const row = matched[0];
        if (!row) {
          return { data: null, error: { message: "not found" } };
        }
        return { data: row, error: null };
      },
      then(
        onfulfilled?: (value: QueryResult) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve({
          data: matchingRows(filters),
          error: null,
        }).then(onfulfilled, onrejected);
      },
    };

    return {
      insert: (payload: unknown) => insert(table, payload),
      select: (columns?: string) => {
        void columns;
        return selectChain;
      },
    };
  });

  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, insert, inserts, stored };
}

function embeddingInserts(
  inserts: InsertCall[],
): Record<string, unknown>[] {
  return inserts
    .filter((call) => call.table === "embeddings")
    .map((call) => insertRow(call.payload));
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

function createFakeEmbedder(options?: {
  modelId?: string;
  vector?: number[];
  costUsd?: number;
}): FakeEmbedder {
  const vector = options?.vector ?? validVector();
  const costUsd = options?.costUsd ?? COST_USD;
  const embed = vi.fn(async (_text: string) => ({ vector, costUsd }));
  return {
    modelId: options?.modelId ?? FAKE_MODEL_ID,
    embed,
  };
}

function expectNumericCostAndDuration(row: AiRunRecord): void {
  expect(typeof row.cost_usd).toBe("number");
  expect(Number.isFinite(row.cost_usd)).toBe(true);
  expect(row.cost_usd).toBeGreaterThanOrEqual(0);
  expect(typeof row.duration_ms).toBe("number");
  expect(Number.isFinite(row.duration_ms)).toBe(true);
  expect(row.duration_ms).toBeGreaterThanOrEqual(0);
}

function expectStoredEmbedding(
  row: Record<string, unknown>,
  expected: {
    ownerType: string;
    ownerId: string;
    modelId: string;
    vector: number[];
  },
): void {
  expect(row.owner_type).toBe(expected.ownerType);
  expect(row.owner_id).toBe(expected.ownerId);
  expect(row.embedding_model).toBe(expected.modelId);
  expect(asVector(row.embedding)).toEqual(expected.vector);
}

function completedRows(runs: { rows: AiRunRecord[] }): AiRunRecord[] {
  return runs.rows.filter(
    (row) => row.status === "succeeded" || row.status === "failed",
  );
}

describe("embeddings (AC1, AC2, AC3)", () => {
  describe("AC3: no provider name outside provider.ts", () => {
    it("finds the source files it scans", () => {
      expect(serverSourceFiles()).toContain("db.ts");
      expect(serverSourceFiles()).toContain(PROVIDER_MODULE);
    });

    it("AC3: the import pattern catches embedding provider SDKs", () => {
      expect(isEmbeddingProviderImport("openai")).toBe(true);
      expect(isEmbeddingProviderImport("openai/resources/embeddings")).toBe(
        true,
      );
      expect(isEmbeddingProviderImport("@ai-sdk/openai")).toBe(true);
      expect(isEmbeddingProviderImport("@ai-sdk/google")).toBe(true);
      expect(isEmbeddingProviderImport("ai")).toBe(true);
      expect(isEmbeddingProviderImport("voyageai")).toBe(true);
      expect(isEmbeddingProviderImport("cohere-ai")).toBe(true);
      expect(isEmbeddingProviderImport("@xenova/transformers")).toBe(true);

      expect(isEmbeddingProviderImport("./embeddings")).toBe(false);
      expect(isEmbeddingProviderImport("../db")).toBe(false);
      expect(isEmbeddingProviderImport("@/server/ai/provider")).toBe(false);
      expect(isEmbeddingProviderImport("openai-tokenizers")).toBe(false);
    });

    it("AC3: no provider name outside provider.ts", () => {
      const files = serverSourceFiles();
      expect(files.length).toBeGreaterThan(0);
      expect(embeddingProviderOffenders(files)).toEqual([]);
    });
  });

  it("AC1: embedding a CV profile stores a vector with the model id", async () => {
    const db = createEmbeddingsDb();
    const runs = createMemoryRuns();
    const vector = validVector();
    const embedder = createFakeEmbedder({ vector });

    const modelId = await embedCvProfile({
      candidateId: CANDIDATE_ID,
      text: EN_CV_TEXT,
      embedder,
      runs,
    });

    expect(modelId).toBe(FAKE_MODEL_ID);
    expect(embedder.embed).toHaveBeenCalledTimes(1);
    expect(embedder.embed).toHaveBeenCalledWith(EN_CV_TEXT);

    const inserted = embeddingInserts(db.inserts);
    expect(inserted).toHaveLength(1);
    expectStoredEmbedding(inserted[0] ?? {}, {
      ownerType: "candidate_profile",
      ownerId: CANDIDATE_ID,
      modelId: FAKE_MODEL_ID,
      vector,
    });

    const completed = completedRows(runs);
    expect(completed).toHaveLength(1);
    const row = completed[0];
    expect(row.status).toBe("succeeded");
    expect(row.model_id).toBe(FAKE_MODEL_ID);
    expect(row.step).toBe("embed");
    expect(row.cost_usd).toBe(COST_USD);
    expectNumericCostAndDuration(row);
  });

  it("AC2: embedding a job version stores a vector with the model id", async () => {
    const db = createEmbeddingsDb();
    const runs = createMemoryRuns();
    const vector = validVector();
    const embedder = createFakeEmbedder({ vector });

    const modelId = await embedJobVersion({
      jobVersionId: JOB_VERSION_ID,
      text: ZH_JD_TEXT,
      embedder,
      runs,
    });

    expect(modelId).toBe(FAKE_MODEL_ID);
    expect(embedder.embed).toHaveBeenCalledTimes(1);
    expect(embedder.embed).toHaveBeenCalledWith(ZH_JD_TEXT);

    const inserted = embeddingInserts(db.inserts);
    expect(inserted).toHaveLength(1);
    expectStoredEmbedding(inserted[0] ?? {}, {
      ownerType: "job_version",
      ownerId: JOB_VERSION_ID,
      modelId: FAKE_MODEL_ID,
      vector,
    });

    const completed = completedRows(runs);
    expect(completed).toHaveLength(1);
    const row = completed[0];
    expect(row.status).toBe("succeeded");
    expect(row.model_id).toBe(FAKE_MODEL_ID);
    expect(row.step).toBe("embed");
    expect(row.cost_usd).toBe(COST_USD);
    expectNumericCostAndDuration(row);
  });

  it("rejects a vector whose length is not EXPECTED_EMBEDDING_DIMENSION", async () => {
    const db = createEmbeddingsDb();
    const runs = createMemoryRuns();
    const embedder = createFakeEmbedder({ vector: wrongLengthVector() });

    let thrown: unknown;
    try {
      await embedCvProfile({
        candidateId: CANDIDATE_ID,
        text: EN_CV_TEXT,
        embedder,
        runs,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : "";
    expect(message.length).toBeGreaterThan(0);
    expect(message.toLowerCase()).not.toBe("error");
    expect(message).toMatch(/dimension/i);

    expect(embedder.embed).toHaveBeenCalledTimes(1);
    expect(embeddingInserts(db.inserts)).toHaveLength(0);

    const completed = completedRows(runs);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.status).toBe("failed");
    expectNumericCostAndDuration(completed[0] ?? ({} as AiRunRecord));
  });

  it("skips re-embedding the same owner+model when a row already exists", async () => {
    const db = createEmbeddingsDb();
    const runs = createMemoryRuns();
    const vector = validVector();
    const embedder = createFakeEmbedder({ vector });

    const first = await embedCvProfile({
      candidateId: CANDIDATE_ID,
      text: EN_CV_TEXT,
      embedder,
      runs,
    });
    expect(first).toBe(FAKE_MODEL_ID);
    expect(embedder.embed).toHaveBeenCalledTimes(1);
    expect(embeddingInserts(db.inserts)).toHaveLength(1);
    expect(completedRows(runs)).toHaveLength(1);

    const second = await embedCvProfile({
      candidateId: CANDIDATE_ID,
      text: EN_CV_TEXT,
      embedder,
      runs,
    });
    expect(second).toBe(FAKE_MODEL_ID);
    expect(embedder.embed).toHaveBeenCalledTimes(1);
    expect(embeddingInserts(db.inserts)).toHaveLength(1);
    expect(completedRows(runs)).toHaveLength(1);
  });

  it("skips when the mock already has an embeddings row for that owner+model", async () => {
    const existingVector = validVector();
    const db = createEmbeddingsDb([
      {
        id: "embeddings-seed-1",
        owner_type: "candidate_profile",
        owner_id: CANDIDATE_ID,
        embedding_model: FAKE_MODEL_ID,
        embedding: existingVector,
      },
    ]);
    const runs = createMemoryRuns();
    const embedder = createFakeEmbedder();

    const modelId = await embedCvProfile({
      candidateId: CANDIDATE_ID,
      text: EN_CV_TEXT,
      embedder,
      runs,
    });

    expect(modelId).toBe(FAKE_MODEL_ID);
    expect(embedder.embed).not.toHaveBeenCalled();
    expect(embeddingInserts(db.inserts)).toHaveLength(0);
    expect(runs.rows).toHaveLength(0);
  });

  it("re-embeds when the same owner is stored under a different model id", async () => {
    const db = createEmbeddingsDb([
      {
        id: "embeddings-seed-other-model",
        owner_type: "candidate_profile",
        owner_id: CANDIDATE_ID,
        embedding_model: "other-embed-model",
        embedding: validVector(),
      },
    ]);
    const runs = createMemoryRuns();
    const vector = validVector();
    const embedder = createFakeEmbedder({ vector });

    await embedCvProfile({
      candidateId: CANDIDATE_ID,
      text: EN_CV_TEXT,
      embedder,
      runs,
    });

    expect(embedder.embed).toHaveBeenCalledTimes(1);
    const inserted = embeddingInserts(db.inserts);
    expect(inserted).toHaveLength(1);
    expectStoredEmbedding(inserted[0] ?? {}, {
      ownerType: "candidate_profile",
      ownerId: CANDIDATE_ID,
      modelId: FAKE_MODEL_ID,
      vector,
    });
    expect(completedRows(runs)).toHaveLength(1);
  });

  it("logs numeric cost and duration via AiRunsWriter on every embed call", async () => {
    const cvRuns = createMemoryRuns();
    const jobRuns = createMemoryRuns();
    createEmbeddingsDb();

    await embedCvProfile({
      candidateId: CANDIDATE_ID,
      text: EN_CV_TEXT,
      embedder: createFakeEmbedder(),
      runs: cvRuns,
    });

    createEmbeddingsDb();
    await embedJobVersion({
      jobVersionId: JOB_VERSION_ID,
      text: ZH_JD_TEXT,
      embedder: createFakeEmbedder(),
      runs: jobRuns,
    });

    for (const row of [...completedRows(cvRuns), ...completedRows(jobRuns)]) {
      expect(row.model_id).toBe(FAKE_MODEL_ID);
      expect(row.step).toBe("embed");
      expect(row.status).toBe("succeeded");
      expect(row.cost_usd).toBe(COST_USD);
      expectNumericCostAndDuration(row);
    }
  });
});
