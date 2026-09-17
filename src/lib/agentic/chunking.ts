import type { SourceDocument } from "../intelligence/contracts";

export interface DocumentChunk {
  /**
   * Machine-stable and unique per organization, which is what the
   * `document_chunks` uniqueness constraint keys on. The document id is part of
   * the locator so two documents holding identical page text still produce
   * distinct chunk rows.
   */
  sourceLocator: string;
  /** Human-readable provenance shown to the founder, e.g. "page 3". */
  label: string;
  content: string;
  contentSha256: string;
  page: number;
  part: number;
  charStart: number;
  charEnd: number;
}

export interface ChunkOptions {
  /** Upper bound on chunk characters. Pitch-deck pages usually fit in one chunk. */
  maxChars?: number;
  /** Characters of trailing context repeated at the start of the next chunk. */
  overlapChars?: number;
  /**
   * Floor for keeping a chunk. Deliberately low: deck pages are often a single
   * short line ("Revenue: $2.4M") and dropping those would discard real
   * evidence. Noise is filtered by `isNoise` instead of by length alone.
   */
  minChars?: number;
  maxChunks?: number;
}

const DEFAULTS = { maxChars: 1200, overlapChars: 150, minChars: 8, maxChunks: 400 };

/** Page numbers, rule glyphs and stray punctuation carry nothing to cite. */
function isNoise(text: string): boolean {
  return !/\p{L}/u.test(text);
}

/** Collapses runs of spaces/blank lines without destroying paragraph structure. */
export function normalizeChunkText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}

/**
 * Picks the end of a chunk, preferring a paragraph break, then a sentence end,
 * then a word boundary, so locators stay stable and excerpts stay readable.
 */
function findBreak(text: string, start: number, limit: number): number {
  const hardEnd = Math.min(start + limit, text.length);
  if (hardEnd >= text.length) return text.length;
  const window = text.slice(start, hardEnd);
  const floor = Math.floor(limit * 0.5);
  for (const pattern of [/\n\n(?![\s\S]*\n\n)/, /[.!?]\s(?![\s\S]*[.!?]\s)/, /\s(?!\S*\s)/]) {
    const match = pattern.exec(window);
    if (match && match.index >= floor) return start + match.index + match[0].length;
  }
  return hardEnd;
}

/**
 * Deterministic, page-aware chunking. The same document always yields the same
 * locators and hashes, which is what makes chunk persistence retry-safe.
 */
export async function chunkDocument(
  document: SourceDocument,
  options: ChunkOptions = {},
): Promise<DocumentChunk[]> {
  const { maxChars, overlapChars, minChars, maxChunks } = { ...DEFAULTS, ...options };
  const chunks: DocumentChunk[] = [];

  for (const page of document.pages) {
    const text = normalizeChunkText(page.text);
    if (text.length < minChars || isNoise(text)) continue;

    const pageChunks: Array<{ content: string; charStart: number; charEnd: number }> = [];
    let cursor = 0;
    while (cursor < text.length) {
      const end = findBreak(text, cursor, maxChars);
      const content = text.slice(cursor, end).trim();
      if (content.length >= minChars && !isNoise(content)) {
        pageChunks.push({ content, charStart: cursor, charEnd: end });
      }
      if (end >= text.length) break;
      // Overlap carries context across the boundary; never move backwards.
      cursor = Math.max(cursor + 1, end - overlapChars);
    }

    for (const [index, chunk] of pageChunks.entries()) {
      if (chunks.length >= maxChunks) return chunks;
      const part = index + 1;
      chunks.push({
        sourceLocator: `document:${document.id}#page=${page.number}&part=${part}`,
        label: pageChunks.length > 1 ? `page ${page.number} (part ${part})` : `page ${page.number}`,
        content: chunk.content,
        contentSha256: await sha256Hex(chunk.content),
        page: page.number,
        part,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
      });
    }
  }

  return chunks;
}
