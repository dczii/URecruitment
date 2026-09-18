import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { retrieveCandidates } from "./retrieve";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * T2a contract — implement `retrieveCandidates` in `src/server/matching/retrieve.ts`
 * (T2b). Do not add a second round-trip: hard filters and top-50 similarity
 * live on one query builder chain.
 *
 * retrieveCandidates(input) → Promise<{ candidateId: string; similarity: number }[]>
 *
 *   input:
 *     jobVersionId: string
 *     mustHaves: { text: string; marking: "must_have" | "nice_to_have" }[]
 *       — the job version's `must_haves`. Each `text` is a hard filter.
 *     requiresNationality: boolean
 *     nationalityReason: string | null
 *     requiresLanguage: boolean
 *     languageReason: string | null
 *     jobEmbedding: number[]
 *       — the job version's stored embedding; used as the pgvector query
 *         vector (e.g. in the `select` similarity expression).
 *
 *   One `getDb()` call. One `.from("embeddings")` chain (not a separate
 *   skills query, not an in-memory filter after fetch):
 *
 *     .from("embeddings")
 *     .select(<expression that aliases owner_id and similarity>)
 *     .eq("owner_type", "candidate_profile")
 *     // Hard filters on this same chain — see "Hard filters" below.
 *     .order("similarity", { ascending: false })
 *     .order("owner_id", { ascending: true })
 *     .limit(50)
 *
 *   Await the chain (`const { data, error } = await query`). Map each row
 *   `{ owner_id, similarity }` → `{ candidateId: owner_id, similarity }`.
 *   Return the mapped rows in query order. Do not slice, sort, or filter
 *   them in JS — the database already applied filters, order, and limit.
 *
 * Hard filters
 *   1. Must-have skill text (always). For every `mustHaves[].text`, a
 *      keyword condition on the retrieval chain includes that text.
 *      Accepted methods: `ilike` / `like` / `filter` / `or` / `textSearch`
 *      / `contains` / `eq`. Suggested shape:
 *        .ilike("candidate_skills.skill", `%${text}%`)
 *      Nice-to-haves are not hard filters and are not part of `input`.
 *   2. Nationality — only when `requiresNationality === true` AND
 *      `nationalityReason` is non-null and non-blank after trim. Then a
 *      filter-method call's arguments must match `/nationality/i` (column
 *      or value), e.g. `.not("parsed->>nationality", "is", null)`. When
 *      the gate is closed, no filter-method argument mentions nationality.
 *   3. Language — only when `requiresLanguage === true` AND
 *      `languageReason` is non-null and non-blank after trim. Then a
 *      filter-method call's arguments must match `/languages_spoken/`
 *      (the parse-cv field), e.g.
 *      `.not("parsed->languages_spoken", "eq", "[]")`. When the gate is
 *      closed, no filter-method argument mentions `languages_spoken`.
 *
 * Tie-break: `embeddings.owner_id` is the candidate id
 * (`embedCvProfile` stores `owner_id = candidateId`). After similarity
 * desc, `.order("owner_id", { ascending: true })` so equal similarities
 * are reproducible.
 */

const JOB_VERSION_ID = "00000000-0000-0000-0000-000000000401";
const CANDIDATE_PYTHON = "00000000-0000-0000-0000-000000000411";
const CANDIDATE_TIE_A = "00000000-0000-0000-0000-000000000412";
const CANDIDATE_TIE_B = "00000000-0000-0000-0000-000000000413";

const RETRIEVAL_LIMIT = 50;
const PYTHON_MUST_HAVE = {
  text: "Python",
  marking: "must_have" as const,
};
const JOB_EMBEDDING = [0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88];
const NATIONALITY_REASON =
  "The client's MAS-regulated desk requires Singapore citizenship for on-site access.";
const LANGUAGE_REASON =
  "Daily stand-ups with the client's Shanghai team are held in Mandarin.";

type RetrieveInput = {
  jobVersionId: string;
  mustHaves: { text: string; marking: "must_have" | "nice_to_have" }[];
  requiresNationality: boolean;
  nationalityReason: string | null;
  requiresLanguage: boolean;
  languageReason: string | null;
  jobEmbedding: number[];
};

type QueryRow = {
  owner_id: string;
  similarity: number;
};

const QUERY_METHODS = [
  "select",
  "eq",
  "neq",
  "filter",
  "not",
  "or",
  "in",
  "contains",
  "containedBy",
  "overlaps",
  "ilike",
  "like",
  "textSearch",
  "match",
  "is",
  "gt",
  "gte",
  "lt",
  "lte",
  "order",
  "limit",
] as const;

const FILTER_METHODS = QUERY_METHODS.filter(
  (method) => method !== "select" && method !== "order" && method !== "limit",
);

type QueryMethod = (typeof QUERY_METHODS)[number];

type QueryChain = Record<QueryMethod, ReturnType<typeof vi.fn>> & {
  then: Promise<{ data: QueryRow[]; error: null }>["then"];
};

function retrieveInput(overrides: Partial<RetrieveInput> = {}): RetrieveInput {
  return {
    jobVersionId: JOB_VERSION_ID,
    mustHaves: [PYTHON_MUST_HAVE],
    requiresNationality: false,
    nationalityReason: null,
    requiresLanguage: false,
    languageReason: null,
    jobEmbedding: JOB_EMBEDDING,
    ...overrides,
  };
}

function createQueryChain(rows: QueryRow[]): QueryChain {
  const result = { data: rows, error: null };
  const chain = {} as QueryChain;

  for (const method of QUERY_METHODS) {
    chain[method] = vi.fn(() => chain);
  }

  chain.then = (onfulfilled, onrejected) =>
    Promise.resolve(result).then(onfulfilled, onrejected);

  return chain;
}

function mockRetrievalQuery(rows: QueryRow[]) {
  const chain = createQueryChain(rows);
  const from = vi.fn(() => chain);
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, chain };
}

function filterArgsBlob(chain: QueryChain): string {
  const calls: unknown[] = [];
  for (const method of FILTER_METHODS) {
    for (const args of chain[method].mock.calls) {
      calls.push([method, ...args]);
    }
  }
  return JSON.stringify(calls);
}

function mappedRows(rows: QueryRow[]): {
  candidateId: string;
  similarity: number;
}[] {
  return rows.map((row) => ({
    candidateId: row.owner_id,
    similarity: row.similarity,
  }));
}

function nQueryRows(count: number): QueryRow[] {
  return Array.from({ length: count }, (_, index) => ({
    owner_id: `00000000-0000-0000-0000-${String(500 + index).padStart(12, "0")}`,
    similarity: 0.9 - index * 0.001,
  }));
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("retrieveCandidates", () => {
  it("hard filters exclude in the query: must-have skill text is a keyword condition, and the function returns the query's rows unchanged", async () => {
    // Hard filter (this task): each mustHaves[].text is applied as a
    // keyword condition on the embeddings query itself. A candidate whose
    // skills do not match "Python" is excluded by Postgres — the mock
    // therefore returns only the qualifying row. retrieveCandidates must
    // not post-filter (or invent rows); it returns exactly what the query
    // returned.
    const qualifying: QueryRow[] = [
      { owner_id: CANDIDATE_PYTHON, similarity: 0.91 },
    ];
    const { chain, from } = mockRetrievalQuery(qualifying);

    const result = await retrieveCandidates(
      retrieveInput({ mustHaves: [PYTHON_MUST_HAVE] }),
    );

    expect(from).toHaveBeenCalledWith("embeddings");
    expect(chain.eq).toHaveBeenCalledWith(
      "owner_type",
      "candidate_profile",
    );
    expect(filterArgsBlob(chain)).toContain(PYTHON_MUST_HAVE.text);
    expect(chain.limit).toHaveBeenCalledWith(RETRIEVAL_LIMIT);
    expect(result).toEqual(mappedRows(qualifying));
  });

  it("returns all 50 rows when the query is already limited to 50", async () => {
    const rows = nQueryRows(RETRIEVAL_LIMIT);
    const { chain } = mockRetrievalQuery(rows);

    const result = await retrieveCandidates(retrieveInput());

    expect(chain.limit).toHaveBeenCalledWith(RETRIEVAL_LIMIT);
    expect(result).toHaveLength(RETRIEVAL_LIMIT);
    expect(result).toEqual(mappedRows(rows));
  });

  it("returns every qualifying row when fewer than 50 match", async () => {
    const rows = nQueryRows(12);
    mockRetrievalQuery(rows);

    const result = await retrieveCandidates(retrieveInput());

    expect(result).toHaveLength(12);
    expect(result).toEqual(mappedRows(rows));
  });

  it("builds a stable secondary order on owner_id after similarity desc", async () => {
    const tied: QueryRow[] = [
      { owner_id: CANDIDATE_TIE_A, similarity: 0.8 },
      { owner_id: CANDIDATE_TIE_B, similarity: 0.8 },
    ];
    const { chain } = mockRetrievalQuery(tied);

    await retrieveCandidates(retrieveInput());

    expect(chain.order.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(chain.order.mock.calls[0]?.[0]).toBe("similarity");
    expect(chain.order.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ ascending: false }),
    );
    expect(chain.order.mock.calls[1]?.[0]).toBe("owner_id");
    const tieBreakOptions = chain.order.mock.calls[1]?.[1] as
      | { ascending?: boolean }
      | undefined;
    expect(tieBreakOptions?.ascending).not.toBe(false);
  });

  it("nationality/language are retrieval filters only when the job requires them with a written reason", async () => {
    const rows: QueryRow[] = [
      { owner_id: CANDIDATE_PYTHON, similarity: 0.91 },
    ];

    const off = mockRetrievalQuery(rows);
    await retrieveCandidates(
      retrieveInput({
        requiresNationality: false,
        nationalityReason: null,
        requiresLanguage: false,
        languageReason: null,
      }),
    );
    expect(filterArgsBlob(off.chain)).not.toMatch(/nationality/i);
    expect(filterArgsBlob(off.chain)).not.toMatch(/languages_spoken/);

    const nationalityOn = mockRetrievalQuery(rows);
    await retrieveCandidates(
      retrieveInput({
        requiresNationality: true,
        nationalityReason: NATIONALITY_REASON,
        requiresLanguage: false,
        languageReason: null,
      }),
    );
    expect(filterArgsBlob(nationalityOn.chain)).toMatch(/nationality/i);
    expect(filterArgsBlob(nationalityOn.chain)).not.toMatch(/languages_spoken/);

    const languageOn = mockRetrievalQuery(rows);
    await retrieveCandidates(
      retrieveInput({
        requiresNationality: false,
        nationalityReason: null,
        requiresLanguage: true,
        languageReason: LANGUAGE_REASON,
      }),
    );
    expect(filterArgsBlob(languageOn.chain)).toMatch(/languages_spoken/);
    expect(filterArgsBlob(languageOn.chain)).not.toMatch(/nationality/i);

    const whitespaceReason = mockRetrievalQuery(rows);
    await retrieveCandidates(
      retrieveInput({
        requiresNationality: true,
        nationalityReason: "   ",
        requiresLanguage: true,
        languageReason: "   ",
      }),
    );
    expect(filterArgsBlob(whitespaceReason.chain)).not.toMatch(/nationality/i);
    expect(filterArgsBlob(whitespaceReason.chain)).not.toMatch(
      /languages_spoken/,
    );
  });

  it("issues one database query per retrieveCandidates call", async () => {
    const { from } = mockRetrievalQuery([
      { owner_id: CANDIDATE_PYTHON, similarity: 0.91 },
    ]);

    await retrieveCandidates(retrieveInput());

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("embeddings");
  });
});
