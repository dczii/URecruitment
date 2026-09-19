import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Desktop-only coverage for the placements screen (design/specs/placements.md:
 * "Desktop only (1440 px) — no phone frame"; plan.md docs/tasks/163-guarantee-flag).
 *
 * There is no UI path yet to move a candidate into Placed (the pipeline
 * board, #160, is a separate task), so this only covers what's reachable
 * without seeded pipeline data: the page loads, renders its heading, and
 * has no horizontal overflow at desktop width — both in the empty state
 * (the common case until #160 ships) and once it does. Interactive
 * coverage (confirming a start date, seeing the guarantee countdown and
 * flag) is a follow-up once #160 gives a way to reach Placed through the UI.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Placements is desktop-only per design/specs/placements.md",
  );
});

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("AC1: the placements screen loads and reads as good news when empty", async ({
  page,
}) => {
  await page.goto("/placements");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Follow up after placement" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
