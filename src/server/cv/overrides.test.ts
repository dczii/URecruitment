import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { clearOverride, mergeProfile, setOverride } from "./overrides";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * T1a contract — implement these signatures in `src/server/cv/overrides.ts`.
 *
 * mergeProfile(parsed, overrides) → { effective, parsed }
 *   Per-field: a key present in `overrides` wins; a key absent from
 *   `overrides` takes the latest `parsed` value. `parsed` on the result is
 *   the original parsed snapshot, still readable when a field is overridden.
 *
 * setOverride(candidateProfileId, field, value, typedName)
 *   Read-modify-write `candidate_profiles.overrides` plus `overridden_by`
 *   (the typed recruiter name) and `overridden_at` (UTC ISO timestamp).
 *
 * clearOverride(candidateProfileId, field)
 *   Read-modify-write: remove that key from `overrides` so merge falls back
 *   to `parsed`.
 */

/** Fictional candidate_profiles.id — never a real candidate row. */
const PROFILE_ID = "00000000-0000-0000-0000-000000000041";

/** Fictional recruiter typed name (CLAUDE.md hard rule 8). */
const TYPED_NAME = "Mei Lin";

/** Frozen UTC instant so `overridden_at` is deterministic. */
const FROZEN_AT = "2026-09-18T04:00:00.000Z";

const PARSED = {
  location: "Kuala Lumpur",
  email: "alex.rivera.fictional@example.com",
};

const OVERRIDES = {
  location: "Singapore",
};

/** Same profile after a later parseCv write to `parsed` only. */
const REPARSED = {
  location: "Penang",
  email: "alex.rivera.updated.fictional@example.com",
};

type ProfileRow = {
  parsed: Record<string, unknown>;
  overrides: Record<string, unknown>;
  overridden_by: string | null;
  overridden_at: string | null;
};

type UpdatePayload = {
  overrides?: Record<string, unknown>;
  overridden_by?: unknown;
  overridden_at?: unknown;
};

function mockProfileClient(row: ProfileRow) {
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
  return payload as UpdatePayload;
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("overrides", () => {
  it("T132-AC1: override survives a re-parse", () => {
    const before = mergeProfile(PARSED, OVERRIDES);
    expect(before.effective.location).toBe("Singapore");
    expect(before.effective.location).not.toBe(PARSED.location);

    const afterReparse = mergeProfile(REPARSED, OVERRIDES);
    expect(afterReparse.effective.location).toBe("Singapore");
    expect(afterReparse.effective.location).not.toBe(REPARSED.location);
  });

  it("T132-AC2: re-parse updates an un-overridden field", () => {
    expect(OVERRIDES).not.toHaveProperty("email");

    const before = mergeProfile(PARSED, OVERRIDES);
    expect(before.effective.email).toBe(PARSED.email);

    const afterReparse = mergeProfile(REPARSED, OVERRIDES);
    expect(afterReparse.effective.email).toBe(REPARSED.email);
    expect(afterReparse.effective.email).not.toBe(PARSED.email);
    expect(afterReparse.effective.location).toBe("Singapore");
  });

  it("T132-AC3: clearing an override falls back to the parsed value", async () => {
    const { from, select, selectEq, update, updateEq } = mockProfileClient({
      parsed: { ...PARSED },
      overrides: { location: "Singapore", email: "priya.rao.fictional@example.com" },
      overridden_by: TYPED_NAME,
      overridden_at: FROZEN_AT,
    });

    await clearOverride(PROFILE_ID, "location");

    expect(from).toHaveBeenCalledWith("candidate_profiles");
    expect(select).toHaveBeenCalled();
    expect(selectEq).toHaveBeenCalledWith("id", PROFILE_ID);
    expect(updateEq).toHaveBeenCalledWith("id", PROFILE_ID);

    const payload = updatePayload(update);
    expect(payload.overrides).toEqual(expect.any(Object));
    expect(payload.overrides).not.toHaveProperty("location");
    expect(payload.overrides?.email).toBe("priya.rao.fictional@example.com");

    const merged = mergeProfile(PARSED, payload.overrides ?? {});
    expect(merged.effective.location).toBe(PARSED.location);
    expect(merged.effective.location).not.toBe("Singapore");
  });

  it("T132-AC4: merge retains the original parsed value alongside an override", () => {
    const merged = mergeProfile(PARSED, OVERRIDES);

    expect(merged.effective.location).toBe("Singapore");
    expect(merged.parsed.location).toBe("Kuala Lumpur");
    expect(merged.parsed).toEqual(PARSED);
    expect(merged.effective.location).not.toBe(merged.parsed.location);
  });

  it("T132-AC5: records typed name and timestamp on an override", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FROZEN_AT));

    const { from, select, selectEq, update, updateEq } = mockProfileClient({
      parsed: { ...PARSED },
      overrides: { email: "priya.rao.fictional@example.com" },
      overridden_by: null,
      overridden_at: null,
    });

    await setOverride(PROFILE_ID, "location", "Singapore", TYPED_NAME);

    expect(from).toHaveBeenCalledWith("candidate_profiles");
    expect(select).toHaveBeenCalled();
    expect(selectEq).toHaveBeenCalledWith("id", PROFILE_ID);
    expect(updateEq).toHaveBeenCalledWith("id", PROFILE_ID);

    const payload = updatePayload(update);
    expect(payload.overrides).toEqual({
      email: "priya.rao.fictional@example.com",
      location: "Singapore",
    });
    expect(payload.overridden_by).toBe(TYPED_NAME);
    expect(payload.overridden_at).toBe(FROZEN_AT);
  });
});
