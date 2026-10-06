import { expect, test } from "./auth-fixture";
import { countClientOptions, selectFieldOption } from "./seeded";
import type { Page } from "@playwright/test";

async function expectPopupWithinViewport(page: Page) {
  const popup = page.locator('[data-slot="select-popup"]');
  await expect(popup).toBeVisible();
  const box = await popup.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(7);
  expect(box!.y).toBeGreaterThanOrEqual(7);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width - 7);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height - 7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("dashboard selections preserve unrelated parameters and restore history", async ({ page }) => {
  await page.goto("/dashboard?view=attention");
  const client = page.getByRole("combobox", { name: "Client", exact: true });
  await client.click();
  const option = page.getByRole("option", { name: "Fictional Agency", exact: true });
  await option.hover();
  await expect(page).toHaveURL(/view=attention$/);
  await option.click();
  await expect(page).toHaveURL(/view=attention&client=Fictional\+Agency$/);
  await expect(client).toContainText("Fictional Agency");
  await page.goBack();
  await expect(client).toHaveText("All");
  await page.goForward();
  await expect(client).toHaveText("Fictional Agency");
  await selectFieldOption(page, "Job", 1);
  await expect(page).toHaveURL(/job=/);
  await selectFieldOption(page, "Client", 0);
  await expect(page).not.toHaveURL(/client=/);
  await expect(page).toHaveURL(/job=/);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/dashboard\?view=attention$/);
});

test("keyboard navigation, typeahead, cancellation and Tab keep focus predictable", async ({ page }) => {
  await page.goto("/dashboard");
  const client = page.getByRole("combobox", { name: "Client", exact: true });
  await client.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option", { name: "All", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Fictional Agency" })).toBeFocused();
  await expect(page).not.toHaveURL(/client=/);
  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: "All", exact: true })).toBeFocused();
  await page.keyboard.type("Fictional");
  await expect(page.getByRole("option", { name: "Fictional Agency" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(client).toBeFocused();
  await expect(page).not.toHaveURL(/client=/);
  await page.keyboard.press("Space");
  await expect(page.getByRole("option", { name: "All", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Fictional Agency" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(client).toBeFocused();
  await expect(page).toHaveURL(/client=/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: "Fictional Agency" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(page.getByRole("combobox", { name: "Job", exact: true })).toBeFocused();
});

test("unavailable URL values remain visible and clearable", async ({ page }) => {
  await page.goto("/dashboard?client=Former&view=attention");
  const client = page.getByRole("combobox", { name: "Client", exact: true });
  await expect(client).toHaveText("Former (unavailable)");
  await client.click();
  await expect(page.getByRole("option", { name: "Former (unavailable)" })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("option", { name: "All", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?view=attention$/);
});

test("empty, duplicate and cleared clients preserve labels, IDs and validation", async ({ page, request }, info) => {
  await page.goto("/jobs/new");
  const client = page.getByRole("combobox", { name: "Client", exact: true });
  await expect(client).toBeDisabled();
  await expect(client).toHaveText("No clients available");
  expect(await countClientOptions(page)).toBe(1);
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle("dark", value), dark);
    await page.screenshot({ path: info.outputPath(`dropdown-${dark ? "dark" : "light"}-disabled.png`) });
  }
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await request.post("http://127.0.0.1:54329/test/dropdown-clients", { data: { mode: "duplicates" } });
  await page.reload();
  expect(await countClientOptions(page)).toBe(3);
  await page.getByLabel("Job title").fill("Fictional Engineer");
  await page.getByLabel("Owner name").fill("Fictional Recruiter");
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(client).toBeFocused();
  await expect(client).toHaveAccessibleDescription("Select a client.");
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle("dark", value), dark);
    await page.screenshot({ path: info.outputPath(`dropdown-${dark ? "dark" : "light"}-invalid.png`) });
  }
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await selectFieldOption(page, "Client", 2);
  await expect(page.locator('input[name="client_id"]')).toHaveValue("00000000-0000-4000-8000-000000000002");
  await selectFieldOption(page, "Client", 0);
  await expect(client).toHaveText("Select a client");
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(client).toBeFocused();
  await expect(page.getByLabel("Job title")).toHaveValue("Fictional Engineer");
});

for (const theme of ["light", "dark"]) {
  test(`${theme}: long labels and 100 choices stay readable and reachable`, async ({ page, request }, info) => {
    await request.post("http://127.0.0.1:54329/test/dropdown-clients", { data: { mode: "stress" } });
    await page.goto("/jobs/new");
    await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
    const client = page.getByRole("combobox", { name: "Client", exact: true });
    expect(await countClientOptions(page)).toBe(101);
    const activate = () => info.project.name === "phone" ? client.tap() : client.click();
    await activate();
    await expectPopupWithinViewport(page);
    const options = page.getByRole("listbox").getByRole("option");
    expect((await client.boundingBox())!.height).toBeGreaterThanOrEqual(info.project.name === "phone" ? 44 : 40);
    expect((await options.nth(1).boundingBox())!.height).toBeGreaterThanOrEqual(info.project.name === "phone" ? 44 : 40);
    await options.nth(100).scrollIntoViewIfNeeded();
    await options.nth(100).click();
    await expect(client).toContainText("Fictional 100");
    await page.screenshot({ path: info.outputPath(`dropdown-${theme}-closed.png`) });
    await activate();
    await expect(options.nth(100)).toHaveAttribute("aria-selected", "true");
    const contrast = await options.nth(100).evaluate((item) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      function luminance(color: string) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const channels = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => {
          const channel = v / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      }
      function ratio(a: string, b: string) {
        const x = luminance(a), y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      }
      const selected = getComputedStyle(item);
      const popup = getComputedStyle(item.closest('[data-slot="select-popup"]')!);
      const trigger = getComputedStyle(document.querySelector('[data-slot="select-trigger"]')!);
      return {
        selectedText: ratio(selected.color, selected.backgroundColor),
        normalText: ratio(popup.color, popup.backgroundColor),
        popupBorder: ratio(popup.borderTopColor, popup.backgroundColor),
        triggerBorder: ratio(trigger.borderTopColor, trigger.backgroundColor),
        focusRing: ratio(trigger.getPropertyValue("--ring"), trigger.backgroundColor),
      };
    });
    expect(contrast.selectedText).toBeGreaterThanOrEqual(4.5);
    expect(contrast.normalText).toBeGreaterThanOrEqual(4.5);
    expect(contrast.popupBorder).toBeGreaterThanOrEqual(3);
    expect(contrast.triggerBorder).toBeGreaterThanOrEqual(3);
    expect(contrast.focusRing).toBeGreaterThanOrEqual(3);
    await info.attach(`dropdown-${theme}-contrast`, { body: JSON.stringify(contrast), contentType: "application/json" });

    await page.screenshot({ path: info.outputPath(`dropdown-${theme}-open.png`) });
    await options.nth(100).focus();
    await page.keyboard.press("ArrowUp");
    await expect(options.nth(99)).toBeFocused();
    await expect(options.nth(100)).toHaveAttribute("aria-selected", "true");
    await expect(client).toContainText("Fictional 100");
    await page.screenshot({ path: info.outputPath(`dropdown-${theme}-highlight.png`) });
    await page.keyboard.press("Escape");
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await client.scrollIntoViewIfNeeded();
    await activate();
    await expectPopupWithinViewport(page);
    await options.nth(100).scrollIntoViewIfNeeded();
    await expect(options.nth(100)).toBeVisible();
    await page.screenshot({ path: info.outputPath(`dropdown-${theme}-enlarged.png`) });
  });
}

test("popup has no motion and stays within right-edge boundaries", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  const owner = page.getByRole("combobox", { name: "Owner", exact: true });
  await owner.click();
  await expectPopupWithinViewport(page);
  const styles = await page.locator('[data-slot="select-popup"]').evaluate((element) => {
    const css = getComputedStyle(element);
    return { transition: css.transitionDuration, animation: css.animationDuration, transform: css.transform };
  });
  expect(styles).toEqual({ transition: "0s", animation: "0s", transform: "none" });
});
