const DAY_MS = 86_400_000;
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Validate calendar dates without accepting JavaScript's overflow normalization. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
}

/** Calendar days, not working days; start is day zero. Shared by load and save. */
export function placementDaysUsed(
  startDate: string,
  periodDays: number,
  now: Date = new Date(),
): number {
  const today = new Date(now.getTime() + SGT_OFFSET_MS).toISOString().slice(0, 10);
  const elapsed = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / DAY_MS;
  return Math.min(periodDays, Math.max(0, elapsed));
}
