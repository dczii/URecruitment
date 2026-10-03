import { expect, it } from "vitest";
import { parseAuthEnv } from "./env";
it("requires a server-only auth key without leaking values", () => {
  expect(() => parseAuthEnv({})).toThrow("SUPABASE_PUBLISHABLE_KEY");
  expect(parseAuthEnv({ SUPABASE_PUBLISHABLE_KEY: "fictional-key" })).toEqual({ SUPABASE_PUBLISHABLE_KEY: "fictional-key" });
});
