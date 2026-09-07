import type {
  ConfirmedProfile,
  InvestorPreferences,
  MatchCriterion,
  SourcedMatch,
} from "./contracts";
const normalize = (s: string) => s.trim().toLocaleLowerCase();
/** Categorical preferences are exact, confirmed values. Unknown evidence never earns points. */
export function matchProfile(profile: ConfirmedProfile, prefs: InvestorPreferences): SourcedMatch {
  const criteria: MatchCriterion[] = [];
  const dimensions = [
    ["sector", prefs.sectors],
    ["stage", prefs.stages],
    ["geography", prefs.geographies],
    ["business_model", prefs.businessModels],
  ] as const;
  for (const [field, allowed] of dimensions) {
    if (!allowed.length) continue;
    const claim = profile.claims.find((c) => c.field === field && c.uncertainty === "explicit");
    const ok = claim && allowed.some((a) => normalize(a) === normalize(claim.value));
    criteria.push({
      field,
      status: !claim ? "unknown" : ok ? "match" : "mismatch",
      detail: !claim
        ? `No confirmed ${field.replace("_", " ")}.`
        : `${claim.value}: ${ok ? "matches" : "does not exactly match"} ${allowed.join(", ")}.`,
      citation: claim?.citation ?? null,
    });
  }
  // Exclusions use categorical equality, never substring-search arbitrary deck instructions.
  for (const c of profile.claims.filter((c) =>
    ["sector", "stage", "geography", "business_model"].includes(c.field),
  )) {
    if (prefs.exclusions.some((e) => normalize(e) === normalize(c.value)))
      criteria.push({
        field: c.field,
        status: "excluded",
        detail: `${c.value} is explicitly excluded by this thesis.`,
        citation: c.citation,
      });
  }
  if (prefs.minGrowth !== null) {
    const c = profile.claims.find((c) => c.field === "growth" && c.uncertainty === "explicit");
    const parsed = c?.value.match(/^([0-9]+(?:\.[0-9]+)?)%\s+(?:YoY|year.over.year)$/i);
    const growth = parsed ? Number(parsed[1]) : null;
    criteria.push({
      field: "growth",
      status: growth === null ? "unknown" : growth >= prefs.minGrowth ? "match" : "mismatch",
      detail:
        growth === null
          ? "Confirmed, explicit year-over-year growth is needed; forecasts and unspecified periods are not comparable."
          : `${growth}% YoY against a ${prefs.minGrowth}% minimum.`,
      citation: c?.citation ?? null,
    });
  }
  const questions = criteria
    .filter((c) => c.status === "unknown" || c.status === "mismatch")
    .map((c) => c.detail);
  if (prefs.checkMin !== null || prefs.checkMax !== null) {
    const ask = profile.claims.find((c) => c.field === "funding_ask");
    questions.push(
      `${ask ? `Confirmed total raise: ${ask.value}. ` : ""}Confirm the desired individual investment and currency before comparing with the investor’s ${prefs.currency} check range. A round size is not a check size.`,
    );
  }
  const excluded = criteria.some((c) => c.status === "excluded");
  const known = criteria.filter((c) => c.status !== "unknown").length;
  const matched = criteria.filter((c) => c.status === "match").length;
  return {
    eligible: !criteria.some((c) => c.status === "mismatch" || c.status === "excluded"),
    score:
      !criteria.length || !known
        ? null
        : excluded
          ? 0
          : Math.round((matched / criteria.length) * 100),
    coverage: criteria.length ? Math.round((known / criteria.length) * 100) : 0,
    criteria,
    explanations: criteria
      .filter((c) => c.citation)
      .map((c) => `${c.detail} Source: ${c.citation!.documentName}, page ${c.citation!.page}.`),
    questions,
    method: "confirmed-evidence-rules",
  };
}
