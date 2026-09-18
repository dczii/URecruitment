import { expect, test } from "@playwright/test";

test("AC1: home page renders without errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "URecruitment" }),
  ).toBeVisible();

  // Vercel Preview deployments inject a "Vercel Live" feedback toolbar that
  // tries to frame vercel.live. Our CSP has no frame-src, so it falls back to
  // default-src 'self' and correctly blocks it — that's our security header
  // working as intended, not an app error, and it never appears in
  // Production. Ignore only this specific, known message.
  const appConsoleErrors = consoleErrors.filter(
    (message) => !message.includes("Framing 'https://vercel.live/'"),
  );
  expect(appConsoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("AC8: no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("AC5: Simplified Chinese sample uses Noto Sans SC without missing glyphs", async ({
  page,
}) => {
  await page.goto("/");

  const sample = page.locator('[lang="zh-Hans"]').first();
  await expect(sample).toBeVisible();

  const snapshot = await sample.evaluate((element) => {
    const text = element.textContent ?? "";
    return {
      text,
      fontFamily: getComputedStyle(element).fontFamily,
    };
  });

  expect(snapshot.text.trim().length).toBeGreaterThan(0);
  expect(snapshot.text.includes("\uFFFD")).toBe(false);
  expect(snapshot.fontFamily).toMatch(/Noto Sans SC/);
});

test("AC6: security headers are present", async ({ page }) => {
  const res = await page.goto("/");
  expect(res).not.toBeNull();
  if (!res) {
    throw new Error("expected a response from /");
  }

  const headers = res.headers();
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("nonce-");
  expect(csp).toContain("frame-ancestors 'none'");

  const scriptSrc =
    csp
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("script-src")) ?? "";
  expect(scriptSrc).not.toContain("'unsafe-inline'");

  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["permissions-policy"]).toBeDefined();
});

test("AC6: a prefetch request also carries the CSP", async ({ request }) => {
  // Next's CSP example exempts prefetches from the proxy, which left those
  // document responses with no CSP at all. src/proxy.ts deliberately does not.
  const res = await request.get("/", {
    headers: { purpose: "prefetch", "next-router-prefetch": "1" },
  });

  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("nonce-");
  expect(csp).toContain("frame-ancestors 'none'");
});
