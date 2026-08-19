import { test } from "node:test";
import assert from "node:assert/strict";

// We can only test the pure validation logic from file-upload.ts
// without browser File/mammoth/pdfjs dependencies.
// Test the MAX_FILE_SIZE and file type validation logic inline.

const MAX_FILE_SIZE = 512_000;

function validateFileExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "docx" || ext === "txt") return ext;
  throw new Error(
    `Unsupported file type ".${ext}". Please upload a .txt, .docx, or .pdf file, or paste the essay text directly.`,
  );
}

function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${Math.round(size / 1024)} KB). The limit is ${MAX_FILE_SIZE / 1024} KB.`,
    );
  }
}

test("accepts .txt extension", () => {
  assert.equal(validateFileExtension("essay.txt"), "txt");
});

test("accepts .docx extension", () => {
  assert.equal(validateFileExtension("paper.docx"), "docx");
});

test("accepts .pdf extension", () => {
  assert.equal(validateFileExtension("homework.pdf"), "pdf");
});

test("accepts mixed-case extensions", () => {
  assert.equal(validateFileExtension("Essay.TXT"), "txt");
  assert.equal(validateFileExtension("Paper.DOCX"), "docx");
  assert.equal(validateFileExtension("HW.Pdf"), "pdf");
});

test("rejects unsupported extensions", () => {
  assert.throws(
    () => validateFileExtension("image.png"),
    /Unsupported file type/,
  );
  assert.throws(
    () => validateFileExtension("spreadsheet.csv"),
    /Unsupported file type/,
  );
  assert.throws(
    () => validateFileExtension("noextension"),
    /Unsupported file type/,
  );
});

test("rejects files over 500 KB", () => {
  assert.throws(
    () => validateFileSize(600_000),
    /File is too large/,
  );
});

test("accepts files under 500 KB", () => {
  assert.doesNotThrow(() => validateFileSize(100_000));
  assert.doesNotThrow(() => validateFileSize(0));
  assert.doesNotThrow(() => validateFileSize(512_000)); // exactly at limit
});
