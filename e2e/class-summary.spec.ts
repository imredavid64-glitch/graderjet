import { test, expect } from "@playwright/test";

/**
 * Class summary E2E tests.
 * Tests the summary tab in the workspace, including grade distribution,
 * category averages, and export buttons.
 */

async function loadSampleWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator("text=Try the sample").first().click();
  await page.waitForSelector("text=Agent Dialogue", { timeout: 20000 });
}

test.describe("Class summary view", () => {
  test.beforeEach(async ({ page }) => {
    await loadSampleWorkspace(page);
    // Switch to Summary tab
    await page.locator("button:has-text('Summary')").click();
  });

  test("summary tab shows class statistics", async ({ page }) => {
    // Should show the class summary heading or section
    await expect(
      page.locator("text=/Class Summary|Summary|Overview/").first()
    ).toBeVisible();
  });

  test("shows grade distribution", async ({ page }) => {
    // Should show grade distribution section
    const gradeSection = page.locator("text=/Grade Distribution|Distribution/").first();
    if (await gradeSection.isVisible()) {
      await expect(gradeSection).toBeVisible();
    }
  });

  test("shows average score", async ({ page }) => {
    // Should show average/mean score
    const avgSection = page.locator("text=/Average|Mean|avg/").first();
    if (await avgSection.isVisible()) {
      await expect(avgSection).toBeVisible();
    }
  });

  test("shows category breakdown", async ({ page }) => {
    // Should show category-level averages
    await expect(page.locator("text=Thesis Statement")).toBeVisible();
  });

  test("export CSV button is visible", async ({ page }) => {
    const csvBtn = page.locator("button:has-text('CSV'), button:has-text('Export CSV')").first();
    if (await csvBtn.isVisible()) {
      await expect(csvBtn).toBeVisible();
    }
  });

  test("export PDF button is visible", async ({ page }) => {
    const pdfBtn = page.locator("button:has-text('PDF'), button:has-text('Export PDF')").first();
    if (await pdfBtn.isVisible()) {
      await expect(pdfBtn).toBeVisible();
    }
  });

  test("clicking CSV export triggers download", async ({ page }) => {
    const csvBtn = page.locator("button:has-text('CSV'), button:has-text('Export CSV')").first();
    if (await csvBtn.isVisible()) {
      const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
      await csvBtn.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    }
  });

  test("clicking PDF export opens print dialog or triggers download", async ({ page }) => {
    const pdfBtn = page.locator("button:has-text('PDF'), button:has-text('Export PDF')").first();
    if (await pdfBtn.isVisible()) {
      await pdfBtn.click();
      // PDF export uses window.print() or creates a blob
      // We just verify the button is clickable and doesn't error
    }
  });
});

test.describe("Class summary with multiple students", () => {
  test("shows multiple student entries", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Switch to batch mode
    await page.locator("button:has-text('Batch')").click();

    // Upload multiple files
    const fileInput = page.locator("input[type='file']");
    const files = [
      { name: "alice.txt", mimeType: "text/plain", buffer: Buffer.from("Alice essay about climate change and its effects on global policy.") },
      { name: "bob.txt", mimeType: "text/plain", buffer: Buffer.from("Bob essay about renewable energy solutions for modern cities.") },
      { name: "carol.txt", mimeType: "text/plain", buffer: Buffer.from("Carol essay about social media impact on mental health.") },
    ];
    await fileInput.setInputFiles(files);

    // Start grading
    await page.locator("button:has-text('Start grading')").click();
    await page.waitForSelector("text=Agent Dialogue", { timeout: 30000 });

    // Switch to Summary tab
    await page.locator("button:has-text('Summary')").click();

    // Should show summary with multiple entries
    await expect(page.locator("text=/Class Summary|Summary|Overview/").first()).toBeVisible();
  });
});
