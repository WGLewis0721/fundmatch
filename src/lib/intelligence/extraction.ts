import {
  CandidateBatchSchema,
  DocumentSchema,
  FIELDS,
  IntelligenceError,
  LIMITS,
} from "./contracts";
import type { Candidate, Claim, Extraction, SourceDocument, Field } from "./contracts";
const labels: Record<string, Field> = {
  company: "name",
  "company name": "name",
  description: "description",
  "company description": "description",
  team: "team",
  "business model": "business_model",
  sector: "sector",
  stage: "stage",
  geography: "geography",
  "annual revenue": "revenue",
  revenue: "revenue",
  "yoy growth": "growth",
  growth: "growth",
  "funding ask": "funding_ask",
  raising: "funding_ask",
  "use of funds": "use_of_funds",
};
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
// A warning signal, not a complete injection detector. The AI provider has no tools.
export const suspicious = (s: string) =>
  /ignore\s+(all\s+)?(previous|prior)|system\s*prompt|developer\s*message|exfiltrat|send.{0,40}(secret|api.key)|mark.{0,20}(verified|complete)/i.test(
    s,
  );
export function literalCandidates(input: SourceDocument): Candidate[] {
  const doc = DocumentSchema.parse(input);
  const claims: Candidate[] = [];
  for (const p of doc.pages)
    for (const line of p.text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z ]{2,40}):\s*(.+?)\s*$/.exec(line);
      if (!match) continue;
      const field = labels[match[1]!.toLowerCase()];
      const value = match[2]!;
      if (
        !field ||
        value.length > 2000 ||
        suspicious(line) ||
        /^(unknown|not (provided|disclosed)|n\/a|tbd)$/i.test(value)
      )
        continue;
      claims.push({
        field,
        value,
        page: p.number,
        quote: line.trim(),
        uncertainty: /forecast|projected|target|estimate|~|approximately/i.test(value)
          ? "ambiguous"
          : "explicit",
      });
    }
  if (claims.length > LIMITS.claims)
    throw new IntelligenceError(
      "TOO_MANY_CLAIMS",
      "Too many claims. Split the deck into smaller documents.",
    );
  return claims;
}
export function buildExtraction(
  input: SourceDocument,
  raw: unknown,
  method: Extraction["method"],
): Extraction {
  const document = DocumentSchema.parse(input);
  const candidates = CandidateBatchSchema.parse({ claims: raw }).claims;
  const warnings: string[] = [];
  if (document.pages.some((p) => suspicious(p.text)))
    warnings.push(
      "Instruction-like content found. Document text is untrusted; review every claim.",
    );
  const claims: Claim[] = [];
  for (const candidate of candidates) {
    const p = document.pages.find((p) => p.number === candidate.page);
    // Exact source/value anchoring prevents fabricated quotes and normalized metrics.
    if (
      !normalize(candidate.value) ||
      !normalize(candidate.quote) ||
      /^(unknown|not (provided|disclosed)|n\/a|tbd)$/i.test(candidate.value.trim()) ||
      !p ||
      !normalize(p.text).includes(normalize(candidate.quote)) ||
      !normalize(candidate.quote).includes(normalize(candidate.value)) ||
      suspicious(candidate.quote)
    ) {
      warnings.push("An unsupported or instruction-like candidate was excluded.");
      continue;
    }
    if (
      claims.some(
        (c) =>
          c.field === candidate.field && c.value === candidate.value && c.page === candidate.page,
      )
    )
      continue;
    claims.push({
      ...candidate,
      uncertainty: /forecast|projected|target|estimate|~|approximately/i.test(candidate.quote)
        ? "ambiguous"
        : candidate.uncertainty,
      id: crypto.randomUUID(),
      source: { documentId: document.id, documentName: document.name, sha256: document.sha256 },
      status: "unreviewed",
      conflict: false,
    });
  }
  for (const c of claims)
    c.conflict = claims.some(
      (other) =>
        other.field === c.field &&
        normalize(other.value).toLowerCase() !== normalize(c.value).toLowerCase(),
    );
  if (claims.some((c) => c.conflict))
    warnings.push(
      "Conflicting values retained. Choose one value per field and explain your resolution.",
    );
  if (!claims.length)
    warnings.push(
      "No supported labeled fields found. Try AI extraction when connected, or add clear field labels to a text export.",
    );
  return {
    id: crypto.randomUUID(),
    document,
    claims,
    missing: FIELDS.filter((f) => !claims.some((c) => c.field === f)),
    warnings: [...new Set(warnings)],
    method,
    createdAt: new Date().toISOString(),
  };
}
export const extractLiteral = (doc: SourceDocument) =>
  buildExtraction(doc, literalCandidates(doc), "literal");
