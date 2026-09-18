import "server-only";

import type { Database, Json } from "@/lib/database.types";
import { getDb } from "../db";
import { jobVersionInputSchema } from "./schema";

export type JobVersion = Database["public"]["Tables"]["job_versions"]["Row"];

/**
 * Insert an immutable `job_versions` snapshot and move
 * `jobs.current_version_id` to it. Every save is a new row — no diff/dedup
 * against the current version, and this module never updates `job_versions`.
 */
export async function saveJobVersion(
  jobId: string,
  input: unknown,
): Promise<JobVersion> {
  const parsed = jobVersionInputSchema.parse(input);
  const db = getDb();

  const { data: version, error: insertError } = await db
    .from("job_versions")
    .insert({
      job_id: jobId,
      fields: toJson(parsed.fields),
      must_haves: toJson(parsed.must_haves),
      nice_to_haves: toJson(parsed.nice_to_haves),
      requires_nationality: parsed.requires_nationality,
      nationality_reason: parsed.nationality_reason ?? null,
      requires_language: parsed.requires_language,
      language_reason: parsed.language_reason ?? null,
    })
    .select()
    .single();

  if (insertError || !version) {
    throw new Error(
      `Failed to save job version for ${jobId}: ${insertError?.message ?? "no row returned"}`,
    );
  }

  const { error: pointerError } = await db
    .from("jobs")
    .update({ current_version_id: version.id })
    .eq("id", jobId);

  if (pointerError) {
    throw new Error(
      `Failed to point job ${jobId} at version ${version.id}: ${pointerError.message}`,
    );
  }

  return version;
}

/**
 * The one place other code resolves "the" version of a job. Match scores and
 * gap flags key off this row's id, not the job id.
 */
export async function getCurrentJobVersion(
  jobId: string,
): Promise<JobVersion | null> {
  const db = getDb();

  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("current_version_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    throw new Error(`Failed to load job ${jobId}: ${jobError.message}`);
  }

  if (job?.current_version_id == null) {
    return null;
  }

  const { data: version, error: versionError } = await db
    .from("job_versions")
    .select()
    .eq("id", job.current_version_id)
    .maybeSingle();

  if (versionError) {
    throw new Error(
      `Failed to load job version ${job.current_version_id}: ${versionError.message}`,
    );
  }

  if (!version) {
    throw new Error(
      `Job ${jobId} points at missing version ${job.current_version_id}`,
    );
  }

  return version;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
