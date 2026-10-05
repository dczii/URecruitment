import { expect, it } from "vitest";
import { formatBuildInfo } from "./build-info";
it("identifies valid deployment commits alongside release", () => {
  expect(formatBuildInfo("0.1.0", "abcdef0123456789")).toBe("v0.1.0 · build abcdef0");
});
it("uses a safe local fallback for missing or malformed metadata", () => {
  for (const sha of [undefined, "", "<script>", "abc", "a".repeat(41)]) {
    expect(formatBuildInfo("0.1.0", sha)).toBe("v0.1.0 · local build");
  }
});
