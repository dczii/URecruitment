import "server-only";

import type { Json } from "@/lib/database.types";
import { getDb } from "../db";

export type ProfileFields = Record<string, unknown>;

export type MergedProfile = {
  effective: ProfileFields;
  parsed: ProfileFields;
};

/**
 * Single merge rule for every read path: a key present in `overrides` wins;
 * a key absent from `overrides` takes the latest `parsed` value. The original
 * parsed snapshot stays readable alongside the effective profile.
 */
export function mergeProfile(
  parsed: ProfileFields,
  overrides: ProfileFields,
): MergedProfile {
  return {
    effective: { ...parsed, ...overrides },
    parsed,
  };
}

export async function setOverride(
  candidateProfileId: string,
  field: string,
  value: unknown,
  typedName: string,
): Promise<void> {
  const current = await loadOverrides(candidateProfileId);
  await writeProfile(candidateProfileId, {
    overrides: toJson({ ...current, [field]: value }),
    overridden_by: typedName,
    overridden_at: new Date().toISOString(),
  });
}

export async function clearOverride(
  candidateProfileId: string,
  field: string,
): Promise<void> {
  const current = await loadOverrides(candidateProfileId);
  const next = { ...current };
  delete next[field];
  await writeProfile(candidateProfileId, { overrides: toJson(next) });
}

type OverrideMap = { [key: string]: Json | undefined };

async function loadOverrides(candidateProfileId: string): Promise<OverrideMap> {
  const { data, error } = await getDb()
    .from("candidate_profiles")
    .select("overrides")
    .eq("id", candidateProfileId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load candidate profile ${candidateProfileId}: ${error.message}`,
    );
  }
  if (!data) {
    throw new Error(`Candidate profile ${candidateProfileId} was not found`);
  }

  return asOverrideMap(data.overrides);
}

async function writeProfile(
  candidateProfileId: string,
  payload: {
    overrides: Json;
    overridden_by?: string;
    overridden_at?: string;
  },
): Promise<void> {
  const { error } = await getDb()
    .from("candidate_profiles")
    .update(payload)
    .eq("id", candidateProfileId);

  if (error) {
    throw new Error(
      `Failed to update overrides for candidate profile ${candidateProfileId}: ${error.message}`,
    );
  }
}

function asOverrideMap(value: Json): OverrideMap {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }
  return {};
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
