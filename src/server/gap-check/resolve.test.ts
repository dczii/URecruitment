import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidRecruiterName } from "@/lib/recruiter-name";
import { getDb } from "../db";
import { closeFlag } from "./resolve";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * T1a contract — implement this signature in `src/server/gap-check/resolve.ts` (T1b).
 *
 * closeFlag(flagId, resolutionState, note, typedName) → Promise<void>
 *   Zod-validate a non-blank note and a valid typed name (`isValidRecruiterName`).
 *   Read the flag; refuse with a clear error if it is already `resolved` or
 *   `dismissed` (no update — resolution is terminal). On success, one update
 *   of `resolution_state`, `resolution_note`, `resolved_by`, `resolved_at`
 *   only. Never write `flag_type`, `reason`, or `suggested_question`.
 */

/** Fictional gap_flags.id — never a real client job. */
const FLAG_ID = "00000000-0000-0000-0000-000000000401";

/** Fictional recruiter typed name (CLAUDE.md hard rule 8). */
const TYPED_NAME = "Maya Tan";

const NOTE = "Called the client, salary is 8-10k";

/** Frozen UTC instant so `resolved_at` is deterministic. */
const FROZEN_AT = "2026-09-19T04:00:00.000Z";

const ORIGINAL_REASON =
  "Without a salary range, candidates cannot tell if the role is in reach.";
const ORIGINAL_QUESTION = "What is the salary range for this role?";

type ResolutionState = "open" | "resolved" | "dismissed";

type GapFlagRow = {
  id: string;
  flag_type: "missing" | "uncertain" | "conflicting" | "fair-employment";
  reason: string;
  suggested_question: string | null;
  resolution_state: ResolutionState;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
};

type UpdatePayload = {
  resolution_state?: unknown;
  resolution_note?: unknown;
  resolved_by?: unknown;
  resolved_at?: unknown;
  flag_type?: unknown;
  reason?: unknown;
  suggested_question?: unknown;
};

function openFlag(overrides: Partial<GapFlagRow> = {}): GapFlagRow {
  return {
    id: FLAG_ID,
    flag_type: "missing",
    reason: ORIGINAL_REASON,
    suggested_question: ORIGINAL_QUESTION,
    resolution_state: "open",
    resolution_note: null,
    resolved_by: null,
    resolved_at: null,
    ...overrides,
  };
}

function closedFlag(
  state: "resolved" | "dismissed",
  overrides: Partial<GapFlagRow> = {},
): GapFlagRow {
  return openFlag({
    resolution_state: state,
    resolution_note: "Original note that must not be overwritten",
    resolved_by: "Priya Rao",
    resolved_at: "2026-09-01T04:00:00.000Z",
    ...overrides,
  });
}

function mockGapFlagsClient(row: GapFlagRow) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const selectEq = vi.fn().mockReturnValue({ maybeSingle, single });
  const select = vi.fn().mockReturnValue({ eq: selectEq });

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn().mockReturnValue({ select, update });
  vi.mocked(getDb).mockReturnValue({ from } as never);

  return { from, select, selectEq, update, updateEq };
}

function updatePayload(update: ReturnType<typeof vi.fn>): UpdatePayload {
  expect(update).toHaveBeenCalledTimes(1);
  const payload = update.mock.calls[0]?.[0] as UpdatePayload | undefined;
  expect(payload).toEqual(expect.any(Object));
  expect(payload).not.toBeNull();
  return payload as UpdatePayload;
}

function expectEvidenceUntouched(payload: UpdatePayload) {
  expect(payload).not.toHaveProperty("flag_type");
  expect(payload).not.toHaveProperty("reason");
  expect(payload).not.toHaveProperty("suggested_question");
}

async function expectRefusedWithoutWrite(
  action: Promise<unknown>,
  update: ReturnType<typeof vi.fn>,
) {
  await expect(action).rejects.toBeInstanceOf(Error);
  expect(update).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_AT));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("closeFlag (AC1)", () => {
  it("AC1: empty note is refused — no DB write", async () => {
    const { update } = mockGapFlagsClient(openFlag());

    await expectRefusedWithoutWrite(
      closeFlag(FLAG_ID, "resolved", "", TYPED_NAME),
      update,
    );
  });

  it("AC1: whitespace-only note is refused — no DB write", async () => {
    const { update } = mockGapFlagsClient(openFlag());

    await expectRefusedWithoutWrite(
      closeFlag(FLAG_ID, "dismissed", "   ", TYPED_NAME),
      update,
    );
  });

  it("AC1: missing or invalid typed name is refused — no DB write", async () => {
    const invalidNames = ["", "   "];

    for (const typedName of invalidNames) {
      expect(isValidRecruiterName(typedName)).toBe(false);
      const { update } = mockGapFlagsClient(openFlag());

      await expectRefusedWithoutWrite(
        closeFlag(FLAG_ID, "resolved", NOTE, typedName),
        update,
      );
    }
  });

  it("AC1: successful resolve records note, typed name, and time", async () => {
    const { from, selectEq, update, updateEq } = mockGapFlagsClient(openFlag());

    await closeFlag(FLAG_ID, "resolved", NOTE, TYPED_NAME);

    expect(from).toHaveBeenCalledWith("gap_flags");
    expect(selectEq).toHaveBeenCalledWith("id", FLAG_ID);
    expect(updateEq).toHaveBeenCalledWith("id", FLAG_ID);

    const payload = updatePayload(update);
    expect(payload.resolution_state).toBe("resolved");
    expect(payload.resolution_note).toBe(NOTE);
    expect(payload.resolved_by).toBe(TYPED_NAME);
    expect(payload.resolved_at).toBe(FROZEN_AT);
    expectEvidenceUntouched(payload);
  });

  it("AC1: successful dismiss writes the same shape with resolution_state dismissed", async () => {
    const { from, update, updateEq } = mockGapFlagsClient(openFlag());

    await closeFlag(FLAG_ID, "dismissed", NOTE, TYPED_NAME);

    expect(from).toHaveBeenCalledWith("gap_flags");
    expect(updateEq).toHaveBeenCalledWith("id", FLAG_ID);

    const payload = updatePayload(update);
    expect(payload.resolution_state).toBe("dismissed");
    expect(payload.resolution_note).toBe(NOTE);
    expect(payload.resolved_by).toBe(TYPED_NAME);
    expect(payload.resolved_at).toBe(FROZEN_AT);
    expectEvidenceUntouched(payload);
  });

  it("AC1: closing an already-closed flag is refused without overwriting", async () => {
    for (const state of ["resolved", "dismissed"] as const) {
      const { update } = mockGapFlagsClient(closedFlag(state));

      let thrown: unknown;
      try {
        await closeFlag(FLAG_ID, "resolved", "Trying to change this", TYPED_NAME);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      const message = thrown instanceof Error ? thrown.message : "";
      expect(message.length).toBeGreaterThan(0);
      expect(message.toLowerCase()).not.toBe("error");
      expect(message.toLowerCase()).toMatch(
        /already|closed|resolved|dismissed/,
      );
      expect(update).not.toHaveBeenCalled();
    }
  });

  it("AC1: update payload never includes flag_type, reason, or suggested_question", async () => {
    const { update } = mockGapFlagsClient(openFlag());

    await closeFlag(FLAG_ID, "resolved", NOTE, TYPED_NAME);

    expectEvidenceUntouched(updatePayload(update));
  });
});
