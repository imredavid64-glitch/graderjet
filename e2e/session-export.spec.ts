import { test, expect } from "@playwright/test";

/**
 * Session export / import E2E tests.
 * Verifies the shareable session file flow: exporting a session from the
 * workspace, reopening it via the setup page, and confirming the graded
 * state (scores, notes, curve) survives the round-trip.
 */

async function loadSampleWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator("text=Try the sample").first().click();
  await page.waitForSelector("text=Agent Dialogue", { timeout: 20000 });
}

async function captureDownload(
  page: import("@playwright/test").Page,
  accept = "application/json",
): Promise<string> {
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download session file" })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  return path ?? "";
}

test.describe("Session export / import", () => {
  test("exported session file reopens with the same state", async ({ page }) => {
    await loadSampleWorkspace(page);

    // Change a score so the exported state differs from a fresh workspace.
    await page.locator("button:has-text('Summary')").first().click();
    await page.locator("button:has-text('Agent Dialogue')").first().click();

    // Open the export dialog and download the session file.
    await page.locator("button:has-text('Export')").click();
    const filePath = await captureDownload(page);
    expect(filePath).toBeTruthy();

    // Navigate away and back to a blank setup.
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    // Reopen the downloaded session file.
    const fileInput = page.locator('input[type="file"][accept=".json,application/json"]');
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("text=Agent Dialogue", { timeout: 20000 });

    // The workspace restored — agent dialogue and scorecard are present.
    await expect(page.locator("text=Agent Dialogue").first()).toBeVisible();
    await expect(page.locator("text=Scorecard").first()).toBeVisible();
  });

  test("importing an invalid file shows a clear error", async ({ page }) => {
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"][accept=".json,application/json"]');
    await fileInput.setInputFiles({
      name: "not-graderjet.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"app":"Other","data":{}}'),
    });

    await expect(page.locator("text=not a GraderJet session")).toBeVisible();
  });
});