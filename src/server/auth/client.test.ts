import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), set: vi.fn(), getAll: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));
vi.mock("../env", () => ({ serverEnv: () => ({ SUPABASE_URL: "http://localhost:54321" }) }));
vi.mock("./env", () => ({ authEnv: () => ({ SUPABASE_PUBLISHABLE_KEY: "fictional" }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: mocks.getAll, set: mocks.set }) }));
import { authClient, clearSession } from "./client";
beforeEach(() => { mocks.getAll.mockReturnValue([{ name: "sb-fictional-auth-token", value: "fake" }, { name: "recruiter-session-age", value: "fake" }, { name: "unrelated", value: "retain" }]); });
it("AC5 auth client is recreated per request with HttpOnly cookies", async () => {
  await authClient(true); await authClient(true); expect(mocks.create).toHaveBeenCalledTimes(2);
  const options = mocks.create.mock.calls[0][2];
  options.cookies.setAll([{ name: "sb-test", value: "token", options: { maxAge: 1000 } }]);
  expect(mocks.set).toHaveBeenCalledWith("sb-test", "token", expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: undefined, path: "/" }));
});
it("AC5 rendering client leaves cookie refresh writes to proxy", async () => {
  await authClient(); mocks.create.mock.calls[0][2].cookies.setAll([{ name: "sb-test", value: "token", options: {} }]); expect(mocks.set).not.toHaveBeenCalled();
});
it("AC5 logout clears both session and age without unrelated cookies", async () => {
  await clearSession(); expect(mocks.set).toHaveBeenCalledTimes(2);
  expect(mocks.set).toHaveBeenCalledWith("recruiter-session-age", "", expect.objectContaining({ maxAge: 0 }));
});
