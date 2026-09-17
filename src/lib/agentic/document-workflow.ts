import type { Claim, Extraction, Field } from "../intelligence/contracts";
import type { DocumentChunk } from "./chunking";
import type { AgentClaim, EvidenceRef } from "./contracts";

/** One proposal row for `record_document_suggestions`. */
export interface SuggestionInput {
  fieldKey: string;
  label: string;
  suggestedValue: string;
  currentValue: string | null;
  confidence: number;
  rationale: string;
  sourceKey: string;
  sourceLocator: string;
  sourceExcerpt: string;
}

export interface ReadinessItemView {
  itemKey: string;
  title: string;
  category: string;
  status: string;
}

export const MAX_SUGGESTED_VALUE = 2000;
export const MAX_EXCERPT = 3000;

/**
 * What the worker can actually read today. The upload surface accepts more MIME
 * types than this on purpose (storing a file is useful even when analysis is
 * not), so the gap is reported to the founder rather than faked.
 */
export const PROCESSABLE_EXTENSIONS = ["pdf", "txt"] as const;

export function unsupportedFileReason(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if ((PROCESSABLE_EXTENSIONS as readonly string[]).includes(extension)) return null;
  return `Automatic analysis currently supports PDFs with selectable text and UTF-8 .txt files. ${fileName} is stored privately but was not analyzed.`;
}

/**
 * Maps extraction fields onto the keys `resolve_profile_suggestion` knows how to
 * promote. Free-text facts become company metrics rather than profile columns so
 * acceptance never has to coerce prose into a typed column.
 */
const FIELD_TARGETS: Record<Field, { fieldKey: string; label: string }> = {
  name: { fieldKey: "name", label: "Company name" },
  description: { fieldKey: "summary", label: "Company summary" },
  team: { fieldKey: "metric:team", label: "Team" },
  business_model: { fieldKey: "business_model", label: "Business model" },
  sector: { fieldKey: "sector", label: "Sector" },
  stage: { fieldKey: "stage", label: "Stage" },
  geography: { fieldKey: "geography", label: "Geography" },
  revenue: { fieldKey: "metric:revenue", label: "Revenue" },
  growth: { fieldKey: "metric:growth", label: "Growth" },
  funding_ask: { fieldKey: "funding_ask", label: "Funding ask" },
  use_of_funds: { fieldKey: "metric:use_of_funds", label: "Use of funds" },
};

/**
 * `startup_profiles.funding_ask` is numeric. Anything that is not a plain number
 * is proposed as a metric instead, so accepting can never fail on a cast.
 */
export function parsePlainNumber(value: string): number | null {
  const cleaned = value
    .trim()
    .replace(/^[$€£]\s?/, "")
    .replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function targetForClaim(claim: Claim): { fieldKey: string; label: string } {
  const target = FIELD_TARGETS[claim.field];
  if (claim.field === "funding_ask" && parsePlainNumber(claim.value) === null) {
    return { fieldKey: "metric:funding_ask", label: target.label };
  }
  return target;
}

function confidenceFor(claim: Claim): number {
  if (claim.conflict) return 0.35;
  return claim.uncertainty === "ambiguous" ? 0.45 : 0.75;
}

function rationaleFor(claim: Claim, method: Extraction["method"]): string {
  const how =
    method === "openai"
      ? "Proposed by the FundMatch document agent from your uploaded file."
      : "Read directly from a labelled line in your uploaded file.";
  const notes = [how, `Source: page ${claim.page}.`];
  if (claim.uncertainty === "ambiguous") {
    notes.push("The wording reads as a projection or estimate rather than a stated fact.");
  }
  if (claim.conflict) {
    notes.push("The document states more than one value for this field. Choose the correct one.");
  }
  notes.push("Nothing changes until you accept it.");
  return notes.join(" ");
}

/**
 * Turns anchored extraction claims into reviewable proposals. Conflicting values
 * are kept as separate proposals on purpose: the human resolves the conflict.
 */
export function suggestionsFromExtraction(input: {
  extraction: Extraction;
  currentValues?: Record<string, string | null | undefined>;
  sourceKey: string;
}): SuggestionInput[] {
  const { extraction, currentValues = {}, sourceKey } = input;
  const seen = new Set<string>();
  const suggestions: SuggestionInput[] = [];

  for (const claim of extraction.claims) {
    const value = claim.value.trim().slice(0, MAX_SUGGESTED_VALUE);
    if (!value) continue;
    const target = targetForClaim(claim);
    const key = `${target.fieldKey}::${value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const current = currentValues[target.fieldKey];
    if (current && current.trim() === value) continue;

    suggestions.push({
      fieldKey: target.fieldKey,
      label: target.label,
      suggestedValue: value,
      currentValue: current?.trim() || null,
      confidence: confidenceFor(claim),
      rationale: rationaleFor(claim, extraction.method),
      sourceKey,
      sourceLocator: `page ${claim.page}`,
      sourceExcerpt: claim.quote.slice(0, MAX_EXCERPT),
    });
  }

  return suggestions;
}

/** Readiness items are keyed `<Category>-<index>` by `ensure_readiness_items`. */
const READINESS_RULES: Array<{
  category: string;
  index: number;
  fields: Field[];
  /** Satisfied by the presence of a deck rather than by an extracted field. */
  deckOnly?: boolean;
}> = [
  { category: "Financials", index: 0, fields: ["revenue"] },
  { category: "Traction", index: 0, fields: ["revenue", "growth"] },
  { category: "Traction", index: 1, fields: ["growth"] },
  { category: "Team", index: 0, fields: ["team"] },
  { category: "Fundraise", index: 0, fields: [], deckOnly: true },
  { category: "Fundraise", index: 1, fields: ["funding_ask", "use_of_funds"] },
];

/**
 * Deterministic readiness proposals derived from what the document actually
 * evidenced. The proposed status is never `Complete`: a person still has to
 * judge completeness and freshness. Items a founder already moved off `Missing`
 * are left alone.
 */
export function readinessProposals(input: {
  template: "vc" | "pe";
  items: ReadinessItemView[];
  claims: Claim[];
  documentKind: string;
  sourceKey: string;
}): SuggestionInput[] {
  const { template, items, claims, documentKind, sourceKey } = input;
  const proposals: SuggestionInput[] = [];

  for (const rule of READINESS_RULES) {
    const itemKey = `${rule.category}-${rule.index}`;
    const item = items.find((candidate) => candidate.itemKey === itemKey);
    if (!item || item.status !== "Missing") continue;

    const supporting = rule.deckOnly
      ? documentKind === "deck"
        ? claims.slice(0, 1)
        : []
      : claims.filter((claim) => rule.fields.includes(claim.field));
    if (!rule.deckOnly && !supporting.length) continue;
    if (rule.deckOnly && documentKind !== "deck") continue;

    const evidence = supporting[0];
    const pages = [...new Set(supporting.map((claim) => claim.page))].sort((a, b) => a - b);
    const detail = rule.deckOnly
      ? "You uploaded a pitch deck for this company."
      : `The document supports this item on ${pages.length > 1 ? "pages" : "page"} ${pages.join(", ")}.`;

    proposals.push({
      fieldKey: `readiness:${template}:${itemKey}`,
      label: item.title,
      suggestedValue: "In progress",
      currentValue: item.status,
      confidence: 0.5,
      rationale: `${detail} Accepting marks it in progress; confirming that the material is complete and current is still your call.`,
      sourceKey,
      sourceLocator: evidence ? `page ${evidence.page}` : "uploaded document",
      sourceExcerpt: (evidence?.quote ?? "").slice(0, MAX_EXCERPT),
    });
  }

  return proposals;
}

/** Chunks become the only evidence a worker is allowed to cite. */
export function chunksToEvidence(input: {
  documentId: string;
  chunks: Array<Pick<DocumentChunk, "sourceLocator" | "label" | "content" | "contentSha256">>;
  maxChunks?: number;
  maxCharacters?: number;
}): EvidenceRef[] {
  const { documentId, chunks, maxChunks = 40, maxCharacters = 48000 } = input;
  const evidence: EvidenceRef[] = [];
  let budget = maxCharacters;

  for (const chunk of chunks.slice(0, maxChunks)) {
    if (budget <= 0) break;
    const excerpt = chunk.content.slice(0, Math.min(budget, 12000));
    if (!excerpt.trim()) continue;
    budget -= excerpt.length;
    evidence.push({
      id: chunk.sourceLocator,
      sourceType: "document",
      sourceId: documentId,
      locator: chunk.label,
      excerpt,
      contentSha256: chunk.contentSha256,
    });
  }

  return evidence;
}

/**
 * Anchored extraction claims, restated as agent claims so they can run through
 * the same evidence validator as model output.
 */
export function extractionToAgentClaims(input: {
  extraction: Extraction;
  chunks: Array<Pick<DocumentChunk, "sourceLocator" | "page">>;
}): AgentClaim[] {
  const { extraction, chunks } = input;
  return extraction.claims.flatMap((claim): AgentClaim[] => {
    const evidenceIds = chunks
      .filter((chunk) => chunk.page === claim.page)
      .map((chunk) => chunk.sourceLocator)
      .slice(0, 20);
    if (!evidenceIds.length) return [];
    return [
      {
        id: claim.id,
        statement: `${claim.field}: ${claim.value}`.slice(0, 4000),
        evidenceIds,
        confidence: confidenceFor(claim),
        uncertainty: claim.conflict
          ? "conflicting"
          : claim.uncertainty === "ambiguous"
            ? "inferred"
            : "explicit",
      },
    ];
  });
}
