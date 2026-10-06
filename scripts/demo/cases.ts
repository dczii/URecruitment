/** Expected outputs are explicitly specified examples, not calculated by the implementation. */
export const cases = [
  { id: "FR-001/month-end", start: "2026-01-31", now: "2026-02-01T04:00:00Z", period: 30, expected: 1 },
  { id: "FR-001/leap-day", start: "2024-02-28", now: "2024-03-01T04:00:00Z", period: 30, expected: 2 },
  { id: "FR-001/year-end", start: "2025-12-31", now: "2026-01-01T04:00:00Z", period: 30, expected: 1 },
  { id: "FR-001/before-SGT-midnight", start: "2026-10-04", now: "2026-10-04T15:59:59Z", period: 30, expected: 0 },
  { id: "FR-001/at-SGT-midnight", start: "2026-10-04", now: "2026-10-04T16:00:00Z", period: 30, expected: 1 },
  { id: "FR-002/ended", start: "2026-08-06", now: "2026-10-05T04:00:00Z", period: 30, expected: 30 },
  { id: "FR-002/end-today", start: "2026-09-05", now: "2026-10-05T04:00:00Z", period: 30, expected: 30 },
  { id: "FR-002/future", start: "2026-10-08", now: "2026-10-05T04:00:00Z", period: 30, expected: 0 },
  { id: "FR-002/start-today", start: "2026-10-05", now: "2026-10-05T04:00:00Z", period: 30, expected: 0 },
  { id: "FR-002/active", start: "2026-10-01", now: "2026-10-05T04:00:00Z", period: 30, expected: 4 },
  { id: "FR-002/client-period", start: "2026-08-01", now: "2026-10-05T04:00:00Z", period: 60, expected: 60 },
] as const;
