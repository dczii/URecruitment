import { expect, test } from "./auth-fixture";
import type { Page } from "@playwright/test";

const provider = "http://127.0.0.1:54329";
const rowFor = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name });
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test.beforeEach(async ({ request, page }) => {
  // Initialize auth/context first: its reset must precede enabling placement fixtures.
  void page;
  const response = await request.post(`${provider}/test/placements`);
  expect(response.ok()).toBe(true);
});

test("049 FR-002 FR-006: populated placements have bounded counts and textual flags at both widths", async ({ page }) => {
  await page.goto("/placements");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Follow up after placement" })).toBeVisible();
  await expect(rowFor(page, "Avery Tan (fictional)")).toContainText("30 of 30 days used");
  await expect(rowFor(page, "Avery Tan (fictional)")).toContainText("Guarantee period has ended");
  await expect(rowFor(page, "Casey Wong (fictional)")).toContainText("30 of 30 days used");
  await expect(rowFor(page, "Casey Wong (fictional)")).toContainText("Guarantee ending soon");
  await expect(rowFor(page, "Devon Lee (fictional)")).toContainText("10 of 30 days used");
  await expect(rowFor(page, "Emery Ng (fictional)")).toContainText("0 of 30 days used");
  await noOverflow(page);
});

test("049 FR-003: first save asks for typed name and count survives reload", async ({ page, request }) => {
  const response = await request.post(`${provider}/test/placements`);
  const { today } = await response.json();
  const start = new Date(Date.parse(`${today}T00:00:00Z`) - 10 * 86400000).toISOString().slice(0, 10);
  await page.goto("/placements");
  const row = rowFor(page, "Frankie Teo (fictional)");
  await row.getByLabel("Start date for Frankie Teo (fictional)").fill(start);
  await row.getByRole("button", { name: "Confirm", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeInViewport();
  await dialog.getByLabel("Name", { exact: true }).fill("Demo Recruiter");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(row).toContainText("10 of 30 days used");
  await page.reload();
  await expect(row.getByLabel("Start date for Frankie Teo (fictional)")).toHaveValue(start);
  await expect(row).toContainText("10 of 30 days used");
  // A second write uses the remembered typed name and does not ask again.
  await row.getByRole("button", { name: "Update", exact: true }).click();
  await expect(row.getByRole("button", { name: "Update", exact: true })).toBeEnabled();
  await expect(dialog).toHaveCount(0);
  await noOverflow(page);
});

test("049 FR-004: rejected and failed saves preserve input and persisted data", async ({ page, request }) => {
  await page.goto("/placements");
  const row = rowFor(page, "Devon Lee (fictional)");
  const input = row.getByLabel("Start date for Devon Lee (fictional)");
  const original = await input.inputValue();
  await input.fill("2020-01-01");
  await row.getByRole("button", { name: "Update", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("Demo Recruiter");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(row.getByRole("alert")).toContainText("before the date");
  await expect(input).toHaveValue("2020-01-01");
  await expect(input).toBeFocused();
  await input.fill(original);
  await request.post(`${provider}/test/placement-failure`);
  await row.getByRole("button", { name: "Update", exact: true }).click();
  await expect(row.getByRole("alert")).toContainText("could not be saved");
  await expect(input).toHaveValue(original);
  await page.reload();
  await expect(row).toContainText("10 of 30 days used");
  await noOverflow(page);
});

test("AC1 / 049 FR-006: empty placements remain readable without overflow", async ({ page, request }) => {
  await request.post(`${provider}/test/placements`, { data: { empty: true } });
  await page.goto("/placements");
  await expect(page.getByRole("heading", { name: "Follow up after placement" })).toBeVisible();
  await expect(page.getByText("No placements yet", { exact: false })).toBeVisible();
  await noOverflow(page);
});
