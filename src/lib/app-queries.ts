/**
 * Organization-scoped data layer for the authenticated application.
 *
 * Every query runs through the browser Supabase client with the signed-in
 * user's JWT, so PostgreSQL row-level security (migration 0002) is the
 * authority. The filters below keep result sets small; they are not the
 * security boundary. Demo records (is_demo = true) are never returned to
 * real accounts by policy.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  InvestorWithThesis,
  Organization,
  PipelineStatus,
  Profile,
  StartupWithData,
  SwipeDecision,
  Swipe,
  TeamNote,
  PipelineItem,
} from "./domain";
import { useAuth } from "./auth";
import { validateDocument } from "./backend";

type Tables = Database["public"]["Tables"];
export type Membership = Tables["organization_members"]["Row"] & { organization: Organization };
export type MemberRole = Database["public"]["Enums"]["member_role"];
export type ReadinessItem = Tables["readiness_items"]["Row"];
export type DocumentRecord = Tables["documents"]["Row"];
export type Invitation = Tables["organization_invitations"]["Row"];
export type ProfileSuggestion = Tables["profile_suggestions"]["Row"];
export type PipelineWithStartup = PipelineItem & { startup: StartupWithData | null };

const STARTUP_SELECT =
  "*, metrics:company_metrics(*), materials:founder_materials(*), provenance:source_provenance(*)";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------------------------------------------------------------------------
// Workspace: who am I, which organizations, which one is active
// ---------------------------------------------------------------------------
export type Workspace = {
  userId: string;
  email: string;
  profile: Profile | null;
  memberships: Membership[];
  org: Organization | null;
  role: MemberRole | null;
  startup: StartupWithData | null;
  investor: InvestorWithThesis | null;
};

export const workspaceKey = (userId: string | undefined) =>
  ["workspace", userId ?? "anon"] as const;

export function useWorkspace() {
  const { user } = useAuth();
  return useQuery({
    queryKey: workspaceKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<Workspace> => {
      const userId = user!.id;
      const [profileRow, memberships] = await Promise.all([
        must(await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()),
        must(
          await supabase
            .from("organization_members")
            .select("*, organization:organizations(*)")
            .order("created_at"),
        ),
      ]);
      const profile = (profileRow ?? null) as Profile | null;
      const list = (memberships as unknown as Membership[]).filter((m) => m.organization);
      const active = list.find((m) => m.org_id === profile?.active_org_id) ?? list[0] ?? null;
      const org = active?.organization ?? null;
      let startup: StartupWithData | null = null;
      let investor: InvestorWithThesis | null = null;
      if (org?.type === "startup") {
        const rows = must(
          await supabase
            .from("startup_profiles")
            .select(STARTUP_SELECT)
            .eq("org_id", org.id)
            .order("created_at")
            .limit(1),
        );
        startup = (rows[0] as unknown as StartupWithData | undefined) ?? null;
      } else if (org?.type === "investment_firm") {
        const rows = must(
          await supabase
            .from("investor_profiles")
            .select("*, thesis:investor_theses(*)")
            .eq("org_id", org.id)
            .order("created_at")
            .limit(1),
        );
        const row = rows[0] as unknown as
          | (InvestorWithThesis & {
              thesis: InvestorWithThesis["thesis"][] | InvestorWithThesis["thesis"];
            })
          | undefined;
        if (row) {
          const thesis = Array.isArray(row.thesis) ? (row.thesis[0] ?? null) : row.thesis;
          investor = { ...row, thesis };
        }
      }
      return {
        userId,
        email: user!.email ?? "",
        profile,
        memberships: list,
        org,
        role: active?.member_role ?? null,
        startup,
        investor,
      };
    },
  });
}

function useInvalidateWorkspace() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => qc.invalidateQueries({ queryKey: workspaceKey(user?.id) });
}

export function useCreateOrganization() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      type: Organization["type"];
      website?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_organization", {
        _name: input.name,
        _type: input.type,
        _website: input.website ?? null,
        _description: input.description ?? null,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: invalidate,
  });
}

export function useSwitchOrganization() {
  const invalidate = useInvalidateWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ active_org_id: orgId })
        .eq("id", user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateMyProfile() {
  const invalidate = useInvalidateWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: { full_name?: string; avatar_emoji?: string }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------------------
// Members & invitations
// ---------------------------------------------------------------------------
export type MemberWithProfile = Tables["organization_members"]["Row"] & { profile: Profile | null };

export function useMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["members", orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const members = must(
        await supabase
          .from("organization_members")
          .select("*")
          .eq("org_id", orgId!)
          .order("created_at"),
      );
      const ids = members.map((m) => m.user_id);
      const profiles = ids.length
        ? must(await supabase.from("profiles").select("*").in("id", ids))
        : [];
      return members.map((m) => ({
        ...m,
        profile: profiles.find((p) => p.id === m.user_id) ?? null,
      }));
    },
  });
}

export function useInvitations(orgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["invitations", orgId],
    enabled: Boolean(orgId) && enabled,
    queryFn: async (): Promise<Invitation[]> =>
      must(
        await supabase
          .from("organization_invitations")
          .select("*")
          .eq("org_id", orgId!)
          .is("accepted_at", null)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useInviteMember(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: MemberRole }) => {
      const { error } = await supabase.rpc("invite_member", {
        _org_id: orgId!,
        _email: input.email,
        _member_role: input.role,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", orgId] }),
  });
}

export function useRevokeInvitation(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_invitations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", orgId] }),
  });
}

export function useRemoveMember(orgId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["members", orgId] });
      void invalidate();
    },
  });
}

export function useAcceptInvitation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------------------
// Founder: company profile, metrics, materials, readiness, documents
// ---------------------------------------------------------------------------
export type StartupPatch = Partial<
  Pick<
    Tables["startup_profiles"]["Update"],
    | "name"
    | "tagline"
    | "summary"
    | "story"
    | "sector"
    | "stage"
    | "geography"
    | "website"
    | "funding_ask"
    | "team_size"
    | "business_model"
    | "visibility"
    | "tags"
  >
>;

export function useSaveStartupProfile() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: StartupPatch;
      metrics?: { revenue?: number | null; growth?: number | null };
    }) => {
      const { error } = await supabase
        .from("startup_profiles")
        .update(input.patch)
        .eq("id", input.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (input.metrics) {
        const rows: Tables["company_metrics"]["Insert"][] = [];
        if (input.metrics.revenue !== undefined && input.metrics.revenue !== null)
          rows.push({
            startup_id: input.id,
            metric_key: "arr",
            label: "Annual revenue",
            value_numeric: input.metrics.revenue,
            value_display: `$${input.metrics.revenue.toLocaleString("en-US")}`,
            period: "Founder reported",
            source_key: "founder_input",
          });
        if (input.metrics.growth !== undefined && input.metrics.growth !== null)
          rows.push({
            startup_id: input.id,
            metric_key: "growth",
            label: "YoY growth",
            value_numeric: input.metrics.growth,
            value_display: `${input.metrics.growth}%`,
            period: "Founder reported",
            source_key: "founder_input",
          });
        const cleared = [
          input.metrics.revenue === null ? "arr" : null,
          input.metrics.growth === null ? "growth" : null,
        ].filter((key): key is string => Boolean(key));
        if (cleared.length) {
          const { error: clearError } = await supabase
            .from("company_metrics")
            .delete()
            .eq("startup_id", input.id)
            .in("metric_key", cleared);
          if (clearError)
            throw new Error(
              "Profile saved, but blank metrics could not be cleared. Retry saving your profile.",
            );
        }
        if (rows.length) {
          const { error: mErr } = await supabase.from("company_metrics").upsert(
            rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
            { onConflict: "startup_id,metric_key" },
          );
          if (mErr)
            throw new Error(
              "Profile saved, but metrics could not be saved. Retry saving your profile.",
            );
        }
      }
    },
    onSettled: invalidate,
  });
}

export function useAddMaterialLink() {
  const invalidate = useInvalidateWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { startupId: string; title: string; url: string }) => {
      const { error } = await supabase.from("founder_materials").insert({
        startup_id: input.startupId,
        title: input.title,
        kind: "link",
        url: input.url,
        source_key: "founder_input",
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useRemoveMaterial() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("founder_materials").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useReadiness(startupId: string | undefined, template: "vc" | "pe") {
  return useQuery({
    queryKey: ["readiness", startupId, template],
    enabled: Boolean(startupId),
    queryFn: async (): Promise<ReadinessItem[]> => {
      const { error } = await supabase.rpc("ensure_readiness_items", {
        _startup_id: startupId!,
        _template: template,
      });
      if (error) throw new Error(error.message);
      const rows = must(
        await supabase
          .from("readiness_items")
          .select("*")
          .eq("startup_id", startupId!)
          .eq("template", template),
      );
      const order = ["Company", "Team", "Financials", "Traction", "Fundraise", "Data room"];
      return rows.sort(
        (a, b) =>
          order.indexOf(a.category) - order.indexOf(b.category) ||
          a.item_key.localeCompare(b.item_key),
      );
    },
  });
}

export function useSaveReadinessItem(startupId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: ReadinessItem["status"];
      owner: string;
      due_date: string | null;
      evidence_url: string;
      notes: string;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from("readiness_items")
        .update({ ...patch, updated_by: user?.id ?? null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["readiness", startupId] }),
  });
}

export function useDocuments(orgId: string | undefined) {
  return useQuery({
    queryKey: ["documents", orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<DocumentRecord[]> =>
      must(
        await supabase
          .from("documents")
          .select("*")
          .eq("org_id", orgId!)
          .neq("status", "pending")
          .order("created_at", { ascending: false }),
      ),
    refetchInterval: (query) =>
      query.state.data?.some((d) => d.status === "processing" || d.status === "uploaded")
        ? 15000
        : false,
  });
}

/**
 * Upload flow (see docs/ASTRA_INTERFACE.md):
 *  1. insert a `documents` row with status = pending at <org>/<id>/<file>
 *  2. upload the bytes to the private `documents` bucket at that path
 *  3. call mark_document_uploaded(id), which verifies the object exists.
 * A failed upload removes the pending row so nothing dangles.
 */
export function useUploadDocument(orgId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      kind: DocumentRecord["kind"];
      startupId: string | null;
    }) => {
      const problem = validateDocument(input.file);
      if (problem) throw new Error(problem);
      const id = crypto.randomUUID();
      const path = `${orgId!}/${id}/${input.file.name}`;
      const { error: insertError } = await supabase.from("documents").insert({
        id,
        org_id: orgId!,
        startup_id: input.startupId,
        uploaded_by: user!.id,
        storage_path: path,
        file_name: input.file.name,
        mime_type: input.file.type,
        size_bytes: input.file.size,
        kind: input.kind,
      });
      if (insertError) throw new Error(insertError.message);
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, input.file, { contentType: input.file.type, upsert: false });
      if (uploadError) {
        await supabase.from("documents").delete().eq("id", id);
        throw new Error(uploadError.message);
      }
      const { error: markError } = await supabase.rpc("mark_document_uploaded", {
        _document_id: id,
      });
      if (markError) {
        await supabase.storage.from("documents").remove([path]);
        await supabase.from("documents").delete().eq("id", id);
        throw new Error(markError.message);
      }
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", orgId] }),
  });
}

/** Authorized download: the bytes are fetched with the user's JWT and saved locally. */
export async function downloadDocument(doc: DocumentRecord): Promise<void> {
  const { data, error } = await supabase.storage.from("documents").download(doc.storage_path);
  if (error) throw new Error(error.message);
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.file_name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useDeleteDocument(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: DocumentRecord) => {
      // Remove the bytes first (storage policy), then the record (RLS). The
      // database trigger also clears storage metadata if the record goes first.
      const { error: removeError } = await supabase.storage
        .from("documents")
        .remove([doc.storage_path]);
      if (removeError) throw new Error(removeError.message);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", orgId] }),
  });
}

export function useProfileSuggestions(startupId: string | undefined) {
  return useQuery({
    queryKey: ["suggestions", startupId],
    enabled: Boolean(startupId),
    queryFn: async (): Promise<ProfileSuggestion[]> =>
      must(
        await supabase
          .from("profile_suggestions")
          .select("*")
          .eq("startup_id", startupId!)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useResolveSuggestion(startupId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (input: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc("resolve_profile_suggestion", {
        _suggestion_id: input.id,
        _accept: input.accept,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["suggestions", startupId] });
      void invalidate();
    },
  });
}

// ---------------------------------------------------------------------------
// Investor: thesis, discovery, decisions, pipeline, notes
// ---------------------------------------------------------------------------
export type ThesisPatch = Pick<
  Tables["investor_theses"]["Insert"],
  | "sectors"
  | "stages"
  | "geographies"
  | "business_models"
  | "exclusions"
  | "check_min"
  | "check_max"
  | "min_growth_pct"
  | "summary"
>;

export function useSaveThesis() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (input: { investorId: string; patch: ThesisPatch }) => {
      const { error } = await supabase
        .from("investor_theses")
        .upsert(
          { investor_id: input.investorId, ...input.patch, updated_at: new Date().toISOString() },
          { onConflict: "investor_id" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useSaveInvestorProfile() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Pick<
        Tables["investor_profiles"]["Update"],
        "firm_name" | "description" | "hq" | "aum_label"
      >;
    }) => {
      const { error } = await supabase
        .from("investor_profiles")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

/** Listed (visibility = public) companies from real founder organizations. */
export function useListedStartups(enabled: boolean) {
  return useQuery({
    queryKey: ["listed-startups"],
    enabled,
    queryFn: async (): Promise<StartupWithData[]> =>
      must(
        await supabase
          .from("startup_profiles")
          .select(STARTUP_SELECT)
          .eq("visibility", "public")
          .order("name"),
      ) as unknown as StartupWithData[],
  });
}

export function useMyDecisions(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["decisions", user?.id],
    enabled: enabled && Boolean(user),
    queryFn: async (): Promise<Swipe[]> =>
      must(await supabase.from("swipes").select("*").eq("user_id", user!.id)),
  });
}

export function useRecordDecision(ws: Workspace | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: string; decision: SwipeDecision }) => {
      if (!ws?.investor || !ws.org) throw new Error("Set up your firm before making decisions.");
      const { error } = await supabase.from("swipes").upsert(
        {
          user_id: ws.userId,
          investor_id: ws.investor.id,
          startup_id: input.startupId,
          decision: input.decision,
        },
        { onConflict: "user_id,startup_id" },
      );
      if (error) throw new Error(error.message);
      if (input.decision === "save") {
        const { error: sErr } = await supabase
          .from("saved_companies")
          .upsert(
            { user_id: ws.userId, startup_id: input.startupId },
            { onConflict: "user_id,startup_id" },
          );
        if (sErr) throw new Error(sErr.message);
      }
      if (input.decision === "interested") {
        const { error: pErr } = await supabase.from("pipeline_items").upsert(
          {
            org_id: ws.org.id,
            investor_id: ws.investor.id,
            startup_id: input.startupId,
            owner_id: ws.userId,
            status: "new",
          },
          { onConflict: "investor_id,startup_id", ignoreDuplicates: true },
        );
        if (pErr) throw new Error(pErr.message);
      }
      await supabase.from("activity_events").insert({
        org_id: ws.org.id,
        startup_id: input.startupId,
        investor_id: ws.investor.id,
        actor_id: ws.userId,
        kind: input.decision,
        description:
          input.decision === "pass"
            ? "Passed from Discover"
            : input.decision === "save"
              ? "Saved for later"
              : "Marked interested and added to the pipeline",
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["decisions"] });
      void qc.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });
}

export function useResetDecisions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const a = await supabase.from("swipes").delete().eq("user_id", user!.id);
      if (a.error) throw new Error(a.error.message);
      const b = await supabase.from("saved_companies").delete().eq("user_id", user!.id);
      if (b.error) throw new Error(b.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });
}

export function usePipeline(orgId: string | undefined) {
  return useQuery({
    queryKey: ["pipeline", orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<PipelineWithStartup[]> =>
      must(
        await supabase
          .from("pipeline_items")
          .select(`*, startup:startup_profiles(${STARTUP_SELECT})`)
          .eq("org_id", orgId!)
          .order("updated_at", { ascending: false }),
      ) as unknown as PipelineWithStartup[],
  });
}

export function useMovePipeline(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: PipelineStatus }) => {
      const { error } = await supabase
        .from("pipeline_items")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline", orgId] }),
  });
}

export function useTeamNotes(orgId: string | undefined, startupId: string | undefined) {
  return useQuery({
    queryKey: ["notes", orgId, startupId],
    enabled: Boolean(orgId && startupId),
    queryFn: async (): Promise<TeamNote[]> =>
      must(
        await supabase
          .from("team_notes")
          .select("*")
          .eq("org_id", orgId!)
          .eq("startup_id", startupId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useAddTeamNote(ws: Workspace | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: string; body: string }) => {
      if (!ws?.org) throw new Error("No active organization.");
      const { error } = await supabase.from("team_notes").insert({
        org_id: ws.org.id,
        startup_id: input.startupId,
        investor_id: ws.investor?.id ?? null,
        author_id: ws.userId,
        author_name: ws.profile?.full_name || ws.email,
        body: input.body,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["notes", ws?.org?.id, v.startupId] }),
  });
}

export function useActivity(orgId: string | undefined) {
  return useQuery({
    queryKey: ["activity", orgId],
    enabled: Boolean(orgId),
    queryFn: async () =>
      must(
        await supabase
          .from("activity_events")
          .select("*")
          .eq("org_id", orgId!)
          .order("created_at", { ascending: false })
          .limit(30),
      ),
  });
}
