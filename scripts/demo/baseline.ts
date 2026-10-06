/**
 * Preserved formulas from HEAD 3c39f2e, inspected before this feature's app edit.
 * This is an executable historical comparison, NOT a production code path.
 * Initial formula: src/server/placements/list.ts (calendarDaysBetween + daysUsed).
 * Save formula: src/components/features/placements/Placements.tsx (performSave).
 * `now` replaces Date.now() solely to replay identical fixed inputs.
 */
export function originalLoad(start: string, now: string): number {
  const today = new Date(Date.parse(now) + 8 * 3600000).toISOString().slice(0, 10);
  const from = Date.UTC(...(start.split("-").map(Number) as [number, number, number]));
  const to = Date.UTC(...(today.split("-").map(Number) as [number, number, number]));
  return Math.max(0, Math.round((to - from) / 86400000));
}
export function originalSave(start: string, period: number, now: string): number {
  return Math.min(Math.max(0, Math.round((Date.parse(now) - Date.parse(`${start}T00:00:00Z`)) / 86400000)), period);
}
