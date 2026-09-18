import { request } from "@playwright/test";

import { bypassStatePath } from "./bypass-state";

/**
 * Exchanges VERCEL_AUTOMATION_BYPASS_SECRET for Vercel's bypass cookie, once,
 * before any test runs.
 *
 * The secret is sent on this single request to the preview host only. Tests
 * then carry the cookie, never the secret, so it cannot reach third-party
 * origins or land in a report uploaded as a public artifact. The saved state
 * lives outside `playwright-report/` and `test-results/`.
 */
export default async function globalSetup(): Promise<void> {
  const previewUrl = process.env.PLAYWRIGHT_BASE_URL;
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET;
  if (!previewUrl || !bypassSecret) {
    return;
  }

  const context = await request.newContext({
    baseURL: previewUrl,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  try {
    const response = await context.get("/");
    // A rejected secret redirects to Vercel's SSO login, which answers 200, so
    // the status alone would pass. The final response must come from the
    // preview itself.
    const landedOnPreview =
      new URL(response.url()).host === new URL(previewUrl).host;
    if (!response.ok() || !landedOnPreview) {
      throw new Error(
        `Vercel bypass was rejected (HTTP ${response.status()}, ended on ${new URL(response.url()).host}). Check VERCEL_AUTOMATION_BYPASS_SECRET.`,
      );
    }
    await context.storageState({ path: bypassStatePath() });
  } finally {
    await context.dispose();
  }
}
