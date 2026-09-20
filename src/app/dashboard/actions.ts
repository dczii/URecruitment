"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import {
  moveManyPipelineStages,
  type MoveManyResult,
} from "@/server/pipeline/move-many";

export type { MoveManyResult };

const NAME_REQUIRED = "Enter your name to continue.";
const MOVE_FAILED = "The candidates could not be moved.";

const inputSchema = z.object({
  entries: z
    .array(z.object({ pipelineEntryId: z.uuid(), stage: z.string().min(1) }))
    .min(1),
  typedName: z.string().trim().refine(isValidRecruiterName),
});

/**
 * Advance every selected candidate by one stage. Only ever called from an
 * explicit recruiter action, and only after the recruiter has seen exactly
 * which candidates move and where (`planStageAdvance`). Each candidate still
 * gets its own audited `stage_events` row.
 */
export async function moveSelectedToNextStage(
  entries: { pipelineEntryId: string; stage: string }[],
  typedName: string,
): Promise<MoveManyResult> {
  const empty = { moved: [], blocked: [], failed: [] };

  if (!isValidRecruiterName(typedName)) {
    return { ok: false, error: NAME_REQUIRED, ...empty };
  }

  const parsed = inputSchema.safeParse({ entries, typedName });
  if (!parsed.success) {
    return { ok: false, error: MOVE_FAILED, ...empty };
  }

  try {
    const result = await moveManyPipelineStages({
      entries: parsed.data.entries,
      recruiterName: parsed.data.typedName,
    });

    if (result.moved.length > 0) {
      revalidatePath("/dashboard");
    }

    return result;
  } catch {
    return { ok: false, error: MOVE_FAILED, ...empty };
  }
}
