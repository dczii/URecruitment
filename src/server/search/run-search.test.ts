import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeModel } from "../ai/fake-model";
import {
  SEARCH_QUERY_PROMPT_ID,
  SEARCH_QUERY_PROMPT_VERSION,
  type SearchQueryOutput,
} from "../ai/prompts/search-query";
import { runAi } from "../ai/run";
import type { AiRunRecord, AiRunsWriter } from "../ai/types";
import type { SearchCandidateRow } from "./query";
import { searchCandidates } from "./query";
import { runSearch } from "./run-search";

vi.mock("./query", () => ({
  searchCandidates: vi.fn(),
}));

vi.mock("../ai/run", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/run")>();
  return {
    ...actual,
    runAi: vi.fn(actual.runAi),
  };
});

/**
 * T1a contract — implement `runSearch` in `src/server/search/run-search.ts`
 * (T1b). One `runAi` call with the search-query prompt (#152), then
 * `searchCandidates` (#153). No network. Embedding is always `null`
 * (`embedText` does not exist yet — flagged limitation, not in scope).
 *
 * ---------------------------------------------------------------------------
 * runSearch({ query, model, runs })
 *   → Promise<RunSearchResult>
 *
 * RunSearchArgs
 *   { query: string; model: AiModel; runs: AiRunsWriter }
 *
 * RunSearchResult (discriminated on `status`)
 *   { status: "ok"; results: SearchResult[]; ignoredTerms: IgnoredTerm[] }
 *     — schema-valid parse, then `searchCandidates`. `results` may be `[]`
 *       when nothing matched. That is a successful search, not a parse
 *       failure. `ignoredTerms` is always an array (empty when the model
 *       reported none). Copied from the parse's `ignored_terms` — never
 *       applied as filters.
 *   | { status: "could_not_understand" }
 *     — `runAi` threw (schema-invalid output or provider error) after
 *       writing the failed `ai_runs` row. Must not throw to the caller.
 *       Must not be `{ status: "ok", results: [] }`. No `results` field.
 *
 * Empty / whitespace-only `query` (after trim) is rejected by throwing
 * before `runAi` / the model / `searchCandidates`. That is input
 * validation, not `could_not_understand`.
 *
 * SearchResult — camelCase map of `SearchCandidateRow`. `cvUpdatedAt`
 * is `cv_updated_at` (AC2). T1b maps every column; do not pass SQL
 * snake_case through.
 *   {
 *     candidateId: string;
 *     fullName: string;
 *     headline: string | null;
 *     totalYears: number;
 *     location: string | null;
 *     languages: string[];
 *     cvUpdatedAt: string | null;   // from cv_updated_at
 *     keywordScore: number;
 *     vectorScore: number | null;
 *     fusedScore: number;
 *     matchScore: number | null;
 *     matched: Json | null;
 *     missing: Json | null;
 *     uncertain: Json | null;
 *     highlight: string | null;
 *   }
 *
 * IgnoredTerm — `{ term: string; reason: string }` from the parse.
 *
 * Resolution rules
 *   1. Trim `query`. Empty → throw (message matches /empty/i). No model.
 *   2. `runAi` with `searchQueryOutputSchema`, prompt id/version
 *      `SEARCH_QUERY_PROMPT_ID` / `SEARCH_QUERY_PROMPT_VERSION`, and
 *      `buildSearchQueryInput(query)` (text contains `<query>` + the
 *      original query). `inputRef` is caller-chosen but must be a
 *      non-empty string (e.g. `search-query`).
 *   3. On success, `searchCandidates({ filters, keyword, embedding })`:
 *        filters   = parsed.filters (all five keys, as returned)
 *        keyword   = parsed.keyword_text
 *        embedding = null   // always; ignore semantic_text
 *      Do not pass ignored_terms into filters. Do not pass a job version
 *      (job-scoped search is #54).
 *   4. Map each SQL row to SearchResult (`cv_updated_at` → `cvUpdatedAt`).
 *   5. `runAi` throw → catch, return `{ status: "could_not_understand" }`.
 *      Do not call `searchCandidates`.
 *   6. Every call that reaches the model writes an `ai_runs` row via
 *      `runs` (success or failure). Empty-query rejection writes none.
 */

const MODEL_ID = "fake-search";
const MODEL_VERSION = "test-1";
const COST_USD = 0.009;

/** Fictional candidate id — never a real person. */
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000701";

const QUERY =
  "young Mandarin-speaking sales candidates in Shanghai with 3+ years, CV updated since 2026-08-19";

/**
 * All five PRD filters populated, plus a protected term in ignored_terms
 * so the pass-through (not the prompt's own routing) is what we assert.
 */
const VALID_SEARCH_OUTPUT: SearchQueryOutput = {
  filters: {
    skills: ["sales"],
    min_years: 3,
    max_years: null,
    locations: ["Shanghai"],
    languages: ["Mandarin"],
    cv_updated_after: "2026-08-19",
  },
  keyword_text: "sales Shanghai Mandarin",
  semantic_text:
    "Sales candidates in Shanghai who speak Mandarin, with at least 3 years of experience and a recently updated CV.",
  ignored_terms: [
    {
      term: "young",
      reason:
        "age is a protected attribute and is never used as a search filter",
    },
  ],
  prompt_injection_detected: false,
  prompt_injection_note: null,
};

const SCHEMA_INVALID_OUTPUT = {
  filters: { skills: "sales" },
  keyword_text: 12,
};

const PROVIDER_ERROR = new Error("provider timeout");

const CV_UPDATED_AT = "2026-08-01T00:00:00.000Z";

function searchRow(
  overrides: Partial<SearchCandidateRow> &
    Pick<SearchCandidateRow, "candidate_id">,
): SearchCandidateRow {
  return {
    full_name: "Alex Tan",
    headline: "Sales Manager",
    total_years: 6,
    location: "Shanghai",
    languages: ["English", "Mandarin"],
    cv_updated_at: CV_UPDATED_AT,
    keyword_score: 1,
    vector_score: 0.5,
    fused_score: 0.03,
    match_score: null,
    matched: null,
    missing: null,
    uncertain: null,
    highlight: "<span>sales</span>",
    ...overrides,
  };
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

function expectNumericCostAndDuration(row: AiRunRecord): void {
  expect(typeof row.cost_usd).toBe("number");
  expect(Number.isFinite(row.cost_usd)).toBe(true);
  expect(typeof row.duration_ms).toBe("number");
  expect(Number.isFinite(row.duration_ms)).toBe(true);
}

function completedRows(runs: { rows: AiRunRecord[] }): AiRunRecord[] {
  return runs.rows.filter(
    (row) => row.status === "succeeded" || row.status === "failed",
  );
}

beforeEach(() => {
  vi.mocked(runAi).mockClear();
  vi.mocked(searchCandidates).mockReset();
  vi.mocked(searchCandidates).mockResolvedValue([]);
});

describe("runSearch (AC1, AC2)", () => {
  it.each(["", "   ", "\n\t"])(
    "rejects an empty or whitespace-only query (%j) before any model call",
    async (query) => {
      const runs = createMemoryRuns();
      const model = createFakeModel({
        modelId: MODEL_ID,
        modelVersion: MODEL_VERSION,
        object: VALID_SEARCH_OUTPUT,
        costUsd: COST_USD,
      });
      const generateObject = vi.spyOn(model, "generateObject");

      let thrown: unknown;
      try {
        await runSearch({ query, model, runs });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      if (thrown instanceof Error) {
        expect(thrown.message).toMatch(/empty/i);
      }

      expect(generateObject).not.toHaveBeenCalled();
      expect(runAi).not.toHaveBeenCalled();
      expect(searchCandidates).not.toHaveBeenCalled();
      expect(runs.rows).toHaveLength(0);
    },
  );

  it("AC1+AC2: a successful parse searches with parsed filters/keyword and embedding null, returning cvUpdatedAt and ignoredTerms", async () => {
    const rows = [searchRow({ candidate_id: CANDIDATE_ID })];
    vi.mocked(searchCandidates).mockResolvedValue(rows);

    const runs = createMemoryRuns();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      object: VALID_SEARCH_OUTPUT,
      costUsd: COST_USD,
    });

    const result = await runSearch({ query: QUERY, model, runs });

    expect(runAi).toHaveBeenCalledTimes(1);
    const aiArgs = vi.mocked(runAi).mock.calls[0]?.[0];
    expect(aiArgs?.prompt.id).toBe(SEARCH_QUERY_PROMPT_ID);
    expect(aiArgs?.prompt.version).toBe(SEARCH_QUERY_PROMPT_VERSION);
    expect(aiArgs?.prompt.text).toContain("<query>");
    expect(aiArgs?.prompt.text).toContain(QUERY);
    expect(aiArgs?.model).toBe(model);
    expect(aiArgs?.runs).toBe(runs);

    expect(searchCandidates).toHaveBeenCalledTimes(1);
    const searchArgs = vi.mocked(searchCandidates).mock.calls[0]?.[0];
    expect(searchArgs).toEqual(
      expect.objectContaining({
        filters: VALID_SEARCH_OUTPUT.filters,
        keyword: VALID_SEARCH_OUTPUT.keyword_text,
        embedding: null,
      }),
    );
    expect(searchArgs?.embedding).toBeNull();
    expect(searchArgs).not.toHaveProperty("semantic_text");
    expect(searchArgs?.filters).not.toEqual(
      expect.objectContaining({
        skills: expect.arrayContaining(["young"]),
      }),
    );
    expect(JSON.stringify(searchArgs?.filters)).not.toContain("young");

    expect(result).toEqual({
      status: "ok",
      ignoredTerms: VALID_SEARCH_OUTPUT.ignored_terms,
      results: [
        {
          candidateId: CANDIDATE_ID,
          fullName: "Alex Tan",
          headline: "Sales Manager",
          totalYears: 6,
          location: "Shanghai",
          languages: ["English", "Mandarin"],
          cvUpdatedAt: CV_UPDATED_AT,
          keywordScore: 1,
          vectorScore: 0.5,
          fusedScore: 0.03,
          matchScore: null,
          matched: null,
          missing: null,
          uncertain: null,
          highlight: "<span>sales</span>",
        },
      ],
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.results[0]?.cvUpdatedAt).toBe(rows[0]?.cv_updated_at);
      expect(result.results[0]).not.toHaveProperty("cv_updated_at");
    }
  });

  it.each([
    {
      label: "schema-invalid model response",
      object: SCHEMA_INVALID_OUTPUT,
      error: undefined,
    },
    {
      label: "thrown model error",
      object: undefined,
      error: PROVIDER_ERROR,
    },
  ])(
    "returns could_not_understand for a $label, not empty results and not a thrown error",
    async ({ object, error }) => {
      const runs = createMemoryRuns();
      const model = createFakeModel({
        modelId: MODEL_ID,
        modelVersion: MODEL_VERSION,
        object,
        error,
        costUsd: COST_USD,
      });

      let thrown: unknown;
      let result: unknown;
      try {
        result = await runSearch({ query: QUERY, model, runs });
      } catch (caught) {
        thrown = caught;
      }

      expect(thrown).toBeUndefined();
      expect(result).toEqual({ status: "could_not_understand" });
      expect(result).not.toEqual(
        expect.objectContaining({ status: "ok", results: [] }),
      );
      expect(result).not.toHaveProperty("results");
      expect(searchCandidates).not.toHaveBeenCalled();

      const failed = runs.rows.filter((row) => row.status === "failed");
      expect(failed.length).toBeGreaterThanOrEqual(1);
      expect(failed[0]?.step).toBe(SEARCH_QUERY_PROMPT_ID);
      expectNumericCostAndDuration(failed[0]);
    },
  );

  it("a successful parse with zero matching candidates returns ok with empty results, not could_not_understand", async () => {
    vi.mocked(searchCandidates).mockResolvedValue([]);

    const runs = createMemoryRuns();
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      object: VALID_SEARCH_OUTPUT,
      costUsd: COST_USD,
    });

    const result = await runSearch({ query: QUERY, model, runs });

    expect(searchCandidates).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "ok",
      results: [],
      ignoredTerms: VALID_SEARCH_OUTPUT.ignored_terms,
    });
    expect(result).not.toEqual({ status: "could_not_understand" });
  });

  it("writes an ai_runs row via the injected AiRunsWriter whenever the model is called", async () => {
    vi.mocked(searchCandidates).mockResolvedValue([
      searchRow({ candidate_id: CANDIDATE_ID }),
    ]);

    const successRuns = createMemoryRuns();
    const successModel = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      object: VALID_SEARCH_OUTPUT,
      costUsd: COST_USD,
    });

    await runSearch({
      query: QUERY,
      model: successModel,
      runs: successRuns,
    });

    const succeeded = completedRows(successRuns);
    expect(succeeded.length).toBeGreaterThanOrEqual(1);
    expect(succeeded[0]?.status).toBe("succeeded");
    expect(succeeded[0]?.model_id).toBe(MODEL_ID);
    expect(succeeded[0]?.model_version).toBe(MODEL_VERSION);
    expect(succeeded[0]?.prompt_version).toBe(SEARCH_QUERY_PROMPT_VERSION);
    expect(succeeded[0]?.step).toBe(SEARCH_QUERY_PROMPT_ID);
    expectNumericCostAndDuration(succeeded[0]);
    expect(succeeded[0]?.cost_usd).toBe(COST_USD);

    const failureRuns = createMemoryRuns();
    const failureModel = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      error: PROVIDER_ERROR,
      costUsd: COST_USD,
    });

    const failureResult = await runSearch({
      query: QUERY,
      model: failureModel,
      runs: failureRuns,
    });
    expect(failureResult).toEqual({ status: "could_not_understand" });

    const failed = completedRows(failureRuns);
    expect(failed.length).toBeGreaterThanOrEqual(1);
    expect(failed[0]?.status).toBe("failed");
    expect(failed[0]?.step).toBe(SEARCH_QUERY_PROMPT_ID);
    expectNumericCostAndDuration(failed[0]);
  });
});
