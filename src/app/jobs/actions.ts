"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import { getModel } from "@/server/ai/provider";
import { createSupabaseAiRunsWriter } from "@/server/ai/run-supabase";
import type { AiModel } from "@/server/ai/types";
import { getDb } from "@/server/db";
import {
  type GapCheckFields,
  type MustHave,
} from "@/server/gap-check/missing-fields";
import { runGapCheck } from "@/server/gap-check/run";
import { jobVersionInputSchema } from "@/server/jobs/schema";
import { saveJobVersion } from "@/server/jobs/versions";

const SAVE_FAILED = "The job could not be saved.";
const OWNER_NAME_MAX = 80;

const requirementFormRowSchema = z.object({
  text: z.string(),
  marking: z.enum(["must_have", "nice_to_have"]).nullable().optional(),
});

/**
 * Form payload: `jobVersionInputSchema` plus the `jobs` row fields the
 * version schema does not own. Kept here so `schema.ts`'s exported shape
 * stays the version-insert contract.
 */
const createJobFormSchema = z.object({
  owner_name: z.string(),
  client_id: z.string(),
  title: z.string(),
  requirements: z.array(requirementFormRowSchema),
  requires_nationality: z.boolean(),
  nationality_reason: z.string().nullable().optional(),
  requires_language: z.boolean(),
  language_reason: z.string().nullable().optional(),
});

export type CreateJobResult =
  | { ok: true }
  | { ok: false; error: string };

function hasWrittenReason(reason: string | null | undefined): boolean {
  return reason != null && reason.trim().length > 0;
}

function formatIssueList(issues: string[]): string | null {
  if (issues.length === 0) {
    return null;
  }

  const [first, ...rest] = issues;
  const head = first.charAt(0).toUpperCase() + first.slice(1);
  if (rest.length === 0) {
    return `${head}.`;
  }
  if (rest.length === 1) {
    return `${head}, and ${rest[0]}.`;
  }
  return `${head}, ${rest.slice(0, -1).join(", ")}, and ${rest[rest.length - 1]}.`;
}

function collectCreateJobIssues(
  data: z.infer<typeof createJobFormSchema>,
): string[] {
  const issues: string[] = [];
  const ownerName = data.owner_name.trim();

  if (!isValidRecruiterName(data.owner_name)) {
    issues.push("the owner name is empty");
  } else if (ownerName.length > OWNER_NAME_MAX) {
    issues.push("the owner name is too long");
  }

  if (!z.uuid().safeParse(data.client_id).success) {
    issues.push("a client must be selected");
  }

  if (data.title.trim().length === 0) {
    issues.push("the job title is empty");
  }

  const unmarkedCount = data.requirements.filter(
    (row) => row.text.trim().length > 0 && row.marking == null,
  ).length;
  if (unmarkedCount === 1) {
    issues.push(
      "1 requirement row is missing a must-have/nice-to-have choice",
    );
  } else if (unmarkedCount > 1) {
    issues.push(
      `${unmarkedCount} requirement rows are missing a must-have/nice-to-have choice`,
    );
  }

  if (
    data.requires_nationality &&
    !hasWrittenReason(data.nationality_reason)
  ) {
    issues.push("the nationality reason is empty");
  }

  if (data.requires_language && !hasWrittenReason(data.language_reason)) {
    issues.push("the language reason is empty");
  }

  return issues;
}

function toJobVersionInput(data: z.infer<typeof createJobFormSchema>) {
  const filled = data.requirements.filter(
    (row) => row.text.trim().length > 0 && row.marking != null,
  );

  return {
    fields: { title: data.title.trim() },
    must_haves: filled
      .filter((row) => row.marking === "must_have")
      .map((row) => ({
        text: row.text.trim(),
        marking: "must_have" as const,
      })),
    nice_to_haves: filled
      .filter((row) => row.marking === "nice_to_have")
      .map((row) => ({
        text: row.text.trim(),
        marking: "nice_to_have" as const,
      })),
    requires_nationality: data.requires_nationality,
    nationality_reason: data.requires_nationality
      ? (data.nationality_reason?.trim() ?? null)
      : null,
    requires_language: data.requires_language,
    language_reason: data.requires_language
      ? (data.language_reason?.trim() ?? null)
      : null,
  };
}

function formatSchemaIssues(error: z.ZodError): string {
  const issues: string[] = [];
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path.includes("nationality_reason")) {
      issues.push("the nationality reason is empty");
    } else if (path.includes("language_reason")) {
      issues.push("the language reason is empty");
    } else if (path.includes("marking")) {
      issues.push(
        "a requirement row is missing a must-have/nice-to-have choice",
      );
    } else if (issue.message.trim().length > 0) {
      issues.push(issue.message.replace(/\.$/, "").toLowerCase());
    }
  }
  return formatIssueList(issues) ?? SAVE_FAILED;
}

export async function createJob(input: unknown): Promise<CreateJobResult> {
  const parsed = createJobFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatSchemaIssues(parsed.error) };
  }

  const banner = formatIssueList(collectCreateJobIssues(parsed.data));
  if (banner) {
    return { ok: false, error: banner };
  }

  const versionInput = toJobVersionInput(parsed.data);
  const versionParsed = jobVersionInputSchema.safeParse(versionInput);
  if (!versionParsed.success) {
    return { ok: false, error: formatSchemaIssues(versionParsed.error) };
  }

  let jobId: string;
  let jobVersionId: string;
  try {
    const { data: job, error } = await getDb()
      .from("jobs")
      .insert({
        client_id: parsed.data.client_id,
        owner_name: parsed.data.owner_name.trim(),
        status: "open",
      })
      .select("id")
      .single();

    if (error || !job) {
      return { ok: false, error: SAVE_FAILED };
    }

    jobId = job.id;
    const version = await saveJobVersion(jobId, versionParsed.data);
    jobVersionId = version.id;
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }

  try {
    await runGapCheck({
      jobVersionId,
      fields: toGapCheckFields(versionParsed.data.fields),
      mustHaves: toMustHaves(versionParsed.data.must_haves),
      formText: buildGapCheckFormText(parsed.data),
      jdText: null,
      model: gapCheckModel(),
      runs: createSupabaseAiRunsWriter(),
    });
  } catch {
    // The job save must succeed even when the gap check fails entirely.
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}

function toGapCheckFields(fields: Record<string, unknown>): GapCheckFields {
  return {
    salary_range: optionalString(fields.salary_range),
    location: optionalString(fields.location),
    work_arrangement: optionalString(fields.work_arrangement),
    employment_type: optionalString(fields.employment_type),
    headcount: optionalNumber(fields.headcount),
    start_date: optionalString(fields.start_date),
    interview_steps: optionalString(fields.interview_steps),
  };
}

function toMustHaves(
  rows: Array<{ text: string; marking: "must_have" | "nice_to_have" }>,
): MustHave[] {
  return rows
    .filter((row) => row.marking === "must_have")
    .map((row) => ({ text: row.text, marking: "must_have" as const }));
}

function buildGapCheckFormText(
  data: z.infer<typeof createJobFormSchema>,
): string {
  const lines = [`Title: ${data.title.trim()}`];
  const requirements = data.requirements
    .map((row) => row.text.trim())
    .filter((text) => text.length > 0);
  if (requirements.length > 0) {
    lines.push(`Requirements: ${requirements.join("; ")}`);
  }
  const nationalityReason = data.nationality_reason?.trim();
  if (data.requires_nationality && nationalityReason) {
    lines.push(`Nationality: ${nationalityReason}`);
  }
  const languageReason = data.language_reason?.trim();
  if (data.requires_language && languageReason) {
    lines.push(`Language: ${languageReason}`);
  }
  return lines.join("\n");
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Defer `getModel("gap")` until a method is invoked so a missing
 * `AI_MODEL_GAP` (provider not chosen yet) cannot skip missing-field flags.
 */
function gapCheckModel(): AiModel {
  return {
    get modelId() {
      return getModel("gap").modelId;
    },
    get modelVersion() {
      return getModel("gap").modelVersion;
    },
    generateObject(promptText: string) {
      return getModel("gap").generateObject(promptText);
    },
  };
}
