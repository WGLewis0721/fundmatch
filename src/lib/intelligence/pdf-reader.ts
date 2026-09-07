import type { PdfTextReader } from "./documents";
import { IntelligenceError, LIMITS } from "./contracts";
export function makePdfTextReader(
  load: () => Promise<Pick<typeof import("pdfjs-dist"), "getDocument">>,
): PdfTextReader {
  return {
    async read(bytes, signal) {
      const pdf = await load();
      const task = pdf.getDocument({ data: bytes, useSystemFonts: true, stopAtErrors: true });
      const abort = () => {
        void task.destroy();
      };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        signal?.throwIfAborted();
        const doc = await task.promise;
        if (doc.numPages > LIMITS.pages)
          throw new IntelligenceError("PAGE_LIMIT", "Decks may contain up to 60 pages.");
        const pages = [];
        let characters = 0;
        for (let n = 1; n <= doc.numPages; n++) {
          signal?.throwIfAborted();
          const page = await doc.getPage(n);
          const content = await page.getTextContent();
          let text = "";
          let lastY: number | undefined;
          for (const item of content.items) {
            if (!("str" in item)) continue;
            const y = item.transform[5] as number;
            if (lastY !== undefined && Math.abs(y - lastY) > 3 && !text.endsWith("\n"))
              text += "\n";
            text += item.str + (item.hasEOL ? "\n" : " ");
            lastY = y;
          }
          characters += text.length;
          if (characters > LIMITS.characters)
            throw new IntelligenceError(
              "TEXT_LIMIT",
              "Too much text. Split this deck into smaller files.",
            );
          pages.push({ number: n, text });
          page.cleanup();
        }
        return pages;
      } finally {
        signal?.removeEventListener("abort", abort);
        await task.destroy();
      }
    },
  };
}

// Dynamic imports run only on upload, never during server rendering.
export const browserPdfReader = makePdfTextReader(async () => {
  if (typeof window === "undefined")
    throw new IntelligenceError("PDF_UNAVAILABLE", "Use a server PDF reader in the backend.");
  const pdf = await import("pdfjs-dist");
  const { default: worker } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdf.GlobalWorkerOptions.workerSrc = worker;
  return pdf;
});
