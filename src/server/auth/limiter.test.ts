import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { limitRules, consumeLimits, limitAttempt } from "./limiter";
import { resetServerEnvCacheForTests } from "../env";
beforeEach(() => { vi.stubEnv("SUPABASE_URL", "http://localhost:54321"); vi.stubEnv("SUPABASE_SECRET_KEY", "fictional-secret"); resetServerEnvCacheForTests(); });
afterEach(() => { vi.unstubAllEnvs(); resetServerEnvCacheForTests(); });
it("AC7 uses hashed shared buckets with separate send/verify budgets", () => {
  const send = limitRules("recruiter@example.test", "192.0.2.1", "send");
  const verify = limitRules("recruiter@example.test", "192.0.2.1", "verify");
  expect(send.map(({ attempts, seconds }) => [attempts, seconds])).toEqual([[1, 60], [5, 3600], [20, 3600]]);
  expect(verify.map(({ attempts, seconds }) => [attempts, seconds])).toEqual([[5, 600], [30, 600]]);
  expect(JSON.stringify(send)).not.toContain("recruiter@"); expect(JSON.stringify(send)).not.toContain("192.0.2.1");
});
it("AC7 charges every bucket and any denied bucket fails closed", async () => {
  const consume = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  expect(await consumeLimits(limitRules("a@example.test", "unknown", "send"), consume)).toBe(false);
  expect(consume).toHaveBeenCalledTimes(3);
});
it("AC7 database outage fails closed", async () => {
  await expect(consumeLimits([{ bucket: "fake", attempts: 1, seconds: 60 }], async () => { throw new Error("unavailable"); })).rejects.toThrow("unavailable");
});

it("AC7 blocked sources cannot allocate counters for arbitrary new emails", async () => {
  const consume = vi.fn().mockResolvedValue(false);
  expect(await limitAttempt(limitRules("fresh@example.test", "unknown", "send"), consume)).toBe(false);
  expect(consume).toHaveBeenCalledTimes(1);
  expect(consume.mock.calls[0][0].bucket).toMatch(/^send:source:/);
});
