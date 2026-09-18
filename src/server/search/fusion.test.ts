import { describe, expect, it } from "vitest";
import {
  RRF_K,
  fuseKeywordAndVectorRanks,
  fuseRankLists,
  reciprocalRankFusion,
} from "./fusion";

/**
 * Reciprocal rank fusion math, mirrored from
 * `supabase/migrations/20260919000003_search_hybrid.sql`.
 *
 *   fused_score = 1/(RRF_K + keyword_rank) + 1/(RRF_K + vector_rank)
 *   RRF_K = 60  (Cormack, Clarke & Büttcher 2009)
 *
 * A ranking that does not contain the document contributes 0.
 * Rank is 1-indexed. Order is fused-score desc, then id asc.
 */

describe("reciprocal rank fusion", () => {
  it("uses RRF_K = 60, the same constant named in the SQL function", () => {
    expect(RRF_K).toBe(60);
  });

  it("combines two 1-indexed ranks as 1/(k+r1) + 1/(k+r2)", () => {
    expect(reciprocalRankFusion([1, 2])).toBeCloseTo(1 / 61 + 1 / 62, 12);
    expect(fuseKeywordAndVectorRanks(1, 2)).toBe(reciprocalRankFusion([1, 2]));
  });

  it("omits a ranking that does not contain the document", () => {
    expect(reciprocalRankFusion([1, null])).toBeCloseTo(1 / 61, 12);
    expect(reciprocalRankFusion([1, undefined])).toBe(reciprocalRankFusion([1]));
    expect(fuseKeywordAndVectorRanks(1, null)).toBe(reciprocalRankFusion([1]));
    expect(fuseKeywordAndVectorRanks(null, 3)).toBeCloseTo(1 / 63, 12);
  });

  it("treats non-positive ranks as absent, not as a score", () => {
    expect(reciprocalRankFusion([0, -1])).toBe(0);
    expect(reciprocalRankFusion([])).toBe(0);
  });

  it("ranks a top hit above a lower hit", () => {
    expect(reciprocalRankFusion([1, 1])).toBeGreaterThan(
      reciprocalRankFusion([2, 2]),
    );
  });

  it("is deterministic across repeated calls", () => {
    const first = reciprocalRankFusion([1, 3]);
    const second = reciprocalRankFusion([1, 3]);
    expect(first).toBe(second);
    expect(first).toBeCloseTo(1 / 61 + 1 / 63, 12);
  });
});

describe("fuseRankLists (two rank lists → one order)", () => {
  const keyword = [
    { id: "A", rank: 1 },
    { id: "B", rank: 2 },
    { id: "C", rank: 3 },
  ];
  const vector = [
    { id: "B", rank: 1 },
    { id: "C", rank: 2 },
    { id: "A", rank: 3 },
  ];

  it("produces a deterministic fused order from two rank lists", () => {
    // A: 1/61 + 1/63
    // B: 1/62 + 1/61  ← highest (vector rank 1 outweighs keyword rank 2)
    // C: 1/63 + 1/62
    const fused = fuseRankLists(keyword, vector);
    expect(fused.map((row) => row.id)).toEqual(["B", "A", "C"]);
    expect(fused[0]?.fusedScore).toBeCloseTo(1 / 62 + 1 / 61, 12);
    expect(fused[1]?.fusedScore).toBeCloseTo(1 / 61 + 1 / 63, 12);
    expect(fused[2]?.fusedScore).toBeCloseTo(1 / 63 + 1 / 62, 12);
  });

  it("returns the same order across repeated runs", () => {
    const first = fuseRankLists(keyword, vector).map((row) => row.id);
    const second = fuseRankLists(keyword, vector).map((row) => row.id);
    expect(second).toEqual(first);
  });

  it("keeps a document that appears in only one list", () => {
    const fused = fuseRankLists(
      [{ id: "only-keyword", rank: 1 }],
      [{ id: "only-vector", rank: 1 }],
    );
    expect(fused).toHaveLength(2);
    expect(fused[0]?.fusedScore).toBe(fused[1]?.fusedScore);
    // Equal scores: tie-break is id ascending.
    expect(fused.map((row) => row.id)).toEqual([
      "only-keyword",
      "only-vector",
    ]);
  });

  it("tie-breaks equal fused scores by id ascending", () => {
    const fused = fuseRankLists(
      [
        { id: "zeta", rank: 1 },
        { id: "alpha", rank: 1 },
      ],
      [],
    );
    expect(fused.map((row) => row.id)).toEqual(["alpha", "zeta"]);
  });
});
