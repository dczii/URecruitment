import "server-only";

import {
  planStageAdvance,
  type BlockedMove,
  type StageAdvanceEntry,
} from "@/lib/stage-advance";
import { movePipelineStage } from "./move";

const NAME_REQUIRED = "Enter your name to continue.";
const NOTHING_SELECTED = "Select at least one candidate.";

export type MoveManyInput = {
  entries: StageAdvanceEntry[];
  recruiterName: string;
};

export type MoveManyResult = {
  ok: boolean;
  error?: string;
  moved: { pipelineEntryId: string; toStage: string }[];
  blocked: BlockedMove[];
  failed: { pipelineEntryId: string; error: string }[];
};

/**
 * Advance several pipeline entries by one stage each, on one recruiter action.
 *
 * Each entry still gets its own `stage_events` row carrying the same typed
 * name, so the audit trail keeps one record per candidate (CLAUDE.md hard rule
 * 8). Entries that cannot advance are never written — they come back as
 * `blocked` so the screen can say so. A failure on one entry does not abandon
 * the rest; it is reported alongside them.
 */
export async function moveManyPipelineStages({
  entries,
  recruiterName,
}: MoveManyInput): Promise<MoveManyResult> {
  const empty = { moved: [], blocked: [], failed: [] };

  const name = recruiterName.trim();
  if (name.length === 0) {
    return { ok: false, error: NAME_REQUIRED, ...empty };
  }
  if (entries.length === 0) {
    return { ok: false, error: NOTHING_SELECTED, ...empty };
  }

  const plan = planStageAdvance(entries);
  const moved: MoveManyResult["moved"] = [];
  const failed: MoveManyResult["failed"] = [];

  for (const move of plan.movable) {
    const result = await movePipelineStage({
      pipelineEntryId: move.pipelineEntryId,
      toStage: move.toStage,
      recruiterName: name,
    });

    if (result.ok) {
      moved.push({
        pipelineEntryId: move.pipelineEntryId,
        toStage: move.toStage,
      });
    } else {
      failed.push({
        pipelineEntryId: move.pipelineEntryId,
        error: result.error,
      });
    }
  }

  return { ok: true, moved, blocked: plan.blocked, failed };
}
