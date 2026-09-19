import { expect, test, type Page } from "@playwright/test";

import { countClientOptions, skipWithoutSeededClient } from "./seeded";

/**
 * Desktop-only coverage for job-scoped search (plan.md T2, Story #54).
 * Entering search from a job ranks by that job's stored match score and
 * never calls `/api/ai/search`. Creating a job still needs a seeded
 * client, same as `jobs.spec.ts` / `matches.spec.ts`.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Job-scoped search is desktop-only",
  );
});

async function createJob(page: Page, title: string) {
  await page.goto("/jobs/new");
  await expect(page.locator("main#main-content")).toHaveCount(1);

  await page.getByLabel("Job title").fill(title);
  await page.getByLabel("Owner name").fill("Maya Tan");

  skipWithoutSeededClient(await countClientOptions(page));
  await page.getByLabel("Client").selectOption({ index: 1 });

  await page.getByLabel("Requirement 1").fill("5+ years backend engineering");
  await page
    .getByRole("group", { name: "Marking for requirement 1" })
    .getByRole("button", { name: "Must-have" })
    .click();

  await page.getByRole("button", { name: "Save job" }).click();

  await expect(page).toHaveURL(
    /\/jobs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
}

function jobIdFromUrl(url: string): string {
  const match = url.match(
    /\/jobs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  if (!match?.[1]) {
    throw new Error(`Expected a job-detail URL, got ${url}`);
  }
  return match[1];
}

function collectAiSearchRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    try {
      if (new URL(request.url()).pathname === "/api/ai/search") {
        urls.push(request.url());
      }
    } catch {
      // Ignore malformed request URLs.
    }
  });
  return urls;
}

function jobScopedResults(page: Page) {
  return page.getByRole("region", { name: "Ranked matches" });
}

async function gotoJobWithRankedMatches(page: Page) {
  const seededId = process.env.E2E_JOB_ID;
  if (seededId) {
    await page.goto(`/jobs/${seededId}`);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(
      page.getByRole("region", { name: "Ranked matches" }).getByRole("article").first(),
    ).toBeVisible();
    return;
  }

  await page.goto("/jobs");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  const links = page.locator("tbody th a");
  const count = await links.count();
  const hrefs: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const href = await links.nth(index).getAttribute("href");
    if (href) {
      hrefs.push(href);
    }
  }

  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    if (
      (await page
        .getByRole("region", { name: "Ranked matches" })
        .getByRole("article")
        .count()) > 0
    ) {
      return;
    }
  }

  // Unseeded deployment (the shared preview until #121): nothing to rank.
  test.skip(
    true,
    "No job with ranked match cards found. Seed match_scores or set E2E_JOB_ID.",
  );
}

test("clicking Search for more candidates from job detail opens job-scoped search", async ({
  page,
}) => {
  const aiSearchUrls = collectAiSearchRequests(page);
  const title = `E2E job-scoped search ${Date.now()}`;
  await createJob(page, title);

  const jobId = jobIdFromUrl(page.url());
  await page.getByRole("link", { name: "Search for more candidates" }).click();

  await expect(page).toHaveURL(new RegExp(`/search\\?jobId=${jobId}$`, "i"));
  await expect(
    page.getByRole("heading", { level: 1, name: "Find candidates" }),
  ).toBeVisible();
  await expect(page.getByLabel("Search candidates")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Search", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Skills")).toBeVisible();
  await expect(page.getByLabel("Minimum years")).toBeVisible();
  await expect(page.getByLabel("Maximum years")).toBeVisible();
  await expect(page.getByLabel("Location")).toBeVisible();
  await expect(page.getByLabel("Language")).toBeVisible();
  await expect(page.getByLabel("CV updated after")).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Back to ${title}` }),
  ).toBeVisible();
  expect(aiSearchUrls).toEqual([]);
});

test("an unscored candidate shows Not yet scored, never 0", async ({ page }) => {
  const aiSearchUrls = collectAiSearchRequests(page);
  const title = `E2E job-scoped unscored ${Date.now()}`;
  await createJob(page, title);
  await page.getByRole("link", { name: "Search for more candidates" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Find candidates" }),
  ).toBeVisible();

  const section = jobScopedResults(page);
  const empty = page.getByRole("heading", {
    name: "No candidates match these filters yet.",
  });
  const notReady = page.getByText(
    "This job has no saved version yet, so there is nothing to rank by.",
  );

  const articleCount = await section.getByRole("article").count();
  if (articleCount > 0) {
    const cards = section.getByRole("article");
    await expect(cards.first()).toBeVisible();
    await expect(cards.getByText("Not yet scored", { exact: true })).toHaveCount(
      articleCount,
    );
    await expect(cards.getByText(/^Match /)).toHaveCount(0);
    await expect(page.getByText("Match 0", { exact: true })).toHaveCount(0);
  } else {
    await expect(empty.or(notReady)).toBeVisible();
    await expect(page.getByText("Match 0", { exact: true })).toHaveCount(0);
  }

  expect(aiSearchUrls).toEqual([]);
});

test("job-scoped results stay score-ordered with the same evidence as the ranked list", async ({
  page,
}) => {
  const aiSearchUrls = collectAiSearchRequests(page);
  await gotoJobWithRankedMatches(page);
  await page.getByRole("link", { name: "Search for more candidates" }).click();

  await expect(page).toHaveURL(/\/search\?jobId=/i);
  await expect(page.getByLabel("Search candidates")).toHaveCount(0);

  const section = jobScopedResults(page);
  const cards = section.getByRole("article");
  await expect(cards.first()).toBeVisible();

  const scoreTexts = await cards.getByText(/^Match /).allTextContents();
  const scores = scoreTexts.map((text) => Number(text.replace(/^Match /, "")));
  expect(scores.length).toBeGreaterThan(0);
  expect(scores.every((score) => Number.isFinite(score))).toBe(true);
  expect([...scores].sort((a, b) => b - a)).toEqual(scores);

  const firstScored = cards.filter({ hasText: "AI suggestion" }).first();
  await expect(
    firstScored.getByRole("heading", { name: /^(Matched|Missing|Uncertain)$/ }).first(),
  ).toBeVisible();
  expect(aiSearchUrls).toEqual([]);
});
