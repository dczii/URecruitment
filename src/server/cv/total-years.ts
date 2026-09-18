import "server-only";

/**
 * Work-history interval used to compute total years in code (PRD AC2).
 * Extra fields on a parsed work-history entry are ignored.
 */
export type WorkHistoryInterval = {
  start: string | null;
  end: string | null;
  current: boolean;
};

const YEAR_MONTH = /^(\d{4})-(\d{2})$/;

/**
 * Sum YYYY-MM interval durations in years, merging overlaps so they count
 * once. `current: true` runs through `Date.now()` (UTC year-month). Entries
 * with `start: null` are skipped.
 */
export function computeTotalYears(
  workHistory: readonly WorkHistoryInterval[],
): number {
  const now = new Date();
  const nowMonths = yearMonthToMonths(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const ranges: Array<{ start: number; end: number }> = [];

  for (const entry of workHistory) {
    if (entry.start === null) {
      continue;
    }
    const startMonths = parseYearMonthToMonths(entry.start);
    if (startMonths === null) {
      continue;
    }

    let endMonths: number | null = null;
    if (entry.current) {
      endMonths = nowMonths;
    } else if (entry.end !== null) {
      endMonths = parseYearMonthToMonths(entry.end);
    }
    if (endMonths === null || endMonths <= startMonths) {
      continue;
    }

    ranges.push({ start: startMonths, end: endMonths });
  }

  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ start: range.start, end: range.end });
    } else if (range.end > last.end) {
      last.end = range.end;
    }
  }

  const totalMonths = merged.reduce(
    (sum, range) => sum + (range.end - range.start),
    0,
  );
  return totalMonths / 12;
}

function parseYearMonthToMonths(value: string): number | null {
  const match = YEAR_MONTH.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return yearMonthToMonths(year, month);
}

function yearMonthToMonths(year: number, month: number): number {
  return year * 12 + (month - 1);
}
