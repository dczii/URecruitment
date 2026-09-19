import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { countClientOptions, skipWithoutSeededClient } from "./seeded";

/**
 * Desktop-only coverage for the jobs list and job detail screens
 * (plan.md Assumptions). Creating a job needs a seeded client in
 * `public.clients`, same as `job-form.spec.ts`.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Jobs list and job detail are desktop-only",
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

  await page.getByRole("button", { name: "Add requirement" }).click();
  await page.getByLabel("Requirement 2", { exact: true }).fill("AWS or GCP experience");
  await page
    .getByRole("group", { name: "Marking for requirement 2" })
    .getByRole("button", { name: "Nice-to-have" })
    .click();

  await page.getByRole("button", { name: "Save job" }).click();

  await expect(page).toHaveURL(
    /\/jobs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
}

test("AC4: jobs list shows status, owner, flag count, candidate count", async ({
  page,
}) => {
  const title = `E2E jobs list ${Date.now()}`;
  await createJob(page, title);

  await page.goto("/jobs");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "Browse jobs" }),
  ).toBeVisible();

  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    await expect(row.getByText(/^(Open|On hold)$/)).toBeVisible();
    await expect(row.getByText(/\d+ open flags?$/)).toBeVisible();
    await expect(row.getByText(/\d+ candidates? in pipeline$/)).toBeVisible();
    const cells = row.getByRole("cell");
    await expect(cells.nth(2)).not.toHaveText(/^$/);
  }

  const created = page.getByRole("row", { name: new RegExp(title) });
  await expect(created.getByText("Open", { exact: true })).toBeVisible();
  await expect(created.getByText("Maya Tan", { exact: true })).toBeVisible();
  await expect(created.getByText("0 open flags")).toBeVisible();
  await expect(created.getByText("0 candidates in pipeline")).toBeVisible();
});

test("job detail names its version and shows requirements tagged must-have/nice-to-have", async ({
  page,
}) => {
  const title = `E2E job detail ${Date.now()}`;
  await createJob(page, title);

  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText(/^Showing the version saved on /)).toBeVisible();

  const requirements = page.getByRole("region", { name: "Requirements" });
  await expect(requirements).toBeVisible();
  await expect(
    requirements.getByText("Must-have", { exact: true }),
  ).toBeVisible();
  await expect(
    requirements.getByText("Nice-to-have", { exact: true }),
  ).toBeVisible();
  await expect(
    requirements.getByText("5+ years backend engineering"),
  ).toBeVisible();
  await expect(requirements.getByText("AWS or GCP experience")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Open gap flags" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ranked matches" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pipeline board" }),
  ).toBeVisible();
  await expect(page.getByText("Coming in a later phase.").first()).toBeVisible();
});
