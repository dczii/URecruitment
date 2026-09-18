/** Singapore has no DST; SGT is a fixed UTC+8 offset. */
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

function toUtcDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Convert a UTC instant to its Asia/Singapore calendar date by adding 8 hours
 * and taking the UTC date parts of the result. Returned as a Date at UTC
 * midnight so `getUTC*` matches the SGT calendar date (weekday included).
 */
function sgtCalendarDate(instant: Date): Date {
  const shifted = new Date(instant.getTime() + SGT_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
}

function ymd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWeekend(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday === 0 || weekday === 6;
}

function isWorkingDay(date: Date, holidays: Set<string>): boolean {
  return !isWeekend(date) && !holidays.has(ymd(date));
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** SGT-local midnight (00:00 SGT) as a UTC instant. */
function sgtMidnightUtc(sgtDate: Date): Date {
  return new Date(sgtDate.getTime() - SGT_OFFSET_MS);
}

/**
 * A working day counts as elapsed only once the SGT local-midnight
 * boundary has been crossed; partial days are not rounded up.
 *
 * Counts Mon–Fri Asia/Singapore calendar dates in the half-open range
 * `[fromSgtDate, toSgtDate)` that are not in `holidays`. A same-SGT-day
 * span therefore returns 0.
 */
export function workingDaysElapsed(
  fromUtc: Date | string,
  toUtc: Date | string,
  holidays: Iterable<string>,
): number {
  const holidaySet = new Set(holidays);
  const fromSgt = sgtCalendarDate(toUtcDate(fromUtc));
  const toSgt = sgtCalendarDate(toUtcDate(toUtc));

  let elapsed = 0;
  for (
    let cursor = fromSgt;
    cursor.getTime() < toSgt.getTime();
    cursor = addCalendarDays(cursor, 1)
  ) {
    if (isWorkingDay(cursor, holidaySet)) {
      elapsed += 1;
    }
  }
  return elapsed;
}

/**
 * Walk forward `days` Singapore working days (Mon–Fri, skipping `holidays`)
 * from the SGT calendar date of `fromUtc`. That from-date is not one of the
 * `days` — the result is N working days *after* it, even when the from-date
 * itself is a weekend or holiday. Returns the UTC instant of SGT-local
 * midnight at the start of the landing date.
 */
export function addWorkingDays(
  fromUtc: Date | string,
  days: number,
  holidays: Iterable<string>,
): Date {
  const holidaySet = new Set(holidays);
  let cursor = sgtCalendarDate(toUtcDate(fromUtc));
  let remaining = days;

  while (remaining > 0) {
    cursor = addCalendarDays(cursor, 1);
    if (isWorkingDay(cursor, holidaySet)) {
      remaining -= 1;
    }
  }

  return sgtMidnightUtc(cursor);
}
