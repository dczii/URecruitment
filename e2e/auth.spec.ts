import { test, expect } from "@playwright/test";
test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54329/test/reset"); });
test("AC4 private pages redirect, login has no workspace navigation", async ({ page }) => {
  await page.goto("/settings"); await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("AC1 AC2 AC5 approved OTP signs in and logout blocks access", async ({ page }) => {
  await page.goto("/login"); await page.getByLabel("Work email").fill("recruiter@example.test");
  await page.getByRole("button", { name: "Send login code" }).click();
  await expect(page.getByLabel("Six-digit code")).toBeFocused();
  await page.getByLabel("Six-digit code").fill("999999"); await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page.locator("#login-error")).toContainText("invalid or expired");
  await page.getByLabel("Six-digit code").fill("001234"); await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const cookies = await page.context().cookies();
  expect(cookies.find(c => c.name === "recruiter-session-age")?.httpOnly).toBe(true);
  expect(cookies.find(c => c.name.startsWith("sb-"))?.httpOnly).toBe(true);
  if ((page.viewportSize()?.width ?? 1440) < 1024) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Account: Add name" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click(); await expect(page).toHaveURL(/\/login$/);
  await page.goto("/settings"); await expect(page).toHaveURL(/\/login$/);
});
test("AC3 unknown email gets acknowledgement and no access", async ({ page }) => {
  await page.goto("/login"); await page.getByLabel("Work email").fill("unknown@example.test");
  await page.getByRole("button", { name: "Send login code" }).click();
  await expect(page.getByText("If this email is approved, a login code will arrive shortly.")).toBeVisible();
  await page.getByLabel("Six-digit code").fill("001234"); await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page.locator("#login-error")).toContainText("invalid or expired"); await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Change email" }).click(); await expect(page.getByLabel("Work email")).toBeVisible();
});
test("AC4 removing approval blocks existing sessions", async ({ page, request }) => {
  await page.goto("/login"); await page.getByLabel("Work email").fill("recruiter@example.test"); await page.getByRole("button", { name: "Send login code" }).click();
  await page.getByLabel("Six-digit code").fill("001234"); await page.getByRole("button", { name: "Verify and sign in" }).click(); await expect(page).toHaveURL(/\/dashboard$/);
  await request.post("http://127.0.0.1:54329/test/revoke"); await page.goto("/jobs"); await expect(page).toHaveURL(/\/login$/);
});
test("AC6 login keyboard focus, email/code layout and screenshots", async ({ page }, info) => {
  await page.goto("/login"); await page.keyboard.press("Tab"); await expect(page.getByLabel("Work email")).toBeFocused();
  await page.screenshot({ path: `specs/047-recruiter-email-otp/screenshots/login-${info.project.name}.png`, fullPage: true });
  await page.getByLabel("Work email").fill("recruiter@example.test"); await page.getByRole("button", { name: "Send login code" }).click();
  await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `specs/047-recruiter-email-otp/screenshots/code-${info.project.name}.png`, fullPage: true });
});

test("AC2 provider rejects an expired code and a reused code", async ({ page, request }) => {
  await page.goto("/login"); await page.getByLabel("Work email").fill("recruiter@example.test"); await page.getByRole("button", { name: "Send login code" }).click();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
  await request.post("http://127.0.0.1:54329/test/expire");
  await page.getByLabel("Six-digit code").fill("001234"); await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page.locator("#login-error")).toContainText("invalid or expired");
  await request.post("http://127.0.0.1:54329/test/reset");
  await page.getByRole("button", { name: "Change email" }).click(); await page.getByRole("button", { name: "Send login code" }).click();
  await page.getByLabel("Six-digit code").fill("001234"); await page.getByRole("button", { name: "Verify and sign in" }).click(); await expect(page).toHaveURL(/\/dashboard$/);
  const replay = await request.post("http://127.0.0.1:54329/auth/v1/verify", { data: { email: "recruiter@example.test", token: "001234" } });
  expect(replay.status()).toBe(403);
});
