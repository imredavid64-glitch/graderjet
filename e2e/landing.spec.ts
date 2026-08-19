import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders brand and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=GraderJet").first()).toBeVisible();
    await expect(page.locator("text=Start grading").first()).toBeVisible();
    await expect(page.locator("text=Try the sample").first()).toBeVisible();
  });

  test("'Start grading' navigates to /setup", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Start grading").first().click();
    await expect(page).toHaveURL(/\/setup/);
  });

  test("'Try the sample' navigates to /workspace", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Try the sample").first().click();
    await expect(page).toHaveURL(/\/workspace/);
  });
});
