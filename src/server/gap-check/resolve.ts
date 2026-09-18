import "server-only";

import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import { getDb } from "../db";

const closeFlagInputSchema = z.object({
  note: z.string().trim().min(1),
  typedName: z.string().trim().refine(isValidRecruiterName),
  resolutionState: z.enum(["resolved", "dismissed"]),
});

export type CloseFlagResolutionState = z.infer<
  typeof closeFlagInputSchema
>["resolutionState"];

/**
 * Close an open gap flag as resolved or dismissed. Resolution is terminal:
 * already-closed flags are refused rather than overwritten. Only the
 * resolution columns change — `flag_type`, `reason`, and `suggested_question`
 * stay as they were.
 */
export async function closeFlag(
  flagId: string,
  resolutionState: CloseFlagResolutionState,
  note: string,
  typedName: string,
): Promise<void> {
  const parsed = closeFlagInputSchema.parse({
    note,
    typedName,
    resolutionState,
  });

  const db = getDb();
  const { data: flag, error: readError } = await db
    .from("gap_flags")
    .select("resolution_state")
    .eq("id", flagId)
    .maybeSingle();

  if (readError) {
    throw new Error(
      `Failed to read gap flag ${flagId}: ${readError.message}`,
    );
  }
  if (!flag) {
    throw new Error(`Gap flag ${flagId} was not found.`);
  }
  if (
    flag.resolution_state === "resolved" ||
    flag.resolution_state === "dismissed"
  ) {
    throw new Error(
      `This gap flag is already ${flag.resolution_state} and cannot be closed again.`,
    );
  }

  const { error: updateError } = await db
    .from("gap_flags")
    .update({
      resolution_state: parsed.resolutionState,
      resolution_note: parsed.note,
      resolved_by: parsed.typedName,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId);

  if (updateError) {
    throw new Error(
      `Failed to close gap flag ${flagId}: ${updateError.message}`,
    );
  }
}
