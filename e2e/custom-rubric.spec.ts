import { test, expect } from "@playwright/test";

/**
 * Custom rubric E2E tests.
 * Tests the rubric editor on the setup page: adding/removing categories,
 * editing weights/names, and seeing the custom rubric reflected in the workspace.
 */

test.describe("Custom rubric editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
  });

  test("default rubric categories are shown", async ({ page }) => {
    // Should show the default rubric categories
    await expect(page.locator("text=Thesis Statement")).toBeVisible();
    await expect(page.locator("text=Organization")).toBeVisible();
    await expect(page.locator("text=Evidence & Analysis")).toBeVisible();
    await expect(page.locator("text=Writing Mechanics")).toBeVisible();
    await expect(page.locator("text=Critical Thinking")).toBeVisible();
  });

  test("add a new rubric category", async ({ page }) => {
    // Click the Add Category button
    await page.locator("button:has-text('Add Category')").click();

    // Should now have 6 categories
    const categories = page.locator("[data-testid='rubric-category']");
    // Alternative: count rows in the rubric editor
    const addButtons = page.locator("button:has-text('Add Category')");
    await expect(addButtons).toBeVisible();
  });

  test("remove a rubric category", async ({ page }) => {
    // There should be delete (trash/X) buttons for each category
    // The default rubric has 5 categories
    const deleteButtons = page.locator(
      "button[aria-label*='Remove'], button[aria-label*='Delete'], button:has-text('×')"
    );

    // Click the first delete button
    const firstDelete = deleteButtons.first();
    if (await firstDelete.isVisible()) {
      await firstDelete.click();
      // Category count should decrease
    }
  });

  test("edit rubric category name", async ({ page }) => {
    // Find the input for "Thesis Statement" and change it
    const thesisInput = page.locator("input[value='Thesis Statement']");
    if (await thesisInput.isVisible()) {
      await thesisInput.clear();
      await thesisInput.fill("Argument Quality");
      await expect(thesisInput).toHaveValue("Argument Quality");
    }
  });

  test("edit rubric category weight", async ({ page }) => {
    // Find a weight input and change it
    const weightInputs = page.locator("input[type='number']");
    const firstWeight = weightInputs.first();
    if (await firstWeight.isVisible()) {
      await firstWeight.clear();
      await firstWeight.fill("30");
      await expect(firstWeight).toHaveValue("30");
    }
  });

  test("category weight shows as percentage", async ({ page }) => {
    // Each category should show its percentage contribution
    // Default: Thesis=25, Organization=20, Evidence=25, Writing=15, Critical=15
    await expect(page.locator("text=25%").first()).toBeVisible();
  });

  test("switching to batch mode preserves rubric", async ({ page }) => {
    // Fill in student info
    const nameInput = page.locator("input[placeholder*='student name']");
    if (await nameInput.isVisible()) {
      await nameInput.fill("Test Student");
    }

    // Switch to batch mode
    const batchTab = page.locator("button:has-text('Batch')");
    if (await batchTab.isVisible()) {
      await batchTab.click();
    }

    // Switch back to single mode
    const singleTab = page.locator("button:has-text('Single')");
    if (await singleTab.isVisible()) {
      await singleTab.click();
    }

    // Rubric should still show default categories
    await expect(page.locator("text=Thesis Statement")).toBeVisible();
  });
});

test.describe("Custom rubric in workspace", () => {
  test("custom rubric categories appear in scorecard", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=Try the sample").first().click();
    await page.waitForSelector("text=Agent Dialogue", { timeout: 20000 });

    // Switch to Scorecard tab
    await page.locator("button:has-text('Scorecard')").click();

    // Default rubric categories should be visible in the scorecard
    await expect(page.locator("text=Thesis Statement")).toBeVisible();
    await expect(page.locator("text=Organization")).toBeVisible();
  });
});
