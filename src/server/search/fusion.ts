import "server-only";

/**
 * Reciprocal rank fusion (Cormack, Clarke & Büttcher 2009).
 *
 * These constants and this formula are the TypeScript mirror of the SQL in
 * `supabase/migrations/20260919000003_search_hybrid.sql`. Keep them in lockstep:
 * the hybrid `search_candidates` function fuses PGroonga keyword ranks with
 * pgvector similarity ranks using the same `RRF_K`.
 *
 *   fused_score(d) = Σ_i 1 / (RRF_K + rank_i(d))
 *
 * Ranks are 1-indexed. A ranking that does not contain `d` contributes 0
 * (equivalent to infinite rank). Ties are broken by candidate id in SQL, and
 * by `id` ascending in `fuseRankLists` below.
 */
export const RRF_K = 60;

export type RankedItem = {
  id: string;
  rank: number;
};

export type FusedItem = {
  id: string;
  fusedScore: number;
};

/**
 * Fuse an arbitrary list of ranks for one document. Null/undefined/non-positive
 * ranks are treated as "not in that ranking" and contribute 0.
 */
export function reciprocalRankFusion(
  ranks: ReadonlyArray<number | null | undefined>,
  k: number = RRF_K,
): number {
  let score = 0;
  for (const rank of ranks) {
    if (rank == null || rank < 1) {
      continue;
    }
    score += 1 / (k + rank);
  }
  return score;
}

/** Keyword + vector RRF for one candidate — the two-list case the SQL uses. */
export function fuseKeywordAndVectorRanks(
  keywordRank: number | null | undefined,
  vectorRank: number | null | undefined,
  k: number = RRF_K,
): number {
  return reciprocalRankFusion([keywordRank, vectorRank], k);
}

/**
 * Combine two rank lists into a single deterministic order: fused score
 * descending, then `id` ascending. Documents present in only one list still
 * appear, with the missing ranking contributing 0.
 */
export function fuseRankLists(
  keywordRanks: readonly RankedItem[],
  vectorRanks: readonly RankedItem[],
  k: number = RRF_K,
): FusedItem[] {
  const keywordById = new Map(
    keywordRanks.map((item) => [item.id, item.rank]),
  );
  const vectorById = new Map(vectorRanks.map((item) => [item.id, item.rank]));
  const ids = new Set<string>([...keywordById.keys(), ...vectorById.keys()]);

  return [...ids]
    .map((id) => ({
      id,
      fusedScore: fuseKeywordAndVectorRanks(
        keywordById.get(id),
        vectorById.get(id),
        k,
      ),
    }))
    .sort((a, b) => {
      if (a.fusedScore !== b.fusedScore) {
        return b.fusedScore - a.fusedScore;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}
