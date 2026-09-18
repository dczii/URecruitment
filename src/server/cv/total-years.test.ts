import { describe, expect, it, vi } from "vitest";
import { computeTotalYears } from "./total-years";

type WorkHistoryInterval = {
  start: string | null;
  end: string | null;
  current: boolean;
};

describe("computeTotalYears (AC2)", () => {
  it("AC2: two sequential, non-overlapping jobs sum their durations", () => {
    const workHistory: WorkHistoryInterval[] = [
      { start: "2018-01", end: "2020-01", current: false },
      { start: "2021-01", end: "2023-01", current: false },
    ];

    const years = computeTotalYears(workHistory);

    // Two 24-month jobs with a gap: 2 + 2 = 4. Merging across the gap would be 5.
    expect(years).toBe(4);
    expect(years).not.toBe(5);
  });

  it("AC2: two overlapping jobs count the overlap once, not twice", () => {
    const workHistory: WorkHistoryInterval[] = [
      { start: "2018-01", end: "2021-01", current: false },
      { start: "2019-01", end: "2022-01", current: false },
    ];

    const years = computeTotalYears(workHistory);

    // Union is 2018-01 → 2022-01 (4 years). Naive sum of both spans is 6.
    expect(years).toBe(4);
    expect(years).not.toBe(6);
  });

  it("AC2: a current job with end null counts through a frozen now", () => {
    const now = new Date("2024-06-01T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const workHistory: WorkHistoryInterval[] = [
      { start: "2022-06", end: null, current: true },
    ];

    const years = computeTotalYears(workHistory);

    expect(years).toBe(2);
  });

  it("AC2: an entry with start null is excluded rather than crashing the calculation", () => {
    const workHistory: WorkHistoryInterval[] = [
      { start: null, end: "2020-01", current: false },
      { start: "2018-01", end: "2020-01", current: false },
    ];

    let years: number | undefined;
    let thrown: unknown;
    try {
      years = computeTotalYears(workHistory);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeUndefined();
    expect(years).toBe(2);
  });
});
