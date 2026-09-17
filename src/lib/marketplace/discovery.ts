import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export const ELIGIBILITY_VERSION = "eligibility-v1";
export const SCORE_VERSION = "rules-v1";

export type DiscoveryDecision = Database["public"]["Enums"]["swipe_decision"];

export interface RankedCandidateAudit {
  startupId: string;
  score: number;
  rankPosition: number;
  scoreVersion?: string;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("FundMatch discovery returned no data.");
  return result.data;
}

/**
 * Starts a production discovery session bound to the signed-in user and
 * investor workspace. PostgreSQL re-derives authorization; the browser does
 * not get to choose org_id/user_id.
 */
export async function startDiscoverySession(
  investorId: string,
  filters: Json = {},
): Promise<string> {
  return unwrap(
    await supabase.rpc("start_discovery_session", {
      _investor_id: investorId,
      _filters: filters,
    }),
  );
}

/**
 * Returns only hard-eligible, undecided production startup ids.
 *
 * The database owns hard eligibility (privacy, stage, geography, conservative
 * minimum-cheque feasibility, explicit exclusions and prior decisions).
 * rules-v1 remains responsible for ranking/explanation after retrieval.
 */
export async function getEligibleDiscoveryCandidateIds(
  investorId: string,
  sessionId: string,
  limit = 100,
): Promise<string[]> {
  const rows = unwrap(
    await supabase.rpc("get_eligible_discovery_candidates", {
      _investor_id: investorId,
      _session_id: sessionId,
      _limit: limit,
    }),
  );
  return rows.map((row) => row.startup_id);
}

/**
 * Persists the exact candidates that were actually surfaced, including score
 * and rank metadata. Repeated writes for the same session/startup converge on
 * one impression event in PostgreSQL.
 */
export async function recordDiscoveryImpressions(
  sessionId: string,
  ranked: RankedCandidateAudit[],
): Promise<void> {
  for (const candidate of ranked) {
    unwrap(
      await supabase.rpc("record_discovery_impression", {
        _session_id: sessionId,
        _startup_id: candidate.startupId,
        _score: candidate.score,
        _score_version: candidate.scoreVersion ?? SCORE_VERSION,
        _rank_position: candidate.rankPosition,
        _eligibility_version: ELIGIBILITY_VERSION,
      }),
    );
  }
}

export async function recordDiscoveryProfileOpen(
  sessionId: string,
  startupId: string,
): Promise<string> {
  return unwrap(
    await supabase.rpc("record_discovery_profile_open", {
      _session_id: sessionId,
      _startup_id: startupId,
    }),
  );
}

/**
 * Atomically updates current decision state and appends the immutable audit
 * event. "Interested" may add the firm's private pipeline item but does not
 * create an introduction or expose founder contact details.
 */
export async function recordDiscoveryDecision(
  sessionId: string,
  startupId: string,
  decision: DiscoveryDecision,
): Promise<string> {
  return unwrap(
    await supabase.rpc("record_discovery_decision", {
      _session_id: sessionId,
      _startup_id: startupId,
      _decision: decision,
    }),
  );
}

/**
 * Clears the caller's current feed decisions while retaining immutable event
 * history. This is intentionally different from deleting audit records.
 */
export async function resetDiscoveryDecisions(investorId: string): Promise<number> {
  return unwrap(
    await supabase.rpc("reset_discovery_decisions", {
      _investor_id: investorId,
    }),
  );
}
