"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import { closeFlag } from "@/server/gap-check/resolve";

const CLOSE_FAILED = "The gap flag could not be closed.";
const NOTE_REQUIRED = "A short note is required.";
const NAME_REQUIRED = "Enter your name to continue.";

const closeGapFlagSchema = z.object({
  flagId: z.uuid(),
  jobId: z.uuid(),
  resolutionState: z.enum(["resolved", "dismissed"]),
  note: z.string().trim().min(1),
  typedName: z.string().trim().refine(isValidRecruiterName),
});

export type CloseGapFlagResult = { ok: true } | { ok: false; error: string };

/**
 * Client-callable wrapper around `closeFlag`. Validates input, never throws
 * to the browser, and revalidates the job screens so the open-flag banner
 * and checklist refresh.
 */
export async function closeGapFlag(
  flagId: string,
  jobId: string,
  resolutionState: "resolved" | "dismissed",
  note: string,
  typedName: string,
): Promise<CloseGapFlagResult> {
  const parsed = closeGapFlagSchema.safeParse({
    flagId,
    jobId,
    resolutionState,
    note,
    typedName,
  });
  if (!parsed.success) {
    return { ok: false, error: formatCloseGapFlagIssues(parsed.error) };
  }

  try {
    await closeFlag(
      parsed.data.flagId,
      parsed.data.resolutionState,
      parsed.data.note,
      parsed.data.typedName,
    );
    revalidatePath(`/jobs/${parsed.data.jobId}`);
    revalidatePath("/jobs");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: formatCloseGapFlagIssues(error) };
    }
    if (error instanceof Error && isAlreadyClosedMessage(error.message)) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: CLOSE_FAILED };
  }
}

function formatCloseGapFlagIssues(error: z.ZodError): string {
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path === "note") {
      return NOTE_REQUIRED;
    }
    if (path === "typedName") {
      return NAME_REQUIRED;
    }
  }
  return CLOSE_FAILED;
}

function isAlreadyClosedMessage(message: string): boolean {
  return /already (resolved|dismissed)|cannot be closed again/i.test(message);
}
