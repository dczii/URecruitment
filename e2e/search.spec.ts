import { expect, test, type Page } from "@playwright/test";

/**
 * Desktop-only coverage for candidate search (plan.md T2, Story #53).
 * Search is intercepted — these tests never call a model or `search_candidates`.
 * Loading `/search` still needs a reachable app, same constraint as other
 * screen specs.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Candidate search is desktop-only",
  );
});

const SEARCH_QUERY =
  "young ZH-speaking QA engineers in Singapore, 3+ years, CV updated this year";

const CANDIDATE_ID = "00000000-0000-4000-8000-000000000701";
const CV_UPDATED_AT = "2026-06-19T00:00:00.000Z";

const OK_WITH_FILTERS_AND_HIT = {
  status: "ok" as const,
  filters: {
    skills: ["QA"],
    minYears: 3,
    maxYears: null,
    locations: ["Singapore"],
    languages: ["ZH"],
    cvUpdatedAfter: "2026-01-01",
  },
  ignoredTerms: [
    {
      term: "young",
      reason:
        "age is a protected attribute and is never used as a search filter",
    },
  ],
  results: [
    {
      candidateId: CANDIDATE_ID,
      fullName: "Alex Tan",
      headline: "QA Engineer",
      totalYears: 4,
      location: "Singapore",
      languages: ["English", "ZH"],
      cvUpdatedAt: CV_UPDATED_AT,
    },
  ],
};

async function mockSearch(page: Page, body: unknown) {
  await page.route("**/api/ai/search", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: body,
    });
  });
}

async function gotoSearch(page: Page) {
  await page.goto("/search");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "Find candidates" }),
  ).toBeVisible();
}

async function submitSearch(page: Page, query = SEARCH_QUERY) {
  await page.getByLabel("Search candidates").fill(query);
  await page.getByRole("button", { name: "Search" }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("AC1: five filters narrow results — chips reflect parsed skill, years, location, language, and CV date", async ({
  page,
}) => {
  await mockSearch(page, OK_WITH_FILTERS_AND_HIT);
  await gotoSearch(page);

  const chips = page.getByRole("list", { name: "Search filters" });
  await expect(chips.getByText("Skills", { exact: true })).toBeVisible();
  await expect(chips.getByText("Years", { exact: true })).toBeVisible();
  await expect(chips.getByText("Location", { exact: true })).toBeVisible();
  await expect(chips.getByText("Language", { exact: true })).toBeVisible();
  await expect(chips.getByText("CV date", { exact: true })).toBeVisible();

  await submitSearch(page);

  await expect(chips.getByText("Skills: QA")).toBeVisible();
  await expect(chips.getByText("Years: 3+")).toBeVisible();
  await expect(chips.getByText("Location: Singapore")).toBeVisible();
  await expect(chips.getByText("Language: ZH")).toBeVisible();
  await expect(chips.getByText("CV date: since 1 Jan 2026")).toBeVisible();
  const ignored = page.getByRole("status").filter({ hasText: /^Ignored:/ });
  await expect(ignored).toContainText("young");
  await expect(page.getByText("AI suggestion")).toBeVisible();
});

test("AC2: every result shows its CV last-updated date (relative and exact)", async ({
  page,
}) => {
  await mockSearch(page, OK_WITH_FILTERS_AND_HIT);
  await gotoSearch(page);
  await submitSearch(page);

  const row = page.getByRole("row", { name: /Alex Tan/ });
  await expect(row.getByRole("link", { name: "Alex Tan" })).toBeVisible();
  await expect(row.getByText("QA Engineer · 4 years · Singapore")).toBeVisible();
  await expect(row.getByText(/^Updated /)).toBeVisible();
  await expect(row.getByText("19 Jun 2026")).toBeVisible();
  await expect(row.locator("time")).toHaveAttribute("datetime", CV_UPDATED_AT);
  await expect(row.locator("time")).toHaveAttribute("title", "19 Jun 2026");
});

test("couldn't understand is distinct from zero results", async ({ page }) => {
  await mockSearch(page, { status: "could_not_understand" });
  await gotoSearch(page);
  await submitSearch(page);

  const alert = page.getByRole("alert");
  await expect(
    alert.getByRole("heading", { name: "Couldn't understand that search" }),
  ).toBeVisible();
  await expect(alert.getByText(/try rephrasing/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No candidates match these filters yet." }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Search failed. Try again." }),
  ).toHaveCount(0);
});

test("AC3: desktop layout has no horizontal overflow", async ({ page }) => {
  await mockSearch(page, OK_WITH_FILTERS_AND_HIT);
  await gotoSearch(page);
  await expectNoHorizontalOverflow(page);

  await submitSearch(page);
  await expect(page.getByRole("link", { name: "Alex Tan" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
