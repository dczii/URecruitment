"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import { getDb } from "@/server/db";

const NAME_REQUIRED = "Enter your name to continue.";
const ADD_FAILED = "The candidate could not be added to the pipeline.";
const ALREADY_ON_JOB = "This candidate is already on this job.";
const UNIQUE_VIOLATION = "23505";

const addCandidateToPipelineSchema = z.object({
  jobId: z.string().min(1),
  candidateId: z.string().min(1),
  typedName: z.string().trim().refine(isValidRecruiterName),
});

export type AddCandidateToPipelineResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Minimal "add to pipeline" action: insert one `pipeline_entries` row in
 * `"Sourced"` with the recruiter's typed name. Not the #156 stage-move
 * system — no `stage_events`, no move validation, no clock reset.
 *
 * Only ever called on an explicit recruiter click.
 */
export async function addCandidateToPipeline(
  jobId: string,
  candidateId: string,
  typedName: string,
): Promise<AddCandidateToPipelineResult> {
  if (!isValidRecruiterName(typedName)) {
    return { ok: false, error: NAME_REQUIRED };
  }

  const parsed = addCandidateToPipelineSchema.safeParse({
    jobId,
    candidateId,
    typedName,
  });
  if (!parsed.success) {
    return { ok: false, error: ADD_FAILED };
  }

  try {
    const { error } = await getDb().from("pipeline_entries").insert({
      job_id: parsed.data.jobId,
      candidate_id: parsed.data.candidateId,
      stage: "Sourced",
      owner_name: parsed.data.typedName,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { ok: false, error: ALREADY_ON_JOB };
      }
      return { ok: false, error: ADD_FAILED };
    }

    revalidatePath(`/jobs/${parsed.data.jobId}`);
    revalidatePath("/jobs");
    return { ok: true };
  } catch {
    return { ok: false, error: ADD_FAILED };
  }
}
