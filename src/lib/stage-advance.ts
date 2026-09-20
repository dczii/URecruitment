import { END_STATES, STAGES, isEndState, type PipelineStage } from "./stages";

export type StageAdvanceEntry = {
  pipelineEntryId: string;
  stage: string;
};

export type PlannedMove = {
  pipelineEntryId: string;
  fromStage: string;
  toStage: PipelineStage;
};

export type BlockedMove = {
  pipelineEntryId: string;
  stage: string;
  reason: string;
};

export type StageAdvancePlan = {
  movable: PlannedMove[];
  blocked: BlockedMove[];
  summary: { toStage: PipelineStage; count: number }[];
};

/** The stage that follows `stage`, or null when there is nowhere to advance to. */
export function nextStage(stage: string): PipelineStage | null {
  const index = (STAGES as readonly string[]).indexOf(stage);
  if (index < 0 || index >= STAGES.length - 1) {
    return null;
  }
  return STAGES[index + 1];
}

function blockedReason(stage: string): string {
  if (isEndState(stage)) {
    return "Left the pipeline";
  }
  if (stage === "Placed") {
    return "Already placed";
  }
  return "Stage not recognised";
}

/**
 * Work out what advancing a selection would do, without doing it. The caller
 * shows this to the recruiter before anything is written, so a bulk move is
 * still one deliberate decision: every entry is either named as a move or
 * named as blocked, and nothing is silently skipped.
 */
export function planStageAdvance(
  entries: StageAdvanceEntry[],
): StageAdvancePlan {
  const seen = new Set<string>();
  const movable: PlannedMove[] = [];
  const blocked: BlockedMove[] = [];

  for (const entry of entries) {
    if (seen.has(entry.pipelineEntryId)) {
      continue;
    }
    seen.add(entry.pipelineEntryId);

    const toStage = nextStage(entry.stage);
    if (toStage === null) {
      blocked.push({
        pipelineEntryId: entry.pipelineEntryId,
        stage: entry.stage,
        reason: blockedReason(entry.stage),
      });
      continue;
    }

    movable.push({
      pipelineEntryId: entry.pipelineEntryId,
      fromStage: entry.stage,
      toStage,
    });
  }

  const counts = new Map<PipelineStage, number>();
  for (const move of movable) {
    counts.set(move.toStage, (counts.get(move.toStage) ?? 0) + 1);
  }

  return {
    movable,
    blocked,
    summary: [...counts].map(([toStage, count]) => ({ toStage, count })),
  };
}

export { END_STATES };
