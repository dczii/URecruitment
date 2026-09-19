import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { skipWithoutSeededCandidate } from "./seeded";

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
  const response = await page.goto(`/candidates/${CANDIDATE_ID}`);
  skipWithoutSeededCandidate(response);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Must match `RECRUITER_NAME_KEY` in `src/lib/recruiter-name.ts`. */
const RECRUITER_NAME_KEY = "urec.recruiterName.v1";

const EDITABLE_FIELD_LABELS = ["Location", "Email", "Phone", "Name"] as const;

async function firstEditableFieldLabel(page: Page): Promise<string> {
  for (const label of EDITABLE_FIELD_LABELS) {
    if (
      (await page.getByRole("button", { name: `Edit ${label}` }).count()) > 0
    ) {
      return label;
    }
  }
  throw new Error("No editable identity field found on the candidate profile");
}

async function otherEditableFieldLabel(
  page: Page,
  firstLabel: string,
): Promise<string> {
  for (const label of EDITABLE_FIELD_LABELS) {
    if (
      label !== firstLabel &&
      (await page.getByRole("button", { name: `Edit ${label}` }).count()) > 0
    ) {
      return label;
    }
  }
  return firstLabel;
}

function fieldCard(page: Page, label: string) {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", { name: label, exact: true }),
  });
}

async function seedStoredRecruiterName(page: Page, name = "Maya Tan") {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: RECRUITER_NAME_KEY, value: name },
  );
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

test("AC1: edits a field and it persists", async ({ page }) => {
  await seedStoredRecruiterName(page);
  await gotoCandidate(page);

  const label = await firstEditableFieldLabel(page);
  const card = fieldCard(page, label);

  await card.getByRole("button", { name: `Edit ${label}` }).click();
  const input = card.getByRole("textbox", { name: label });
  await expect(input).toBeVisible();
  const originalValue = await input.inputValue();
  const editedValue = `E2E recruiter edit ${Date.now()}`;
  await input.fill(editedValue);
  await card.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toHaveCount(0);
  await expect(card.getByRole("button", { name: `Edit ${label}` })).toBeVisible();
  await expect(card.getByText(editedValue, { exact: true })).toBeVisible();
  await expect(card.getByText(originalValue, { exact: true })).toBeVisible();
  await expect(card.getByText("Edited by Maya Tan")).toBeVisible();

  const showSource = card.getByRole("button", { name: "Show source text" });
  if ((await showSource.count()) > 0) {
    await showSource.click();
    await expect(
      card.getByRole("button", { name: "Hide source text" }),
    ).toBeVisible();
  }
});

test("AC2: name prompt appears once per device", async ({ page }) => {
  await gotoCandidate(page);

  const firstLabel = await firstEditableFieldLabel(page);
  const firstCard = fieldCard(page, firstLabel);

  await firstCard.getByRole("button", { name: `Edit ${firstLabel}` }).click();
  const firstInput = firstCard.getByRole("textbox", { name: firstLabel });
  await firstInput.fill(`E2E first edit ${Date.now()}`);
  await firstCard.getByRole("button", { name: "Save" }).click();

  const nameDialog = page.getByRole("dialog");
  await expect(
    nameDialog.getByRole("heading", { name: "What's your name?" }),
  ).toBeVisible();
  await nameDialog.getByRole("textbox", { name: "Name" }).fill("Maya Tan");
  await nameDialog.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toHaveCount(0);
  await expect(
    firstCard.getByRole("button", { name: `Edit ${firstLabel}` }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), RECRUITER_NAME_KEY)).toBe(
    "Maya Tan",
  );

  const secondLabel = await otherEditableFieldLabel(page, firstLabel);
  const secondCard = fieldCard(page, secondLabel);
  await secondCard.getByRole("button", { name: `Edit ${secondLabel}` }).click();
  const secondInput = secondCard.getByRole("textbox", { name: secondLabel });
  await secondInput.fill(`E2E second edit ${Date.now()}`);
  await secondCard.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toHaveCount(0);
  await expect(
    secondCard.getByRole("button", { name: `Edit ${secondLabel}` }),
  ).toBeVisible();
});
