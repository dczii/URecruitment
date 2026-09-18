"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import {
  createPlacement,
  type CreatePlacementResult,
} from "@/server/placements/create";

export type { CreatePlacementResult };

const NAME_REQUIRED = "Enter your name to continue.";
const SAVE_FAILED = "The placement could not be saved.";

const savePlacementSchema = z.object({
  pipelineEntryId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  typedName: z.string().trim().refine(isValidRecruiterName),
});

/**
 * Confirm or change a placement's start date. Only ever called on an
 * explicit recruiter action, with the typed-name prompt on first use.
 */
export async function savePlacementAction(
  pipelineEntryId: string,
  startDate: string,
  typedName: string,
): Promise<CreatePlacementResult> {
  if (!isValidRecruiterName(typedName)) {
    return { ok: false, error: NAME_REQUIRED };
  }

  const parsed = savePlacementSchema.safeParse({
    pipelineEntryId,
    startDate,
    typedName,
  });
  if (!parsed.success) {
    return { ok: false, error: SAVE_FAILED };
  }

  try {
    const result = await createPlacement({
      pipelineEntryId: parsed.data.pipelineEntryId,
      startDate: parsed.data.startDate,
      recruiterName: parsed.data.typedName,
    });

    if (!result.ok) {
      return result;
    }

    revalidatePath("/placements");
    revalidatePath("/dashboard");
    return result;
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}
