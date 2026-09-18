import "server-only";

import type { Json } from "@/lib/database.types";
import { getDb } from "../db";
import {
  mergeProfile,
  type MergedProfile,
  type ProfileFields,
} from "./overrides";

export type CandidateParseStatus = "ready" | "not_yet_parsed";

export type CandidateIdentity = {
  name: unknown;
  email: unknown;
  phone: unknown;
  location: unknown;
};

export type CandidateSkill = {
  skill: string;
  source_text: string;
};

export type CandidateStageEvent = {
  recruiter_name: string;
  from_stage: string | null;
  to_stage: string;
  created_at: string;
};

export type CandidateProfilePage = {
  parseStatus: CandidateParseStatus;
  fullName: string;
  identity: CandidateIdentity | null;
  profile: MergedProfile | null;
  overriddenBy: string | null;
  overriddenAt: string | null;
  skills: CandidateSkill[];
  stageHistory: CandidateStageEvent[];
};

export async function getCandidateProfile(
  candidateId: string,
): Promise<CandidateProfilePage> {
  const db = getDb();

  const [candidateResult, profileResult, skillsResult, entriesResult] =
    await Promise.all([
      db
        .from("candidates")
        .select("id, full_name, email, phone")
        .eq("id", candidateId)
        .maybeSingle(),
      db
        .from("candidate_profiles")
        .select("parsed, overrides, overridden_by, overridden_at")
        .eq("candidate_id", candidateId)
        .maybeSingle(),
      db
        .from("candidate_skills")
        .select("skill, source_text")
        .eq("candidate_id", candidateId),
      db.from("pipeline_entries").select("id").eq("candidate_id", candidateId),
    ]);

  if (candidateResult.error) {
    throw new Error(
      `Failed to load candidate ${candidateId}: ${candidateResult.error.message}`,
    );
  }
  if (profileResult.error) {
    throw new Error(
      `Failed to load candidate profile for ${candidateId}: ${profileResult.error.message}`,
    );
  }
  if (skillsResult.error) {
    throw new Error(
      `Failed to load skills for ${candidateId}: ${skillsResult.error.message}`,
    );
  }
  if (entriesResult.error) {
    throw new Error(
      `Failed to load pipeline entries for ${candidateId}: ${entriesResult.error.message}`,
    );
  }

  if (!candidateResult.data) {
    throw new Error(`Candidate ${candidateId} was not found`);
  }

  const skills = (skillsResult.data ?? []).map((row) => ({
    skill: row.skill,
    source_text: row.source_text,
  }));
  const stageHistory = await loadStageHistory(
    (entriesResult.data ?? []).map((row) => row.id),
  );

  if (!profileResult.data) {
    return {
      parseStatus: "not_yet_parsed",
      fullName: candidateResult.data.full_name,
      identity: null,
      profile: null,
      overriddenBy: null,
      overriddenAt: null,
      skills,
      stageHistory,
    };
  }

  const profile = mergeProfile(
    asProfileFields(profileResult.data.parsed),
    asProfileFields(profileResult.data.overrides),
  );

  return {
    parseStatus: "ready",
    fullName: candidateResult.data.full_name,
    identity: {
      name: profile.effective.name,
      email: profile.effective.email,
      phone: profile.effective.phone,
      location: profile.effective.location,
    },
    profile,
    overriddenBy: profileResult.data.overridden_by,
    overriddenAt: profileResult.data.overridden_at,
    skills,
    stageHistory,
  };
}

async function loadStageHistory(
  pipelineEntryIds: string[],
): Promise<CandidateStageEvent[]> {
  if (pipelineEntryIds.length === 0) {
    return [];
  }

  const { data, error } = await getDb()
    .from("stage_events")
    .select("recruiter_name, from_stage, to_stage, created_at")
    .in("pipeline_entry_id", pipelineEntryIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load stage history: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    recruiter_name: row.recruiter_name,
    from_stage: row.from_stage,
    to_stage: row.to_stage,
    created_at: row.created_at,
  }));
}

function asProfileFields(value: Json): ProfileFields {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }
  return {};
}
