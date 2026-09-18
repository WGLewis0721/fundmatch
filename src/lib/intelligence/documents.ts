import { DocumentSchema, IntelligenceError, LIMITS } from "./contracts";
import type { SourceDocument } from "./contracts";
export interface PdfTextReader {
  read(bytes: Uint8Array, signal?: AbortSignal): Promise<{ number: number; text: string }[]>;
}
/** Shared preflight; the server repeats byte/content validation after authorized retrieval. */
export function validateDocumentFile(file: Pick<File, "name" | "size">) {
  if (file.size === 0 || file.size > LIMITS.bytes)
    throw new IntelligenceError(
      "FILE_SIZE",
      "Choose a non-empty PDF or UTF-8 text file up to 10 MB.",
    );
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "txt"].includes(ext ?? ""))
    throw new IntelligenceError(
      "FILE_TYPE",
      "Only PDF and UTF-8 .txt decks are supported. Export PowerPoint to PDF first.",
    );
}
export async function readDocument(
  file: Pick<File, "name" | "size" | "type" | "arrayBuffer">,
  pdf: PdfTextReader,
  signal?: AbortSignal,
): Promise<SourceDocument> {
  validateDocumentFile(file);
  const ext = file.name.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal?.throwIfAborted();
  if (bytes.byteLength !== file.size || bytes.byteLength > LIMITS.bytes)
    throw new IntelligenceError("FILE_SIZE", "The file size changed or exceeds the limit.");
  const isPDF = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  let pages;
  if (ext === "pdf") {
    if (!isPDF)
      throw new IntelligenceError("INVALID_PDF", "This file does not contain a valid PDF header.");
    try {
      pages = await pdf.read(bytes.slice(), signal);
    } catch (e) {
      if (e instanceof IntelligenceError || signal?.aborted) throw e;
      throw new IntelligenceError(
        "UNREADABLE_PDF",
        "Could not read this PDF. It may be damaged or password protected.",
      );
    }
  } else {
    if (isPDF) throw new IntelligenceError("FILE_TYPE", "The extension does not match the file.");
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new IntelligenceError("ENCODING", "Save the text file as UTF-8.");
    }
    if (text.includes("\0"))
      throw new IntelligenceError("ENCODING", "Binary content is not supported in a text file.");
    pages = text.split("\f").map((text, i) => ({ number: i + 1, text }));
  }
  signal?.throwIfAborted();
  if (pages.length > LIMITS.pages)
    throw new IntelligenceError("PAGE_LIMIT", "Decks may contain up to 60 pages.");
  const totalCharacters = pages.reduce((total, page) => total + page.text.length, 0);
  if (totalCharacters > LIMITS.characters)
    throw new IntelligenceError(
      "TEXT_LIMIT",
      "Too much text. Split this deck into smaller files.",
    );
  if (pages.every((p) => !p.text.trim()))
    throw new IntelligenceError(
      "OCR_REQUIRED",
      "No selectable text found. Scanned decks require OCR, which is not connected.",
    );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join(
    "",
  );
  return DocumentSchema.parse({ id: crypto.randomUUID(), name: file.name, sha256, pages });
}
