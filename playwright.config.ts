import { defineConfig, devices } from "@playwright/test";

import { bypassStatePath } from "./e2e/bypass-state";

const previewUrl = process.env.PLAYWRIGHT_BASE_URL;
const usesBypass = Boolean(previewUrl && process.env.PLAYWRIGHT_BYPASS_SECRET);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Against a protected preview, global setup swaps the bypass secret for
  // Vercel's cookie once, so tests never send the secret themselves.
  globalSetup: usesBypass ? "./e2e/global-setup.ts" : undefined,
  use: {
    baseURL: previewUrl ?? "http://localhost:3000",
    // Traces record request headers and cookies, and CI uploads them to a
    // public repo on failure. Against a protected preview they would carry the
    // bypass cookie, so keep screenshots only there.
    trace: usesBypass ? "off" : "retain-on-failure",
    screenshot: usesBypass ? "only-on-failure" : "off",
    storageState: usesBypass ? bypassStatePath() : undefined,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "phone",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: previewUrl
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
