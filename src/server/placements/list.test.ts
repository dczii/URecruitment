import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { listPlacements } from "./list";

vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("./guarantee", () => ({ getFlaggedPlacements: vi.fn(async () => []) }));

afterEach(() => vi.useRealTimers());

function fixture(startDate: string) {
  const rows: Record<string, unknown[]> = {
    pipeline_entries: [{ id: "entry", job_id: "job", candidate_id: "candidate", candidates: { full_name: "Fictional Candidate" }, jobs: { current_version_id: "version", clients: { name: "Fictional Agency" } } }],
    job_versions: [{ id: "version", fields: { title: "Engineer" } }],
    placements: [{ id: "placement", pipeline_entry_id: "entry", start_date: startDate, guarantee_period_days: 30, guarantee_end_date: "2026-03-02" }],
  };
  vi.mocked(getDb).mockReturnValue({ from: (table: string) => ({ select: () => ({
    eq: async () => ({ data: rows[table], error: null }),
    in: async () => ({ data: rows[table], error: null }),
  }) }) } as never);
}

describe("049 placement load", () => {
  it("FR-001 counts Jan 31 to Feb 1 as one calendar day", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-02-01T04:00:00Z"));
    fixture("2026-01-31");
    expect((await listPlacements())[0].daysUsed).toBe(1);
  });
  it("FR-002 caps an ended guarantee at its period", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T04:00:00Z"));
    fixture("2026-08-06");
    expect((await listPlacements())[0].daysUsed).toBe(30);
  });
});
