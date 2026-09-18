import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addWorkingDays, workingDaysElapsed } from "./working-days";

// ---------------------------------------------------------------------------
// S2b contract — implement these exact signatures in src/lib/working-days.ts
//
// workingDaysElapsed(
//   fromUtc: Date | string,
//   toUtc: Date | string,
//   holidays: Iterable<string /* YYYY-MM-DD */>,
// ): number
//   Convert each timestamp to an Asia/Singapore calendar date (UTC+8;
//   SGT midnight == 16:00 UTC of the previous calendar day). Count Mon–Fri
//   dates in the half-open range [fromSgtDate, toSgtDate) that are not in
//   `holidays`. Returns an integer. The from-date counts only after SGT
//   midnight has been crossed (see rounding rule below).
//
// addWorkingDays(
//   fromUtc: Date | string,
//   days: number,
//   holidays: Iterable<string /* YYYY-MM-DD */>,
// ): Date
//   From the SGT calendar date of `fromUtc`, walk forward `days` Singapore
//   working days (Mon–Fri, skipping `holidays`). The from-date is not one of
//   the `days` — it is N working days *after* that date. Weekend/holiday
//   from-dates do not count. Return the UTC instant of SGT-local-midnight
//   at the start of the landing date.
//
// Rounding rule (copy onto the implementation in working-days.ts):
//   A working day is counted as fully elapsed only once the SGT
//   local-midnight boundary has been crossed. Partial days do not round up.
//   A same-SGT-day span therefore returns 0, not 1.
// ---------------------------------------------------------------------------

/**
 * Subset of the 2026 rows in `sg_public_holidays` (migration
 * 20260918000006_sg_public_holidays.sql). Pure fixture — no DB call.
 *
 * 2026-01-01  Thu  New Year's Day
 * 2026-05-31  Sun  Vesak Day
 * 2026-06-01  Mon  Vesak Day (in lieu)
 */
const HOLIDAYS: readonly string[] = [
  "2026-01-01",
  "2026-05-31",
  "2026-06-01",
];

/** Wednesday 2026-03-18 12:00 SGT — a working day, away from the fixtures. */
const FROZEN_NOW = "2026-03-18T04:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("working-days", () => {
  describe("workingDaysElapsed", () => {
    it("AC1: counts Friday→Monday as one working day", () => {
      // Friday 2026-01-09 14:00 SGT → Monday 2026-01-12 10:00 SGT.
      // Three calendar days (Fri, Sat, Sun) but only Friday is a working
      // day that has fully elapsed by Monday.
      const fridayAfternoonSgt = "2026-01-09T06:00:00.000Z";
      const mondayMorningSgt = "2026-01-12T02:00:00.000Z";

      expect(
        workingDaysElapsed(fridayAfternoonSgt, mondayMorningSgt, HOLIDAYS),
      ).toBe(1);
    });

    it("does not count a Saturday or Sunday entry as a working day", () => {
      // Saturday 2026-01-10 / Sunday 2026-01-11. Next working day is Monday
      // 2026-01-12. Neither weekend day is in [from, to) as a working day,
      // so elapsed is 0 until Monday itself has fully elapsed (Tue 00:00 SGT).
      const saturdaySgt = "2026-01-10T02:00:00.000Z"; // 10:00 SGT Sat
      const sundaySgt = "2026-01-11T02:00:00.000Z"; // 10:00 SGT Sun
      const mondayMorningSgt = "2026-01-12T02:00:00.000Z"; // 10:00 SGT Mon
      const tuesdayMidnightSgt = "2026-01-12T16:00:00.000Z"; // 00:00 SGT Tue

      expect(workingDaysElapsed(saturdaySgt, mondayMorningSgt, HOLIDAYS)).toBe(
        0,
      );
      expect(workingDaysElapsed(sundaySgt, mondayMorningSgt, HOLIDAYS)).toBe(0);
      expect(
        workingDaysElapsed(saturdaySgt, tuesdayMidnightSgt, HOLIDAYS),
      ).toBe(1);
    });

    it("counts the weekday eve of a holiday and skips the holiday", () => {
      // 2025-12-31 is Wednesday (eve of 2026-01-01 New Year's Day, Thursday).
      // Eve counts as a working day; the holiday itself does not.
      const eveWednesdaySgt = "2025-12-31T02:00:00.000Z"; // 10:00 SGT Wed
      const fridayAfterSgt = "2026-01-02T02:00:00.000Z"; // 10:00 SGT Fri

      expect(
        workingDaysElapsed(eveWednesdaySgt, fridayAfterSgt, HOLIDAYS),
      ).toBe(1);
    });

    it("AC2: excludes a single SG public holiday", () => {
      // 2026-01-01 is Thursday and a seeded holiday — excluded even though
      // it falls on a weekday. Entering on the holiday, by Friday only the
      // holiday (skipped) has been in range → 0; by Monday, Friday has
      // elapsed → 1.
      const newYearsDaySgt = "2026-01-01T02:00:00.000Z"; // 10:00 SGT Thu
      const fridaySgt = "2026-01-02T02:00:00.000Z"; // 10:00 SGT Fri
      const mondaySgt = "2026-01-05T02:00:00.000Z"; // 10:00 SGT Mon

      expect(workingDaysElapsed(newYearsDaySgt, fridaySgt, HOLIDAYS)).toBe(0);
      expect(workingDaysElapsed(newYearsDaySgt, mondaySgt, HOLIDAYS)).toBe(1);
    });

    it("AC2: excludes a run of consecutive holidays", () => {
      // 2026-05-31 (Sun, Vesak Day) + 2026-06-01 (Mon, Vesak Day in lieu).
      // Friday 2026-05-29 → Tuesday 2026-06-02 10:00 SGT: only Friday has
      // elapsed; Sat/Sun/in-lieu Monday are all excluded.
      const fridayBeforeSgt = "2026-05-29T02:00:00.000Z";
      const tuesdayAfterSgt = "2026-06-02T02:00:00.000Z";
      const wednesdayAfterSgt = "2026-06-03T02:00:00.000Z";

      expect(
        workingDaysElapsed(fridayBeforeSgt, tuesdayAfterSgt, HOLIDAYS),
      ).toBe(1);
      expect(
        workingDaysElapsed(fridayBeforeSgt, wednesdayAfterSgt, HOLIDAYS),
      ).toBe(2);
    });

    it("AC3: treats 15:59 UTC and 16:00 UTC as different SGT days", () => {
      // 2026-01-01T15:59:00Z = 2026-01-01 23:59 SGT (still 1 Jan, Thursday)
      // 2026-01-01T16:00:00Z = 2026-01-02 00:00 SGT (now 2 Jan, Friday)
      const stillJan1Sgt = "2026-01-01T15:59:00.000Z";
      const nowJan2Sgt = "2026-01-01T16:00:00.000Z";
      // Wednesday 2025-12-31 00:00 SGT — the working-day eve of NYD.
      const wedMidnightSgt = "2025-12-30T16:00:00.000Z";

      // Empty holiday set isolates the day-boundary: crossing this midnight
      // completes Thursday 1 Jan, so elapsed goes 1 → 2. One UTC minute,
      // two Singapore calendar dates, two different counts.
      expect(workingDaysElapsed(wedMidnightSgt, stillJan1Sgt, [])).toBe(1);
      expect(workingDaysElapsed(wedMidnightSgt, nowJan2Sgt, [])).toBe(2);

      // Same distinction when "now" is frozen on each side of the boundary.
      vi.setSystemTime(new Date(stillJan1Sgt));
      expect(workingDaysElapsed(wedMidnightSgt, new Date(), [])).toBe(1);
      vi.setSystemTime(new Date(nowJan2Sgt));
      expect(workingDaysElapsed(wedMidnightSgt, new Date(), [])).toBe(2);
    });

    it("counts a partial working day as 0 (no round-up)", () => {
      // Rounding rule: a working day elapses only after SGT midnight is
      // crossed. Same SGT calendar day → 0, not a fraction rounded to 1.
      const wednesdayMorningSgt = "2026-01-07T01:00:00.000Z"; // 09:00 SGT Wed
      const wednesdayEveningSgt = "2026-01-07T15:00:00.000Z"; // 23:00 SGT Wed
      const wednesdayLastMinuteSgt = "2026-01-07T15:59:00.000Z"; // 23:59 SGT Wed
      const thursdayMidnightSgt = "2026-01-07T16:00:00.000Z"; // 00:00 SGT Thu

      expect(
        workingDaysElapsed(wednesdayMorningSgt, wednesdayEveningSgt, HOLIDAYS),
      ).toBe(0);
      expect(
        workingDaysElapsed(
          wednesdayMorningSgt,
          wednesdayLastMinuteSgt,
          HOLIDAYS,
        ),
      ).toBe(0);
      expect(
        workingDaysElapsed(
          wednesdayMorningSgt,
          thursdayMidnightSgt,
          HOLIDAYS,
        ),
      ).toBe(1);
    });
  });

  describe("addWorkingDays", () => {
    it("AC1: Friday + 1 working day is Monday 00:00 SGT", () => {
      const fridayAfternoonSgt = "2026-01-09T06:00:00.000Z";
      // Monday 2026-01-12 00:00 SGT
      expect(
        addWorkingDays(fridayAfternoonSgt, 1, HOLIDAYS).toISOString(),
      ).toBe("2026-01-11T16:00:00.000Z");
      // Friday + 2 working days = Tuesday 2026-01-13 00:00 SGT
      expect(
        addWorkingDays(fridayAfternoonSgt, 2, HOLIDAYS).toISOString(),
      ).toBe("2026-01-12T16:00:00.000Z");
    });

    it("Saturday or Sunday + 1 working day is the following Monday", () => {
      const saturdaySgt = "2026-01-10T02:00:00.000Z";
      const sundaySgt = "2026-01-11T02:00:00.000Z";
      // Monday 2026-01-12 00:00 SGT
      const mondayMidnightUtc = "2026-01-11T16:00:00.000Z";

      expect(addWorkingDays(saturdaySgt, 1, HOLIDAYS).toISOString()).toBe(
        mondayMidnightUtc,
      );
      expect(addWorkingDays(sundaySgt, 1, HOLIDAYS).toISOString()).toBe(
        mondayMidnightUtc,
      );
    });

    it("skips a holiday after its eve, and skips the holiday itself", () => {
      const eveWednesdaySgt = "2025-12-31T02:00:00.000Z";
      const newYearsDaySgt = "2026-01-01T02:00:00.000Z";
      // Friday 2026-01-02 00:00 SGT (Thursday 1 Jan is a holiday)
      const fridayMidnightUtc = "2026-01-01T16:00:00.000Z";

      expect(addWorkingDays(eveWednesdaySgt, 1, HOLIDAYS).toISOString()).toBe(
        fridayMidnightUtc,
      );
      expect(addWorkingDays(newYearsDaySgt, 1, HOLIDAYS).toISOString()).toBe(
        fridayMidnightUtc,
      );
    });

    it("AC2: consecutive holidays push the next working day to Tuesday", () => {
      // After Friday 2026-05-29, Sat/Sun + Vesak in-lieu Monday are all
      // skipped, so +1 working day lands on Tuesday 2026-06-02 00:00 SGT.
      const fridayBeforeSgt = "2026-05-29T02:00:00.000Z";
      const sundayVesakSgt = "2026-05-31T02:00:00.000Z";
      const mondayInLieuSgt = "2026-06-01T02:00:00.000Z";
      const tuesdayMidnightUtc = "2026-06-01T16:00:00.000Z";

      expect(addWorkingDays(fridayBeforeSgt, 1, HOLIDAYS).toISOString()).toBe(
        tuesdayMidnightUtc,
      );
      expect(addWorkingDays(sundayVesakSgt, 1, HOLIDAYS).toISOString()).toBe(
        tuesdayMidnightUtc,
      );
      expect(addWorkingDays(mondayInLieuSgt, 1, HOLIDAYS).toISOString()).toBe(
        tuesdayMidnightUtc,
      );
    });

    it("AC3: 15:59 UTC and 16:00 UTC land on different SGT dates", () => {
      const stillJan1Sgt = "2026-01-01T15:59:00.000Z";
      const nowJan2Sgt = "2026-01-01T16:00:00.000Z";

      // 1 Jan (holiday Thu) + 1 WD = Fri 2 Jan 00:00 SGT
      expect(addWorkingDays(stillJan1Sgt, 1, HOLIDAYS).toISOString()).toBe(
        "2026-01-01T16:00:00.000Z",
      );
      // 2 Jan (Fri) + 1 WD = Mon 5 Jan 00:00 SGT
      expect(addWorkingDays(nowJan2Sgt, 1, HOLIDAYS).toISOString()).toBe(
        "2026-01-04T16:00:00.000Z",
      );
    });
  });
});
