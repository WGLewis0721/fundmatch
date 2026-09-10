import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Compass,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Brand } from "@/routes/index";
import { LoadingCard, RequireSession } from "@/components/fundmatch/app-shell";
import { useAuth } from "@/lib/auth";
import {
  downloadDocument,
  useActivity,
  useAddMaterialLink,
  useAddTeamNote,
  useDeleteDocument,
  useDocuments,
  useInvitations,
  useInviteMember,
  useListedStartups,
  useMembers,
  useMovePipeline,
  useMyDecisions,
  usePipeline,
  useProfileSuggestions,
  useReadiness,
  useRecordDecision,
  useRemoveMaterial,
  useRemoveMember,
  useResetDecisions,
  useResolveSuggestion,
  useRevokeInvitation,
  useSaveInvestorProfile,
  useSaveReadinessItem,
  useSaveStartupProfile,
  useSaveThesis,
  useSwitchOrganization,
  useTeamNotes,
  useUploadDocument,
  useWorkspace,
  type DocumentRecord,
  type ReadinessItem,
  type Workspace,
} from "@/lib/app-queries";
import { DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, describeError } from "@/lib/backend";
import { matchEngine } from "@/lib/match-engine";
import {
  BUSINESS_MODELS,
  GEOGRAPHIES,
  SECTORS,
  STAGES,
  metricValue,
  profileCompleteness,
} from "@/lib/domain";
import type { PipelineStatus, StartupWithData, SwipeDecision } from "@/lib/domain";
import { money, safeUrl } from "@/lib/demo-data";
import { timeAgo } from "@/lib/format";

import { FounderBuilder } from "@/components/fundmatch/founder-builder";
import { FounderJourney } from "@/components/fundmatch/founder-journey";
import { InvestorPacket } from "@/components/fundmatch/investor-packet";
import { fromStartup } from "@/lib/founder-readiness";
const VIEWS = [
  "discover",
  "pipeline",
  "insights",
  "thesis",
  "overview",
  "profile",
  "readiness",
  "materials",
  "packet",
  "team",
  "company",
] as const;
type View = (typeof VIEWS)[number];

export const Route = createFileRoute("/app/")({
  validateSearch: (s: Record<string, unknown>): { view?: View; company?: string } => ({
    ...(VIEWS.includes(s["view"] as View) ? { view: s["view"] as View } : {}),
    ...(typeof s["company"] === "string" ? { company: s["company"] } : {}),
  }),
  component: () => (
    <RequireSession>
      <WorkspaceShell />
    </RequireSession>
  ),
});

const PIPELINE: { value: PipelineStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "meeting", label: "Meeting" },
  { value: "passed", label: "Passed" },
];

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
function WorkspaceShell() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const search = Route.useSearch();
  const switchOrg = useSwitchOrganization();
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (ws.isSuccess && ws.data.memberships.length === 0)
      void navigate({ to: "/app/onboarding", replace: true });
  }, [ws.isSuccess, ws.data, navigate]);

  if (ws.isPending) return <LoadingCard />;
  if (ws.isError)
    return (
      <div className="fm-demo app-auth">
        <main className="app-auth-main">
          <article className="demo-card demo-empty">
            <h2>Your workspace couldn’t load.</h2>
            <p>{describeError(ws.error)}</p>
            <div className="demo-controls">
              <button className="fm-button" onClick={() => void ws.refetch()}>
                Try again
              </button>
              <button className="fm-button secondary" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </article>
        </main>
      </div>
    );
  const data = ws.data;
  if (!data.org) return <LoadingCard text="Preparing your organization…" />;
  const persona = data.org.type === "startup" ? "founder" : "investor";
  const view: View = search.view ?? (persona === "investor" ? "discover" : "overview");
  const nav =
    persona === "investor"
      ? ([
          ["discover", "Discover", Compass],
          ["pipeline", "Pipeline", LayoutDashboard],
          ["insights", "Insights", Lightbulb],
          ["thesis", "Investment thesis", Settings2],
          ["team", "Team", Users],
        ] as const)
      : ([
          ["overview", "Overview", LayoutDashboard],
          ["profile", "Company profile", Users],
          ["readiness", "Readiness", ShieldCheck],
          ["materials", "Materials", FolderOpen],
          ["packet", "Investor packet", FileText],
          ["team", "Team", Users],
        ] as const);
  const headings: Record<View, [string, string]> = {
    discover: ["Find your next “tell me more.”", "Listed companies ranked against your thesis."],
    pipeline: ["Good conversations start here.", "Your firm’s pipeline, shared with your team."],
    insights: ["The bigger picture.", "Your decisions and thesis overlap."],
    thesis: ["Your thesis. Your lens.", "Preferences drive matching for everyone at your firm."],
    overview: ["Your next chapter.", "Your company, your preparation and the path ahead."],
    profile: ["Tell your company’s story.", "Investors see this when your company is listed."],
    readiness: ["Ready for the room.", "Know what’s ready, what’s missing and who’s on it."],
    packet: [
      "Your story. Ready to share.",
      "Review your company profile before sharing it with investors.",
    ],
    materials: ["Your story, supported.", "Private documents and links behind your profile."],
    team: ["Your team.", "Members share this workspace. Invitations go to a specific email."],
    company: ["Company", ""],
  };
  const props: ViewProps = { ws: data, toast: setToast };
  return (
    <div className="fm-demo">
      <header className="demo-header">
        <Link to="/">
          <Brand />
        </Link>
        <div className="app-org-switch">
          <span className="demo-label">
            {persona === "investor" ? "INVESTOR WORKSPACE" : "FOUNDER WORKSPACE"}
          </span>
          <select
            aria-label="Switch organization"
            value={data.org.id}
            onChange={(e) => {
              if (e.target.value === "__new") {
                void navigate({ to: "/app/onboarding" });
                return;
              }
              switchOrg.mutate(e.target.value, {
                onError: (err) => setToast(describeError(err)),
              });
            }}
          >
            {data.memberships.map((m) => (
              <option key={m.org_id} value={m.org_id}>
                {m.organization.name}
              </option>
            ))}
            <option value="__new">+ New organization…</option>
          </select>
          <button className="demo-link" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <div className="demo-layout">
        <aside className="demo-sidebar" aria-label="Workspace navigation">
          {nav.map(([v, label, Icon]) => (
            <Link key={v} to="/app" search={{ view: v }} className={view === v ? "active" : ""}>
              <Icon size={17} />
              {label}
            </Link>
          ))}
          <small>
            Signed in as {data.email}.
            <br />
            Data is private to {data.org.name}.
            <br />
            Rules-based fit, not investment odds.
          </small>
          <Link to="/demo" search={{ persona: "investor", view: "discover", company: "dippi" }}>
            Open the no-signup demo <ArrowUpRight size={13} />
          </Link>
        </aside>
        <main className="demo-main">
          <div className="demo-page-heading">
            <div>
              <span className="fm-kicker">{data.org.name.toUpperCase()}</span>
              {view !== "company" && (
                <>
                  <h1>{headings[view][0]}</h1>
                  <p>{headings[view][1]}</p>
                </>
              )}
            </div>
          </div>
          {persona === "investor" ? (
            <>
              {view === "discover" && <Discover {...props} />}
              {view === "pipeline" && <Pipeline {...props} />}
              {view === "insights" && <Insights {...props} />}
              {view === "thesis" && <Thesis {...props} />}
              {view === "company" && <CompanyDetail {...props} companyId={search.company ?? ""} />}
              {view === "team" && <Team {...props} />}
              {["overview", "profile", "readiness", "materials", "packet"].includes(view) && (
                <WrongWorkspace persona={persona} />
              )}
            </>
          ) : (
            <>
              {view === "overview" && <Overview {...props} />}
              {view === "profile" && <CompanyProfile key={data.startup?.id} {...props} />}
              {view === "readiness" && <Readiness {...props} />}
              {view === "materials" && <Materials {...props} />}
              {view === "packet" && <FounderPacket {...props} />}
              {view === "team" && <Team {...props} />}
              {["discover", "pipeline", "insights", "thesis", "company"].includes(view) && (
                <WrongWorkspace persona={persona} />
              )}
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="demo-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

type ViewProps = { ws: Workspace; toast: (message: string) => void };

function WrongWorkspace({ persona }: { persona: "founder" | "investor" }) {
  return (
    <div className="demo-card demo-empty">
      <h2>That view belongs to the {persona === "founder" ? "investor" : "founder"} workspace.</h2>
      <p>Switch organizations from the header, or create one from the onboarding screen.</p>
    </div>
  );
}

function QueryState({
  query,
  empty,
  children,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
    data?: unknown;
  };
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (query.isPending)
    return (
      <div className="demo-card app-skeleton" role="status" aria-live="polite">
        <span style={{ width: "60%" }} />
        <span style={{ width: "85%" }} />
        <span style={{ width: "40%" }} />
      </div>
    );
  if (query.isError)
    return (
      <div className="demo-card demo-empty" role="alert">
        <h2>This couldn’t load.</h2>
        <p>{describeError(query.error)}</p>
        <button className="fm-button secondary" onClick={() => void query.refetch()}>
          Try again
        </button>
      </div>
    );
  if (empty !== undefined && Array.isArray(query.data) && query.data.length === 0)
    return <>{empty}</>;
  return <>{children}</>;
}

function Metrics({ company }: { company: StartupWithData }) {
  return (
    <div className="fm-preview-metrics">
      <div>
        <strong>{metricValue(company, "arr")}</strong>
        <span>Annual revenue · reported</span>
      </div>
      <div>
        <strong>{metricValue(company, "growth")}</strong>
        <span>YoY growth · reported</span>
      </div>
      <div>
        <strong>{company.funding_ask ? money(Number(company.funding_ask)) : "—"}</strong>
        <span>Raising</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Investor views
// ---------------------------------------------------------------------------
function useRanked(ws: Workspace) {
  const listed = useListedStartups(Boolean(ws.investor));
  const ranked = useMemo(
    () => (listed.data && ws.investor ? matchEngine.rank(listed.data, ws.investor) : []),
    [listed.data, ws.investor],
  );
  return { listed, ranked };
}

function Discover({ ws, toast }: ViewProps) {
  const { listed, ranked } = useRanked(ws);
  const decisions = useMyDecisions(true);
  const record = useRecordDecision(ws);
  const reset = useResetDecisions();
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All stages");
  const [query, setQuery] = useState("");
  const decided = new Map((decisions.data ?? []).map((d) => [d.startup_id, d.decision]));
  const available = ranked.filter(
    ({ startup: c }) =>
      !decided.has(c.id) &&
      (sector === "All sectors" || c.sector === sector) &&
      (stage === "All stages" || c.stage === stage) &&
      [c.name, c.summary ?? ""].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const active = available[0];
  function decide(id: string, decision: SwipeDecision) {
    record.mutate(
      { startupId: id, decision },
      {
        onSuccess: () =>
          toast(
            decision === "interested"
              ? "Added to your firm’s pipeline. No introduction was sent."
              : decision === "save"
                ? "Saved to your shortlist."
                : "Passed. You can reset decisions to revisit.",
          ),
        onError: (err) => toast(describeError(err)),
      },
    );
  }
  return (
    <>
      <div className="demo-toolbar">
        <input
          aria-label="Search companies"
          placeholder="Search companies"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filter by sector"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          {["All sectors", ...SECTORS].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Filter by stage"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          {["All stages", ...STAGES].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <QueryState query={listed}>
        <QueryState query={decisions}>
          {active ? (
            <div className="demo-grid">
              <article className="demo-card demo-discovery">
                <div className="demo-discovery-top">
                  <span className="fm-company-logo">
                    {active.startup.name.slice(0, 1).toLowerCase()}.
                  </span>
                  <div className="demo-score">
                    <strong>{active.match.score}</strong>
                    <span>THESIS FIT / 100</span>
                  </div>
                </div>
                <h2>{active.startup.name}</h2>
                <p>{active.startup.tagline}</p>
                <div className="demo-meta">
                  <span>{active.startup.sector}</span>
                  <span>{active.startup.stage}</span>
                  <span>{active.startup.geography}</span>
                </div>
                <p>{active.startup.summary}</p>
                <Metrics company={active.startup} />
                <Link
                  to="/app"
                  search={{ view: "company", company: active.startup.id }}
                  className="demo-link"
                >
                  Explore the company <ArrowUpRight size={13} className="inline" />
                </Link>
                <div className="demo-controls">
                  <button
                    className="fm-button secondary"
                    disabled={record.isPending}
                    onClick={() => decide(active.startup.id, "pass")}
                  >
                    <X size={15} />
                    Pass
                  </button>
                  <button
                    className="fm-button secondary"
                    disabled={record.isPending}
                    onClick={() => decide(active.startup.id, "save")}
                  >
                    <Bookmark size={15} />
                    Save
                  </button>
                  <button
                    className="fm-button"
                    disabled={record.isPending}
                    onClick={() => decide(active.startup.id, "interested")}
                  >
                    Interested <ArrowUpRight size={15} />
                  </button>
                </div>
              </article>
              <aside>
                <article className="demo-card">
                  <span className="fm-kicker">THE REASON BEHIND THE FIT</span>
                  <h3>Why it’s worth a look.</h3>
                  {active.match.strengths.map((x) => (
                    <div className="demo-check" key={x}>
                      <Check size={16} />
                      {x}
                    </div>
                  ))}
                  <h3>Questions to explore</h3>
                  {active.match.risks.map((x) => (
                    <p key={x}>{x}</p>
                  ))}
                  <p className="demo-note">
                    Transparent rules-based score against founder-reported data. Not due diligence
                    or a probability of investment.
                  </p>
                  <Link to="/app" search={{ view: "thesis" }} className="demo-link">
                    Adjust your investment thesis →
                  </Link>
                </article>
                <p className="fm-micro">{available.length} companies left in this view.</p>
              </aside>
            </div>
          ) : (listed.data?.length ?? 0) === 0 ? (
            <div className="demo-card demo-empty">
              <h2>No listed companies yet.</h2>
              <p>
                Companies appear here once founders list their profiles. Set your thesis in the
                meantime.
              </p>
              <Link to="/app" search={{ view: "thesis" }} className="fm-button secondary">
                Set your thesis
              </Link>
            </div>
          ) : (
            <div className="demo-card demo-empty">
              <h2>You’re all caught up.</h2>
              <p>Try different filters or revisit your discovery decisions.</p>
              <button
                className="fm-button secondary"
                disabled={reset.isPending}
                onClick={() => {
                  setSector("All sectors");
                  setStage("All stages");
                  setQuery("");
                  reset.mutate(undefined, {
                    onSuccess: () => toast("Decisions reset."),
                    onError: (err) => toast(describeError(err)),
                  });
                }}
              >
                Revisit companies
              </button>
            </div>
          )}
        </QueryState>
      </QueryState>
    </>
  );
}

function Pipeline({ ws, toast }: ViewProps) {
  const pipeline = usePipeline(ws.org?.id);
  const move = useMovePipeline(ws.org?.id);
  const decisions = useMyDecisions(true);
  const record = useRecordDecision(ws);
  const { listed } = useRanked(ws);
  const items = pipeline.data ?? [];
  const saved = (decisions.data ?? [])
    .filter((d) => d.decision === "save")
    .map((d) => listed.data?.find((s) => s.id === d.startup_id))
    .filter((s): s is StartupWithData => Boolean(s));
  return (
    <QueryState query={pipeline}>
      <div className="demo-stat-grid">
        <article>
          <strong>{items.length}</strong>
          <span>In your pipeline</span>
        </article>
        <article>
          <strong>{saved.length}</strong>
          <span>Saved for later</span>
        </article>
        <article>
          <strong>{items.filter((i) => i.status === "meeting").length}</strong>
          <span>At meeting stage</span>
        </article>
      </div>
      <div className="demo-kanban">
        {PIPELINE.map((status) => (
          <section className="demo-column" key={status.value}>
            <h2>
              {status.label} · {items.filter((i) => i.status === status.value).length}
            </h2>
            {items
              .filter((i) => i.status === status.value)
              .map((i) => (
                <article className="demo-card" key={i.id}>
                  {i.startup ? (
                    <Link to="/app" search={{ view: "company", company: i.startup.id }}>
                      <h3>{i.startup.name} ↗</h3>
                    </Link>
                  ) : (
                    <h3>Company no longer listed</h3>
                  )}
                  {i.startup && (
                    <>
                      <p>
                        {i.startup.stage} ·{" "}
                        {i.startup.funding_ask ? money(Number(i.startup.funding_ask)) : "—"} raise
                      </p>
                      {ws.investor && (
                        <p>{matchEngine.score(i.startup, ws.investor).score}/100 thesis fit</p>
                      )}
                    </>
                  )}
                  <select
                    aria-label={"Pipeline stage for " + (i.startup?.name ?? "company")}
                    value={i.status}
                    disabled={move.isPending}
                    onChange={(e) =>
                      move.mutate(
                        { id: i.id, status: e.target.value as PipelineStatus },
                        { onError: (err) => toast(describeError(err)) },
                      )
                    }
                  >
                    {PIPELINE.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
          </section>
        ))}
      </div>
      {items.length === 0 && (
        <div className="demo-card demo-empty" style={{ marginTop: 20 }}>
          <h2>Your pipeline is empty.</h2>
          <p>Mark a company as interested in Discover to start tracking it here.</p>
          <Link to="/app" search={{ view: "discover" }} className="fm-button secondary">
            Go to Discover
          </Link>
        </div>
      )}
      <section className="demo-card" style={{ marginTop: 24 }}>
        <h2>Saved for later</h2>
        {saved.map((c) => (
          <div className="demo-list-row" key={c.id}>
            <Link to="/app" search={{ view: "company", company: c.id }}>
              {c.name} ↗
            </Link>
            <button
              className="demo-link"
              disabled={record.isPending}
              onClick={() =>
                record.mutate(
                  { startupId: c.id, decision: "interested" },
                  {
                    onSuccess: () => toast("Moved to your pipeline."),
                    onError: (err) => toast(describeError(err)),
                  },
                )
              }
            >
              Move to pipeline →
            </button>
          </div>
        ))}
        {saved.length === 0 && <p>Your saved companies will appear here.</p>}
      </section>
    </QueryState>
  );
}

function Insights({ ws }: ViewProps) {
  const { listed, ranked } = useRanked(ws);
  const decisions = useMyDecisions(true);
  const activity = useActivity(ws.org?.id);
  return (
    <QueryState query={listed}>
      <div className="demo-stat-grid">
        <article>
          <strong>{decisions.data?.length ?? 0}</strong>
          <span>Discovery decisions</span>
        </article>
        <article>
          <strong>{ranked.filter((x) => x.match.score >= 75).length}</strong>
          <span>Companies at 75+ fit</span>
        </article>
        <article>
          <strong>{activity.data?.length ?? 0}</strong>
          <span>Recent team actions</span>
        </article>
      </div>
      <div className="demo-card">
        <h2>Thesis overlap</h2>
        {ranked.length === 0 && <p>No listed companies to rank yet.</p>}
        {ranked.map(({ startup: c, match }) => (
          <div className="demo-list-row" key={c.id}>
            <div>
              <Link to="/app" search={{ view: "company", company: c.id }}>
                <h3>{c.name} ↗</h3>
              </Link>
              <p>
                {c.sector} · {c.stage}
              </p>
            </div>
            <div style={{ width: "40%" }}>
              <div className="fm-progress-label">
                <span>Fit score</span>
                <strong>{match.score}/100</strong>
              </div>
              <Progress value={match.score} />
            </div>
          </div>
        ))}
        <p className="demo-note">
          Rankings recalculate when your firm edits the thesis. No performance or return is
          predicted.
        </p>
      </div>
      <div className="demo-card" style={{ marginTop: 20 }}>
        <h2>Recent activity</h2>
        {(activity.data ?? []).length === 0 && <p>Activity from your team will appear here.</p>}
        {(activity.data ?? []).map((a) => (
          <div className="demo-list-row" key={a.id}>
            <span>{a.description}</span>
            <small>{timeAgo(a.created_at)}</small>
          </div>
        ))}
      </div>
    </QueryState>
  );
}

const split = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function Thesis({ ws, toast }: ViewProps) {
  const save = useSaveThesis();
  const saveFirm = useSaveInvestorProfile();
  const investor = ws.investor;
  if (!investor)
    return (
      <div className="demo-card demo-empty">
        <h2>No firm profile yet.</h2>
      </div>
    );
  const t = investor.thesis;
  return (
    <div className="demo-card">
      <h2>{investor.firm_name}</h2>
      <p>Preferences below drive matching for every member of your firm.</p>
      <form
        key={t?.updated_at ?? "new"}
        className="demo-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const min = Number(f.get("min")),
            max = Number(f.get("max"));
          if (min > max) {
            toast("Minimum check size must be below maximum.");
            return;
          }
          try {
            await saveFirm.mutateAsync({
              id: investor.id,
              patch: {
                firm_name: String(f.get("firm_name")).trim() || investor.firm_name,
                hq: String(f.get("hq") || "").trim() || null,
              },
            });
            await save.mutateAsync({
              investorId: investor.id,
              patch: {
                sectors: split(f.get("sectors")),
                stages: split(f.get("stages")),
                geographies: split(f.get("geographies")),
                business_models: split(f.get("models")),
                exclusions: split(f.get("exclusions")),
                check_min: min,
                check_max: max,
                min_growth_pct: Number(f.get("growth")),
                summary: String(f.get("summary") || "").trim() || null,
              },
            });
            toast("Thesis saved. Fit scores have updated for your firm.");
          } catch (err) {
            toast(describeError(err));
          }
        }}
      >
        <label>
          Firm name
          <input name="firm_name" defaultValue={investor.firm_name} required maxLength={120} />
        </label>
        <label>
          Headquarters
          <input name="hq" defaultValue={investor.hq ?? ""} maxLength={120} />
        </label>
        <label className="full">
          Thesis summary
          <textarea name="summary" defaultValue={t?.summary ?? ""} maxLength={1000} />
        </label>
        {(
          [
            ["sectors", "Sectors", SECTORS.join(", ")],
            ["stages", "Stages", STAGES.join(", ")],
            ["geographies", "Geographies", GEOGRAPHIES.join(", ")],
            ["models", "Business models", BUSINESS_MODELS.join(", ")],
            ["exclusions", "Exclusions", "e.g. Alcohol"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key}>
            {label} (comma separated)
            <input
              name={key}
              placeholder={placeholder}
              defaultValue={
                key === "models"
                  ? (t?.business_models ?? []).join(", ")
                  : (t?.[key] ?? []).join(", ")
              }
            />
          </label>
        ))}
        <label>
          Minimum check (USD)
          <input type="number" name="min" min="0" required defaultValue={t?.check_min ?? 0} />
        </label>
        <label>
          Maximum check (USD)
          <input type="number" name="max" min="0" required defaultValue={t?.check_max ?? 0} />
        </label>
        <label>
          Minimum YoY growth (%)
          <input
            type="number"
            name="growth"
            min="0"
            required
            defaultValue={t?.min_growth_pct ?? 0}
          />
        </label>
        <div className="full">
          <button
            className="fm-button"
            type="submit"
            disabled={save.isPending || saveFirm.isPending}
          >
            {save.isPending ? "Saving…" : "Save investment thesis"} <Check size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}

function CompanyDetail({ ws, toast, companyId }: ViewProps & { companyId: string }) {
  const { listed } = useRanked(ws);
  const pipeline = usePipeline(ws.org?.id);
  const notes = useTeamNotes(ws.org?.id, companyId);
  const addNote = useAddTeamNote(ws);
  const record = useRecordDecision(ws);
  const company =
    listed.data?.find((s) => s.id === companyId) ??
    pipeline.data?.find((p) => p.startup?.id === companyId)?.startup ??
    null;
  if (listed.isPending || pipeline.isPending) return <QueryState query={listed}>{null}</QueryState>;
  if (!company)
    return (
      <div className="demo-card demo-empty">
        <h2>This company isn’t available.</h2>
        <p>It may have been unlisted by its founders.</p>
        <Link to="/app" search={{ view: "discover" }} className="fm-button secondary">
          Back to Discover
        </Link>
      </div>
    );
  const result = ws.investor ? matchEngine.score(company, ws.investor) : null;
  return (
    <>
      <div className="demo-page-heading" style={{ marginTop: -10 }}>
        <div>
          <h1>{company.name}</h1>
          <p>{company.tagline}</p>
        </div>
      </div>
      <div className="demo-grid">
        <div>
          <article className="demo-card">
            <div className="demo-meta">
              <span>{company.sector}</span>
              <span>{company.stage}</span>
              <span>{company.geography}</span>
            </div>
            <p>{company.summary}</p>
            {company.story && <p>{company.story}</p>}
            <Metrics company={company} />
            <h3>Team & business model</h3>
            <p>
              {company.team_size ?? "—"} people · {company.business_model ?? "—"}
            </p>
            <h3>Source transparency</h3>
            <p>
              Profile and metrics are reported by the founding team
              {company.provenance.length ? " with recorded sources." : "."} FundMatch has not
              verified these claims.
            </p>
            {company.website && safeUrl(company.website) && (
              <a className="demo-link" href={company.website} target="_blank" rel="noreferrer">
                Visit supplied website ↗
              </a>
            )}
            <h3>Materials</h3>
            {company.materials.map((m) => (
              <p key={m.id}>
                {m.url && safeUrl(m.url) ? (
                  <a className="demo-link" href={m.url} target="_blank" rel="noreferrer">
                    {m.title} ↗
                  </a>
                ) : (
                  m.title
                )}
              </p>
            ))}
            {company.materials.length === 0 && <p>No shared materials yet.</p>}
            <div className="demo-controls">
              <button
                className="fm-button secondary"
                disabled={record.isPending}
                onClick={() =>
                  record.mutate(
                    { startupId: company.id, decision: "save" },
                    {
                      onSuccess: () => toast("Saved to your shortlist."),
                      onError: (err) => toast(describeError(err)),
                    },
                  )
                }
              >
                Save <Bookmark size={14} />
              </button>
              <button
                className="fm-button"
                disabled={record.isPending}
                onClick={() =>
                  record.mutate(
                    { startupId: company.id, decision: "interested" },
                    {
                      onSuccess: () => toast("Added to your pipeline."),
                      onError: (err) => toast(describeError(err)),
                    },
                  )
                }
              >
                Move to pipeline <ArrowRight size={14} />
              </button>
            </div>
          </article>
          <article className="demo-card" style={{ marginTop: 20 }}>
            <h2>Team notes</h2>
            <QueryState
              query={notes}
              empty={<p>No notes yet. Notes are visible only to {ws.org?.name}.</p>}
            >
              <div className="demo-notes">
                {(notes.data ?? []).map((n) => (
                  <p key={n.id}>
                    {n.body}
                    <small>
                      {n.author_name} · {new Date(n.created_at).toLocaleString()}
                    </small>
                  </p>
                ))}
              </div>
            </QueryState>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const body = String(new FormData(form).get("note") || "").trim();
                if (!body) return;
                addNote.mutate(
                  { startupId: company.id, body },
                  {
                    onSuccess: () => {
                      form.reset();
                      toast("Note saved for your team.");
                    },
                    onError: (err) => toast(describeError(err)),
                  },
                );
              }}
            >
              <label>
                Add a note
                <textarea
                  name="note"
                  required
                  maxLength={3000}
                  placeholder="What should we explore in a first conversation?"
                />
              </label>
              <button
                className="fm-button compact"
                style={{ marginTop: 12 }}
                disabled={addNote.isPending}
              >
                {addNote.isPending ? "Saving…" : "Save note"} <Plus size={13} />
              </button>
            </form>
          </article>
        </div>
        <aside className="demo-card">
          {result && (
            <>
              <div className="demo-score">
                <strong>{result.score}</strong>
                <span>THESIS FIT / 100</span>
              </div>
              <h3>Behind the match</h3>
              {result.rationale.map((r) => (
                <div className="demo-check" key={r.key}>
                  {r.hit ? <Check size={15} /> : <Compass size={15} />}
                  <div>
                    <strong>{r.label}</strong>
                    <br />
                    {r.detail}
                  </div>
                </div>
              ))}
            </>
          )}
          <p className="demo-note">
            Rules-based fit against {ws.investor?.firm_name}’s thesis. This is not an investment
            recommendation.
          </p>
        </aside>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Founder views
// ---------------------------------------------------------------------------
function Overview({ ws, toast }: ViewProps) {
  const navigate = useNavigate();
  const startup = ws.startup;
  const readiness = useReadiness(startup?.id, "vc");
  const documents = useDocuments(ws.org?.id);
  const suggestions = useProfileSuggestions(startup?.id);
  const save = useSaveStartupProfile();
  if (!startup)
    return (
      <div className="demo-card demo-empty">
        <h2>No company profile yet.</h2>
      </div>
    );
  const done = (readiness.data ?? []).filter((t) => t.status === "Complete").length;
  const total = readiness.data?.length ?? 0;
  return (
    <>
      {readiness.isSuccess && documents.isSuccess && (
        <FounderJourney
          profile={fromStartup(startup)}
          materials={startup.materials.map((m) => ({ id: m.id, title: m.title, url: m.url ?? "" }))}
          documentCount={documents.data.filter((d) => d.startup_id === startup.id).length}
          tasks={readiness.data}
          onOpen={(view) => void navigate({ to: "/app", search: { view } })}
        />
      )}
      <div className="demo-stat-grid">
        <article>
          <strong>{profileCompleteness(startup)}%</strong>
          <span>Profile complete</span>
        </article>
        <article>
          <strong>{readiness.isPending ? "…" : `${done}/${total}`}</strong>
          <span>Readiness items complete</span>
        </article>
        <article>
          <strong>{documents.isPending ? "…" : (documents.data?.length ?? 0)}</strong>
          <span>Private documents</span>
        </article>
      </div>
      <div className="demo-grid">
        <article className="demo-card">
          <span className="fm-kicker">YOUR NEXT MOVE</span>
          <h2>Make a stronger first impression.</h2>
          <p>
            Complete your profile, upload your deck privately, and work through the readiness
            checklist.
          </p>
          <div className="demo-controls">
            <Link to="/app" search={{ view: "profile" }} className="fm-button">
              Edit your profile <ArrowRight size={15} />
            </Link>
            <Link to="/app" search={{ view: "readiness" }} className="fm-button secondary">
              Open readiness
            </Link>
          </div>
        </article>
        <article className="demo-card">
          <h2>Investor visibility</h2>
          <p>
            {startup.visibility === "public"
              ? "Your company is listed. Signed-in investors can discover your profile, metrics and material links. Private documents stay private."
              : "Your company is private. Only your team can see it. List it when you’re ready for investors to discover you."}
          </p>
          <button
            className="fm-button secondary"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  id: startup.id,
                  patch: { visibility: startup.visibility === "public" ? "private" : "public" },
                },
                {
                  onSuccess: () =>
                    toast(
                      startup.visibility === "public"
                        ? "Your company is now private."
                        : "Your company is now listed for investors.",
                    ),
                  onError: (err) => toast(describeError(err)),
                },
              )
            }
          >
            {startup.visibility === "public" ? "Unlist company" : "List for investors"}
          </button>
          {(suggestions.data?.length ?? 0) > 0 && (
            <p className="demo-note" style={{ marginTop: 14 }}>
              {suggestions.data!.length} profile suggestion
              {suggestions.data!.length === 1 ? "" : "s"} from your documents are waiting on the
              profile page.
            </p>
          )}
        </article>
      </div>
    </>
  );
}

function CompanyProfile({ ws, toast }: ViewProps) {
  const navigate = useNavigate();
  const startup = ws.startup;
  const save = useSaveStartupProfile();
  const suggestions = useProfileSuggestions(startup?.id);
  const resolve = useResolveSuggestion(startup?.id);
  if (!startup)
    return (
      <div className="demo-card demo-empty">
        <h2>No company profile yet.</h2>
      </div>
    );
  return (
    <>
      {(suggestions.data?.length ?? 0) > 0 && (
        <article className="demo-card" style={{ marginBottom: 20 }}>
          <span className="fm-kicker">SUGGESTED FROM YOUR DOCUMENTS</span>
          <h2>Review before it changes your profile.</h2>
          {suggestions.data!.map((s) => (
            <div className="demo-list-row" key={s.id}>
              <div>
                <h3>{s.label}</h3>
                <p>
                  {s.suggested_value}
                  {s.current_value ? ` (currently ${s.current_value})` : ""} ·{" "}
                  {Math.round(Number(s.confidence) * 100)}% confidence
                </p>
                {s.rationale && <p className="fm-micro">{s.rationale}</p>}
                <p className="fm-micro">
                  Source: {s.source_key} ·{" "}
                  {s.document_id ? "Linked private document" : "No document reference"} · Awaiting
                  your review
                </p>
              </div>
              <div className="app-inline-actions">
                <button
                  className="demo-link"
                  disabled={resolve.isPending}
                  onClick={() =>
                    resolve.mutate(
                      { id: s.id, accept: true },
                      {
                        onSuccess: () => toast("Suggestion applied."),
                        onError: (err) => toast(describeError(err)),
                      },
                    )
                  }
                >
                  Apply
                </button>
                <button
                  className="demo-link"
                  disabled={resolve.isPending}
                  onClick={() =>
                    resolve.mutate(
                      { id: s.id, accept: false },
                      { onError: (err) => toast(describeError(err)) },
                    )
                  }
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </article>
      )}
      <FounderBuilder
        key={startup.id}
        profile={fromStartup(startup)}
        onSave={async (profile) => {
          const { revenue, growth, ask, team, businessModel, ...fields } = profile;
          try {
            await save.mutateAsync({
              id: startup.id,
              patch: {
                ...fields,
                website: fields.website || null,
                story: fields.story || null,
                funding_ask: ask,
                team_size: team,
                business_model: businessModel || null,
              },
              metrics: { revenue, growth },
            });
          } catch (err) {
            throw new Error(describeError(err));
          }
        }}
        onContinue={() => void navigate({ to: "/app", search: { view: "materials" } })}
      />
    </>
  );
}

function FounderPacket({ ws }: ViewProps) {
  const [template, setTemplate] = useState<"vc" | "pe">("vc");
  const navigate = useNavigate();
  const readiness = useReadiness(ws.startup?.id, template);
  if (!ws.startup) return <div className="demo-card">Create a company profile first.</div>;
  return (
    <>
      <div className="demo-toolbar fm-packet-controls">
        <label>
          Packet checklist{" "}
          <select
            aria-label="Packet checklist"
            value={template}
            onChange={(e) => setTemplate(e.target.value as "vc" | "pe")}
          >
            <option value="vc">VC / angel fundraising</option>
            <option value="pe">PE acquisition preparation</option>
          </select>
        </label>
      </div>
      <QueryState query={readiness}>{null}</QueryState>
      {readiness.isSuccess && (
        <InvestorPacket
          key={`${ws.startup.id}:${template}`}
          profile={fromStartup(ws.startup)}
          materials={ws.startup.materials.map((m) => ({
            id: m.id,
            title: m.title,
            url: m.url ?? "",
          }))}
          tasks={readiness.data}
          template={template}
          onEdit={() => void navigate({ to: "/app", search: { view: "profile" } })}
        />
      )}
    </>
  );
}

function Readiness({ ws, toast }: ViewProps) {
  const startup = ws.startup;
  const [template, setTemplate] = useState<"vc" | "pe">("vc");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [editing, setEditing] = useState<ReadinessItem | null>(null);
  const items = useReadiness(startup?.id, template);
  const save = useSaveReadinessItem(startup?.id);
  if (!startup)
    return (
      <div className="demo-card demo-empty">
        <h2>No company profile yet.</h2>
      </div>
    );
  const tasks = items.data ?? [];
  const completed = tasks.filter((t) => t.status === "Complete").length;
  return (
    <>
      <div className="demo-toolbar">
        <select
          aria-label="Readiness template"
          value={template}
          onChange={(e) => {
            setTemplate(e.target.value as "vc" | "pe");
            setCategory("All");
            setStatus("All");
          }}
        >
          <option value="vc">VC fundraising</option>
          <option value="pe">PE acquisition preparation</option>
        </select>
        <select
          aria-label="Checklist category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["All", ...new Set(tasks.map((t) => t.category))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Checklist status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["All", "Missing", "In progress", "Complete", "Needs update"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <QueryState query={items}>
        <article className="demo-card">
          <div className="demo-list-row" style={{ paddingTop: 0, border: 0 }}>
            <div>
              <h2>
                {startup.name} · {tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%
                prepared
              </h2>
              <p>
                {completed} of {tasks.length} items complete. Open an item to assign an owner,
                deadline and evidence.
              </p>
            </div>
            <ShieldCheck size={30} />
          </div>
          <Progress value={tasks.length ? (completed / tasks.length) * 100 : 0} />
          <div className="demo-table-wrap">
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Preparation item</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks
                  .filter(
                    (t) =>
                      (category === "All" || t.category === category) &&
                      (status === "All" || t.status === status),
                  )
                  .map((t) => (
                    <tr key={t.id}>
                      <td>
                        <button onClick={() => setEditing(t)}>
                          <FileText size={14} />
                          <span>
                            {t.title}
                            <small style={{ display: "block", color: "#93999f", fontSize: 9 }}>
                              {t.category}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>{t.owner || "Unassigned"}</td>
                      <td>{t.due_date || "No due date"}</td>
                      <td>
                        <span className="fm-chip">{t.status}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="demo-note">
            Completion is team-reported preparation, not verified diligence or a funding guarantee.
            Evidence links are stored as links only.
          </p>
        </article>
      </QueryState>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="demo-evidence-dialog">
          <DialogTitle>{editing?.title}</DialogTitle>
          <DialogDescription>
            Assign responsibility and record supporting evidence. Saved for your whole team.
          </DialogDescription>
          {editing && (
            <form
              key={editing.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const evidence = String(f.get("evidence") || "").trim();
                if (evidence && !safeUrl(evidence)) {
                  toast("Use a valid http or https evidence link.");
                  return;
                }
                save.mutate(
                  {
                    id: editing.id,
                    owner: String(f.get("owner") || "").trim(),
                    due_date: String(f.get("due") || "") || null,
                    evidence_url: evidence,
                    notes: String(f.get("notes") || "").trim(),
                    status: String(f.get("status")) as ReadinessItem["status"],
                  },
                  {
                    onSuccess: () => {
                      setEditing(null);
                      toast("Readiness item saved.");
                    },
                    onError: (err) => toast(describeError(err)),
                  },
                );
              }}
            >
              <label>
                Owner
                <input
                  name="owner"
                  defaultValue={editing.owner}
                  placeholder="Who owns this?"
                  maxLength={120}
                />
              </label>
              <label>
                Status
                <select name="status" defaultValue={editing.status}>
                  {["Missing", "In progress", "Complete", "Needs update"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <input name="due" type="date" defaultValue={editing.due_date ?? ""} />
              </label>
              <label>
                Evidence link
                <input
                  name="evidence"
                  type="url"
                  defaultValue={editing.evidence_url}
                  placeholder="https://…"
                />
              </label>
              <label>
                Notes
                <textarea name="notes" defaultValue={editing.notes} maxLength={3000} />
              </label>
              <button className="fm-button" type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save readiness item"} <Check size={15} />
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function statusLabel(d: DocumentRecord): string {
  switch (d.status) {
    case "uploaded":
      return "Uploaded · awaiting analysis";
    case "processing":
      return "Analyzing";
    case "processed":
      return "Analyzed";
    case "failed":
      return "Analysis failed";
    default:
      return d.status;
  }
}

function Materials({ ws, toast }: ViewProps) {
  const startup = ws.startup;
  const documents = useDocuments(ws.org?.id);
  const upload = useUploadDocument(ws.org?.id);
  const remove = useDeleteDocument(ws.org?.id);
  const addLink = useAddMaterialLink();
  const removeLink = useRemoveMaterial();
  const [kind, setKind] = useState<DocumentRecord["kind"]>("deck");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocumentRecord | null>(null);
  if (!startup)
    return (
      <div className="demo-card demo-empty">
        <h2>No company profile yet.</h2>
      </div>
    );
  return (
    <>
      <div className="demo-card">
        <h2>Private documents</h2>
        <Link to="/app" search={{ view: "packet" }} className="fm-button secondary">
          Preview investor packet <ArrowRight size={15} />
        </Link>
        <p>
          Decks, financials and legal documents are stored privately for {ws.org?.name}. They are
          never listed publicly; only your team can download them. Uploading stores the document;
          automatic analysis is not connected yet. Any future suggestions require your review.
        </p>
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
            if (!file) {
              toast("Choose a file to upload.");
              return;
            }
            upload.mutate(
              { file, kind, startupId: startup.id },
              {
                onSuccess: () => {
                  form.reset();
                  toast("Document uploaded privately.");
                },
                onError: (err) => toast(describeError(err)),
              },
            );
          }}
        >
          <label>
            Document type
            <select value={kind} onChange={(e) => setKind(e.target.value)} name="kind">
              <option value="deck">Pitch deck</option>
              <option value="financials">Financials</option>
              <option value="legal">Legal</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            File (PDF, Office, CSV, text or image · up to 25 MB)
            <input name="file" type="file" accept={DOCUMENT_ACCEPT} required />
          </label>
          <div className="full">
            <button className="fm-button" type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Uploading…" : "Upload privately"} <Upload size={15} />
            </button>
          </div>
        </form>
        <div style={{ marginTop: 20 }}>
          <QueryState
            query={documents}
            empty={<p>No documents yet. Your pitch deck is a good first upload.</p>}
          >
            {(documents.data ?? []).map((d) => (
              <div className="demo-list-row" key={d.id}>
                <div>
                  <h3>{d.file_name}</h3>
                  <p>
                    {DOCUMENT_MIME_TYPES[d.mime_type] ?? d.mime_type} ·{" "}
                    {(d.size_bytes / 1024 / 1024).toFixed(1)} MB · {d.kind} ·{" "}
                    {timeAgo(d.created_at)}
                  </p>
                  <p className={"fm-micro app-status " + d.status}>
                    {statusLabel(d)}
                    {d.status === "failed" && d.processing_error ? ` · ${d.processing_error}` : ""}
                  </p>
                </div>
                <div className="app-inline-actions">
                  <button
                    className="demo-link"
                    disabled={downloading === d.id}
                    onClick={async () => {
                      setDownloading(d.id);
                      try {
                        await downloadDocument(d);
                      } catch (err) {
                        toast(describeError(err));
                      } finally {
                        setDownloading(null);
                      }
                    }}
                  >
                    <Download size={13} className="inline" />{" "}
                    {downloading === d.id ? "Preparing…" : "Download"}
                  </button>
                  <button className="demo-link" onClick={() => setConfirmDelete(d)}>
                    <Trash2 size={13} className="inline" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </QueryState>
        </div>
      </div>
      <div className="demo-card" style={{ marginTop: 20 }}>
        <h2>Material links</h2>
        <p>
          Links are shown to investors when your company is listed. FundMatch stores the link only;
          it does not fetch or change sharing permissions.
        </p>
        {startup.materials.map((m) => (
          <div className="demo-list-row" key={m.id}>
            <div>
              <h3>
                {m.url && safeUrl(m.url) ? (
                  <a href={m.url} target="_blank" rel="noreferrer">
                    {m.title} ↗
                  </a>
                ) : (
                  m.title
                )}
              </h3>
              <p>External link</p>
            </div>
            <button
              className="demo-link"
              disabled={removeLink.isPending}
              onClick={() =>
                removeLink.mutate(m.id, {
                  onSuccess: () => toast("Link removed."),
                  onError: (err) => toast(describeError(err)),
                })
              }
            >
              Remove link
            </button>
          </div>
        ))}
        {startup.materials.length === 0 && <p>No links yet.</p>}
        <form
          style={{ marginTop: 25 }}
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = new FormData(form),
              title = String(f.get("title") || "").trim(),
              url = String(f.get("url") || "").trim();
            if (!safeUrl(url) || !title) {
              toast("Add a title and valid http or https link.");
              return;
            }
            addLink.mutate(
              { startupId: startup.id, title, url },
              {
                onSuccess: () => {
                  form.reset();
                  toast("Material link saved.");
                },
                onError: (err) => toast(describeError(err)),
              },
            );
          }}
        >
          <label>
            Link title
            <input name="title" placeholder="Seed pitch deck (DocSend)" required maxLength={200} />
          </label>
          <label>
            Link
            <input name="url" type="url" placeholder="https://…" required />
          </label>
          <div className="full">
            <button className="fm-button" type="submit" disabled={addLink.isPending}>
              {addLink.isPending ? "Saving…" : "Add link"} <Plus size={15} />
            </button>
          </div>
        </form>
      </div>
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogTitle>Delete {confirmDelete?.file_name}?</DialogTitle>
          <DialogDescription>
            The file is removed from private storage for everyone at {ws.org?.name}. This can’t be
            undone.
          </DialogDescription>
          <button
            className="fm-button"
            disabled={remove.isPending}
            onClick={() =>
              confirmDelete &&
              remove.mutate(confirmDelete, {
                onSuccess: () => {
                  setConfirmDelete(null);
                  toast("Document deleted.");
                },
                onError: (err) => toast(describeError(err)),
              })
            }
          >
            {remove.isPending ? "Deleting…" : "Delete document"}
          </button>
          <button className="fm-button secondary" onClick={() => setConfirmDelete(null)}>
            Keep it
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared: team
// ---------------------------------------------------------------------------
function Team({ ws, toast }: ViewProps) {
  const orgId = ws.org?.id;
  const isAdmin = ws.role === "owner" || ws.role === "admin";
  const members = useMembers(orgId);
  const invitations = useInvitations(orgId, isAdmin);
  const invite = useInviteMember(orgId);
  const revoke = useRevokeInvitation(orgId);
  const removeMember = useRemoveMember(orgId);
  const [lastLink, setLastLink] = useState<string | null>(null);
  return (
    <>
      <div className="demo-card">
        <h2>Members</h2>
        <QueryState query={members}>
          {(members.data ?? []).map((m) => (
            <div className="demo-list-row" key={m.id}>
              <div>
                <h3>
                  {m.profile?.full_name ||
                    m.profile?.email ||
                    (m.user_id === ws.userId ? ws.email : "Team member")}
                </h3>
                <p>
                  {m.profile?.email ?? ""} · <span className="fm-chip">{m.member_role}</span>
                </p>
              </div>
              {(m.user_id === ws.userId || isAdmin) && (
                <button
                  className="demo-link"
                  disabled={removeMember.isPending}
                  onClick={() => {
                    if (
                      !confirm(
                        m.user_id === ws.userId
                          ? "Leave this organization?"
                          : "Remove this member?",
                      )
                    )
                      return;
                    removeMember.mutate(m.id, {
                      onSuccess: () =>
                        toast(
                          m.user_id === ws.userId
                            ? "You left the organization."
                            : "Member removed.",
                        ),
                      onError: (err) => toast(describeError(err)),
                    });
                  }}
                >
                  {m.user_id === ws.userId ? "Leave" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </QueryState>
      </div>
      {isAdmin ? (
        <div className="demo-card" style={{ marginTop: 20 }}>
          <h2>Invite a teammate</h2>
          <p>
            An invitation is tied to one email address. The person signs in with that email, opens
            the link, and joins with the chosen role. Links expire after 7 days.
          </p>
          <form
            className="demo-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              invite.mutate(
                {
                  email: String(f.get("email")).trim(),
                  role: String(f.get("role")) as "admin" | "member",
                },
                {
                  onSuccess: () => {
                    form.reset();
                    toast("Invitation created. Share the link below.");
                  },
                  onError: (err) => toast(describeError(err)),
                },
              );
            }}
          >
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Role
              <select name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="full">
              <button className="fm-button" type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Creating…" : "Create invitation"} <Plus size={15} />
              </button>
            </div>
          </form>
          <div style={{ marginTop: 20 }}>
            <QueryState query={invitations} empty={<p>No pending invitations.</p>}>
              {(invitations.data ?? []).map((i) => {
                const link = `${window.location.origin}/app/invite?token=${encodeURIComponent(i.token)}`;
                return (
                  <div className="demo-list-row" key={i.id}>
                    <div>
                      <h3>{i.email}</h3>
                      <p>
                        {i.member_role} · expires {new Date(i.expires_at).toLocaleDateString()}
                      </p>
                      {lastLink === i.id && (
                        <p className="app-form-ok">Link copied to your clipboard.</p>
                      )}
                    </div>
                    <div className="app-inline-actions">
                      <button
                        className="demo-link"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(link);
                            setLastLink(i.id);
                          } catch {
                            prompt("Copy this invitation link", link);
                          }
                        }}
                      >
                        Copy link
                      </button>
                      <button
                        className="demo-link"
                        disabled={revoke.isPending}
                        onClick={() =>
                          revoke.mutate(i.id, { onError: (err) => toast(describeError(err)) })
                        }
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                );
              })}
            </QueryState>
          </div>
        </div>
      ) : (
        <p className="demo-note" style={{ marginTop: 20 }}>
          Only owners and admins can invite or remove members.
        </p>
      )}
    </>
  );
}
