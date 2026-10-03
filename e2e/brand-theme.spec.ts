import { expect, test } from "./auth-fixture";

test("logo-based light theme is the default with readable navigation", async ({ page }) => {
  const response = await page.goto("/settings");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Adjust portal rules" })).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const logo = page.locator('img[alt="USER Experience Researchers"]:visible').first();
  await expect(logo).toBeVisible();
  await expect(logo.locator("..")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  const phone = (page.viewportSize()?.width ?? 1440) < 1024;
  if (phone) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  }
  const selected = page.locator('a[aria-current="page"]:visible');
  await expect(selected).toHaveCSS("color", "rgb(190, 32, 38)");
  if (phone) {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open navigation" }).tap();
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
    await expect(selected).toHaveCSS("color", "rgb(190, 32, 38)");
    await page.getByRole("button", { name: "Close navigation" }).tap();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const dark of [false, true]) {
  test(`${dark ? "dark" : "light"} theme preserves logo and primary-action contrast through hover`, async ({ page }) => {
    await page.goto("/settings");
    if (dark) await page.evaluate(() => document.documentElement.classList.add("dark"));
    const logo = page.locator('img[alt="USER Experience Researchers"]:visible').first();
    await expect(logo.locator("..")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.getByRole("button", { name: "Add name", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Fictional Recruiter");
    const button = page.getByRole("button", { name: "Continue", exact: true });
    await expect(button).toBeEnabled();
    for (const hover of [false, true]) {
      if (hover) await button.hover();
      await expect(async () => {
        const ratio = await button.evaluate((element) => {
          const style = getComputedStyle(element);
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const context = canvas.getContext("2d")!;
          function luminance(color: string) {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const pixel = context.getImageData(0, 0, 1, 1).data;
            const channels = [pixel[0], pixel[1], pixel[2]].map((channel) => {
              const value = channel / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          }
          const values = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => a - b);
          return (values[1] + 0.05) / (values[0] + 0.05);
        });
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }).toPass();
    }
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
