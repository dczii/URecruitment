"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import { getDb } from "@/server/db";
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
    await saveJobVersion(jobId, versionParsed.data);
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}
