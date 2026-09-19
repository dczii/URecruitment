import "server-only";

import { z } from "zod";

import { isValidPipelineStage } from "@/lib/stages";
import { getDb } from "../db";

const NAME_REQUIRED = "Enter your name to continue.";
const INVALID_STAGE = "That stage is not recognised.";
const MOVE_FAILED = "The candidate could not be moved.";

const moveInputSchema = z.object({
  pipelineEntryId: z.string().min(1),
  toStage: z.string().refine(isValidPipelineStage),
  recruiterName: z.string().trim().min(1).max(80),
});

export type MovePipelineStageInput = {
  pipelineEntryId: string;
  toStage: string;
  recruiterName: string;
};

export type MovePipelineStageResult =
  | { ok: true; entry: { id: string; stage: string; entered_at: string } }
  | { ok: false; error: string };

/**
 * Move a pipeline entry to a new stage: reset its clock and append one
 * `stage_events` row with the recruiter's typed name. Never reads or writes
 * `stage_limits`. Only ever called from a recruiter-initiated Server Action.
 */
export async function movePipelineStage(
  input: MovePipelineStageInput,
): Promise<MovePipelineStageResult> {
  const recruiterName = input.recruiterName.trim();
  if (recruiterName.length === 0) {
    return { ok: false, error: NAME_REQUIRED };
  }
  if (!isValidPipelineStage(input.toStage)) {
    return { ok: false, error: INVALID_STAGE };
  }

  const parsed = moveInputSchema.safeParse({ ...input, recruiterName });
  if (!parsed.success) {
    return { ok: false, error: MOVE_FAILED };
  }

  const { pipelineEntryId, toStage } = parsed.data;
  const enteredAt = new Date().toISOString();

  const db = getDb();
  const { data: current, error: readError } = await db
    .from("pipeline_entries")
    .select("id, stage")
    .eq("id", pipelineEntryId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: MOVE_FAILED };
  }
  if (!current) {
    return { ok: false, error: MOVE_FAILED };
  }

  const { error: updateError } = await db
    .from("pipeline_entries")
    .update({ stage: toStage, entered_at: enteredAt })
    .eq("id", pipelineEntryId);

  if (updateError) {
    return { ok: false, error: MOVE_FAILED };
  }

  const { error: insertError } = await db.from("stage_events").insert({
    pipeline_entry_id: pipelineEntryId,
    from_stage: current.stage,
    to_stage: toStage,
    recruiter_name: parsed.data.recruiterName,
  });

  if (insertError) {
    return { ok: false, error: MOVE_FAILED };
  }

  return {
    ok: true,
    entry: {
      id: pipelineEntryId,
      stage: toStage,
      entered_at: enteredAt,
    },
  };
}
