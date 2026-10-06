import { describe, expect, it } from "vitest";
import { cases } from "../../scripts/demo/cases";
import { placementDaysUsed, isCalendarDate } from "./placement-countdown";

describe("049 authoritative placement countdown", () => {
  for (const c of cases) it(c.id, () => {
    expect(placementDaysUsed(c.start, c.period, new Date(c.now))).toBe(c.expected);
  });
  it("FR-004 validates dates rather than normalizing impossible dates", () => {
    for (const value of ["2026-02-29", "2026-02-31", "2026-13-01", "2026-00-01", "2026-04-31", "", "2026-1-1"]) expect(isCalendarDate(value)).toBe(false);
    for (const value of ["2024-02-29", "2026-01-31", "2026-12-31"]) expect(isCalendarDate(value)).toBe(true);
  });
});
