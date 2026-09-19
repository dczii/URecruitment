import { expect, test } from "@playwright/test";

import { countClientOptions, skipWithoutSeededClient } from "./seeded";

/**
 * Desktop-only coverage for the job creation form (plan.md Assumptions).
 * The accepted-save case needs a seeded client in `public.clients`.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Job form is desktop-only",
  );
});

test("refused save: unmarked requirements and empty nationality reason show the itemized banner", async ({
  page,
}) => {
  await page.goto("/jobs/new");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "Create job" }),
  ).toBeVisible();

  await page.getByLabel("Job title").fill("Senior Backend Engineer");
  await page.getByLabel("Owner name").fill("Maya Tan");

  skipWithoutSeededClient(await countClientOptions(page));
  await page.getByLabel("Client").selectOption({ index: 1 });

  await page.getByLabel("Requirement 1").fill("5+ years backend engineering");
  await page.getByRole("button", { name: "Add requirement" }).click();
  await page.getByLabel("Requirement 2").fill("Node.js and PostgreSQL");

  await page
    .getByRole("switch", {
      name: "Count nationality as a real requirement for this job",
    })
    .click();
  await expect(
    page.getByText(
      "Nationality will not count toward the score until this reason is filled in.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Save job" }).click();

  const banner = page.getByRole("alert");
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText(
    "2 requirement rows are missing a must-have/nice-to-have choice, and the nationality reason is empty.",
  );
  await expect(page).toHaveURL(/\/jobs\/new$/);
});

test("accepted save: a complete job redirects to the new job page", async ({
  page,
}) => {
  await page.goto("/jobs/new");
  await expect(page.locator("main#main-content")).toHaveCount(1);

  await page.getByLabel("Job title").fill("Senior Backend Engineer");
  await page.getByLabel("Owner name").fill("Maya Tan");

  skipWithoutSeededClient(await countClientOptions(page));
  await page.getByLabel("Client").selectOption({ index: 1 });

  await page.getByLabel("Requirement 1").fill("5+ years backend engineering");
  await page
    .getByRole("group", { name: "Marking for requirement 1" })
    .getByRole("button", { name: "Must-have" })
    .click();

  await page.getByRole("button", { name: "Add requirement" }).click();
  await page.getByLabel("Requirement 2").fill("AWS or GCP experience");
  await page
    .getByRole("group", { name: "Marking for requirement 2" })
    .getByRole("button", { name: "Nice-to-have" })
    .click();

  await page
    .getByRole("switch", {
      name: "Count nationality as a real requirement for this job",
    })
    .click();
  await page
    .getByLabel(
      "Required — write why nationality is a real requirement before it can count",
    )
    .fill(
      "The client's MAS-regulated desk requires Singapore citizenship for on-site access.",
    );

  await page.getByRole("button", { name: "Save job" }).click();

  await expect(page).toHaveURL(
    /\/jobs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});
