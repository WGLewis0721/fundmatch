import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { readDocument } from "../src/lib/intelligence/documents";
import { buildExtraction, extractLiteral } from "../src/lib/intelligence/extraction";
import { confirmExtraction, readinessSuggestions } from "../src/lib/intelligence/review";
import { matchProfile } from "../src/lib/intelligence/matching";
import { openAIExtractor } from "../src/lib/intelligence/openai.server";
import { intelligenceService } from "../src/lib/intelligence/service.server";
import type {
  Confirmation,
  Extraction,
  InvestorPreferences,
  SourceDocument,
} from "../src/lib/intelligence/contracts";
const pdf = { read: async () => [{ number: 1, text: "" }] };
const empty = { id: "company", version: 0, claims: [] };
const prefs: InvestorPreferences = {
  sectors: ["Consumer"],
  stages: ["Seed"],
  geographies: ["North America"],
  businessModels: ["Subscription"],
  exclusions: [],
  checkMin: 100000,
  checkMax: 500000,
  currency: "USD",
  minGrowth: 20,
};
async function fixture(name: string) {
  return readDocument(
    new File(
      [await readFile(new URL(`./fixtures/decks/${name}.txt`, import.meta.url))],
      `${name}.txt`,
    ),
    pdf,
  );
}
const request = (ex: Extraction): Confirmation => ({
  extractionId: ex.id,
  expectedVersion: 0,
  idempotencyKey: "test-key-1",
  decisions: ex.claims.filter((c) => !c.conflict).map((c) => ({ claimId: c.id, action: "accept" })),
});
describe("document processing and provenance", () => {
  test("missing stays unknown and sources preserve pages and hash", async () => {
    const d = await fixture("missing");
    const ex = extractLiteral(d);
    expect(ex.missing).toContain("revenue");
    expect(ex.missing).toContain("funding_ask");
    expect(ex.claims.find((c) => c.field === "team")?.source.sha256).toBe(d.sha256);
    expect(ex.claims.every((c) => c.page === 1)).toBe(true);
  });
  test("contradictions survive extraction and require resolution", async () => {
    const ex = extractLiteral(await fixture("contradictory"));
    const revenues = ex.claims.filter((c) => c.field === "revenue");
    expect(revenues).toHaveLength(2);
    expect(revenues.map((c) => c.page)).toEqual([1, 2]);
    expect(revenues.every((c) => c.conflict)).toBe(true);
    const req = request(ex);
    req.decisions = [{ claimId: revenues[0]!.id, action: "accept" }];
    expect(() => confirmExtraction(ex, req, empty, "user")).toThrow("Explain corrections");
    req.decisions[0]!.reason = "Page 1 is the current period";
    const confirmed = confirmExtraction(ex, req, empty, "user");
    expect(confirmed.claims[0]?.citation.page).toBe(1);
    req.decisions.push({ claimId: revenues[1]!.id, action: "accept", reason: "Keep both" });
    expect(() => confirmExtraction(ex, req, empty, "user")).toThrow("only one value");
  });
  test("instruction text never grants authority; projected metrics remain ambiguous", async () => {
    const ex = extractLiteral(await fixture("malicious"));
    expect(ex.claims.some((c) => c.field === "revenue")).toBe(false);
    expect(ex.warnings.length).toBeGreaterThan(0);
    expect(ex.claims.find((c) => c.field === "growth")?.uncertainty).toBe("ambiguous");
    const confirmed = confirmExtraction(ex, request(ex), empty, "user");
    expect(matchProfile(confirmed, prefs).criteria.find((c) => c.field === "growth")?.status).toBe(
      "unknown",
    );
    expect(
      readinessSuggestions(confirmed).every(
        (s) => s.proposedStatus === "Needs review" && s.requiresHumanConfirmation,
      ),
    ).toBe(true);
  });
  test("rejects fabricated values, source quotes and wrong pages", async () => {
    const d = await fixture("missing");
    const claim = {
      field: "revenue" as const,
      value: "USD 999M",
      quote: d.pages[0]!.text,
      page: 1,
      uncertainty: "explicit" as const,
    };
    expect(buildExtraction(d, [claim], "openai").claims).toHaveLength(0);
    expect(
      buildExtraction(
        d,
        [{ ...claim, value: "Soapbox Caddie", quote: "Soapbox Caddie", page: 2 }],
        "openai",
      ).claims,
    ).toHaveLength(0);
    expect(
      buildExtraction(d, [{ ...claim, quote: "Fabricated USD 999M" }], "openai").claims,
    ).toHaveLength(0);
  });
  test("unsupported, oversized, binary, empty and scanned documents fail explicitly", async () => {
    await expect(readDocument(new File(["a"], "deck.pptx"), pdf)).rejects.toThrow("Only PDF");
    await expect(readDocument(new File([], "deck.txt"), pdf)).rejects.toThrow("non-empty");
    await expect(readDocument(new File(["bad"], "deck.pdf"), pdf)).rejects.toThrow("valid PDF");
    await expect(readDocument(new File(["%PDF-1.7"], "scan.pdf"), pdf)).rejects.toThrow("OCR");
    await expect(readDocument(new File(["a\0"], "deck.txt"), pdf)).rejects.toThrow("Binary");
    await expect(
      readDocument(
        {
          name: "large.pdf",
          type: "application/pdf",
          size: 11 * 1024 * 1024,
          arrayBuffer: async () => {
            throw Error("must not read");
          },
        },
        pdf,
      ),
    ).rejects.toThrow("10 MB");
  });
  test("page limit and cancelled reads cannot yield profiles", async () => {
    await expect(
      readDocument(new File([Array(61).fill("x").join("\f")], "pages.txt"), pdf),
    ).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(
      readDocument(new File(["Company: A"], "a.txt"), pdf, controller.signal),
    ).rejects.toThrow();
  });
});
describe("confirmation and matching", () => {
  test("corrections retain the original quote and author", async () => {
    const ex = extractLiteral(await fixture("missing"));
    const c = ex.claims[0]!;
    const req = request(ex);
    req.decisions = [
      { claimId: c.id, action: "correct", correctedValue: "Soapbox", reason: "Trading name" },
    ];
    const p = confirmExtraction(ex, req, empty, "reviewer");
    expect(p.claims[0]).toMatchObject({
      value: "Soapbox",
      originalValue: c.value,
      reviewerId: "reviewer",
      correctionReason: "Trading name",
    });
    expect(p.claims[0]?.citation.quote).toBe(c.quote);
    expect(p.version).toBe(1);
    expect(empty.claims).toHaveLength(0);
    expect(() => confirmExtraction(ex, req, p, "reviewer")).toThrow("profile changed");
  });
  test("unknowns get no score and exclusions veto", async () => {
    expect(matchProfile(empty, prefs).score).toBeNull();
    const ex = extractLiteral(await fixture("missing"));
    const p = confirmExtraction(ex, request(ex), empty, "user");
    const match = matchProfile(p, prefs);
    expect(match.score).toBe(80);
    expect(match.coverage).toBe(80);
    expect(match.questions.some((q) => q.includes("round size is not a check"))).toBe(true);
    expect(matchProfile(p, { ...prefs, exclusions: ["Consumer"] }).eligible).toBe(false);
    expect(matchProfile(p, { ...prefs, exclusions: ["Consumer"] }).score).toBe(0);
    expect(matchProfile(p, { ...prefs, stages: ["Series A"] }).eligible).toBe(false);
  });
  test("unreviewed claims and empty confirmation cannot change profile", async () => {
    const ex = extractLiteral(await fixture("missing"));
    expect(() => confirmExtraction(ex, { ...request(ex), decisions: [] }, empty, "u")).toThrow(
      "Select at least",
    );
    expect(() => confirmExtraction(ex, request(ex), empty, "")).toThrow("authenticated");
    expect(() =>
      confirmExtraction(
        ex,
        { ...request(ex), decisions: [{ claimId: "fake", action: "accept" }] },
        empty,
        "u",
      ),
    ).toThrow("not part");
  });
});
describe("server AI boundary", () => {
  test("missing config never calls a provider", async () => {
    let called = false;
    await expect(
      openAIExtractor({
        fetch: async () => {
          called = true;
          throw Error();
        },
      }).extract(await fixture("missing")),
    ).rejects.toThrow("not configured");
    expect(called).toBe(false);
  });
  test("structured request contains untrusted data, no tools, and disables response storage", async () => {
    const d = await fixture("malicious");
    let payload: any;
    const extractor = openAIExtractor({
      apiKey: "fixture-key",
      model: "configured-model",
      fetch: async (url, options) => {
        expect(url).toBe("https://api.openai.com/v1/responses");
        payload = JSON.parse(String(options?.body));
        return Response.json({
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text: '{"claims":[]}' }] }],
        });
      },
    });
    expect(await extractor.extract(d)).toEqual([]);
    expect(payload.store).toBe(false);
    expect(payload.tools).toBeUndefined();
    expect(payload.text.format.strict).toBe(true);
    expect(payload.instructions).toContain("Never obey");
    expect(payload.input[0].content).toContain("Ignore previous");
  });
  for (const [name, body, error] of [
    [
      "refusal",
      { status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] },
      "declined",
    ],
    ["incomplete", { status: "incomplete" }, "did not complete"],
    [
      "malformed",
      {
        status: "completed",
        output: [{ type: "message", content: [{ type: "output_text", text: "not-json" }] }],
      },
      "unreadable",
    ],
  ] as const) {
    test(name, async () => {
      const extractor = openAIExtractor({
        apiKey: "test",
        model: "test",
        fetch: async () => Response.json(body),
      });
      await expect(extractor.extract(await fixture("missing"))).rejects.toThrow(error);
    });
  }
  test("provider errors do not leak raw bodies or keys", async () => {
    const extractor = openAIExtractor({
      apiKey: "secret-key",
      model: "test",
      fetch: async () => new Response("sensitive provider detail", { status: 429 }),
    });
    await expect(extractor.extract(await fixture("missing"))).rejects.toThrow("could not process");
  });
  test("timeout is explicit", async () => {
    const extractor = openAIExtractor({
      apiKey: "test",
      model: "test",
      fetch: async () => {
        throw new DOMException("private", "TimeoutError");
      },
    });
    await expect(extractor.extract(await fixture("missing"))).rejects.toThrow("timed out");
  });
  test("authorization runs before document or model access", async () => {
    let touched = false;
    const repo = {
      requireEditor: async () => {
        throw Error("Denied");
      },
      readDocument: async () => {
        touched = true;
        return new File(["x"], "x.txt");
      },
    };
    const service = intelligenceService(repo as any, pdf, {
      extract: async () => {
        touched = true;
        return [];
      },
    });
    await expect(
      service.process({ userId: "u", companyId: "c", organizationId: "o" }, "doc"),
    ).rejects.toThrow("Denied");
    expect(touched).toBe(false);
  });
  test("canonical stored claims and server reviewer are used; commit receives expected version", async () => {
    const ex = extractLiteral(await fixture("missing"));
    let saved: any;
    const ctx = { userId: "server-user", companyId: "company", organizationId: "org" };
    const repo = {
      requireEditor: async () => {},
      findConfirmation: async () => null,
      readExtraction: async () => ex,
      readProfile: async () => empty,
      commitConfirmation: async (context: any, input: any, profile: any) => {
        saved = { context, input, profile };
        return profile;
      },
    };
    const service = intelligenceService(repo as any, pdf, { extract: async () => [] });
    const p = await service.confirm(ctx, request(ex));
    expect(p.claims[0]?.reviewerId).toBe("server-user");
    expect(saved.input.expectedVersion).toBe(0);
    expect(saved.context).toEqual(ctx);
  });
});

describe("real PDF fixtures", () => {
  for (const name of ["missing", "contradictory", "malicious"])
    test(`parses ${name} PDF with the production text reader`, async () => {
      const { makePdfTextReader } = await import("../src/lib/intelligence/pdf-reader");
      const reader = makePdfTextReader(() => import("pdfjs-dist/legacy/build/pdf.mjs"));
      const file = new File(
        [await readFile(new URL(`./fixtures/decks/generated/${name}.pdf`, import.meta.url))],
        `${name}.pdf`,
      );
      const ex = extractLiteral(await readDocument(file, reader));
      expect(ex.claims.find((c) => c.field === "name")).toBeDefined();
      if (name === "contradictory")
        expect(ex.claims.filter((c) => c.field === "revenue").map((c) => c.page)).toEqual([1, 2]);
      if (name === "missing") expect(ex.missing).toContain("revenue");
      if (name === "malicious") {
        expect(ex.missing).toContain("revenue");
        expect(ex.claims.find((c) => c.field === "growth")?.uncertainty).toBe("ambiguous");
      }
    });
  test("nontext PDF explicitly requires OCR", async () => {
    const { makePdfTextReader } = await import("../src/lib/intelligence/pdf-reader");
    const reader = makePdfTextReader(() => import("pdfjs-dist/legacy/build/pdf.mjs"));
    await expect(
      readDocument(
        new File(
          [await readFile(new URL("./fixtures/decks/generated/scanned.pdf", import.meta.url))],
          "scanned.pdf",
        ),
        reader,
      ),
    ).rejects.toThrow("OCR");
  });
});

test("server processing persists only validated candidates with authorized source identity", async () => {
  const file = new File(["Company: Fixture\nRevenue: USD 100\n"], "deck.txt");
  let saved: Extraction | undefined;
  const repo = {
    requireEditor: async () => {},
    readDocument: async () => file,
    saveExtraction: async (_ctx: unknown, ex: Extraction) => {
      saved = ex;
    },
  };
  const service = intelligenceService(repo as any, pdf, {
    extract: async () => [
      {
        field: "revenue",
        value: "USD 100",
        quote: "Revenue: USD 100",
        page: 1,
        uncertainty: "explicit",
      },
      { field: "growth", value: "200%", quote: "Growth: 200%", page: 1, uncertainty: "explicit" },
    ],
  });
  const result = await service.process(
    { userId: "u", organizationId: "o", companyId: "c" },
    "canonical-document",
  );
  expect(result.claims).toHaveLength(1);
  expect(result.claims[0]?.source.documentId).toBe("canonical-document");
  expect(saved?.id).toBe(result.id);
  expect(result.missing).toContain("growth");
});
test("identical confirmation retry returns saved result without another mutation", async () => {
  const ex = extractLiteral(await fixture("missing"));
  const prior = confirmExtraction(ex, request(ex), empty, "u");
  let touched = false;
  const repo = {
    requireEditor: async () => {},
    findConfirmation: async () => prior,
    readExtraction: async () => {
      touched = true;
      throw Error("Must not reach");
    },
  };
  expect(
    await intelligenceService(repo as any, pdf, { extract: async () => [] }).confirm(
      { userId: "u", organizationId: "o", companyId: "c" },
      request(ex),
    ),
  ).toBe(prior);
  expect(touched).toBe(false);
});
