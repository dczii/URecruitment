import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { searchCandidates, type SearchCandidateRow } from "./query";

vi.mock("../db", () => ({ getDb: vi.fn() }));

const QUERY_SOURCE_PATH = join(process.cwd(), "src/server/search/query.ts");

/** Fictional candidate ids — never a real person. */
const CANDIDATE_LOW = "00000000-0000-0000-0000-000000000501";
const CANDIDATE_HIGH = "00000000-0000-0000-0000-000000000502";
const JOB_VERSION_ID = "00000000-0000-0000-0000-000000000601";

const FILTERS = {
  skills: ["SAP"],
  min_years: 5,
  max_years: null,
  locations: ["Singapore"],
  languages: ["Mandarin"],
  cv_updated_after: null,
};

const KEYWORD = "accountant SAP";
const EMBEDDING = [0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88];

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function searchRow(
  overrides: Partial<SearchCandidateRow> & Pick<SearchCandidateRow, "candidate_id">,
): SearchCandidateRow {
  return {
    full_name: "Alex Tan",
    headline: "Accountant",
    total_years: 6,
    location: "Singapore",
    languages: ["English", "Mandarin"],
    cv_updated_at: "2026-08-01T00:00:00.000Z",
    keyword_score: 1,
    vector_score: 0.5,
    fused_score: 0.03,
    match_score: null,
    matched: null,
    missing: null,
    uncertain: null,
    highlight: "<span>accountant</span>",
    ...overrides,
  };
}

function mockRpc(result: {
  data: SearchCandidateRow[] | null;
  error: { message: string } | null;
}) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(getDb).mockReturnValue({ rpc } as never);
  return { rpc };
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("searchCandidates", () => {
  it("AC1: calls search_candidates with snake_case args mapped from filters, keyword, and embedding", async () => {
    const rows = [searchRow({ candidate_id: CANDIDATE_HIGH })];
    const { rpc } = mockRpc({ data: rows, error: null });

    await searchCandidates({
      filters: FILTERS,
      keyword: KEYWORD,
      embedding: EMBEDDING,
      jobVersionId: JOB_VERSION_ID,
      limit: 10,
      offset: 20,
    });

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("search_candidates", {
      filters: FILTERS,
      keyword: KEYWORD,
      embedding: EMBEDDING,
      job_version_id: JOB_VERSION_ID,
      lim: 10,
      off: 20,
    });
  });

  it("returns the SQL rows as-is: no client-side re-filter or re-sort", async () => {
    // SQL already ranked. These arrive with the lower fused_score first so a
    // client-side re-sort by score would swap them.
    const rows = [
      searchRow({
        candidate_id: CANDIDATE_LOW,
        fused_score: 0.01,
        full_name: "Alex Tan",
      }),
      searchRow({
        candidate_id: CANDIDATE_HIGH,
        fused_score: 0.99,
        full_name: "Jordan Lim",
      }),
    ];
    mockRpc({ data: rows, error: null });

    const result = await searchCandidates({
      filters: FILTERS,
      keyword: KEYWORD,
      embedding: EMBEDDING,
    });

    expect(result).toBe(rows);
    expect(result.map((row) => row.candidate_id)).toEqual([
      CANDIDATE_LOW,
      CANDIDATE_HIGH,
    ]);
  });

  it("defaults job_version_id to null, lim to 50, and off to 0", async () => {
    const { rpc } = mockRpc({ data: [], error: null });

    await searchCandidates({
      filters: FILTERS,
      keyword: null,
      embedding: null,
    });

    expect(rpc).toHaveBeenCalledWith("search_candidates", {
      filters: FILTERS,
      keyword: null,
      embedding: null,
      job_version_id: null,
      lim: 50,
      off: 0,
    });
  });

  it("surfaces a DB error, doesn't swallow it", async () => {
    mockRpc({ data: null, error: { message: "boom" } });

    let thrown: unknown;
    try {
      await searchCandidates({
        filters: FILTERS,
        keyword: KEYWORD,
        embedding: EMBEDDING,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : "";
    expect(message).toContain("boom");
  });

  it('starts with import "server-only"', () => {
    const source = readFileSync(QUERY_SOURCE_PATH, "utf8");
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });
});
