import "server-only";

import type { Json } from "@/lib/database.types";
import { getDb } from "../db";
import { getCurrentJobVersion } from "./versions";

export type JobListItem = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  ownerName: string;
  openFlagCount: number;
  pipelineCandidateCount: number;
};

export type JobRequirement = {
  text: string;
  marking: "must_have" | "nice_to_have";
};

export const OPEN_GAP_FLAG_TYPES = [
  "missing",
  "uncertain",
  "conflicting",
  "fair-employment",
] as const;

export type OpenGapFlagType = (typeof OPEN_GAP_FLAG_TYPES)[number];

export type OpenGapFlag = {
  id: string;
  flagType: OpenGapFlagType;
  reason: string;
  suggestedQuestion: string | null;
};

export type JobDetail = {
  id: string;
  title: string;
  clientName: string;
  ownerName: string;
  status: string;
  versionCreatedAt: string | null;
  mustHaves: JobRequirement[];
  niceToHaves: JobRequirement[];
  openFlagCount: number;
  openFlags: OpenGapFlag[];
  isRescoring: boolean;
};

/**
 * Every job with its current-version title, client, status, owner, open
 * gap-flag count (current version only) and pipeline-entry count.
 */
export async function listJobs(): Promise<JobListItem[]> {
  const db = getDb();
  const { data, error } = await db
    .from("jobs")
    .select(
      "id, status, owner_name, current_version_id, created_at, clients(name)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list jobs: ${error.message}`);
  }

  const jobs = data ?? [];
  if (jobs.length === 0) {
    return [];
  }

  const versionIds = [
    ...new Set(
      jobs
        .map((job) => job.current_version_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const jobIds = jobs.map((job) => job.id);

  const [versionsResult, flagsResult, entriesResult] = await Promise.all([
    versionIds.length > 0
      ? db.from("job_versions").select("id, fields").in("id", versionIds)
      : Promise.resolve({ data: [] as { id: string; fields: Json }[], error: null }),
    versionIds.length > 0
      ? db
          .from("gap_flags")
          .select("job_version_id")
          .eq("resolution_state", "open")
          .in("job_version_id", versionIds)
      : Promise.resolve({ data: [] as { job_version_id: string }[], error: null }),
    db.from("pipeline_entries").select("job_id").in("job_id", jobIds),
  ]);

  if (versionsResult.error) {
    throw new Error(
      `Failed to load job versions for the jobs list: ${versionsResult.error.message}`,
    );
  }
  if (flagsResult.error) {
    throw new Error(
      `Failed to count open gap flags for the jobs list: ${flagsResult.error.message}`,
    );
  }
  if (entriesResult.error) {
    throw new Error(
      `Failed to count pipeline entries for the jobs list: ${entriesResult.error.message}`,
    );
  }

  const titleByVersionId = new Map<string, string>();
  for (const version of versionsResult.data ?? []) {
    titleByVersionId.set(version.id, titleFromFields(version.fields));
  }

  const openFlagsByVersionId = new Map<string, number>();
  for (const flag of flagsResult.data ?? []) {
    openFlagsByVersionId.set(
      flag.job_version_id,
      (openFlagsByVersionId.get(flag.job_version_id) ?? 0) + 1,
    );
  }

  const pipelineByJobId = new Map<string, number>();
  for (const entry of entriesResult.data ?? []) {
    pipelineByJobId.set(
      entry.job_id,
      (pipelineByJobId.get(entry.job_id) ?? 0) + 1,
    );
  }

  return jobs.map((job) => {
    const versionId = job.current_version_id;
    return {
      id: job.id,
      title:
        versionId != null
          ? (titleByVersionId.get(versionId) ?? "Untitled job")
          : "Untitled job",
      clientName: embeddedClientName(job.clients),
      status: formatJobStatus(job.status),
      ownerName: job.owner_name,
      openFlagCount:
        versionId != null ? (openFlagsByVersionId.get(versionId) ?? 0) : 0,
      pipelineCandidateCount: pipelineByJobId.get(job.id) ?? 0,
    };
  });
}

/**
 * One job for the detail screen: current version's requirements, the
 * version's created date, the open gap-flag count (never a blocker), the
 * open flag rows themselves (flat — the checklist groups by type), and
 * whether a re-score run is in progress for the current version.
 */
export async function getJobDetail(
  jobId: string,
): Promise<JobDetail | null> {
  const db = getDb();
  const [jobResult, version] = await Promise.all([
    db
      .from("jobs")
      .select("id, status, owner_name, clients(name)")
      .eq("id", jobId)
      .maybeSingle(),
    getCurrentJobVersion(jobId),
  ]);

  if (jobResult.error) {
    throw new Error(`Failed to load job ${jobId}: ${jobResult.error.message}`);
  }

  const job = jobResult.data;
  if (!job) {
    return null;
  }

  let openFlags: OpenGapFlag[] = [];
  let isRescoring = false;
  if (version) {
    const [flagsResult, rescoreResult] = await Promise.all([
      db
        .from("gap_flags")
        .select("id, flag_type, reason, suggested_question")
        .eq("job_version_id", version.id)
        .eq("resolution_state", "open"),
      db
        .from("rescore_runs")
        .select("id")
        .eq("job_version_id", version.id)
        .in("status", ["pending", "running"])
        .limit(1)
        .maybeSingle(),
    ]);

    if (flagsResult.error) {
      throw new Error(
        `Failed to load open gap flags for job ${jobId}: ${flagsResult.error.message}`,
      );
    }
    if (rescoreResult.error) {
      throw new Error(
        `Failed to load re-score status for job ${jobId}: ${rescoreResult.error.message}`,
      );
    }
    openFlags = (flagsResult.data ?? [])
      .map(toOpenGapFlag)
      .filter((flag): flag is OpenGapFlag => flag !== null);
    isRescoring = rescoreResult.data != null;
  }

  return {
    id: job.id,
    title: titleFromFields(version?.fields),
    clientName: embeddedClientName(job.clients),
    ownerName: job.owner_name,
    status: formatJobStatus(job.status),
    versionCreatedAt: version?.created_at ?? null,
    mustHaves: requirementTexts(version?.must_haves, "must_have"),
    niceToHaves: requirementTexts(version?.nice_to_haves, "nice_to_have"),
    openFlagCount: openFlags.length,
    openFlags,
    isRescoring,
  };
}

function isOpenGapFlagType(value: string): value is OpenGapFlagType {
  return (OPEN_GAP_FLAG_TYPES as readonly string[]).includes(value);
}

function toOpenGapFlag(row: {
  id: string;
  flag_type: string;
  reason: string;
  suggested_question: string | null;
}): OpenGapFlag | null {
  if (!isOpenGapFlagType(row.flag_type)) {
    return null;
  }
  const question = row.suggested_question?.trim();
  return {
    id: row.id,
    flagType: row.flag_type,
    reason: row.reason,
    suggestedQuestion: question && question.length > 0 ? question : null,
  };
}

function formatJobStatus(status: string): string {
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "open") {
    return "Open";
  }
  if (key === "on_hold") {
    return "On hold";
  }
  return status
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function titleFromFields(fields: Json | null | undefined): string {
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    const title = fields.title;
    if (typeof title === "string" && title.trim().length > 0) {
      return title;
    }
  }
  return "Untitled job";
}

function embeddedClientName(clients: unknown): string {
  const row = Array.isArray(clients) ? clients[0] : clients;
  if (row && typeof row === "object" && "name" in row) {
    const name = (row as { name: unknown }).name;
    if (typeof name === "string" && name.trim().length > 0) {
      return name;
    }
  }
  return "Unknown client";
}

function requirementTexts(
  value: Json | null | undefined,
  marking: JobRequirement["marking"],
): JobRequirement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows: JobRequirement[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const text = "text" in item ? item.text : undefined;
    if (typeof text === "string" && text.trim().length > 0) {
      rows.push({ text: text.trim(), marking });
    }
  }
  return rows;
}
