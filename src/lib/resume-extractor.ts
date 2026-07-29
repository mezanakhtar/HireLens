import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

/* ── PDF.js worker via CDN (avoids Vite worker-bundling complexity) ── */
GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs";

export type ExtractedFile = {
  name: string;
  size: number;
  type: "pdf" | "docx";
  text: string;
};

export const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ── Helpers ── */
function fileExtension(filename: string): string {
  return filename.toLowerCase().split(".").pop() ?? "";
}

export function validateFile(file: File): string | null {
  const ext = fileExtension(file.name);
  if (ext !== "pdf" && ext !== "docx") {
    return `Unsupported file type ".${ext}". Please upload a PDF or DOCX file.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  if (file.size === 0) {
    return "The file appears to be empty.";
  }
  return null;
}

/* ── PDF text extraction ── */
async function extractPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = "";

    for (const item of content.items) {
      const textItem = item as TextItem;
      if (!textItem.str) continue;

      const y = textItem.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = textItem.str;
      } else {
        currentLine += (currentLine && !currentLine.endsWith(" ") ? " " : "") + textItem.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    pageTexts.push(lines.join("\n"));
  }

  const text = pageTexts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("No readable text found in this PDF. It may be image-based (scanned). Please paste the text manually.");
  return text;
}

/* ── DOCX text extraction ── */
async function extractDOCX(file: File): Promise<string> {
  /* Dynamic import — avoids pulling in Node.js shims at startup */
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("No readable text found in this DOCX file. Please paste the text manually.");
  return text;
}

/* ── Public API ── */
export async function extractResumeText(file: File): Promise<ExtractedFile> {
  const ext = fileExtension(file.name);
  let text: string;
  if (ext === "pdf") {
    text = await extractPDF(file);
  } else if (ext === "docx") {
    text = await extractDOCX(file);
  } else {
    throw new Error(`Unsupported file type ".${ext}"`);
  }
  return { name: file.name, size: file.size, type: ext as "pdf" | "docx", text };
}
