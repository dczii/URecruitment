import "server-only";

import type { Json } from "@/lib/database.types";
import type { AiModel, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import type { ScoringCandidateProfile } from "./redact";
import { retrieveCandidates, type RetrieveCandidatesInput } from "./retrieve";
import { scoreCandidate, type ScoringRequirement } from "./score";

export type StartRescoreRunArgs = {
  jobVersionId: string;
  model: AiModel;
  runs: AiRunsWriter;
};

type RescoreStatus = "pending" | "running" | "failed" | "complete";

type RescoreRunRow = {
  id: string;
  job_version_id: string;
  status: RescoreStatus;
  candidate_ids_scored: string[];
  error: string | null;
};

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

/**
 * Generated Database types do not yet include `rescore_runs` (M1 migration).
 * Local chain so we can talk to the table without `any`.
 */
type RescoreRunsChain = {
  select: (columns?: string) => RescoreRunsChain;
  insert: (payload: Record<string, unknown>) => RescoreRunsChain;
  update: (payload: Record<string, unknown>) => RescoreRunsChain;
  eq: (column: string, value: unknown) => RescoreRunsChain;
  in: (column: string, values: readonly unknown[]) => RescoreRunsChain;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => RescoreRunsChain;
  limit: (count: number) => RescoreRunsChain;
  maybeSingle: () => Promise<QueryResult<RescoreRunRow>>;
  single: () => Promise<QueryResult<RescoreRunRow>>;
};

type RequirementRow = RetrieveCandidatesInput["mustHaves"][number];

type JobContext = {
  mustHaves: RequirementRow[];
  requiresNationality: boolean;
  nationalityReason: string | null;
  requiresLanguage: boolean;
  languageReason: string | null;
  jobEmbedding: number[];
  requirements: ScoringRequirement[];
};

/**
 * Start (or resume) a re-score for one job version. Sequential scoring only.
 * Safe to fire-and-forget from `after()` — the caller must not await this
 * inline in a Server Action.
 */
export async function startRescoreRun({
  jobVersionId,
  model,
  runs,
}: StartRescoreRunArgs): Promise<void> {
  const active = await rescoreRuns()
    .select("id")
    .eq("job_version_id", jobVersionId)
    .in("status", ["pending", "running"])
    .maybeSingle();

  if (active.error) {
    throw new Error(
      `Failed to check for an in-progress re-score of ${jobVersionId}: ${active.error.message}`,
    );
  }
  if (active.data) {
    return;
  }

  const run = await claimRescoreRun(jobVersionId);
  const scoredIds = [...asIdList(run.candidate_ids_scored)];
  const scoredSet = new Set(scoredIds);

  try {
    const context = await loadJobContext(jobVersionId);
    const retrieved = await retrieveCandidates({
      jobVersionId,
      mustHaves: context.mustHaves,
      requiresNationality: context.requiresNationality,
      nationalityReason: context.nationalityReason,
      requiresLanguage: context.requiresLanguage,
      languageReason: context.languageReason,
      jobEmbedding: context.jobEmbedding,
    });

    for (const candidate of retrieved) {
      if (scoredSet.has(candidate.candidateId)) {
        continue;
      }

      try {
        const candidateProfile = await loadScoringProfile(
          candidate.candidateId,
        );
        await scoreCandidate({
          candidateId: candidate.candidateId,
          jobVersionId,
          candidateProfile,
          jobVersion: {
            requires_language: context.requiresLanguage,
            language_reason: context.languageReason,
          },
          requirements: context.requirements,
          model,
          runs,
        });
      } catch (error) {
        await updateRescoreRun(run.id, {
          status: "failed",
          error: errorMessage(error),
        });
        return;
      }

      scoredIds.push(candidate.candidateId);
      scoredSet.add(candidate.candidateId);
      await updateRescoreRun(run.id, {
        candidate_ids_scored: [...scoredIds],
      });
    }

    await updateRescoreRun(run.id, {
      status: "complete",
      error: null,
    });
  } catch (error) {
    await updateRescoreRun(run.id, {
      status: "failed",
      error: errorMessage(error),
    });
  }
}

async function claimRescoreRun(jobVersionId: string): Promise<RescoreRunRow> {
  const failed = await rescoreRuns()
    .select()
    .eq("job_version_id", jobVersionId)
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (failed.error) {
    throw new Error(
      `Failed to look up a failed re-score of ${jobVersionId}: ${failed.error.message}`,
    );
  }

  if (failed.data) {
    await updateRescoreRun(failed.data.id, {
      status: "running",
      error: null,
    });
    return { ...failed.data, status: "running", error: null };
  }

  const inserted = await rescoreRuns()
    .insert({
      job_version_id: jobVersionId,
      status: "running",
      candidate_ids_scored: [],
      error: null,
    })
    .select()
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(
      `Failed to start a re-score of ${jobVersionId}: ${inserted.error?.message ?? "no row returned"}`,
    );
  }

  return inserted.data;
}

async function loadJobContext(jobVersionId: string): Promise<JobContext> {
  const { data: version, error: versionError } = await getDb()
    .from("job_versions")
    .select(
      "must_haves, nice_to_haves, requires_nationality, nationality_reason, requires_language, language_reason",
    )
    .eq("id", jobVersionId)
    .maybeSingle();

  if (versionError) {
    throw new Error(
      `Failed to load job version ${jobVersionId}: ${versionError.message}`,
    );
  }
  if (!version) {
    throw new Error(`Job version ${jobVersionId} was not found`);
  }

  const { data: embeddingRow, error: embeddingError } = await getDb()
    .from("embeddings")
    .select("embedding")
    .eq("owner_type", "job_version")
    .eq("owner_id", jobVersionId)
    .maybeSingle();

  if (embeddingError) {
    throw new Error(
      `Failed to load embedding for job version ${jobVersionId}: ${embeddingError.message}`,
    );
  }

  const mustHaves = requirementRows(version.must_haves, "must_have");
  const niceToHaves = requirementRows(version.nice_to_haves, "nice_to_have");

  return {
    mustHaves,
    requiresNationality: version.requires_nationality,
    nationalityReason: version.nationality_reason,
    requiresLanguage: version.requires_language,
    languageReason: version.language_reason,
    jobEmbedding: parseEmbedding(embeddingRow?.embedding, jobVersionId),
    requirements: toScoringRequirements(mustHaves, niceToHaves),
  };
}

async function loadScoringProfile(
  candidateId: string,
): Promise<ScoringCandidateProfile> {
  const { data, error } = await getDb()
    .from("candidate_profiles")
    .select("parsed, overrides")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load candidate profile for ${candidateId}: ${error.message}`,
    );
  }
  if (!data) {
    throw new Error(`Candidate profile for ${candidateId} was not found`);
  }

  const effective = {
    ...asRecord(data.parsed),
    ...asRecord(data.overrides),
  };

  return {
    work_history: asTypedList(effective.work_history),
    education: asTypedList(effective.education),
    certifications: asTypedList(effective.certifications),
    skills: asTypedList(effective.skills),
    languages_spoken: asStringList(effective.languages_spoken),
    total_years:
      typeof effective.total_years === "number" ? effective.total_years : 0,
  };
}

async function updateRescoreRun(
  id: string,
  patch: {
    status?: RescoreStatus;
    candidate_ids_scored?: string[];
    error?: string | null;
  },
): Promise<void> {
  const { error } = await rescoreRuns()
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to update re-score run ${id}: ${error.message}`);
  }
}

function rescoreRuns(): RescoreRunsChain {
  return getDb().from("rescore_runs") as unknown as RescoreRunsChain;
}

function requirementRows(
  value: Json,
  marking: "must_have" | "nice_to_have",
): RequirementRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows: RequirementRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const text = "text" in item && typeof item.text === "string" ? item.text : "";
    if (text.trim().length === 0) {
      continue;
    }
    const rowMarking =
      "marking" in item &&
      (item.marking === "must_have" || item.marking === "nice_to_have")
        ? item.marking
        : marking;
    rows.push({ text, marking: rowMarking });
  }
  return rows;
}

function toScoringRequirements(
  mustHaves: RequirementRow[],
  niceToHaves: RequirementRow[],
): ScoringRequirement[] {
  return [
    ...mustHaves.map((row, index) => ({
      id: `must_have:${index}`,
      text: row.text,
      marking: "must_have" as const,
    })),
    ...niceToHaves.map((row, index) => ({
      id: `nice_to_have:${index}`,
      text: row.text,
      marking: "nice_to_have" as const,
    })),
  ];
}

function parseEmbedding(value: unknown, jobVersionId: string): number[] {
  if (Array.isArray(value) && value.every((n) => typeof n === "number")) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) {
      return parsed;
    }
  }
  throw new Error(`No embedding for job version ${jobVersionId}`);
}

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(String);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asTypedList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
