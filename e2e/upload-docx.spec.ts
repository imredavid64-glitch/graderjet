import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { deflateRawSync } from "zlib";

/**
 * Create a minimal valid .docx file containing the given text.
 * A .docx is a ZIP archive with specific XML files inside.
 */
function createTestDocx(text: string, filename: string): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, filename);

  // Escape XML special characters
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${escaped}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`,
  };

  // Build a ZIP file manually (STORED, no compression for simplicity)
  const entries: Buffer[] = [];
  let offset = 0;
  const centralDir: Buffer[] = [];

  for (const [name, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name, "utf-8");
    const dataBuffer = Buffer.from(content, "utf-8");
    const crc = crc32(dataBuffer);

    // Local file header
    const header = Buffer.alloc(30 + nameBuffer.length);
    header.writeUInt32LE(0x04034b50, 0); // signature
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0, 6); // flags
    header.writeUInt16LE(0, 8); // compression: stored
    header.writeUInt16LE(0, 10); // mod time
    header.writeUInt16LE(0, 12); // mod date
    header.writeUInt32LE(crc, 14); // crc32
    header.writeUInt32LE(dataBuffer.length, 18); // compressed size
    header.writeUInt32LE(dataBuffer.length, 22); // uncompressed size
    header.writeUInt16LE(nameBuffer.length, 26); // filename length
    header.writeUInt16LE(0, 28); // extra field length
    nameBuffer.copy(header, 30);

    // Central directory entry
    const cdEntry = Buffer.alloc(46 + nameBuffer.length);
    cdEntry.writeUInt32LE(0x02014b50, 0); // signature
    cdEntry.writeUInt16LE(20, 4); // version made by
    cdEntry.writeUInt16LE(20, 6); // version needed
    cdEntry.writeUInt16LE(0, 8); // flags
    cdEntry.writeUInt16LE(0, 10); // compression: stored
    cdEntry.writeUInt16LE(0, 12); // mod time
    cdEntry.writeUInt16LE(0, 14); // mod date
    cdEntry.writeUInt32LE(crc, 16); // crc32
    cdEntry.writeUInt32LE(dataBuffer.length, 20); // compressed size
    cdEntry.writeUInt32LE(dataBuffer.length, 24); // uncompressed size
    cdEntry.writeUInt16LE(nameBuffer.length, 28); // filename length
    cdEntry.writeUInt16LE(0, 30); // extra field length
    cdEntry.writeUInt16LE(0, 32); // comment length
    cdEntry.writeUInt16LE(0, 34); // disk number start
    cdEntry.writeUInt16LE(0, 36); // internal attrs
    cdEntry.writeUInt32LE(0, 38); // external attrs
    cdEntry.writeUInt32LE(offset, 42); // relative offset of local header
    nameBuffer.copy(cdEntry, 46);

    entries.push(header, dataBuffer);
    centralDir.push(cdEntry);
    offset += header.length + dataBuffer.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const cd of centralDir) {
    centralDirSize += cd.length;
  }

  // End of central directory
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // disk with central dir
  endRecord.writeUInt16LE(Object.keys(files).length, 8); // entries on this disk
  endRecord.writeUInt16LE(Object.keys(files).length, 10); // total entries
  endRecord.writeUInt32LE(centralDirSize, 12); // central dir size
  endRecord.writeUInt32LE(centralDirOffset, 16); // central dir offset
  endRecord.writeUInt16LE(0, 20); // comment length

  const zip = Buffer.concat([...entries, ...centralDir, endRecord]);
  fs.writeFileSync(filePath, zip);

  return filePath;
}

/** CRC32 implementation for ZIP file entries. */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------- Tests ----------

test.describe("Setup page — .docx upload", () => {
  test("uploading a .docx file populates student name and essay text", async ({
    page,
  }) => {
    const docxPath = createTestDocx(
      "The impact of technology on modern education has been profound and multifaceted. Students now have access to unprecedented resources and learning tools that transform how knowledge is acquired and shared across classrooms worldwide.",
      "test-student-essay.docx",
    );

    try {
      await page.goto("/setup");

      // The file input is hidden; use Playwright's setInputFiles
      const fileInput = page.locator(
        'input[type="file"][accept=".txt,.docx,.pdf"]',
      );
      await fileInput.setInputFiles(docxPath);

      // Wait for the file to be processed
      await page.waitForTimeout(1000);

      // Student name should be populated from the filename
      const nameInput = page.locator("#student-name");
      const nameValue = await nameInput.inputValue();
      expect(nameValue.toLowerCase()).toContain("test student essay");

      // Essay text should be populated from the .docx content
      const textInput = page.locator("#essay-text");
      const textValue = await textInput.inputValue();
      expect(textValue).toContain("impact of technology");
      expect(textValue).toContain("modern education");

      // Start grading should now be enabled
      const startBtn = page.locator("button:has-text('Start grading')");
      await expect(startBtn).toBeEnabled();
    } finally {
      fs.unlinkSync(docxPath);
    }
  });

  test("uploading a .docx with multiple paragraphs preserves them", async ({
    page,
  }) => {
    const essayText =
      "First paragraph of the essay. Second paragraph with more analysis. Third paragraph conclusion.";
    const docxPath = createTestDocx(essayText, "multi-para.docx");

    try {
      await page.goto("/setup");

      const fileInput = page.locator(
        'input[type="file"][accept=".txt,.docx,.pdf"]',
      );
      await fileInput.setInputFiles(docxPath);
      await page.waitForTimeout(1000);

      const textValue = await page.locator("#essay-text").inputValue();
      expect(textValue).toContain("First paragraph");
      expect(textValue).toContain("Second paragraph");
      expect(textValue).toContain("Third paragraph");
    } finally {
      fs.unlinkSync(docxPath);
    }
  });

  test("upload error is shown for unsupported file types", async ({ page }) => {
    await page.goto("/setup");

    // Create a fake .png file
    const tmpDir = os.tmpdir();
    const fakePng = path.join(tmpDir, "image.png");
    fs.writeFileSync(fakePng, "not a real png");

    try {
      const fileInput = page.locator(
        'input[type="file"][accept=".txt,.docx,.pdf"]',
      );
      // Override the accept attribute so Playwright can set it
      await fileInput.evaluate((el) => {
        el.removeAttribute("accept");
      });
      await fileInput.setInputFiles(fakePng);
      await page.waitForTimeout(500);

      // Should show an error about unsupported file type
      await expect(page.locator("text=Unsupported file type")).toBeVisible();
    } finally {
      fs.unlinkSync(fakePng);
    }
  });

  test("uploading a .txt file populates the form", async ({ page }) => {
    const tmpDir = os.tmpdir();
    const txtPath = path.join(tmpDir, "sample-upload.txt");
    fs.writeFileSync(
      txtPath,
      "A well-written essay about climate change and its global impact on ecosystems and biodiversity loss.",
    );

    try {
      await page.goto("/setup");

      const fileInput = page.locator(
        'input[type="file"][accept=".txt,.docx,.pdf"]',
      );
      await fileInput.setInputFiles(txtPath);
      await page.waitForTimeout(1000);

      // Student name from filename
      const nameValue = await page.locator("#student-name").inputValue();
      expect(nameValue.toLowerCase()).toContain("sample upload");

      // Essay text from file
      const textValue = await page.locator("#essay-text").inputValue();
      expect(textValue).toContain("climate change");
    } finally {
      fs.unlinkSync(txtPath);
    }
  });

  test("uploading multiple .txt files creates batch tabs", async ({ page }) => {
    const tmpDir = os.tmpdir();
    const file1 = path.join(tmpDir, "alice.txt");
    const file2 = path.join(tmpDir, "bob.txt");
    fs.writeFileSync(
      file1,
      "Alice's essay about literature and its impact on society and culture.",
    );
    fs.writeFileSync(
      file2,
      "Bob's essay about science and technology advances in the modern world.",
    );

    try {
      await page.goto("/setup");

      const fileInput = page.locator(
        'input[type="file"][accept=".txt,.docx,.pdf"]',
      );
      await fileInput.setInputFiles([file1, file2]);
      await page.waitForTimeout(1000);

      // Should now have two student tabs
      const aliceTab = page.locator("button").filter({ hasText: /alice/i });
      const bobTab = page.locator("button").filter({ hasText: /bob/i });
      await expect(aliceTab).toBeVisible();
      await expect(bobTab).toBeVisible();

      // Start grading should be enabled
      const startBtn = page.locator("button:has-text('Start grading')");
      await expect(startBtn).toBeEnabled();
    } finally {
      fs.unlinkSync(file1);
      fs.unlinkSync(file2);
    }
  });

  test("uploaded .docx content works end-to-end through to workspace", async ({
    page,
  }) => {
    const docxPath = createTestDocx(
      "Technology has changed education profoundly. Students learn through screens and interactive tools, gaining access to knowledge that was previously unavailable.",
      "end-to-end-test.docx",
    );

    try {
      await page.goto("/setup");

      // Upload the .docx
      const fileInput = page.locator(
        'input[type="file"][accept=".txt,.docx,.pdf"]',
      );
      await fileInput.setInputFiles(docxPath);
      await page.waitForTimeout(1000);

      // Start grading
      await page.locator("button:has-text('Start grading')").click();

      // Should navigate to workspace
      await expect(page).toHaveURL(/\/workspace/);

      // Workspace should show the student name from the .docx filename
      await page.waitForSelector("text=end-to-end-test", { timeout: 15000 });
      await expect(page.locator("text=end-to-end-test").first()).toBeVisible();

      // The essay text should be visible in the document viewer
      await expect(
        page.locator("text=Technology has changed education"),
      ).toBeVisible();
    } finally {
      fs.unlinkSync(docxPath);
    }
  });
});
