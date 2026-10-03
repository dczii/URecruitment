import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { issueSessionAge, validSessionAge, MAX_SESSION_SECONDS } from "./session";
import { resetServerEnvCacheForTests } from "../env";
beforeEach(() => { vi.stubEnv("SUPABASE_URL", "http://localhost:54321"); vi.stubEnv("SUPABASE_SECRET_KEY", "fictional-secret"); resetServerEnvCacheForTests(); });
afterEach(() => { vi.unstubAllEnvs(); resetServerEnvCacheForTests(); });
describe("AC5 bounded session age", () => {
  const now = 1800000000000;
  it("valid marker belongs only to its verified identity", () => {
    const marker = issueSessionAge("fictional-one", now);
    expect(validSessionAge(marker, "fictional-one", now + 1000)).toBe(true);
    expect(validSessionAge(marker, "fictional-two", now)).toBe(false);
  });
  it("refresh cannot extend maximum login age", () => {
    const marker = issueSessionAge("fictional", now);
    expect(validSessionAge(marker, "fictional", now + MAX_SESSION_SECONDS * 1000 - 1)).toBe(true);
    expect(validSessionAge(marker, "fictional", now + MAX_SESSION_SECONDS * 1000)).toBe(false);
  });
  it("tampering, missing or future markers grant no access", () => {
    const marker = issueSessionAge("fictional", now);
    expect(validSessionAge(marker.replace(String(now / 1000), String(now / 1000 + 1)), "fictional", now)).toBe(false);
    expect(validSessionAge(undefined, "fictional", now)).toBe(false);
    expect(validSessionAge(issueSessionAge("fictional", now + 1000), "fictional", now)).toBe(false);
  });
});
