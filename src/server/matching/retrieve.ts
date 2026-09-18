import "server-only";

import { getDb } from "../db";

const RETRIEVAL_LIMIT = 50;

export type RetrieveCandidatesInput = {
  jobVersionId: string;
  mustHaves: { text: string; marking: "must_have" | "nice_to_have" }[];
  requiresNationality: boolean;
  nationalityReason: string | null;
  requiresLanguage: boolean;
  languageReason: string | null;
  jobEmbedding: number[];
};

export type RetrievedCandidate = {
  candidateId: string;
  similarity: number;
};

type RetrievalRow = {
  owner_id: string;
  similarity: number;
};

/**
 * Embeddings has no `similarity` alias or related-table filter columns, so
 * the PostgREST chain is typed against the T2a contract rather than the
 * generated row type.
 */
type RetrievalQuery = {
  eq: (column: string, value: string) => RetrievalQuery;
  ilike: (column: string, pattern: string) => RetrievalQuery;
  not: (column: string, operator: string, value: unknown) => RetrievalQuery;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => RetrievalQuery;
  limit: (count: number) => RetrievalQuery;
  then: Promise<{
    data: RetrievalRow[] | null;
    error: { message: string } | null;
  }>["then"];
};

function hasWrittenReason(reason: string | null | undefined): boolean {
  return reason != null && reason.trim().length > 0;
}

function similaritySelect(jobEmbedding: number[]): string {
  const vectorLiteral = `[${jobEmbedding.join(",")}]`;
  return `owner_id, 1 - (embedding <=> '${vectorLiteral}') as similarity`;
}

export async function retrieveCandidates(
  input: RetrieveCandidatesInput,
): Promise<RetrievedCandidate[]> {
  let query = getDb()
    .from("embeddings")
    .select(similaritySelect(input.jobEmbedding))
    .eq("owner_type", "candidate_profile") as unknown as RetrievalQuery;

  for (const mustHave of input.mustHaves) {
    query = query.ilike("candidate_skills.skill", `%${mustHave.text}%`);
  }

  if (
    input.requiresNationality &&
    hasWrittenReason(input.nationalityReason)
  ) {
    query = query.not("parsed->>nationality", "is", null);
  }

  if (input.requiresLanguage && hasWrittenReason(input.languageReason)) {
    query = query.not("parsed->languages_spoken", "eq", "[]");
  }

  const { data, error } = await query
    .order("similarity", { ascending: false })
    .order("owner_id", { ascending: true })
    .limit(RETRIEVAL_LIMIT);

  if (error) {
    throw new Error(`Failed to retrieve candidates: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    candidateId: row.owner_id,
    similarity: row.similarity,
  }));
}
