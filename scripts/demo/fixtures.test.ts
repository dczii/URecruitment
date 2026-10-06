import { describe, expect, it } from "vitest";
import { createPlacementFixture } from "../../e2e/placement-fixtures.mjs";

describe("049 local fictional provider", () => {
  it("FR-005 persists a saved start date and resets original fixture", () => {
    const f = createPlacementFixture("2026-10-05");
    const before = f.read("placements", new URLSearchParams())!;
    expect(before).toHaveLength(5);
    const first = before[0];
    f.write({ ...first, start_date: "2026-10-01", guarantee_end_date: "2026-10-31" }, first.id);
    expect(f.read("placements", new URLSearchParams({ id: `eq.${first.id}` }))![0].start_date).toBe("2026-10-01");
    f.reset();
    expect(f.read("placements", new URLSearchParams())![0].start_date).toBe(first.start_date);
  });
  it("FR-005 filters Placed entries and distinguishes end-today from ended", () => {
    const f = createPlacementFixture("2026-10-05");
    expect(f.read("pipeline_entries", new URLSearchParams({ stage: "eq.Screening" }))).toEqual([]);
    const flags = f.read("placements_guarantee_flag", new URLSearchParams())!;
    expect(flags.filter((r: { flag: string }) => r.flag === "ended")).toHaveLength(1);
    expect(flags.filter((r: { flag: string }) => r.flag === "ending-soon")).toHaveLength(2);
  });
});
