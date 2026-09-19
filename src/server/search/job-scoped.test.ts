import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentJobVersion } from "../jobs/versions";
import {
  searchCandidates,
  type SearchCandidateRow,
  type SearchCandidatesFilters,
} from "./query";
import { getJobScopedResults } from "./job-scoped";

vi.mock("./query", () => ({
  searchCandidates: vi.fn(),
}));

vi.mock("../jobs/versions", () => ({
  getCurrentJobVersion: vi.fn(),
}));

const JOB_SCOPED_SOURCE_PATH = join(
  process.cwd(),
  "src/server/search/job-scoped.ts",
);

const JOB_ID = "00000000-0000-0000-0000-000000000801";
const VERSION_ID = "00000000-0000-0000-0000-000000000821";
const CANDIDATE_HIGH = "00000000-0000-0000-0000-000000000812";

const FILTERS: SearchCandidatesFilters = {
  skills: ["SAP"],
  min_years: 5,
  max_years: null,
  locations: ["Singapore"],
  languages: ["Mandarin"],
  cv_updated_after: "2026-07-01",
};

const CURRENT_VERSION = {
  id: VERSION_ID,
  job_id: JOB_ID,
  fields: {},
  must_haves: [],
  nice_to_haves: [],
  requires_nationality: false,
  nationality_reason: null,
  requires_language: false,
  language_reason: null,
  created_at: "2026-09-10T02:00:00.000Z",
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
    keyword_score: 0,
    highlight: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(searchCandidates).mockReset();
  vi.mocked(getCurrentJobVersion).mockReset();
});

describe("getJobScopedResults", () => {
  it("returns not_ready when the job has no version", async () => {
    vi.mocked(getCurrentJobVersion).mockResolvedValue(null);

    const result = await getJobScopedResults({ jobId: JOB_ID, filters: FILTERS });

    expect(result).toEqual({ status: "not_ready" });
    expect(searchCandidates).not.toHaveBeenCalled();
  });

  it("maps SQL rows in order without match scores", async () => {
    vi.mocked(getCurrentJobVersion).mockResolvedValue(CURRENT_VERSION);
    const rows = [
      searchRow({ candidate_id: CANDIDATE_HIGH, full_name: "Jordan Lim" }),
    ];
    vi.mocked(searchCandidates).mockResolvedValue(rows);

    const result = await getJobScopedResults({ jobId: JOB_ID, filters: FILTERS });

    expect(searchCandidates).toHaveBeenCalledWith({
      filters: FILTERS,
      keyword: null,
    });
    expect(result).toEqual({
      status: "ready",
      jobVersionId: VERSION_ID,
      results: [
        {
          candidateId: CANDIDATE_HIGH,
          fullName: "Jordan Lim",
          headline: "Accountant",
          totalYears: 6,
          location: "Singapore",
          languages: ["English", "Mandarin"],
          cvUpdatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });
  });

  it('starts with import "server-only" and does not import AI modules', () => {
    const source = readFileSync(JOB_SCOPED_SOURCE_PATH, "utf8");
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
    expect(source).not.toMatch(/src\/server\/ai/);
    expect(source).not.toMatch(/\brunAi\b/);
    expect(source).not.toMatch(/\bgetModel\b/);
  });
});
