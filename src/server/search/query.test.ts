import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { searchCandidates, type SearchCandidateRow } from "./query";

vi.mock("../db", () => ({ getDb: vi.fn() }));

const QUERY_SOURCE_PATH = join(process.cwd(), "src/server/search/query.ts");

const CANDIDATE_LOW = "00000000-0000-0000-0000-000000000501";
const CANDIDATE_HIGH = "00000000-0000-0000-0000-000000000502";

const FILTERS = {
  skills: ["SAP"],
  min_years: 5,
  max_years: null,
  locations: ["Singapore"],
  languages: ["Mandarin"],
  cv_updated_after: null,
};

const KEYWORD = "accountant SAP";

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
  it("calls search_candidates with filters and keyword", async () => {
    const rows = [searchRow({ candidate_id: CANDIDATE_HIGH })];
    const { rpc } = mockRpc({ data: rows, error: null });

    await searchCandidates({
      filters: FILTERS,
      keyword: KEYWORD,
      limit: 10,
      offset: 20,
    });

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("search_candidates", {
      filters: FILTERS,
      keyword: KEYWORD,
      lim: 10,
      off: 20,
    });
  });

  it("returns the SQL rows as-is: no client-side re-filter or re-sort", async () => {
    const rows = [
      searchRow({
        candidate_id: CANDIDATE_LOW,
        keyword_score: 0.01,
        full_name: "Alex Tan",
      }),
      searchRow({
        candidate_id: CANDIDATE_HIGH,
        keyword_score: 0.99,
        full_name: "Jordan Lim",
      }),
    ];
    mockRpc({ data: rows, error: null });

    const result = await searchCandidates({
      filters: FILTERS,
      keyword: KEYWORD,
    });

    expect(result).toBe(rows);
    expect(result.map((row) => row.candidate_id)).toEqual([
      CANDIDATE_LOW,
      CANDIDATE_HIGH,
    ]);
  });

  it("defaults lim to 50 and off to 0", async () => {
    const { rpc } = mockRpc({ data: [], error: null });

    await searchCandidates({
      filters: FILTERS,
      keyword: null,
    });

    expect(rpc).toHaveBeenCalledWith("search_candidates", {
      filters: FILTERS,
      keyword: null,
      lim: 50,
      off: 0,
    });
  });

  it("surfaces a DB error, doesn't swallow it", async () => {
    mockRpc({ data: null, error: { message: "boom" } });

    await expect(
      searchCandidates({
        filters: FILTERS,
        keyword: KEYWORD,
      }),
    ).rejects.toThrow(/boom/);
  });

  it('starts with import "server-only"', () => {
    const source = readFileSync(QUERY_SOURCE_PATH, "utf8");
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });
});
