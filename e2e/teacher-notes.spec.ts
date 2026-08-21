import { test, expect } from "@playwright/test";

/**
 * Teacher notes E2E tests.
 * Tests both paragraph-level notes (in DocumentViewer) and category-level
 * notes (in Scorecard).
 *
 * Flow: landing → sample essay → workspace → add/remove notes.
 */

async function loadSampleWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator("text=Try the sample").first().click();
  await page.waitForSelector("text=Agent Dialogue", { timeout: 20000 });
}

test.describe("Teacher notes — paragraph level", () => {
  test.beforeEach(async ({ page }) => {
    await loadSampleWorkspace(page);
  });

  test("'Add note' button appears on paragraph hover", async ({ page }) => {
    // Hover over the first paragraph to reveal the Add note button
    const firstParagraph = page.locator("text=Social media has completely changed").first();
    await firstParagraph.hover();

    // The Add note button should be visible (uses group-hover opacity)
    const addNoteBtn = page.locator("button:has-text('Add note')").first();
    await expect(addNoteBtn).toBeVisible();
  });

  test("clicking 'Add note' opens an input field", async ({ page }) => {
    const firstParagraph = page.locator("text=Social media has completely changed").first();
    await firstParagraph.hover();

    const addNoteBtn = page.locator("button:has-text('Add note')").first();
    await addNoteBtn.click();

    // Should now show the note input
    const noteInput = page.locator("input[placeholder*='note about this paragraph']");
    await expect(noteInput).toBeVisible();
    await expect(noteInput).toBeFocused();
  });

  test("typing and saving a paragraph note", async ({ page }) => {
    const firstParagraph = page.locator("text=Social media has completely changed").first();
    await firstParagraph.hover();

    await page.locator("button:has-text('Add note')").first().click();

    const noteInput = page.locator("input[placeholder*='note about this paragraph']");
    await noteInput.fill("Strong opening with a clear claim");
    await noteInput.press("Enter");

    // The note should appear in the document viewer
    await expect(page.locator("text=Strong opening with a clear claim").first()).toBeVisible();

    // The input should disappear
    await expect(noteInput).not.toBeVisible();
  });

  test("clicking Save button saves the note", async ({ page }) => {
    const firstParagraph = page.locator("text=Social media has completely changed").first();
    await firstParagraph.hover();

    await page.locator("button:has-text('Add note')").first().click();

    const noteInput = page.locator("input[placeholder*='note about this paragraph']");
    await noteInput.fill("Test note via save button");

    // Click the Save button (not the note text)
    const saveBtn = page.locator("button:has-text('Save')").last();
    await saveBtn.click();

    await expect(page.locator("text=Test note via save button").first()).toBeVisible();
  });

  test("Escape key cancels note input", async ({ page }) => {
    const firstParagraph = page.locator("text=Social media has completely changed").first();
    await firstParagraph.hover();

    await page.locator("button:has-text('Add note')").first().click();

    const noteInput = page.locator("input[placeholder*='note about this paragraph']");
    await noteInput.fill("This should be discarded");
    await noteInput.press("Escape");

    // Input should disappear and note should not appear
    await expect(noteInput).not.toBeVisible();
    await expect(page.locator("text=This should be discarded")).not.toBeVisible();
  });

  test("removing a paragraph note", async ({ page }) => {
    // First add a note
    const firstParagraph = page.locator("text=Social media has completely changed").first();
    await firstParagraph.hover();

    await page.locator("button:has-text('Add note')").first().click();
    const noteInput = page.locator("input[placeholder*='note about this paragraph']");
    await noteInput.fill("Note to remove");
    await noteInput.press("Enter");
    await expect(page.locator("text=Note to remove").first()).toBeVisible();

    // Now remove it — find the X button next to the note
    const removeBtn = page.locator("button[aria-label='Remove note']").first();
    await removeBtn.click();

    // Note should be gone
    await expect(page.locator("text=Note to remove")).not.toBeVisible();
  });

  test("notes appear in the activity feed", async ({ page }) => {
    const firstParagraph = page.locator("text=Social media has completely changed").first();
    await firstParagraph.hover();

    await page.locator("button:has-text('Add note')").first().click();
    const noteInput = page.locator("input[placeholder*='note about this paragraph']");
    await noteInput.fill("Activity feed test");
    await noteInput.press("Enter");

    // Activity feed should show the note
    await expect(page.locator("text=Note added").first()).toBeVisible();
  });
});

test.describe("Teacher notes — category level", () => {
  test.beforeEach(async ({ page }) => {
    await loadSampleWorkspace(page);
    // Switch to Scorecard tab
    await page.locator("text=Scorecard").first().click();
    await page.waitForSelector("text=Overall score", { timeout: 5000 });
  });

  test("category 'Add note' button is visible", async ({ page }) => {
    // Scorecard should show 'Add note' buttons for each category
    const addNoteBtns = page.locator("text=Add note");
    const count = await addNoteBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking category 'Add note' opens input", async ({ page }) => {
    // Find the first category (Thesis) and click its Add note
    const addNoteBtns = page.locator("button:has-text('Add note')");
    await addNoteBtns.first().click();

    const noteInput = page.locator("input[placeholder*='note for this category']");
    await expect(noteInput).toBeVisible();
    await expect(noteInput).toBeFocused();
  });

  test("saving a category note", async ({ page }) => {
    const addNoteBtns = page.locator("button:has-text('Add note')");
    await addNoteBtns.first().click();

    const noteInput = page.locator("input[placeholder*='note for this category']");
    await noteInput.fill("Thesis needs strengthening");
    await noteInput.press("Enter");

    // Note should appear in the scorecard
    await expect(page.locator("text=Thesis needs strengthening").first()).toBeVisible();
  });

  test("removing a category note", async ({ page }) => {
    // Add a note first
    const addNoteBtns = page.locator("button:has-text('Add note')");
    await addNoteBtns.first().click();

    const noteInput = page.locator("input[placeholder*='note for this category']");
    await noteInput.fill("Removable note");
    await noteInput.press("Enter");
    await expect(page.locator("text=Removable note").first()).toBeVisible();

    // Remove it
    const removeBtn = page.locator("button[aria-label='Remove note']").first();
    await removeBtn.click();

    await expect(page.locator("text=Removable note")).not.toBeVisible();
  });

  test("multiple category notes are supported", async ({ page }) => {
    // Add note to first category
    const addNoteBtns = page.locator("button:has-text('Add note')");
    await addNoteBtns.first().click();
    let noteInput = page.locator("input[placeholder*='note for this category']");
    await noteInput.fill("First category note");
    await noteInput.press("Enter");
    await expect(page.locator("text=First category note").first()).toBeVisible();

    // Add another note to the same category
    const addNoteBtns2 = page.locator("button:has-text('Add note')");
    await addNoteBtns2.first().click();
    noteInput = page.locator("input[placeholder*='note for this category']");
    await noteInput.fill("Second category note");
    await noteInput.press("Enter");

    // Both should be visible
    await expect(page.locator("text=First category note").first()).toBeVisible();
    await expect(page.locator("text=Second category note").first()).toBeVisible();
  });
});
