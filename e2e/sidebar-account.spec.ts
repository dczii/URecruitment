import { expect, test } from "./auth-fixture";

test("sidebar account supports long names and menu/dialog keyboard focus", async ({ page }, info) => {
  await page.goto("/settings");
  if (info.project.name === "phone") await page.getByRole("button", { name: "Open navigation" }).click();
  const trigger = page.getByRole("button", { name: "Account: Add name" });
  await trigger.focus(); await page.keyboard.press("Enter");
  const add = page.getByRole("menuitem", { name: "Add name" });
  await add.focus(); await page.keyboard.press("Enter");
  const name = "虚构招聘顾问" + "FictionalRecruiter".repeat(10);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  const account = page.getByRole("button", { name: `Account: ${name}` });
  await expect(account).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await account.click(); await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(account).toBeFocused();
  await page.screenshot({ path: `test-results/sidebar-account-${info.project.name}.png` });
});

test("desktop collapse remains navigable and keyboard/reduced motion are instant", async ({ page }, info) => {
  await page.goto("/settings");
  if (info.project.name === "phone") {
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeHidden();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Account: Add name" })).toBeVisible();
    return;
  }
  const collapse = page.getByRole("button", { name: "Collapse sidebar" });
  await collapse.click();
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("link", { name: "Jobs", exact: true }).hover();
  await expect(page.getByRole("tooltip", { name: "Jobs" })).toBeVisible();
  await page.getByRole("link", { name: "Jobs", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/); await expect(expand).toBeVisible();
  await expand.focus(); await page.keyboard.press("Enter");
  expect(await page.locator("[data-shell-column]").evaluate(e => e.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" }); await collapse.click();
  expect(await page.locator("[data-shell-column]").evaluate(e => e.getAnimations().length)).toBe(0);
  expect(await page.locator(".sidebar-surface").evaluate(e => getComputedStyle(e).transitionDuration)).toBe("0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: /^(Expand|Collapse) sidebar$/ }).click();
  await expect(page.locator("[data-shell-column]")).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => page.locator(".sidebar-surface").evaluate(element => element.getAnimations().length)).toBe(0);
  const edge = await page.locator(".sidebar-surface").evaluate(element => ({ surface: element.getBoundingClientRect().right, sidebar: element.parentElement!.getBoundingClientRect().right }));
  expect(edge.surface).toBeCloseTo(edge.sidebar, 0);
  await page.screenshot({ path: "test-results/sidebar-compact.png" });
});

test("build footer follows content on short and long pages", async ({ page }) => {
  for (const route of ["/settings", "/dashboard"]) {
    await page.goto(route);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("v0.1.0 ·");
    await footer.scrollIntoViewIfNeeded(); await expect(footer).toBeVisible();
    const position = await footer.evaluate(e => ({ bottom: e.getBoundingClientRect().bottom, height: innerHeight, order: !!e.previousElementSibling?.matches("main") }));
    expect(position.order).toBe(true); expect(position.bottom).toBeLessThanOrEqual(position.height + 1);
  }
});

test("resizing an open account menu restores navigation access", async ({ page }, info) => {
  await page.goto("/settings");
  if (info.project.name === "phone") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Account: Add name" }).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  }
});

test("collapse animates only transforms without in-flight overflow", async ({ page }, info) => {
  await page.goto("/settings");
  if (info.project.name === "phone") return;
  const before = await page.getByRole("button", { name: "Collapse sidebar" }).boundingBox();
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  const sample = await page.locator("[data-shell-column]").evaluate(element => {
    const animation = element.getAnimations()[0];
    if (animation) { animation.pause(); animation.currentTime = 100; }
    return { frames: (animation?.effect as KeyframeEffect | null)?.getKeyframes() ?? [], overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(sample.frames.length).toBeGreaterThan(0);
  expect(sample.frames.every(frame => "transform" in frame && !("width" in frame))).toBe(true);
  expect(sample.overflow).toBe(false);
  await page.locator("[data-shell-column]").evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
  const after = await page.getByRole("button", { name: "Expand sidebar" }).boundingBox();
  expect(after?.x).toBe(before?.x); expect(after?.y).toBe(before?.y);
  await expect.poll(() => page.locator(".sidebar-surface").evaluate(element => element.getAnimations().length)).toBe(0);
  const edge = await page.locator(".sidebar-surface").evaluate(element => ({ surface: element.getBoundingClientRect().right, sidebar: element.parentElement!.getBoundingClientRect().right }));
  expect(edge.surface).toBeCloseTo(edge.sidebar, 0);
  await page.screenshot({ path: "test-results/sidebar-compact.png" });
});

test("short viewports keep navigation scrollable and account controls reachable", async ({ page }, info) => {
  await page.setViewportSize(info.project.name === "phone" ? { width: 390, height: 420 } : { width: 1440, height: 360 });
  await page.goto("/settings");
  if (info.project.name === "phone") await page.getByRole("button", { name: "Open navigation" }).click();
  const settings = page.getByRole("link", { name: "Settings", exact: true });
  await settings.scrollIntoViewIfNeeded(); await expect(settings).toBeVisible();
  const account = page.getByRole("button", { name: "Account: Add name" });
  await expect(account).toBeVisible(); await account.click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
