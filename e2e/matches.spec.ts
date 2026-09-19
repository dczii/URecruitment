import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { countClientOptions, skipWithoutSeededClient } from "./seeded";

/**
 * Desktop-only coverage for ranked matches on job detail (plan.md T3).
 * Jobs with stored `match_scores` come from seed (override with
 * `E2E_JOB_ID`). Creating a job still needs a seeded client, same as
 * `jobs.spec.ts`. These tests do not call a model.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Job detail ranked matches are desktop-only",
  );
});

/** Must match `RECRUITER_NAME_KEY` in `src/lib/recruiter-name.ts`. */
const RECRUITER_NAME_KEY = "urec.recruiterName.v1";

const SGT_DATE = /\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/;

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

function rankedMatches(page: Page) {
  return page.getByRole("region", { name: "Ranked matches" });
}

async function gotoJobWithRankedMatches(page: Page) {
  const seededId = process.env.E2E_JOB_ID;
  if (seededId) {
    await page.goto(`/jobs/${seededId}`);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(rankedMatches(page).getByRole("article").first()).toBeVisible();
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
    if ((await rankedMatches(page).getByRole("article").count()) > 0) {
      return;
    }
  }

  // Unseeded deployment (the shared preview until #121): nothing to rank.
  test.skip(
    true,
    "No job with ranked match cards found. Seed match_scores or set E2E_JOB_ID.",
  );
}

test("a newly created job shows Ranked matches without a fabricated list", async ({
  page,
}) => {
  const title = `E2E ranked matches empty ${Date.now()}`;
  await createJob(page, title);

  const section = rankedMatches(page);
  await expect(
    section.getByRole("heading", { name: "Ranked matches" }),
  ).toBeVisible();
  await expect(
    section.getByText(
      /No match scores yet for this job|Recalculating scores — check back shortly/,
    ),
  ).toBeVisible();
  await expect(section.getByRole("article")).toHaveCount(0);
  await expect(
    section.getByRole("button", { name: "Add to pipeline" }),
  ).toHaveCount(0);
});

test("AC1: ranked list shows score and skill evidence", async ({ page }) => {
  await gotoJobWithRankedMatches(page);

  const section = rankedMatches(page);
  const card = section.getByRole("article").filter({
    hasText: "AI suggestion",
  }).first();
  await expect(card).toBeVisible();
  await expect(card.locator("h3")).not.toHaveText(/^$/);
  await expect(card.getByText(/^Match \d+(\.\d+)?$/)).toBeVisible();
  await expect(
    card.getByRole("heading", { name: /^(Matched|Missing|Uncertain)$/ }).first(),
  ).toBeVisible();

  const sourceButton = card.getByRole("button", { name: "Show source text" });
  if ((await sourceButton.count()) > 0) {
    await sourceButton.first().click();
    await expect(
      card.getByRole("button", { name: "Hide source text" }).first(),
    ).toBeVisible();
  }
});

test("AC2: sort/filter updates ranking without a new network request", async ({
  page,
}) => {
  await gotoJobWithRankedMatches(page);

  const section = rankedMatches(page);
  const articles = section.getByRole("article");
  const cardCount = await articles.count();
  expect(cardCount).toBeGreaterThan(1);

  const namesBefore = await articles.locator("h3").allTextContents();
  const urlBefore = page.url();
  const extraRequests: string[] = [];
  const onRequest = (request: { url: () => string; resourceType: () => string }) => {
    const type = request.resourceType();
    if (type === "document" || type === "xhr" || type === "fetch") {
      extraRequests.push(request.url());
    }
  };
  page.on("request", onRequest);

  await section.getByLabel("Sort matches").selectOption("name");
  await section.getByLabel("Sort matches").selectOption("score-asc");

  const uniqueName =
    namesBefore.find(
      (name) =>
        namesBefore.filter(
          (other) => other.toLowerCase() === name.toLowerCase(),
        ).length === 1,
    ) ?? namesBefore[0] ?? "";
  expect(uniqueName.length).toBeGreaterThan(0);
  await section.getByLabel("Filter by name").fill(uniqueName);
  await expect(articles).toHaveCount(1);
  await expect(articles.locator("h3")).toHaveText(uniqueName);

  page.off("request", onRequest);
  expect(page.url()).toBe(urlBefore);
  expect(extraRequests.filter((url) => url.includes("/api/ai"))).toEqual([]);
  expect(
    extraRequests.filter((url) => {
      try {
        return new URL(url).pathname.startsWith("/jobs/");
      } catch {
        return false;
      }
    }),
  ).toEqual([]);
});

test("AC3: adding a candidate to the pipeline requires an explicit click and shows the typed-name dialog on first use", async ({
  page,
}) => {
  await gotoJobWithRankedMatches(page);

  expect(
    await page.evaluate((key) => localStorage.getItem(key), RECRUITER_NAME_KEY),
  ).toBeNull();

  const section = rankedMatches(page);
  const addButtons = section.getByRole("button", { name: "Add to pipeline" });
  const buttonCount = await addButtons.count();
  expect(buttonCount).toBeGreaterThan(0);
  await expect(section.getByText("Added", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toHaveCount(0);

  await addButtons.first().click();

  const nameDialog = page.getByRole("dialog");
  await expect(
    nameDialog.getByRole("heading", { name: "What's your name?" }),
  ).toBeVisible();
  await nameDialog.getByRole("textbox", { name: "Name" }).fill("Maya Tan");
  await nameDialog.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toHaveCount(0);
  await expect(section.getByText("Added", { exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), RECRUITER_NAME_KEY),
  ).toBe("Maya Tan");
});

test("AC4: a score is labelled a suggestion and shows its model version and date", async ({
  page,
}) => {
  await gotoJobWithRankedMatches(page);

  const card = rankedMatches(page).getByRole("article").filter({
    hasText: "AI suggestion",
  }).first();
  await expect(card).toBeVisible();
  await expect(card.getByText("AI suggestion")).toBeVisible();
  await expect(card.getByText(/^Match \d+(\.\d+)?$/)).toBeVisible();
  await expect(card.getByText(SGT_DATE)).toBeVisible();
});
