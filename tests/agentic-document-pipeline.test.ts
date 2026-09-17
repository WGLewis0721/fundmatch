/**
 * Phase 8 document pipeline: the properties that keep queued analysis safe to
 * retry and honest about where a suggestion came from. No database, no network
 * and no model provider is involved here.
 */
import { describe, expect, test } from "bun:test";
import { chunkDocument, normalizeChunkText } from "../src/lib/agentic/chunking";
import {
  chunksToEvidence,
  extractionToAgentClaims,
  parsePlainNumber,
  readinessProposals,
  suggestionsFromExtraction,
  targetForClaim,
  unsupportedFileReason,
} from "../src/lib/agentic/document-workflow";
import { EvidenceValidator } from "../src/lib/agentic";
import type { AgentContext, AgentTask } from "../src/lib/agentic";
import { buildExtraction } from "../src/lib/intelligence/extraction";
import type { Claim, Extraction, SourceDocument } from "../src/lib/intelligence/contracts";

const deck: SourceDocument = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "acme-deck.pdf",
  sha256: "a".repeat(64),
  pages: [
    { number: 1, text: "Acme Robotics\nSector: Climate\nStage: Seed" },
    { number: 2, text: "Annual revenue: 2400000\nYoY growth: 140%" },
    { number: 3, text: "  " },
  ],
};

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    field: overrides.field ?? "revenue",
    value: overrides.value ?? "2400000",
    page: overrides.page ?? 2,
    quote: overrides.quote ?? "Annual revenue: 2400000",
    uncertainty: overrides.uncertainty ?? "explicit",
    source: overrides.source ?? {
      documentId: deck.id,
      documentName: deck.name,
      sha256: deck.sha256,
    },
    status: "unreviewed",
    conflict: overrides.conflict ?? false,
  };
}

function extraction(claims: Claim[], method: Extraction["method"] = "literal"): Extraction {
  return {
    id: "extraction-1",
    document: deck,
    claims,
    missing: [],
    warnings: [],
    method,
    createdAt: new Date().toISOString(),
  };
}

describe("document chunking", () => {
  test("is deterministic, so reprocessing the same file cannot duplicate chunks", async () => {
    const first = await chunkDocument(deck);
    const second = await chunkDocument(deck);
    expect(first).toEqual(second);
    expect(new Set(first.map((chunk) => chunk.contentSha256)).size).toBe(first.length);
  });

  test("locators carry the document id so identical text in two files stays distinct", async () => {
    const other = await chunkDocument({ ...deck, id: "22222222-2222-4222-8222-222222222222" });
    const mine = await chunkDocument(deck);
    expect(mine[0]!.sourceLocator).toContain(deck.id);
    expect(other[0]!.sourceLocator).not.toBe(mine[0]!.sourceLocator);
    // Same content, so the hash matches; the locator is what separates them.
    expect(other[0]!.contentSha256).toBe(mine[0]!.contentSha256);
  });

  test("keeps page provenance and drops pages with nothing readable", async () => {
    const chunks = await chunkDocument(deck);
    expect(chunks.map((chunk) => chunk.page)).toEqual([1, 2]);
    expect(chunks[0]!.label).toBe("page 1");
    expect(chunks.some((chunk) => chunk.page === 3)).toBe(false);
  });

  test("splits a long page into ordered parts that still name their page", async () => {
    const long = "Sentence about the company. ".repeat(200);
    const chunks = await chunkDocument({ ...deck, pages: [{ number: 1, text: long }] });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.part)).toEqual(chunks.map((_, index) => index + 1));
    expect(chunks.every((chunk) => chunk.label.startsWith("page 1"))).toBe(true);
    expect(chunks.every((chunk) => chunk.content.length <= 1200)).toBe(true);
  });

  test("normalization collapses noise without destroying paragraphs", () => {
    expect(normalizeChunkText("a  b\r\n\r\n\r\n c ")).toBe("a b\n\nc");
  });

  test("keeps a short but meaningful page and drops one that is only a page number", async () => {
    const chunks = await chunkDocument({
      ...deck,
      pages: [
        { number: 1, text: "Revenue: $2.4M" },
        { number: 2, text: "— 12 —" },
      ],
    });
    expect(chunks.map((chunk) => chunk.page)).toEqual([1]);
    expect(chunks[0]!.content).toBe("Revenue: $2.4M");
  });
});

describe("unsupported input", () => {
  test("names the formats that actually work and does not pretend otherwise", () => {
    expect(unsupportedFileReason("deck.pdf")).toBeNull();
    expect(unsupportedFileReason("notes.txt")).toBeNull();
    for (const name of ["deck.pptx", "model.xlsx", "brief.docx", "scan.png", "raw"]) {
      expect(unsupportedFileReason(name)).toContain("PDFs with selectable text");
    }
  });
});

describe("claims to reviewable suggestions", () => {
  test("maps fields onto keys the promotion RPC can apply", () => {
    expect(targetForClaim(claim({ field: "sector", value: "Climate" })).fieldKey).toBe("sector");
    expect(targetForClaim(claim({ field: "revenue" })).fieldKey).toBe("metric:revenue");
  });

  test("only proposes funding_ask as a number when it really is one", () => {
    expect(parsePlainNumber("$2,400,000")).toBe(2400000);
    expect(parsePlainNumber("about 2.4m")).toBeNull();
    expect(targetForClaim(claim({ field: "funding_ask", value: "2400000" })).fieldKey).toBe(
      "funding_ask",
    );
    expect(targetForClaim(claim({ field: "funding_ask", value: "$2.4M seed" })).fieldKey).toBe(
      "metric:funding_ask",
    );
  });

  test("carries the source page and verbatim quote onto every proposal", () => {
    const [suggestion] = suggestionsFromExtraction({
      extraction: extraction([claim()]),
      sourceKey: "fundmatch_literal",
    });
    expect(suggestion!.sourceLocator).toBe("page 2");
    expect(suggestion!.sourceExcerpt).toBe("Annual revenue: 2400000");
    expect(suggestion!.rationale).toContain("page 2");
  });

  test("keeps conflicting values as competing proposals instead of picking one", () => {
    const suggestions = suggestionsFromExtraction({
      extraction: extraction([
        claim({ value: "2400000", conflict: true }),
        claim({ value: "3100000", page: 4, quote: "Annual revenue: 3100000", conflict: true }),
      ]),
      sourceKey: "fundmatch_document_agent",
    });
    expect(suggestions.map((item) => item.suggestedValue).sort()).toEqual(["2400000", "3100000"]);
    expect(suggestions.every((item) => item.confidence < 0.5)).toBe(true);
    expect(suggestions[0]!.rationale).toContain("more than one value");
  });

  test("does not propose a value the profile already holds", () => {
    const suggestions = suggestionsFromExtraction({
      extraction: extraction([
        claim({ field: "sector", value: "Climate", page: 1, quote: "Sector: Climate" }),
      ]),
      currentValues: { sector: "Climate" },
      sourceKey: "fundmatch_literal",
    });
    expect(suggestions).toEqual([]);
  });

  test("records which method produced the proposal", () => {
    const literal = suggestionsFromExtraction({
      extraction: extraction([claim()], "literal"),
      sourceKey: "fundmatch_literal",
    });
    const model = suggestionsFromExtraction({
      extraction: extraction([claim()], "openai"),
      sourceKey: "fundmatch_document_agent",
    });
    expect(literal[0]!.rationale).toContain("labelled line");
    expect(model[0]!.rationale).toContain("document agent");
  });
});

describe("readiness proposals", () => {
  const items = [
    {
      itemKey: "Financials-0",
      title: "Revenue, burn & runway",
      category: "Financials",
      status: "Missing",
    },
    {
      itemKey: "Team-0",
      title: "Founder bios & responsibilities",
      category: "Team",
      status: "Complete",
    },
    {
      itemKey: "Fundraise-0",
      title: "Current pitch deck",
      category: "Fundraise",
      status: "Missing",
    },
  ];

  test("never proposes Complete and never overwrites an item the founder moved", () => {
    const proposals = readinessProposals({
      template: "vc",
      items,
      claims: [
        claim(),
        claim({ field: "team", value: "3 founders", page: 1, quote: "Team: 3 founders" }),
      ],
      documentKind: "deck",
      sourceKey: "fundmatch_literal",
    });
    expect(proposals.every((item) => item.suggestedValue === "In progress")).toBe(true);
    expect(proposals.some((item) => item.fieldKey.endsWith("Team-0"))).toBe(false);
    expect(proposals.some((item) => item.fieldKey === "readiness:vc:Financials-0")).toBe(true);
  });

  test("the deck item needs an actual deck upload", () => {
    const asDeck = readinessProposals({
      template: "vc",
      items,
      claims: [claim()],
      documentKind: "deck",
      sourceKey: "fundmatch_literal",
    });
    const asLegal = readinessProposals({
      template: "vc",
      items,
      claims: [claim()],
      documentKind: "legal",
      sourceKey: "fundmatch_literal",
    });
    expect(asDeck.some((item) => item.fieldKey === "readiness:vc:Fundraise-0")).toBe(true);
    expect(asLegal.some((item) => item.fieldKey === "readiness:vc:Fundraise-0")).toBe(false);
  });

  test("proposes nothing when the document evidenced nothing", () => {
    expect(
      readinessProposals({
        template: "vc",
        items,
        claims: [],
        documentKind: "other",
        sourceKey: "fundmatch_literal",
      }),
    ).toEqual([]);
  });
});

describe("evidence boundary", () => {
  const context: AgentContext = {
    userId: "user-1",
    organizationId: "org-1",
    subjectType: "document",
    subjectId: deck.id,
    trigger: "document_uploaded",
    workflowVersion: "agentic-v1",
  };

  async function taskFor(): Promise<AgentTask> {
    const chunks = await chunkDocument(deck);
    return {
      id: "run-1:root:1",
      runId: "run-1",
      agent: "document",
      attempt: 1,
      depth: 0,
      payload: {},
      evidence: chunksToEvidence({ documentId: deck.id, chunks }),
    };
  }

  test("evidence is bounded and addressed by chunk locator", async () => {
    const chunks = await chunkDocument(deck);
    const evidence = chunksToEvidence({ documentId: deck.id, chunks, maxChunks: 1 });
    expect(evidence.length).toBe(1);
    expect(evidence[0]!.id).toBe(chunks[0]!.sourceLocator);
    expect(evidence[0]!.sourceId).toBe(deck.id);
  });

  test("anchored claims validate against the chunks they were drawn from", async () => {
    const task = await taskFor();
    const chunks = await chunkDocument(deck);
    const result = {
      summary: "Revenue and growth are stated on page 2.",
      data: {},
      claims: extractionToAgentClaims({ extraction: extraction([claim()]), chunks }),
      followUps: [],
    };
    expect(result.claims.length).toBe(1);
    expect(new EvidenceValidator().validate(task, result, context).outcome).toBe("valid");
  });

  test("a conflicting claim becomes needs_review rather than a silent winner", async () => {
    const task = await taskFor();
    const chunks = await chunkDocument(deck);
    const result = {
      summary: "Revenue is stated twice with different values.",
      data: {},
      claims: extractionToAgentClaims({
        extraction: extraction([claim({ conflict: true })]),
        chunks,
      }),
      followUps: [],
    };
    expect(new EvidenceValidator().validate(task, result, context).outcome).toBe("needs_review");
  });

  test("a claim citing evidence that was never supplied is rejected", async () => {
    const task = await taskFor();
    const result = {
      summary: "Invented source.",
      data: {},
      claims: [
        {
          id: "c1",
          statement: "revenue: 9900000",
          evidenceIds: ["document:other#page=9&part=1"],
          confidence: 0.9,
          uncertainty: "explicit" as const,
        },
      ],
      followUps: [],
    };
    expect(new EvidenceValidator().validate(task, result, context).outcome).toBe("rejected");
  });
});

describe("server-side reading of a real PDF", () => {
  /** Minimal one-page PDF with selectable text, built inline so no fixture binary is needed. */
  function pdfBytes(line: string): Uint8Array {
    const content = `BT /F1 12 Tf 20 100 Td (${line}) Tj ET`;
    const src = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${content.length}>>stream
${content}
endstream
endobj
trailer<</Root 1 0 R>>`;
    return Uint8Array.from(src, (character) => character.charCodeAt(0) & 0xff);
  }

  function fileFrom(name: string, bytes: Uint8Array, type: string) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return { name, size: bytes.byteLength, type, arrayBuffer: async () => buffer as ArrayBuffer };
  }

  test("a stored PDF becomes page-anchored chunks and reviewable proposals", async () => {
    const { readDocument } = await import("../src/lib/intelligence/documents");
    const { serverPdfReader } = await import("../src/lib/intelligence/pdf-reader");
    const { literalCandidates } = await import("../src/lib/intelligence/extraction");

    const source = await readDocument(
      fileFrom("acme-deck.pdf", pdfBytes("Annual revenue: 2400000"), "application/pdf"),
      serverPdfReader,
    );
    expect(source.pages[0]!.text).toContain("Annual revenue: 2400000");

    const chunks = await chunkDocument(source);
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.label).toBe("page 1");

    const built = buildExtraction(source, literalCandidates(source), "literal");
    const [suggestion] = suggestionsFromExtraction({
      extraction: built,
      sourceKey: "fundmatch_literal",
    });
    expect(suggestion!.fieldKey).toBe("metric:revenue");
    expect(suggestion!.suggestedValue).toBe("2400000");
    expect(suggestion!.sourceLocator).toBe("page 1");
  });

  test("a scanned PDF with no selectable text fails honestly instead of inventing text", async () => {
    const { readDocument } = await import("../src/lib/intelligence/documents");
    const { serverPdfReader } = await import("../src/lib/intelligence/pdf-reader");
    await expect(
      readDocument(fileFrom("scan.pdf", pdfBytes(" "), "application/pdf"), serverPdfReader),
    ).rejects.toThrow(/OCR|No selectable text/i);
  });
});

describe("extraction anchoring", () => {
  test("a fabricated quote is dropped before it can become a suggestion", () => {
    const built = buildExtraction(
      deck,
      [
        {
          field: "revenue",
          value: "9900000",
          page: 2,
          quote: "Annual revenue: 9900000",
          uncertainty: "explicit" as const,
        },
      ],
      "openai",
    );
    expect(built.claims).toEqual([]);
    expect(
      suggestionsFromExtraction({ extraction: built, sourceKey: "fundmatch_document_agent" }),
    ).toEqual([]);
  });
});
