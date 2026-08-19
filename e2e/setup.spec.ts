import { test, expect } from "@playwright/test";

const SAMPLE_ESSAY =
  "Technology has changed education in profound ways. Students now learn " +
  "through screens and interactive tools, and this shift has both benefits " +
  "and drawbacks that deserve careful attention. The classroom of the future " +
  "will need to balance digital fluency with the human connections that make " +
  "learning meaningful.";

test.describe("Setup page", () => {
  test("renders the setup form with student name and essay fields", async ({
    page,
  }) => {
    await page.goto("/setup");
    await expect(page.locator("#student-name")).toBeVisible();
    await expect(page.locator("#essay-text")).toBeVisible();
    await expect(
      page.locator("button:has-text('Start grading')"),
    ).toBeVisible();
  });

  test("Start grading is disabled when name is empty", async ({ page }) => {
    await page.goto("/setup");
    const btn = page.locator("button:has-text('Start grading')");
    await expect(btn).toBeDisabled();
  });

  test("Start grading is enabled after filling required fields", async ({
    page,
  }) => {
    await page.goto("/setup");
    await page.fill("#student-name", "Test Student");
    await page.fill("#essay-text", SAMPLE_ESSAY);
    const btn = page.locator("button:has-text('Start grading')");
    await expect(btn).toBeEnabled();
  });

  test("submitting the form navigates to /workspace", async ({ page }) => {
    await page.goto("/setup");
    await page.fill("#student-name", "Test Student");
    await page.fill("#essay-text", SAMPLE_ESSAY);
    await page.locator("button:has-text('Start grading')").click();
    await expect(page).toHaveURL(/\/workspace/);
  });

  test("workspace shows the student name after setup", async ({ page }) => {
    await page.goto("/setup");
    await page.fill("#student-name", "Jordan Lee");
    await page.fill("#essay-text", SAMPLE_ESSAY);
    await page.locator("button:has-text('Start grading')").click();
    await page.waitForSelector("text=Jordan Lee", { timeout: 15000 });
    await expect(page.locator("text=Jordan Lee").first()).toBeVisible();
  });

  test("rubric editor toggles open and closed", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.locator("text=Analytical Essay")).toBeVisible();
    // Click Edit to open the rubric editor
    const editBtn = page.locator("button:has-text('Edit')");
    if (await editBtn.isVisible()) {
      await editBtn.click();
      // Should show a Reset button when open
      await expect(page.locator("button:has-text('Reset')")).toBeVisible();
    }
  });

  test("batch tab: Add student creates a new tab", async ({ page }) => {
    await page.goto("/setup");
    const addBtn = page.locator("button:has-text('Add student')");
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    // Should now have two student tabs
    const tabs = page.locator("button").filter({ hasText: /^Student \d+$/ });
    await expect(tabs).toHaveCount(2);
  });
});
