/**
 * Client-side file upload utilities.
 * Supports .txt, .pdf, and .docx files.
 */

export interface ParsedFile {
  name: string;
  text: string;
}

const MAX_FILE_SIZE = 512_000; // 500 KB

/**
 * Read a .txt file and return its text content.
 */
async function readTxt(file: File): Promise<ParsedFile> {
  const text = await file.text();
  if (!text.trim()) throw new Error("The file appears to be empty.");
  return { name: file.name, text: text.trim() };
}

/**
 * Read a .docx file and extract text using mammoth.
 */
async function readDocx(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  if (!text.trim()) throw new Error("No text could be extracted from the document.");
  return { name: file.name, text: text.trim() };
}

/**
 * Read a .pdf file and extract text content using pdf.js.
 */
async function readPdf(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker source to a CDN to avoid bundling the worker file.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => {
        const ti = item as { str?: string; type?: string };
        return ti.type === "text" ? ti.str ?? "" : "";
      })
      .join(" ");
    if (pageText.trim()) textParts.push(pageText.trim());
  }

  const text = textParts.join("\n\n");
  if (!text.trim()) throw new Error("No text could be extracted from the PDF.");
  return { name: file.name, text };
}

/**
 * Read a File object and return its text content.
 * Supports .txt, .docx, and .pdf files.
 */
export async function readFileAsText(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${Math.round(file.size / 1024)} KB). The limit is ${MAX_FILE_SIZE / 1024} KB.`,
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return readPdf(file);
  }

  if (ext === "docx") {
    return readDocx(file);
  }

  if (ext === "txt") {
    return readTxt(file);
  }

  throw new Error(
    `Unsupported file type ".${ext}". Please upload a .txt, .docx, or .pdf file, or paste the essay text directly.`,
  );
}

/**
 * Parse multiple files dropped or selected by the user.
 * Returns successfully parsed files and any errors.
 */
export async function readFiles(
  files: FileList | File[],
): Promise<{ parsed: ParsedFile[]; errors: { name: string; error: string }[] }> {
  const parsed: ParsedFile[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of Array.from(files)) {
    try {
      const result = await readFileAsText(file);
      parsed.push(result);
    } catch (err) {
      errors.push({
        name: file.name,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { parsed, errors };
}
