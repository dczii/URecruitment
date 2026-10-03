import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ create: vi.fn(), user: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));
vi.mock("../env", () => ({ serverEnv: () => ({ SUPABASE_URL: "http://localhost:54321" }) }));
vi.mock("./env", () => ({ authEnv: () => ({ SUPABASE_PUBLISHABLE_KEY: "fake" }) }));
import { refreshAuth } from "./proxy";
it("AC5 refresh updates downstream and response cookies together", async () => {
  const request = new NextRequest("http://localhost/dashboard", { headers: { cookie: "sb-test=old" } });
  mocks.create.mockImplementation((_url, _key, options) => ({ auth: { getUser: async () => { options.cookies.setAll([{ name: "sb-test", value: "refreshed", options: {} }]); return { data: { user: {} } }; } } }));
  const response = await refreshAuth(request, new Headers(request.headers));
  expect(response.cookies.get("sb-test")?.value).toBe("refreshed");
  expect(response.headers.get("x-middleware-request-cookie")).toContain("refreshed");
  expect(response.cookies.get("sb-test")?.httpOnly).toBe(true);
});
it("AC5 no cookies means no provider refresh", async () => {
  await refreshAuth(new NextRequest("http://localhost/login"), new Headers()); expect(mocks.create).not.toHaveBeenCalled();
});
