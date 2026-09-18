import { describe, expect, it } from "vitest";
import {
  AI_FAILED_MESSAGE,
  AI_RATE_LIMITED_MESSAGE,
  AI_ROUTE_PREFIX,
  aiFailureMessage,
  isAiRoutePath,
} from "./ai-routes";

describe("ai-routes (AC4, AC6)", () => {
  it("AC4: AI_ROUTE_PREFIX is /api/ai/", () => {
    expect(AI_ROUTE_PREFIX).toBe("/api/ai/");
  });

  it("AC4: isAiRoutePath is true only for paths under the trailing-slash prefix", () => {
    expect(isAiRoutePath("/api/ai/search")).toBe(true);
    expect(isAiRoutePath("/api/ai/jobs/123/gap-check")).toBe(true);

    expect(isAiRoutePath("/api/ai")).toBe(false);
    expect(isAiRoutePath("/api/aid")).toBe(false);
    expect(isAiRoutePath("/api/aix/foo")).toBe(false);
    expect(isAiRoutePath("/api/search")).toBe(false);
    expect(isAiRoutePath("/API/ai/search")).toBe(false);
    expect(isAiRoutePath("/api/sentry-test")).toBe(false);
    expect(isAiRoutePath("")).toBe(false);
  });

  it("AC6: aiFailureMessage returns null for 2xx success", () => {
    for (const status of [200, 201, 204, 299]) {
      expect(aiFailureMessage(status)).toBeNull();
    }
  });

  it("AC6: HTTP 429 maps to the rate-limited recruiter message", () => {
    expect(aiFailureMessage(429)).toBe(AI_RATE_LIMITED_MESSAGE);
    expect(AI_RATE_LIMITED_MESSAGE).toMatch(/wait a minute/i);
    expect(AI_RATE_LIMITED_MESSAGE).toMatch(/network/i);
  });

  it("AC6: any other failure maps to a generic AI failed message", () => {
    for (const status of [400, 403, 404, 500, 502, 503, 0, NaN, -1]) {
      expect(aiFailureMessage(status)).toBe(AI_FAILED_MESSAGE);
    }
  });

  it("AC6: both messages are non-empty and distinct", () => {
    expect(AI_RATE_LIMITED_MESSAGE.trim().length).toBeGreaterThan(0);
    expect(AI_FAILED_MESSAGE.trim().length).toBeGreaterThan(0);
    expect(AI_RATE_LIMITED_MESSAGE).not.toBe(AI_FAILED_MESSAGE);
  });
});
