import { test, expect } from "@playwright/test";

test.describe("Workspace (sample flow)", () => {
  test.beforeEach(async ({ page }) => {
    // Load the sample essay via the landing page
    await page.goto("/");
    await page.locator("text=Try the sample").first().click();
    await page.waitForSelector("text=Agent Dialogue", { timeout: 20000 });
  });

  test("opens with Alex Rivera's paper", async ({ page }) => {
    await expect(page.locator("text=Alex Rivera").first()).toBeVisible();
    await expect(
      page.locator("text=applied an initial assessment"),
    ).toBeVisible();
  });

  test("document viewer shows the essay text", async ({ page }) => {
    await expect(
      page.locator("text=Social media has completely changed"),
    ).toBeVisible();
  });

  test("tabs switch between Dialogue, Scorecard, and Activity", async ({
    page,
  }) => {
    // Dialogue is active by default
    await expect(
      page.locator('[role="tab"][data-state="active"]:has-text("Agent Dialogue")'),
    ).toBeVisible();

    // Switch to Scorecard
    await page.locator("text=Scorecard").first().click();
    await expect(
      page.locator('[role="tab"][data-state="active"]:has-text("Scorecard")'),
    ).toBeVisible();
    await expect(page.locator("text=Overall score")).toBeVisible();
  });

  test("suggested prompts are visible in the dialogue", async ({ page }) => {
    await expect(
      page.locator("text=Raise Thesis to 20 and explain why"),
    ).toBeVisible();
  });

  test("sending a suggested prompt triggers the agent", async ({ page }) => {
    await page.locator("text=Raise Thesis to 20 and explain why").click();

    // Wait for the tool card to appear (agent executes the tool)
    await page.waitForSelector("text=Update score", { timeout: 15000 });
    await expect(page.locator("text=Update score").first()).toBeVisible();
  });

  test("activity feed records agent actions", async ({ page }) => {
    // Trigger a tool action
    await page.locator("text=Raise Thesis to 20 and explain why").click();
    await page.waitForSelector("text=Update score", { timeout: 15000 });

    // Activity feed should show the score change
    await expect(page.locator("text=Score updated")).toBeVisible();
  });

  test("scorecard shows category scores", async ({ page }) => {
    await page.locator("text=Scorecard").first().click();
    await page.waitForSelector("text=Overall score", { timeout: 5000 });
    await expect(page.locator("text=Thesis")).toBeVisible();
    await expect(page.locator("text=Evidence")).toBeVisible();
    await expect(page.locator("text=Analysis")).toBeVisible();
    await expect(page.locator("text=Organization")).toBeVisible();
    await expect(page.locator("text=Conventions")).toBeVisible();
  });

  test("top nav shows paper count", async ({ page }) => {
    await expect(page.locator("text=Paper 3 of 25")).toBeVisible();
  });

  test("export button opens the export dialog", async ({ page }) => {
    await page.locator("button:has-text('Export')").click();
    await expect(
      page.locator("text=Export grading"),
    ).toBeVisible();
    await expect(page.locator("text=Download .json")).toBeVisible();
  });

  test("no browser console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.locator("text=Try the sample").first().click();
    await page.waitForSelector("text=Agent Dialogue", { timeout: 20000 });
    // Wait a moment for any async errors
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
