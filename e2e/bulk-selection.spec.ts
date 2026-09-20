import { expect, test } from "@playwright/test";

/**
 * Dashboard multi-select: tick several candidates, read what a bulk move would
 * do, and stop at the typed-name prompt.
 *
 * These tests deliberately never confirm. Confirming writes one `stage_events`
 * row per selected candidate and advances real rows in the shared Supabase
 * project, which is not idempotent — a second run would push the same people
 * further along the pipeline. Everything up to the confirmation boundary is
 * covered here; the write path itself is covered by unit tests
 * (`src/server/pipeline/move-many.test.ts`).
 *
 * Desktop only, matching the rest of the dashboard coverage
 * (design/specs/dashboard.md).
 */
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === "phone",
    "Dashboard is desktop-only per design/specs/dashboard.md",
  );
});

/** The pane is always present; it is the tables that may be empty. */
test("AC1: the selection pane explains itself before anything is ticked", async ({
  page,
}) => {
  await page.goto("/dashboard");

  const pane = page.getByRole("complementary", { name: "Selection" });
  await expect(pane).toBeVisible();
  await expect(pane.getByText("Nothing selected")).toBeVisible();
});

test("AC2: ticking candidates names every stage they would move to", async ({
  page,
}) => {
  await page.goto("/dashboard");

  const checkboxes = page.getByRole("checkbox");
  const count = await checkboxes.count();
  test.skip(
    count === 0,
    "No overdue or due-soon candidates on this deployment — nothing to select (#121)",
  );

  const pane = page.getByRole("complementary", { name: "Selection" });
  await checkboxes.first().check();
  await expect(pane.getByText("1 candidate selected")).toBeVisible();

  // Every selected row is accounted for: each line is either a move to a named
  // stage or a stated reason it cannot move.
  const lines = pane.getByRole("listitem");
  await expect(lines).toHaveCount(1);
  await expect(lines.first()).toHaveText(/^1\s(to\s\S|cannot move)/);

  if (count > 1) {
    await checkboxes.nth(1).check();
    await expect(pane.getByText("2 selected")).toBeVisible();
    const totals = await pane
      .getByRole("listitem")
      .evaluateAll((items) =>
        items
          .map((item) => Number.parseInt(item.textContent ?? "0", 10))
          .reduce((sum, n) => sum + n, 0),
      );
    expect(totals).toBe(2);
  }
});

test("AC3: moving a selection asks for a name and writes nothing until confirmed", async ({
  page,
}) => {
  await page.goto("/dashboard");

  const checkboxes = page.getByRole("checkbox");
  test.skip(
    (await checkboxes.count()) === 0,
    "No overdue or due-soon candidates on this deployment — nothing to select (#121)",
  );

  const pane = page.getByRole("complementary", { name: "Selection" });
  await checkboxes.first().check();

  const move = pane.getByRole("button", { name: "Move each to next stage" });
  await expect(move).toBeEnabled();
  await move.click();

  // First use on this device: the typed name is required before any write.
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "What's your name?" }),
  ).toBeVisible();

  // Leave without confirming — the selection survives and nothing was recorded.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(pane.getByText("1 candidate selected")).toBeVisible();
});

test("AC4: clearing the selection empties the pane", async ({ page }) => {
  await page.goto("/dashboard");

  const checkboxes = page.getByRole("checkbox");
  test.skip(
    (await checkboxes.count()) === 0,
    "No overdue or due-soon candidates on this deployment — nothing to select (#121)",
  );

  const pane = page.getByRole("complementary", { name: "Selection" });
  await checkboxes.first().check();
  await pane.getByRole("button", { name: "Clear selection" }).click();

  await expect(pane.getByText("Nothing selected")).toBeVisible();
  await expect(checkboxes.first()).not.toBeChecked();
});
