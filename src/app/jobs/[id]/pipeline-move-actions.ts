"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import {
  movePipelineStage,
  type MovePipelineStageResult,
} from "@/server/pipeline/move";

export type { MovePipelineStageResult };

const NAME_REQUIRED = "Enter your name to continue.";
const MOVE_FAILED = "The candidate could not be moved.";

const movePipelineStageSchema = z.object({
  pipelineEntryId: z.string().min(1),
  toStage: z.string(),
  typedName: z.string().trim().refine(isValidRecruiterName),
});

/**
 * Move a pipeline entry to a new stage. Wraps `movePipelineStage` for the
 * future board UI. Only ever called on an explicit recruiter action.
 */
export async function movePipelineStageAction(
  jobId: string,
  pipelineEntryId: string,
  toStage: string,
  typedName: string,
): Promise<MovePipelineStageResult> {
  if (!isValidRecruiterName(typedName)) {
    return { ok: false, error: NAME_REQUIRED };
  }

  const parsed = movePipelineStageSchema.safeParse({
    pipelineEntryId,
    toStage,
    typedName,
  });
  if (!parsed.success) {
    return { ok: false, error: MOVE_FAILED };
  }

  try {
    const result = await movePipelineStage({
      pipelineEntryId: parsed.data.pipelineEntryId,
      toStage: parsed.data.toStage,
      recruiterName: parsed.data.typedName,
    });

    if (!result.ok) {
      return result;
    }

    revalidatePath(`/jobs/${jobId}`);
    return result;
  } catch {
    return { ok: false, error: MOVE_FAILED };
  }
}
