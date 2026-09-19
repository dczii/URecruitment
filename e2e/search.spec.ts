import { expect, test, type Page } from "@playwright/test";

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Candidate search is desktop-only",
  );
});

async function gotoSearch(page: Page) {
  await page.goto("/search");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "Find candidates" }),
  ).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("search form uses keyword and filters, not AI copy", async ({ page }) => {
  await gotoSearch(page);
  await expect(page.getByLabel("Keyword")).toBeVisible();
  await expect(page.getByLabel("Skills")).toBeVisible();
  await expect(page.getByLabel("Minimum years")).toBeVisible();
  await expect(page.getByLabel("Maximum years")).toBeVisible();
  await expect(page.getByLabel("Location")).toBeVisible();
  await expect(page.getByLabel("Language")).toBeVisible();
  await expect(page.getByLabel("CV updated after")).toBeVisible();
  await expect(page.getByText("AI suggestion")).toHaveCount(0);
});

test("submitting search does not show AI suggestion labels", async ({
  page,
}) => {
  await gotoSearch(page);
  await page.getByLabel("Keyword").fill("QA");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("AI suggestion")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Couldn't understand that search" }),
  ).toHaveCount(0);
});

test("desktop layout has no horizontal overflow", async ({ page }) => {
  await gotoSearch(page);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Search" }).click();
  await expectNoHorizontalOverflow(page);
});
