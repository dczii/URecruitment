import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { extractCvText } from "./extract";
import { parseCv } from "./parse";
import { listFailedCvFiles, retryParse } from "./review-queue";

vi.mock("../db", () => ({ getDb: vi.fn() }));

vi.mock("./extract", () => ({
  extractCvText: vi.fn(),
}));

vi.mock("./parse", () => ({
  parseCv: vi.fn(),
}));

const REVIEW_QUEUE_SOURCE_PATH = join(
  process.cwd(),
  "src/server/cv/review-queue.ts",
);

/** Fictional cv_files ids — never a real candidate row. */
const ERROR_CV_ID = "00000000-0000-0000-0000-000000000021";
const OTHER_ERROR_CV_ID = "00000000-0000-0000-0000-000000000022";
const PARSED_CV_ID = "00000000-0000-0000-0000-000000000023";
const PENDING_CV_ID = "00000000-0000-0000-0000-000000000024";
const REJECTED_CV_ID = "00000000-0000-0000-0000-000000000025";

const ALEX_FILE_NAME = "Alex-Rivera-CV.pdf";
const PRIYA_FILE_NAME = "Priya-Rao-Test-CV.pdf";

const SCHEMA_ERROR =
  "The suggested parse of this file did not match the expected fields, so it cannot be used as a profile yet.";
const OTHER_ERROR = "This file produced no usable text.";
const RETRY_ERROR = "parse failed on retry: schema mismatch";

const FAILED_AT = "2026-09-18T04:00:00.000Z";
const RETRY_AT = "2026-09-18T13:42:00.000Z";

const SUCCESSFUL_EXTRACTION = {
  text: "Alex Rivera\nAccountant at Northgate Logistics",
  quality: {
    totalChars: 48,
    pageCount: 1,
    avgCharsPerPage: 48,
    isLikelyScanned: false,
  },
};

type CvFileRow = {
  id: string;
  candidate_id: string;
  source_ref: string;
  storage_path: string;
  doc_kind: string;
  parse_status: string;
  parse_error: string | null;
  attempt_count: number;
  last_attempted_at: string | null;
  created_at: string;
};

type Filter = { column: string; value: unknown };

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type QueryChain = {
  select: (columns?: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => QueryChain;
  limit: (count: number) => QueryChain;
  update: (payload: Record<string, unknown>) => QueryChain;
  single: () => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
  then: Promise<QueryResult>["then"];
};

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).toEqual(expect.any(Object));
  return value as Record<string, unknown>;
}

function queuedIds(queued: unknown): unknown[] {
  expect(Array.isArray(queued)).toBe(true);
  return (queued as unknown[]).map((item) => asRecord(item).id);
}

function fictionalCvFile(
  overrides: Partial<CvFileRow> & Pick<CvFileRow, "id" | "parse_status">,
): CvFileRow {
  const fileName = overrides.source_ref ?? `${overrides.id}.pdf`;
  return {
    candidate_id: "00000000-0000-0000-0000-000000000031",
    source_ref: fileName,
    storage_path: `cv/${overrides.id}/${fileName}`,
    doc_kind: "cv",
    parse_error: null,
    attempt_count: 0,
    last_attempted_at: null,
    created_at: "2026-09-17T04:00:00.000Z",
    ...overrides,
  };
}

function matchesFilters(row: CvFileRow, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const value = row[filter.column as keyof CvFileRow];
    return value === filter.value;
  });
}

function createQuery(store: CvFileRow[]): QueryChain {
  const filters: Filter[] = [];
  let mode: "select" | "update" = "select";
  let updatePayload: Record<string, unknown> = {};

  function matchingRows(): CvFileRow[] {
    return store.filter((row) => matchesFilters(row, filters));
  }

  function execute(): Promise<QueryResult> {
    if (mode === "update") {
      const matched = matchingRows();
      for (const row of matched) {
        Object.assign(row, updatePayload);
      }
      return Promise.resolve({ data: matched, error: null });
    }
    return Promise.resolve({ data: matchingRows(), error: null });
  }

  const query: QueryChain = {
    select() {
      return query;
    },
    eq(column, value) {
      filters.push({ column, value });
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    update(payload) {
      mode = "update";
      updatePayload = payload;
      return query;
    },
    async single() {
      const rows = matchingRows();
      const row = rows[0];
      if (!row) {
        return { data: null, error: { message: "not found" } };
      }
      return { data: row, error: null };
    },
    async maybeSingle() {
      const rows = matchingRows();
      return { data: rows[0] ?? null, error: null };
    },
    then(onfulfilled, onrejected) {
      return execute().then(onfulfilled, onrejected);
    },
  };

  return query;
}

function mockCvFilesDb(rows: CvFileRow[]) {
  const store = rows.map((row) => ({ ...row }));
  const from = vi.fn((table: string) => {
    expect(table).toBe("cv_files");
    return createQuery(store);
  });
  const download = vi.fn(async () => ({
    data: new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]),
    error: null,
  }));

  vi.mocked(getDb).mockReturnValue({
    from,
    storage: {
      from: vi.fn(() => ({ download })),
    },
  } as never);

  return { from, store, download };
}

function seedMixedQueue() {
  return mockCvFilesDb([
    fictionalCvFile({
      id: ERROR_CV_ID,
      source_ref: ALEX_FILE_NAME,
      parse_status: "error",
      parse_error: SCHEMA_ERROR,
      attempt_count: 2,
      last_attempted_at: FAILED_AT,
    }),
    fictionalCvFile({
      id: OTHER_ERROR_CV_ID,
      source_ref: PRIYA_FILE_NAME,
      parse_status: "error",
      parse_error: OTHER_ERROR,
      attempt_count: 1,
      last_attempted_at: "2026-09-18T05:00:00.000Z",
    }),
    fictionalCvFile({
      id: PARSED_CV_ID,
      source_ref: "Jordan-Lee-CV.pdf",
      parse_status: "parsed",
    }),
    fictionalCvFile({
      id: PENDING_CV_ID,
      source_ref: "Sam-Ng-CV.pdf",
      parse_status: "pending",
    }),
    fictionalCvFile({
      id: REJECTED_CV_ID,
      source_ref: "Scanned-Page-CV.pdf",
      parse_status: "rejected",
      parse_error: "image_only_or_scanned: scan",
    }),
  ]);
}

function seedQueuedError(overrides?: Partial<CvFileRow>) {
  return mockCvFilesDb([
    fictionalCvFile({
      id: ERROR_CV_ID,
      source_ref: ALEX_FILE_NAME,
      parse_status: "error",
      parse_error: SCHEMA_ERROR,
      attempt_count: 2,
      last_attempted_at: FAILED_AT,
      ...overrides,
    }),
  ]);
}

describe("cv review queue (T130-AC1, T130-AC2, T130-AC3, T130-AC4)", () => {
  it("T130-AC1: lists failed files with reason", async () => {
    seedMixedQueue();

    const queued = await listFailedCvFiles();
    const ids = queuedIds(queued);

    expect(ids).toHaveLength(2);
    expect(ids).toEqual(
      expect.arrayContaining([ERROR_CV_ID, OTHER_ERROR_CV_ID]),
    );
    expect(ids).not.toContain(PARSED_CV_ID);
    expect(ids).not.toContain(PENDING_CV_ID);
    expect(ids).not.toContain(REJECTED_CV_ID);

    const alex = asRecord(
      (queued as unknown[]).find(
        (item) => asRecord(item).id === ERROR_CV_ID,
      ),
    );
    expect(alex.parse_error).toBe(SCHEMA_ERROR);
    expect(alex.source_ref).toBe(ALEX_FILE_NAME);
    expect(alex.attempt_count).toBe(2);
    expect(alex.last_attempted_at).toBe(FAILED_AT);
  });

  it("T130-AC2: a successful retry clears the file from the queue", async () => {
    const { store } = seedQueuedError();
    vi.mocked(extractCvText).mockResolvedValue(SUCCESSFUL_EXTRACTION);
    vi.mocked(parseCv).mockResolvedValue({} as never);

    await retryParse(ERROR_CV_ID);

    expect(extractCvText).toHaveBeenCalled();
    expect(parseCv).toHaveBeenCalled();

    const row = store.find((item) => item.id === ERROR_CV_ID);
    expect(row?.parse_status).toBe("parsed");

    const remaining = await listFailedCvFiles();
    expect(queuedIds(remaining)).not.toContain(ERROR_CV_ID);
    expect(remaining).toHaveLength(0);
  });

  it("T130-AC3: a repeated failure keeps the file queued with an updated reason and attempt count", async () => {
    const initialAttempts = 2;
    const { store } = seedQueuedError({ attempt_count: initialAttempts });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(RETRY_AT));
    vi.mocked(extractCvText).mockResolvedValue(SUCCESSFUL_EXTRACTION);
    vi.mocked(parseCv).mockRejectedValue(new Error(RETRY_ERROR));

    try {
      await retryParse(ERROR_CV_ID);
    } catch {
      // A failing retry may surface the error after persisting the new reason.
    }

    const row = store.find((item) => item.id === ERROR_CV_ID);
    expect(row?.parse_status).toBe("error");
    expect(typeof row?.parse_error).toBe("string");
    expect(row?.parse_error).not.toBe(SCHEMA_ERROR);
    expect(row?.parse_error).toContain(RETRY_ERROR);
    expect(row?.attempt_count).toBe(initialAttempts + 1);
    expect(row?.last_attempted_at).toBeTruthy();
    expect(new Date(String(row?.last_attempted_at)).toISOString()).toBe(
      RETRY_AT,
    );

    const queued = await listFailedCvFiles();
    expect(queuedIds(queued)).toContain(ERROR_CV_ID);
    const listed = asRecord(
      (queued as unknown[]).find(
        (item) => asRecord(item).id === ERROR_CV_ID,
      ),
    );
    expect(listed.parse_error).toContain(RETRY_ERROR);
    expect(listed.attempt_count).toBe(initialAttempts + 1);
  });

  it("T130-AC4: retryParse is a plain recruiter-invoked export with no scheduler", () => {
    expect(typeof retryParse).toBe("function");
    expect(retryParse.length).toBe(1);

    const source = readFileSync(REVIEW_QUEUE_SOURCE_PATH, "utf8");
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
    expect(source).toMatch(/export async function retryParse\s*\(/);
    expect(source).not.toMatch(/setInterval\s*\(/);
    expect(source).not.toMatch(/setTimeout\s*\(/);
    expect(source).not.toMatch(/from\s+["']next\/server["']/);
    expect(source).not.toMatch(/from\s+["']node:timers["']/);

    const retryParseSites = source.match(/\bretryParse\s*\(/g) ?? [];
    expect(retryParseSites).toHaveLength(1);
  });
});
