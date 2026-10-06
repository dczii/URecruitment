import { describe, expect, it } from "vitest";
import { classify, classifyPaths } from "./comparison";

describe("049 FR-007 consistency classification", () => {
  it("fails an unexpected value even when the case names an approved requirement", () => {
    expect(classify(60, 30, 29)).toBe("unexpected difference");
    expect(classify(60, 30, 60)).toBe("unexpected difference");
  });
  it("FR-007 reports an approved save difference even when load was unchanged", () => {
    expect(classifyPaths(0, 1, 0, 0)).toBe("approved difference");
    expect(classifyPaths(0, 1, 0, 2)).toBe("unexpected difference");
  });
  it("distinguishes preserved cases from exactly approved differences", () => {
    expect(classify(4, 4, 4)).toBe("unchanged");
    expect(classify(60, 30, 30)).toBe("approved difference");
  });
});
