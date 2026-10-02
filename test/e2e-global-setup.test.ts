import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  storageState: vi.fn(),
  dispose: vi.fn(),
  newContext: vi.fn(),
}));
vi.mock("@playwright/test", () => ({ request: { newContext: mocks.newContext } }));
vi.mock("../e2e/bypass-state", () => ({
  bypassStatePath: () => "/tmp/bypass.json",
}));
import globalSetup from "../e2e/global-setup";

describe("preview authentication setup", () => {
  beforeEach(() => {
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "https://preview.example.com");
    vi.stubEnv("PLAYWRIGHT_BYPASS_SECRET", "fictional-bypass-secret");
    mocks.newContext.mockResolvedValue(mocks);
    mocks.get.mockResolvedValue({
      ok: () => true,
      status: () => 200,
      url: () => "https://preview.example.com/favicon.ico",
      headers: () => ({}),
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("authenticates using a static asset without following redirects", async () => {
    await globalSetup();
    expect(mocks.get).toHaveBeenCalledWith("/favicon.ico", {
      maxRedirects: 0,
      headers: {
        "x-vercel-protection-bypass": "fictional-bypass-secret",
        "x-vercel-set-bypass-cookie": "true",
      },
    });
    expect(mocks.storageState).toHaveBeenCalledWith({ path: "/tmp/bypass.json" });
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it("follows the cookie-setting redirect without sending the secret again", async () => {
    mocks.get.mockResolvedValueOnce({
      ok: () => false,
      status: () => 307,
      url: () => "https://preview.example.com/favicon.ico",
      headers: () => ({ location: "/favicon.ico" }),
    });
    await globalSetup();
    expect(mocks.get).toHaveBeenNthCalledWith(
      2,
      "https://preview.example.com/favicon.ico",
      { maxRedirects: 0 },
    );
    expect(mocks.newContext).toHaveBeenCalledWith({
      baseURL: "https://preview.example.com",
    });
    expect(mocks.storageState).toHaveBeenCalledOnce();
  });

  it("does not follow a redirect to SSO", async () => {
    mocks.get.mockResolvedValueOnce({
      ok: () => false,
      status: () => 307,
      url: () => "https://preview.example.com/favicon.ico",
      headers: () => ({ location: "https://vercel.com/login" }),
    });
    await expect(globalSetup()).rejects.toThrow("Vercel bypass was rejected");
    expect(mocks.get).toHaveBeenCalledOnce();
    expect(mocks.storageState).not.toHaveBeenCalled();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it.each([
    [401, "https://preview.example.com/favicon.ico"],
    [500, "https://preview.example.com/favicon.ico"],
    [200, "https://vercel.com/login"],
  ])(
    "rejects HTTP %s from %s without saving authentication",
    async (status, url) => {
      mocks.get.mockResolvedValue({
        ok: () => status >= 200 && status < 300,
        status: () => status,
        url: () => url,
        headers: () => ({}),
      });
      await expect(globalSetup()).rejects.toThrow("Vercel bypass was rejected");
      expect(mocks.storageState).not.toHaveBeenCalled();
      expect(mocks.dispose).toHaveBeenCalledOnce();
    },
  );

  it("does not exchange a cookie when no bypass secret is configured", async () => {
    vi.stubEnv("PLAYWRIGHT_BYPASS_SECRET", "");
    await globalSetup();
    expect(mocks.newContext).not.toHaveBeenCalled();
  });
});
