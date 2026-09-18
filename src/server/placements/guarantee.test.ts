import { describe, expect, it } from "vitest";
import { resolveGuaranteeFlag } from "./guarantee";

const NO_HOLIDAYS: string[] = [];

describe("resolveGuaranteeFlag", () => {
  it("AC: exactly five working days before the end date is ending-soon", () => {
    // Monday 2026-09-14 today, end date Monday 2026-09-21 (5 working days:
    // Tue 15, Wed 16, Thu 17, Fri 18, Mon 21 — the boundary itself counts).
    expect(
      resolveGuaranteeFlag("2026-09-14", "2026-09-21", NO_HOLIDAYS),
    ).toBe("ending-soon");
  });

  it("AC: six working days before the end date is not flagged", () => {
    // Monday 2026-09-14 today, end date Tuesday 2026-09-22 (6 working days).
    expect(
      resolveGuaranteeFlag("2026-09-14", "2026-09-22", NO_HOLIDAYS),
    ).toBe("ok");
  });

  it("AC: the day itself (guarantee ends today) is ending-soon", () => {
    expect(
      resolveGuaranteeFlag("2026-09-21", "2026-09-21", NO_HOLIDAYS),
    ).toBe("ending-soon");
  });

  it("AC: a date already past the end date is ended", () => {
    expect(
      resolveGuaranteeFlag("2026-09-22", "2026-09-21", NO_HOLIDAYS),
    ).toBe("ended");
  });

  it("AC: a window spanning a weekend is not inflated by weekend days", () => {
    // Friday 2026-09-18 today. Working days to Friday 2026-09-25: Mon 21,
    // Tue 22, Wed 23, Thu 24, Fri 25 = 5 working days despite the Sat/Sun
    // in between — still ending-soon, not pushed out by the weekend.
    expect(
      resolveGuaranteeFlag("2026-09-18", "2026-09-25", NO_HOLIDAYS),
    ).toBe("ending-soon");
  });

  it("AC: a window spanning a public holiday shifts the boundary", () => {
    // Friday 2026-09-18 today. Without a holiday, 5 working days lands on
    // Friday 2026-09-25, so an end date of Monday 2026-09-28 is more than
    // 5 working days away and is not flagged.
    expect(
      resolveGuaranteeFlag("2026-09-18", "2026-09-28", NO_HOLIDAYS),
    ).toBe("ok");
    // With Monday 2026-09-21 a public holiday, that holiday itself doesn't
    // count as a working day, so it takes until Monday 2026-09-28 to
    // accumulate 5 working days — the same end date is now within the
    // window, proving the holiday is excluded from the count rather than
    // ignored.
    expect(
      resolveGuaranteeFlag("2026-09-18", "2026-09-28", ["2026-09-21"]),
    ).toBe("ending-soon");
  });
});
