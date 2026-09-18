import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const destinations = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Jobs", path: "/jobs" },
  { name: "Candidates", path: "/search" },
  { name: "Placements", path: "/placements" },
  { name: "Settings", path: "/settings" },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("AC1: navigation reaches every primary destination in one click", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard");

  for (const destination of destinations) {
    if (testInfo.project.name === "phone") {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }

    const link = page.getByRole("link", { name: destination.name, exact: true });
    await expect(link).toHaveAttribute("href", destination.path);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${destination.path}$`));
  }
});

test("AC2: phone sheet restores focus and routes never overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard");

  if (testInfo.project.name === "phone") {
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();

    const sheet = page.getByRole("dialog", { name: "Navigation" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link")).toHaveCount(destinations.length);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  }

  for (const destination of destinations) {
    await page.goto(destination.path);
    await expectNoHorizontalOverflow(page);
  }
});

test("AC3: keyboard reaches skip link and navigation with visible focus", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  if (testInfo.project.name === "phone") {
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    return;
  }

  await page.keyboard.press("Shift+Tab");
  const dashboardLink = page.getByRole("link", {
    name: "Dashboard",
    exact: true,
  });
  await expect(dashboardLink).toBeFocused();

  const focusStyle = await dashboardLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return { boxShadow: style.boxShadow, outlineStyle: style.outlineStyle };
  });
  expect(
    focusStyle.outlineStyle !== "none" || focusStyle.boxShadow !== "none",
  ).toBe(true);

  for (const destination of destinations.slice(1)) {
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: destination.name, exact: true }),
    ).toBeFocused();
  }
});

test("AC4: shell renders page context, main region, title, and recruiter name", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page.getByLabel("Current page")).toHaveText("Dashboard");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "What needs attention today" }),
  ).toBeVisible();
  await expect(page.getByText("Recording as Maya Tan")).toBeVisible();
});
