import type { InvestorWithThesis, StartupWithData } from "@/lib/domain";
import { matchEngine } from "@/lib/match-engine";
import { SCORE_VERSION, type RankedCandidateAudit } from "@/lib/marketplace/discovery";

export type RankedDiscoveryCandidate = {
  startup: StartupWithData;
  match: ReturnType<typeof matchEngine.score>;
  rankPosition: number;
};

/**
 * Rank already-eligible startups with the existing deterministic engine.
 * Eligibility is owned by PostgreSQL; this function must not re-implement
 * hard exclusions.
 */
export function rankEligibleStartups(
  eligible: StartupWithData[],
  investor: InvestorWithThesis,
): RankedDiscoveryCandidate[] {
  return matchEngine.rank(eligible, investor).map((row, index) => ({
    ...row,
    rankPosition: index + 1,
  }));
}

export function impressionAudit(ranked: RankedDiscoveryCandidate[]): RankedCandidateAudit[] {
  return ranked.map((row) => ({
    startupId: row.startup.id,
    score: row.match.score,
    rankPosition: row.rankPosition,
    scoreVersion: SCORE_VERSION,
  }));
}

export function filterRankedFeed(
  ranked: RankedDiscoveryCandidate[],
  filters: { sector: string; stage: string; query: string },
): RankedDiscoveryCandidate[] {
  const q = filters.query.trim().toLowerCase();
  return ranked.filter(({ startup: c }) => {
    if (filters.sector !== "All sectors" && c.sector !== filters.sector) return false;
    if (filters.stage !== "All stages" && c.stage !== filters.stage) return false;
    if (q && ![c.name, c.summary ?? ""].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
}
