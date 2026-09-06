import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityEvent,
  DataSource,
  Integration,
  IntroRequest,
  InvestorWithThesis,
  PipelineItem,
  PipelineStatus,
  Profile,
  StartupWithData,
  SwipeDecision,
  Swipe,
  TeamNote,
} from "./domain";

async function must<T>(res: { data: T | null; error: { message: string } | null }): Promise<T> {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const DEMO_INVESTOR_ID = "bbbbbbb1-0000-4000-8000-000000000001";
export const DEMO_STARTUP_IDS = {
  dippi: "aaaaaaa1-0000-4000-8000-000000000001",
  soapbox: "aaaaaaa1-0000-4000-8000-000000000002",
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<{ userId: string; email: string; profile: Profile | null } | null> => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const profile = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      return { userId: data.user.id, email: data.user.email ?? "", profile: profile.data };
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile> & { id: string }) => {
      const { error } = await supabase.from("profiles").upsert(patch).eq("id", patch.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useStartups() {
  return useQuery({
    queryKey: ["startups"],
    queryFn: async (): Promise<StartupWithData[]> => {
      const [startups, metrics, provenance, materials] = await Promise.all([
        must(await supabase.from("startup_profiles").select("*").order("name")),
        must(await supabase.from("company_metrics").select("*")),
        must(await supabase.from("source_provenance").select("*")),
        must(await supabase.from("founder_materials").select("*")),
      ]);
      return (startups as StartupWithData[]).map((s) => ({
        ...s,
        metrics: (metrics as StartupWithData["metrics"]).filter((m) => m.startup_id === s.id),
        provenance: (provenance as StartupWithData["provenance"]).filter((p) => p.startup_id === s.id),
        materials: (materials as StartupWithData["materials"]).filter((m) => m.startup_id === s.id),
      }));
    },
  });
}

export function useInvestors() {
  return useQuery({
    queryKey: ["investors"],
    queryFn: async (): Promise<InvestorWithThesis[]> => {
      const [investors, theses] = await Promise.all([
        must(await supabase.from("investor_profiles").select("*").order("firm_name")),
        must(await supabase.from("investor_theses").select("*")),
      ]);
      return (investors as InvestorWithThesis[]).map((i) => ({
        ...i,
        thesis: (theses as NonNullable<InvestorWithThesis["thesis"]>[]).find((t) => t.investor_id === i.id) ?? null,
      }));
    },
  });
}

export function useSwipes() {
  return useQuery({
    queryKey: ["swipes"],
    queryFn: async (): Promise<Swipe[]> => must(await supabase.from("swipes").select("*")),
  });
}

export function useRecordSwipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: string; investorId: string | null; decision: SwipeDecision }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("swipes").upsert(
        {
          user_id: auth.user.id,
          startup_id: input.startupId,
          investor_id: input.investorId,
          decision: input.decision,
        },
        { onConflict: "user_id,startup_id" },
      );
      if (error) throw new Error(error.message);

      if (input.decision === "save") {
        await supabase
          .from("saved_companies")
          .upsert({ user_id: auth.user.id, startup_id: input.startupId }, { onConflict: "user_id,startup_id" });
      }
      if (input.decision === "interested" && input.investorId) {
        await supabase
          .from("pipeline_items")
          .upsert(
            { investor_id: input.investorId, startup_id: input.startupId, status: "new", owner_id: auth.user.id },
            { onConflict: "investor_id,startup_id" },
          );
      }
      await supabase.from("activity_events").insert({
        startup_id: input.startupId,
        investor_id: input.investorId,
        actor_id: auth.user.id,
        kind: input.decision,
        description:
          input.decision === "pass"
            ? "An investor passed from Discover"
            : input.decision === "save"
              ? "An investor saved this company"
              : "An investor marked interest and added the company to their pipeline",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swipes"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ["pipeline"],
    queryFn: async (): Promise<PipelineItem[]> =>
      must(await supabase.from("pipeline_items").select("*").order("updated_at", { ascending: false })),
  });
}

export function useMovePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: PipelineStatus }) => {
      const { error } = await supabase
        .from("pipeline_items")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });
}

export function useAddToPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: string; investorId: string }) => {
      const { error } = await supabase.from("pipeline_items").upsert(
        { startup_id: input.startupId, investor_id: input.investorId, status: "new" },
        { onConflict: "investor_id,startup_id" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });
}

export function useNotes(startupId?: string) {
  return useQuery({
    queryKey: ["notes", startupId ?? "all"],
    queryFn: async (): Promise<TeamNote[]> => {
      let q = supabase.from("team_notes").select("*").order("created_at", { ascending: false });
      if (startupId) q = q.eq("startup_id", startupId);
      return must(await q);
    },
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: string; investorId: string | null; body: string; authorName: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("team_notes").insert({
        startup_id: input.startupId,
        investor_id: input.investorId,
        author_id: auth.user?.id ?? null,
        author_name: input.authorName,
        body: input.body,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useActivity(startupId?: string) {
  return useQuery({
    queryKey: ["activity", startupId ?? "all"],
    queryFn: async (): Promise<ActivityEvent[]> => {
      let q = supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(60);
      if (startupId) q = q.eq("startup_id", startupId);
      return must(await q);
    },
  });
}

export function useIntroRequests(startupId?: string) {
  return useQuery({
    queryKey: ["intros", startupId ?? "all"],
    queryFn: async (): Promise<IntroRequest[]> => {
      let q = supabase.from("intro_requests").select("*").order("created_at", { ascending: false });
      if (startupId) q = q.eq("startup_id", startupId);
      return must(await q);
    },
  });
}

export function useRequestIntro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: string; investorId: string | null; message: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("intro_requests").insert({
        startup_id: input.startupId,
        investor_id: input.investorId,
        requester_id: auth.user?.id ?? null,
        message: input.message,
      });
      if (error) throw new Error(error.message);
      await supabase.from("activity_events").insert({
        startup_id: input.startupId,
        investor_id: input.investorId,
        kind: "intro",
        description: "An investor requested an intro",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intros"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useDataSources() {
  return useQuery({
    queryKey: ["data_sources"],
    queryFn: async (): Promise<DataSource[]> => must(await supabase.from("data_sources").select("*")),
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async (): Promise<Integration[]> => must(await supabase.from("integrations").select("*")),
  });
}

export function useToggleIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orgId: string; sourceKey: string; connect: boolean }) => {
      const { error } = await supabase.from("integrations").upsert(
        {
          org_id: input.orgId,
          source_key: input.sourceKey,
          status: input.connect ? "connected" : "available",
          mode: "demo",
          connected_at: input.connect ? new Date().toISOString() : null,
          last_sync_at: input.connect ? new Date().toISOString() : null,
        },
        { onConflict: "org_id,source_key" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useSaveStartup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("startup_profiles")
        .update({ ...input.patch, updated_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["startups"] }),
  });
}

export function useSaveThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { investorId: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("investor_theses")
        .upsert(
          { investor_id: input.investorId, ...input.patch, updated_at: new Date().toISOString() },
          { onConflict: "investor_id" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investors"] }),
  });
}

export function useResetDemoDecisions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      await supabase.from("swipes").delete().eq("user_id", auth.user.id);
      await supabase.from("saved_companies").delete().eq("user_id", auth.user.id);
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
