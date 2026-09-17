import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StartupWithData, SwipeDecision } from "@/lib/domain";
import type { Workspace } from "@/lib/app-queries";
import {
  getEligibleDiscoveryCandidateIds,
  recordDiscoveryDecision,
  recordDiscoveryImpressions,
  recordDiscoveryProfileOpen,
  resetDiscoveryDecisions,
  resumeOrStartDiscoverySession,
} from "@/lib/marketplace/discovery";
import {
  impressionAudit,
  rankEligibleStartups,
  type RankedDiscoveryCandidate,
} from "@/lib/marketplace/discovery-feed";

const STARTUP_SELECT =
  "*, metrics:company_metrics(*), materials:founder_materials(*), provenance:source_provenance(*)";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export type ProductionDiscoveryFeed = {
  sessionId: string;
  ranked: RankedDiscoveryCandidate[];
};

export function useProductionDiscoveryFeed(ws: Workspace | undefined) {
  const investorId = ws?.investor?.id;
  return useQuery({
    queryKey: ["discovery-feed", investorId, ws?.investor?.thesis?.updated_at],
    enabled: Boolean(investorId),
    queryFn: async (): Promise<ProductionDiscoveryFeed> => {
      if (!ws?.investor) throw new Error("Set an investment thesis before discovery.");
      const sessionId = await resumeOrStartDiscoverySession(
        ws.investor.id,
        ws.investor.thesis?.updated_at ?? null,
      );
      const ids = await getEligibleDiscoveryCandidateIds(ws.investor.id, sessionId);
      if (ids.length === 0) return { sessionId, ranked: [] };
      const rows = must(
        await supabase.from("startup_profiles").select(STARTUP_SELECT).in("id", ids),
      ) as unknown as StartupWithData[];
      const byId = new Map(rows.map((row) => [row.id, row]));
      const eligible = ids
        .map((id) => byId.get(id))
        .filter((row): row is StartupWithData => Boolean(row));
      return { sessionId, ranked: rankEligibleStartups(eligible, ws.investor) };
    },
  });
}

export function useRecordDiscoveryDecision(ws: Workspace | undefined, sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: string; decision: SwipeDecision }) => {
      if (!ws?.investor || !sessionId) throw new Error("Discovery session is not ready.");
      await recordDiscoveryDecision(sessionId, input.startupId, input.decision);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["decisions"] });
      void qc.invalidateQueries({ queryKey: ["pipeline"] });
      void qc.invalidateQueries({ queryKey: ["discovery-feed"] });
    },
  });
}

export function useResetDiscoveryDecisions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (investorId: string) => {
      await resetDiscoveryDecisions(investorId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["decisions"] });
      void qc.invalidateQueries({ queryKey: ["discovery-feed"] });
    },
  });
}

export function useRecordSurfacedImpression(sessionId: string | undefined) {
  return useMutation({
    mutationFn: async (candidate: RankedDiscoveryCandidate) => {
      if (!sessionId) return;
      await recordDiscoveryImpressions(sessionId, impressionAudit([candidate]));
    },
  });
}

export function useRecordProfileOpen(sessionId: string | undefined) {
  return useMutation({
    mutationFn: async (startupId: string) => {
      if (!sessionId) return;
      await recordDiscoveryProfileOpen(sessionId, startupId);
    },
  });
}
