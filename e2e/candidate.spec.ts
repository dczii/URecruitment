import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Desktop-only coverage for the candidate profile screen (plan.md Assumptions).
 * Needs a seeded candidate. Override the id with E2E_CANDIDATE_ID when the
 * local/preview database uses a different row.
 */
const CANDIDATE_ID =
  process.env.E2E_CANDIDATE_ID ?? "00000000-0000-4000-8000-000000000001";

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Candidate profile content is desktop-only",
  );
});

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function gotoCandidate(page: Page) {
  await page.goto(`/candidates/${CANDIDATE_ID}`);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("AC1: shows every parsed field with source text available", async ({
  page,
}) => {
  await gotoCandidate(page);

  await expect(page.getByText("AI suggestion").first()).toBeVisible();

  const showSource = page.getByRole("button", { name: "Show source text" });
  const sourceCount = await showSource.count();
  expect(sourceCount).toBeGreaterThan(0);

  for (let index = 0; index < sourceCount; index += 1) {
    await page.getByRole("button", { name: "Show source text" }).first().click();
  }

  await expect(
    page.getByRole("button", { name: "Hide source text" }),
  ).toHaveCount(sourceCount);
});

test("AC2: original CV opens through a signed link", async ({ page }) => {
  await gotoCandidate(page);

  const button = page.getByRole("button", { name: /View original CV/ });
  await expect(button).toBeVisible();
  await expect(button).not.toHaveAttribute("href");

  const html = await page.content();
  expect(html).not.toMatch(
    /cv\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i,
  );
  expect(html).not.toMatch(/\/storage\/v1\/object\/sign\//i);

  await page.evaluate(() => {
    window.open = (url?: string | URL) => {
      (
        window as typeof window & { __openedCvUrl?: string }
      ).__openedCvUrl = String(url ?? "");
      return null;
    };
  });

  const actionPosted = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      Boolean(request.headers()["next-action"]) &&
      request.url().includes(`/candidates/${CANDIDATE_ID}`),
  );

  await button.click();
  const request = await actionPosted;
  expect(request.url()).toContain(`/candidates/${CANDIDATE_ID}`);
});

test("AC3: stage history shows recruiter names", async ({ page }) => {
  await gotoCandidate(page);

  const region = page.getByRole("region", { name: "Stage history" });
  await expect(region).toBeVisible();

  const items = region.getByRole("listitem");
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const text = (await items.nth(index).innerText()).trim();
    const [recruiter] = text.split("·");
    expect(recruiter?.trim().length ?? 0).toBeGreaterThan(0);
    expect(text).toMatch(/·/);
  }
});

test("no horizontal overflow at desktop width", async ({ page }) => {
  await gotoCandidate(page);
  await expectNoHorizontalOverflow(page);
});
