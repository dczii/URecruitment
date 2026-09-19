import { expect, test, type Page } from "@playwright/test";

import { countClientOptions, skipWithoutSeededClient } from "./seeded";

/**
 * Desktop-only coverage for job-scoped search (plan.md T2, Story #54).
 * Entering search from a job filters the talent database for that job.
 * Creating a job still needs a seeded client, same as `jobs.spec.ts`.
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

  await page.getByLabel("Requirement 1", { exact: true }).fill("5+ years backend engineering");
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

test("clicking Search for more candidates from job detail opens job-scoped search", async ({
  page,
}) => {
  const title = `E2E job-scoped search ${Date.now()}`;
  await createJob(page, title);

  const jobId = jobIdFromUrl(page.url());
  await page.getByRole("link", { name: "Search for more candidates" }).click();

  await expect(page).toHaveURL(new RegExp(`/search\\?jobId=${jobId}$`, "i"));
  await expect(
    page.getByRole("heading", { level: 1, name: "Find candidates" }),
  ).toBeVisible();
  await expect(page.getByLabel("Keyword")).toHaveCount(0);
  await expect(page.getByLabel("Skills")).toBeVisible();
  await expect(page.getByLabel("Minimum years")).toBeVisible();
  await expect(page.getByLabel("Maximum years")).toBeVisible();
  await expect(page.getByLabel("Location")).toBeVisible();
  await expect(page.getByLabel("Language")).toBeVisible();
  await expect(page.getByLabel("CV updated after")).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Back to ${title}` }),
  ).toBeVisible();
  await expect(page.getByText("AI suggestion")).toHaveCount(0);
  await expect(page.getByText("Ranked matches")).toHaveCount(0);
});
