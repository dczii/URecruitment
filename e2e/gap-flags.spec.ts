import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { countClientOptions, skipWithoutSeededClient } from "./seeded";

/**
 * Desktop-only coverage for the job-detail gap-flag checklist
 * (plan.md Assumptions / T2). Creating a job needs a seeded client in
 * `public.clients`, same as `jobs.spec.ts`. Saving a job runs the gap
 * check, which raises missing-field flags for fields the form does not
 * collect.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Job detail gap-flag checklist is desktop-only",
  );
});

/** Must match `RECRUITER_NAME_KEY` in `src/lib/recruiter-name.ts`. */
const RECRUITER_NAME_KEY = "urec.recruiterName.v1";

const SALARY_QUESTION = "What is the salary range for this role?";
const SALARY_REASON = /Without a salary range/;

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

function gapFlagChecklist(page: Page) {
  return page.getByRole("region", { name: "Open gap flags" });
}

function salaryFlagRow(page: Page) {
  return gapFlagChecklist(page).getByRole("listitem").filter({
    hasText: SALARY_QUESTION,
  });
}

test("AC2: banner shows open flag count", async ({ page }) => {
  const title = `E2E gap flags banner ${Date.now()}`;
  await createJob(page, title);

  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(
    page.getByText(
      /\d+ open gap flags? needs? a recruiter answer/,
    ),
  ).toBeVisible();
});

test("a flag shows its evidence and client-facing question", async ({
  page,
}) => {
  const title = `E2E gap flags evidence ${Date.now()}`;
  await createJob(page, title);

  const checklist = gapFlagChecklist(page);
  await expect(
    checklist.getByRole("heading", { name: "Open gap flags" }),
  ).toBeVisible();
  await expect(
    checklist.getByRole("heading", { name: "Missing" }),
  ).toBeVisible();

  const row = salaryFlagRow(page);
  await expect(row).toBeVisible();
  await expect(row.getByText(SALARY_REASON)).toBeVisible();
  await expect(
    row.getByText(`Ask the client: "${SALARY_QUESTION}"`),
  ).toBeVisible();
  await expect(row.getByRole("button", { name: "Resolve" })).toBeVisible();
  await expect(row.getByRole("button", { name: "Dismiss" })).toBeVisible();
});

test("resolving requires a note and shows the name dialog on first use", async ({
  page,
}) => {
  const title = `E2E gap flags resolve ${Date.now()}`;
  await createJob(page, title);

  expect(
    await page.evaluate((key) => localStorage.getItem(key), RECRUITER_NAME_KEY),
  ).toBeNull();

  const row = salaryFlagRow(page);
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Resolve" }).click();

  const confirm = row.getByRole("button", { name: "Confirm resolve" });
  await expect(confirm).toBeVisible();
  await confirm.click();

  await expect(row.getByRole("alert")).toHaveText("A short note is required.");
  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toHaveCount(0);

  await row.getByLabel("Note").fill("Called the client; salary is 8-10k.");
  await confirm.click();

  const nameDialog = page.getByRole("dialog");
  await expect(
    nameDialog.getByRole("heading", { name: "What's your name?" }),
  ).toBeVisible();
  await nameDialog.getByRole("textbox", { name: "Name" }).fill("Maya Tan");
  await nameDialog.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toHaveCount(0);
  await expect(salaryFlagRow(page)).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), RECRUITER_NAME_KEY),
  ).toBe("Maya Tan");
});
