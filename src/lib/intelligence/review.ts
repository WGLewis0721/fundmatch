import { ConfirmationSchema, IntelligenceError } from "./contracts";
import type {
  ConfirmedClaim,
  ConfirmedProfile,
  Confirmation,
  Extraction,
  ReadinessSuggestion,
} from "./contracts";
export function confirmExtraction(
  extraction: Extraction,
  input: Confirmation,
  current: ConfirmedProfile,
  reviewerId: string,
): ConfirmedProfile {
  const request = ConfirmationSchema.parse(input);
  if (!reviewerId)
    throw new IntelligenceError("UNAUTHORIZED", "An authenticated reviewer is required.");
  if (request.extractionId !== extraction.id)
    throw new IntelligenceError(
      "STALE_EXTRACTION",
      "The extraction has changed. Reload it before confirming.",
    );
  if (request.expectedVersion !== current.version)
    throw new IntelligenceError(
      "VERSION_CONFLICT",
      "The profile changed. Reload and review before saving.",
    );
  const seen = new Set<string>();
  const accepted: ConfirmedClaim[] = [];
  for (const d of request.decisions) {
    if (seen.has(d.claimId))
      throw new IntelligenceError("DUPLICATE_DECISION", "Each claim needs one decision.");
    seen.add(d.claimId);
    const c = extraction.claims.find((c) => c.id === d.claimId);
    if (!c)
      throw new IntelligenceError("UNKNOWN_CLAIM", "The claim is not part of this extraction.");
    if (d.action === "reject") continue;
    const value = d.action === "correct" ? d.correctedValue?.trim() : c.value;
    if (!value) throw new IntelligenceError("EMPTY_VALUE", "A confirmed value cannot be empty.");
    if ((d.action === "correct" || c.conflict) && !d.reason?.trim())
      throw new IntelligenceError(
        "REASON_REQUIRED",
        "Explain corrections and conflict resolutions.",
      );
    if (accepted.some((a) => a.field === c.field))
      throw new IntelligenceError("UNRESOLVED_CONFLICT", "Confirm only one value for each field.");
    accepted.push({
      uncertainty: c.uncertainty,
      field: c.field,
      value,
      originalValue: c.value,
      citation: { ...c.source, page: c.page, quote: c.quote },
      reviewerId,
      reviewedAt: new Date().toISOString(),
      correctionReason: d.reason?.trim() || null,
    });
  }
  if (!accepted.length)
    throw new IntelligenceError("NO_SELECTION", "Select at least one supported claim.");
  return {
    ...current,
    version: current.version + 1,
    claims: [
      ...current.claims.filter((c) => !accepted.some((a) => a.field === c.field)),
      ...accepted,
    ],
  };
}
export function readinessSuggestions(profile: ConfirmedProfile): ReadinessSuggestion[] {
  const definitions = [
    { id: "pitch", title: "Company story & pitch", fields: ["description", "business_model"] },
    { id: "team", title: "Founder and team information", fields: ["team"] },
    { id: "traction", title: "Traction evidence", fields: ["revenue", "growth"] },
    { id: "raise", title: "Funding ask & use of funds", fields: ["funding_ask", "use_of_funds"] },
  ];
  return definitions.flatMap((d) => {
    const claims = profile.claims.filter((c) => d.fields.includes(c.field));
    return claims.length
      ? [
          {
            id: d.id,
            title: d.title,
            proposedStatus: "Needs review" as const,
            evidence: claims.map((c) => c.citation),
            explanation: `${claims.length} confirmed profile field(s) support reviewing this item. Document validity, completeness and freshness still require a person.`,
            requiresHumanConfirmation: true as const,
          },
        ]
      : [];
  });
}
