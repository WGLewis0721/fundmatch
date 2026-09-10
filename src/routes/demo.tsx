import { DiscoveryCard } from "@/components/fundmatch/discovery-card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Check,
  Compass,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  Link2,
  MessageSquare,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Brand } from "./index";
import { StateSchema, initialState, fit, money, makeTasks, safeUrl } from "@/lib/demo-data";
import type { Company, DemoState, Task } from "@/lib/demo-data";
import "../fundmatch.css";
import { ProfileIntelligence } from "@/components/intelligence/profile-intelligence";
import { FounderBuilder } from "@/components/fundmatch/founder-builder";
import { FounderJourney } from "@/components/fundmatch/founder-journey";
import { InvestorPacket } from "@/components/fundmatch/investor-packet";
import { fromDemoCompany } from "@/lib/founder-readiness";
const VIEWS = [
  "discover",
  "pipeline",
  "insights",
  "integrations",
  "profile",
  "readiness",
  "materials",
  "packet",
  "intelligence",
  "interest",
  "company",
] as const;
type View = (typeof VIEWS)[number];
type Persona = "founder" | "investor";
export const Route = createFileRoute("/demo")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { persona: Persona; view: View; company: string } => ({
    persona: s["persona"] === "founder" ? "founder" : "investor",
    view: VIEWS.includes(s["view"] as View)
      ? (s["view"] as View)
      : s["persona"] === "founder"
        ? "interest"
        : "discover",
    company: typeof s["company"] === "string" ? s["company"] : "dippi",
  }),
  component: Demo,
});
const STORAGE = "fundmatch-explorer-v1";
export function Demo() {
  const go = Route.useNavigate();
  const search = Route.useSearch();
  const { persona, view } = search;
  const [state, setState] = useState<DemoState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [toast, setToast] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [stage, setStage] = useState("All stages");
  const [query, setQuery] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [template, setTemplate] = useState("vc");
  const [category, setCategory] = useState("All");
  const [taskStatus, setTaskStatus] = useState("All");
  const [connector, setConnector] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const company = state.companies.find((c) => c.id === search.company) ?? state.companies[0]!;
  const taskKey = company.id + ":" + template;
  const tasks = state.tasks[taskKey] ?? makeTasks(template);
  const completed = tasks.filter((t) => t.status === "Complete").length;
  const result = fit(company, state.thesis);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = StateSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setState(parsed.data);
        else setToast("An older demo could not be restored. A fresh demo is ready.");
      }
    } catch {
      setStorageOk(false);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE, JSON.stringify(state));
      } catch {
        setStorageOk(false);
      }
    }
  }, [state, ready]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const ranked = useMemo(
    () =>
      state.companies
        .map((c) => ({ c, match: fit(c, state.thesis) }))
        .sort((a, b) => b.match.score - a.match.score),
    [state.companies, state.thesis],
  );
  const available = ranked.filter(
    ({ c }) =>
      !state.decisions[c.id] &&
      (sector === "All sectors" || c.sector === sector) &&
      (stage === "All stages" || c.stage === stage) &&
      [c.name, c.summary].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const active = available[0];
  const navigate = (next: View, id = company.id) => ({ persona, view: next, company: id });
  function decide(id: string, decision: "pass" | "save" | "interested") {
    setState((s) => ({
      ...s,
      decisions: { ...s.decisions, [id]: decision },
      pipeline:
        decision === "interested" ? { ...s.pipeline, [id]: s.pipeline[id] ?? "New" } : s.pipeline,
    }));
    setToast(
      decision === "interested"
        ? "Added to your pipeline. No introduction was sent."
        : decision === "save"
          ? "Saved to your shortlist."
          : "Passed. You can reset decisions to revisit.",
    );
  }
  const nav =
    persona === "investor"
      ? ([
          ["discover", "Discover", Compass],
          ["pipeline", "Pipeline", LayoutDashboard],
          ["insights", "Insights", Lightbulb],
          ["profile", "Investment thesis", Settings2],
          ["integrations", "Integrations", Link2],
        ] as const)
      : ([
          ["interest", "Overview", LayoutDashboard],
          ["profile", "Company profile", Users],
          ["readiness", "Readiness", ShieldCheck],
          ["materials", "Materials", FolderOpen],
          ["packet", "Investor packet", FileText],
          ["intelligence", "Build from deck", Sparkles],
          ["integrations", "Integrations", Link2],
        ] as const);
  const headings: Record<View, [string, string]> = {
    discover: ["Discover your next big thing.", "A good fit deserves a closer look."],
    pipeline: ["Good conversations start here.", "Keep your next moves in view."],
    insights: [
      "The bigger picture.",
      "A clear look at your discovery activity and thesis overlap.",
    ],
    integrations: ["Your sources. Together.", "Explore the connections planned for FundMatch."],
    profile:
      persona === "investor"
        ? ["Your thesis. Your lens.", "Change your preferences and see matching respond."]
        : ["Tell your company’s story.", "Bring the details that matter into focus."],
    readiness: ["Ready for the room.", "Know what’s ready, what’s missing and who’s on it."],
    intelligence: [
      "From evidence to understanding.",
      "Build a sourced profile you can stand behind.",
    ],
    packet: [
      "Your story. Ready to share.",
      "A consistent company profile for your next investor conversation.",
    ],
    materials: ["Your story, supported.", "Organize links to the materials behind your profile."],
    interest: ["Your next chapter.", "Your company, your preparation and the path ahead."],
    company: [company.name, company.tagline],
  };
  return (
    <div className="fm-demo" data-persona={persona}>
      <header className="demo-header">
        <Link to="/">
          <Brand />
        </Link>
        <div>
          <span className="demo-label">
            DEMO · {storageOk ? "SAVED ON THIS DEVICE" : "SESSION ONLY"}
          </span>
          <select
            aria-label="Choose demo persona"
            value={persona}
            onChange={(e) => {
              void go({
                search: {
                  persona: e.target.value as Persona,
                  view: e.target.value === "founder" ? "interest" : "discover",
                  company: company.id,
                },
              });
            }}
          >
            <option value="investor">Investor view</option>
            <option value="founder">Founder view</option>
          </select>
        </div>
      </header>
      <div className="demo-layout">
        <aside className="demo-sidebar" aria-label="Demo navigation">
          <div className="fm-workspace-caption">YOUR WORKSPACE</div>
          {nav.map(([v, label, Icon]) => (
            <Link
              key={v}
              to="/demo"
              search={navigate(v)}
              className={view === v ? "active" : ""}
              aria-current={view === v ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
          <small>
            Fictional demo data.
            <br />
            Rules-based fit, not investment odds.
            <br />
            No real accounts or external connections.
          </small>
          <button className="demo-link" onClick={() => setReset(true)}>
            Reset this demo
          </button>
          <Link to="/">
            Back to FundMatch <ArrowUpRight size={13} />
          </Link>
        </aside>
        <main className="demo-main">
          <div className="demo-page-heading">
            <div>
              <span className="fm-kicker">
                {persona === "investor"
                  ? "NORTHSTAR VENTURES · DEMO FIRM"
                  : "FOUNDER WORKSPACE · DEMO"}
              </span>
              <h1>{headings[view][0]}</h1>
              <p>{headings[view][1]}</p>
            </div>
            {persona === "founder" && (
              <select
                aria-label="Select company"
                value={company.id}
                onChange={(e) => {
                  void go({ search: { persona: "founder", view, company: e.target.value } });
                }}
              >
                {state.companies.slice(0, 2).map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {!ready ? (
            <div className="demo-card" role="status">
              Opening your demo…
            </div>
          ) : (
            <>
              {view === "discover" && (
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
                      {["All sectors", ...new Set(state.companies.map((c) => c.sector))].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                    <select
                      aria-label="Filter by stage"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                    >
                      {["All stages", "Seed", "Series A"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </div>
                  {active ? (
                    <div className="demo-grid fm-discovery-grid">
                      <DiscoveryCard
                        key={active.c.id}
                        company={active.c}
                        score={active.match.score}
                        metrics={<Metrics company={active.c} />}
                        demo
                        onDecide={(decision) => decide(active.c.id, decision)}
                      >
                        <Link
                          to="/demo"
                          search={navigate("company", active.c.id)}
                          className="demo-link"
                        >
                          View full profile <ArrowUpRight size={15} />
                        </Link>
                      </DiscoveryCard>
                      <aside>
                        <article className="demo-card">
                          <span className="fm-kicker">YOUR THESIS, IN FOCUS</span>
                          <h3>Here’s the connection.</h3>
                          {active.match.strengths.map((x) => (
                            <div className="demo-check" key={x}>
                              <Check size={16} />
                              {x}
                            </div>
                          ))}
                          <h3 className="fm-diligence-heading">Worth a conversation</h3>
                          {active.match.risks.map((x) => (
                            <p key={x}>{x}</p>
                          ))}
                          <p className="demo-note">
                            This is a transparent rules-based score using fictional data. It is not
                            AI due diligence or a probability of investment.
                          </p>
                          <Link to="/demo" search={navigate("profile")} className="demo-link">
                            Adjust your investment thesis →
                          </Link>
                        </article>
                        <p className="fm-micro">{available.length} companies left in this view.</p>
                      </aside>
                    </div>
                  ) : (
                    <div className="demo-card demo-empty">
                      <h2>You’re all caught up.</h2>
                      <p>Try different filters or revisit your discovery decisions.</p>
                      <button
                        className="fm-button secondary"
                        onClick={() => {
                          setSector("All sectors");
                          setStage("All stages");
                          setQuery("");
                          setState((s) => ({ ...s, decisions: {} }));
                        }}
                      >
                        Revisit companies
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === "pipeline" && (
                <>
                  <div className="demo-stat-grid">
                    <article>
                      <strong>{Object.keys(state.pipeline).length}</strong>
                      <span>In your pipeline</span>
                    </article>
                    <article>
                      <strong>
                        {Object.values(state.decisions).filter((d) => d === "save").length}
                      </strong>
                      <span>Saved for later</span>
                    </article>
                    <article>
                      <strong>
                        {Object.values(state.pipeline).filter((d) => d === "Meeting").length}
                      </strong>
                      <span>At meeting stage</span>
                    </article>
                  </div>
                  <div className="demo-kanban">
                    {(["New", "Reviewing", "Meeting", "Passed"] as const).map((status) => (
                      <section className="demo-column" key={status}>
                        <h2>
                          {status} ·{" "}
                          {Object.values(state.pipeline).filter((v) => v === status).length}
                        </h2>
                        {state.companies
                          .filter((c) => state.pipeline[c.id] === status)
                          .map((c) => (
                            <article className="demo-card" key={c.id}>
                              <Link to="/demo" search={navigate("company", c.id)}>
                                <h3>{c.name} ↗</h3>
                              </Link>
                              <p>
                                {c.stage} · {money(c.ask)} raise
                              </p>
                              <p>{fit(c, state.thesis).score}/100 thesis fit</p>
                              <select
                                aria-label={"Pipeline stage for " + c.name}
                                value={status}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    pipeline: {
                                      ...s.pipeline,
                                      [c.id]: e.target.value as typeof status,
                                    },
                                  }))
                                }
                              >
                                {["New", "Reviewing", "Meeting", "Passed"].map((x) => (
                                  <option key={x}>{x}</option>
                                ))}
                              </select>
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                  <section className="demo-card" style={{ marginTop: 24 }}>
                    <h2>Saved for later</h2>
                    {state.companies
                      .filter((c) => state.decisions[c.id] === "save")
                      .map((c) => (
                        <div className="demo-list-row" key={c.id}>
                          <Link to="/demo" search={navigate("company", c.id)}>
                            {c.name} ↗
                          </Link>
                          <button className="demo-link" onClick={() => decide(c.id, "interested")}>
                            Move to pipeline →
                          </button>
                        </div>
                      ))}
                    {!Object.values(state.decisions).includes("save") && (
                      <p>Your saved companies will appear here.</p>
                    )}
                  </section>
                </>
              )}
              {view === "insights" && (
                <>
                  <div className="demo-stat-grid">
                    <article>
                      <strong>{Object.keys(state.decisions).length}</strong>
                      <span>Discovery decisions</span>
                    </article>
                    <article>
                      <strong>{ranked.filter((x) => x.match.score >= 75).length}</strong>
                      <span>Companies at 75+ fit</span>
                    </article>
                    <article>
                      <strong>{state.notes.length}</strong>
                      <span>Review notes</span>
                    </article>
                  </div>
                  <div className="demo-card">
                    <h2>Thesis overlap</h2>
                    {ranked.map(({ c, match }) => (
                      <div className="demo-list-row" key={c.id}>
                        <div>
                          <Link to="/demo" search={navigate("company", c.id)}>
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
                      Rankings recalculate when you edit the thesis. All underlying metrics are
                      illustrative. No performance or return is predicted.
                    </p>
                  </div>
                </>
              )}
              {view === "profile" &&
                (persona === "investor" ? (
                  <div className="demo-card">
                    <h2>Northstar Ventures</h2>
                    <p>
                      A fictional investment firm. Preferences below drive the working MatchEngine.
                    </p>
                    <form
                      key={JSON.stringify(state.thesis)}
                      className="demo-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const split = (k: string) =>
                          String(f.get(k) || "")
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean);
                        const min = Number(f.get("min")),
                          max = Number(f.get("max"));
                        if (min > max) {
                          setToast("Minimum check size must be below maximum.");
                          return;
                        }
                        setState((s) => ({
                          ...s,
                          thesis: {
                            sectors: split("sectors"),
                            stages: split("stages"),
                            geographies: split("geographies"),
                            models: split("models"),
                            exclusions: split("exclusions"),
                            min,
                            max,
                            growth: Number(f.get("growth")),
                          },
                        }));
                        setToast("Thesis saved. Fit scores have updated.");
                      }}
                    >
                      {(["sectors", "stages", "geographies", "models", "exclusions"] as const).map(
                        (key) => (
                          <label key={key}>
                            {
                              {
                                sectors: "Sectors",
                                stages: "Stages",
                                geographies: "Geographies",
                                models: "Business models",
                                exclusions: "Exclusions",
                              }[key]
                            }{" "}
                            (comma separated)
                            <input
                              name={key}
                              defaultValue={state.thesis[key].join(", ")}
                              placeholder={key === "exclusions" ? "e.g. Alcohol" : ""}
                            />
                          </label>
                        ),
                      )}
                      <label>
                        Minimum check (USD)
                        <input
                          type="number"
                          name="min"
                          min="0"
                          required
                          defaultValue={state.thesis.min}
                        />
                      </label>
                      <label>
                        Maximum check (USD)
                        <input
                          type="number"
                          name="max"
                          min="0"
                          required
                          defaultValue={state.thesis.max}
                        />
                      </label>
                      <label>
                        Minimum YoY growth (%)
                        <input
                          type="number"
                          name="growth"
                          min="0"
                          required
                          defaultValue={state.thesis.growth}
                        />
                      </label>
                      <div className="full">
                        <button className="fm-button" type="submit">
                          Save investment thesis <Check size={15} />
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <FounderBuilder
                    key={company.id}
                    profile={fromDemoCompany(company)}
                    demo
                    onSave={async (patch) => {
                      setState((current) => ({
                        ...current,
                        companies: current.companies.map((c) =>
                          c.id === company.id ? { ...c, ...patch } : c,
                        ),
                      }));
                      setToast(
                        storageOk
                          ? "Demo profile saved on this device."
                          : "Profile saved for this session only.",
                      );
                    }}
                    onContinue={() => void go({ search: navigate("materials") })}
                  />
                ))}
              {view === "company" && (
                <div className="demo-grid">
                  <div>
                    <article className="demo-card">
                      <div className="demo-meta">
                        <span>{company.sector}</span>
                        <span>{company.stage}</span>
                        <span>{company.geography}</span>
                      </div>
                      <p>{company.summary}</p>
                      <Metrics company={company} />
                      <h3>Team & business model</h3>
                      <p>
                        {company.team === null
                          ? "Team size not provided"
                          : `${company.team} people`}{" "}
                        · {company.businessModel}
                      </p>
                      <h3>Source transparency</h3>
                      <p>
                        Company profile and financial metrics: fictional FundMatch demo data. Any
                        changes you make are stored on this device. No external data source has
                        verified these claims.
                      </p>
                      {company.website && safeUrl(company.website) && (
                        <a
                          className="demo-link"
                          href={company.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visit supplied website ↗
                        </a>
                      )}
                      <h3>Materials</h3>
                      {state.materials
                        .filter((m) => m.company === company.id)
                        .map((m) => (
                          <p key={m.id}>
                            {safeUrl(m.url) ? (
                              <a
                                className="demo-link"
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {m.title} ↗
                              </a>
                            ) : (
                              m.title
                            )}
                          </p>
                        ))}
                      {!state.materials.some((m) => m.company === company.id) && (
                        <p>No materials supplied. Add a link in the founder workspace.</p>
                      )}
                      <div className="demo-controls">
                        <button
                          className="fm-button secondary"
                          onClick={() => decide(company.id, "save")}
                        >
                          Save <Bookmark size={14} />
                        </button>
                        <button
                          className="fm-button"
                          onClick={() => decide(company.id, "interested")}
                        >
                          Move to pipeline <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                    <article className="demo-card" style={{ marginTop: 20 }}>
                      <h2>Review notes</h2>
                      <div className="demo-notes">
                        {state.notes
                          .filter((n) => n.company === company.id)
                          .map((n) => (
                            <p key={n.id}>
                              {n.text}
                              <small>You · {new Date(n.date).toLocaleString()}</small>
                            </p>
                          ))}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const text = String(new FormData(form).get("note") || "").trim();
                          if (!text) return;
                          setState((s) => ({
                            ...s,
                            notes: [
                              ...s.notes,
                              {
                                id: crypto.randomUUID(),
                                company: company.id,
                                text,
                                date: new Date().toISOString(),
                              },
                            ],
                          }));
                          form.reset();
                          setToast("Review note saved.");
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
                        <button className="fm-button compact" style={{ marginTop: 12 }}>
                          Save note <Plus size={13} />
                        </button>
                      </form>
                    </article>
                  </div>
                  <aside className="demo-card">
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
                    <p className="demo-note">
                      Rules-based fit against Northstar Ventures’ demo thesis. This is not an
                      investment recommendation.
                    </p>
                  </aside>
                </div>
              )}
              {view === "interest" && (
                <>
                  <FounderJourney
                    profile={fromDemoCompany(company)}
                    materials={state.materials.filter((m) => m.company === company.id)}
                    tasks={tasks}
                    onOpen={(next) => void go({ search: navigate(next) })}
                  />
                  <div className="demo-stat-grid">
                    <article>
                      <strong>{company.name}</strong>
                      <span>Your demo company</span>
                    </article>
                    <article>
                      <strong>
                        {completed}/{tasks.length}
                      </strong>
                      <span>Readiness items complete</span>
                    </article>
                    <article>
                      <strong>
                        {state.materials.filter((m) => m.company === company.id).length}
                      </strong>
                      <span>Supporting material links</span>
                    </article>
                  </div>
                  <div className="demo-grid">
                    <article className="demo-card">
                      <span className="fm-kicker">YOUR NEXT MOVE</span>
                      <h2>Make a stronger first impression.</h2>
                      <p>
                        A clear story and organized materials make the next conversation easier.
                        Start with your profile, then work through your fundraising checklist.
                      </p>
                      <div className="demo-controls">
                        <Link to="/demo" search={navigate("profile")} className="fm-button">
                          Edit your profile <ArrowRight size={15} />
                        </Link>
                        <Link
                          to="/demo"
                          search={navigate("readiness")}
                          className="fm-button secondary"
                        >
                          Open readiness
                        </Link>
                      </div>
                    </article>
                    <article className="demo-card">
                      <h2>Investor interest</h2>
                      <p>
                        {state.decisions[company.id] === "interested"
                          ? "You marked this company as interested in the investor demo. It is now in the demo pipeline."
                          : "No investor interest yet. Explore the investor view to try the interest-to-pipeline workflow."}
                      </p>
                      <p className="demo-note">
                        These are your local demo actions. No actual investors have viewed, saved or
                        contacted this company through this demo.
                      </p>
                    </article>
                  </div>
                </>
              )}
              {view === "packet" && (
                <>
                  <div className="demo-toolbar fm-packet-controls">
                    <label>
                      Packet checklist{" "}
                      <select
                        aria-label="Packet checklist"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                      >
                        <option value="vc">VC / angel fundraising</option>
                        <option value="pe">PE acquisition preparation</option>
                      </select>
                    </label>
                  </div>
                  <InvestorPacket
                    key={`${company.id}:${template}`}
                    profile={fromDemoCompany(company)}
                    materials={state.materials.filter((m) => m.company === company.id)}
                    tasks={tasks}
                    template={template === "pe" ? "pe" : "vc"}
                    demo
                    onEdit={() => void go({ search: navigate("profile") })}
                  />
                </>
              )}
              {view === "intelligence" && (
                <ProfileIntelligence
                  key={company.id}
                  profileId={company.id}
                  preferences={{
                    sectors: state.thesis.sectors,
                    stages: state.thesis.stages,
                    geographies: state.thesis.geographies,
                    businessModels: state.thesis.models,
                    exclusions: state.thesis.exclusions,
                    checkMin: state.thesis.min,
                    checkMax: state.thesis.max,
                    currency: "USD",
                    minGrowth: state.thesis.growth,
                  }}
                />
              )}
              {view === "readiness" && (
                <>
                  <div className="demo-toolbar">
                    <select
                      aria-label="Readiness template"
                      value={template}
                      onChange={(e) => {
                        setTemplate(e.target.value);
                        setCategory("All");
                        setTaskStatus("All");
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
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value)}
                    >
                      {["All", "Missing", "In progress", "Complete", "Needs update"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </div>
                  <article className="demo-card">
                    <div className="demo-list-row" style={{ paddingTop: 0, border: 0 }}>
                      <div>
                        <h2>
                          {company.name} · {Math.round((completed / tasks.length) * 100)}% prepared
                        </h2>
                        <p>
                          {completed} of {tasks.length} items complete. Open an item to assign an
                          owner, deadline and evidence.
                        </p>
                      </div>
                      <ShieldCheck size={30} />
                    </div>
                    <Progress value={(completed / tasks.length) * 100} />
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
                                (taskStatus === "All" || t.status === taskStatus),
                            )
                            .map((t) => (
                              <tr key={t.id}>
                                <td>
                                  <button onClick={() => setEditingTask(t)}>
                                    <FileText size={14} />
                                    <span>
                                      {t.title}
                                      <small
                                        style={{ display: "block", color: "#93999f", fontSize: 9 }}
                                      >
                                        {t.category}
                                      </small>
                                    </span>
                                  </button>
                                </td>
                                <td>{t.owner || "Unassigned"}</td>
                                <td>{t.due || "No due date"}</td>
                                <td>
                                  <span className="fm-chip">{t.status}</span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="demo-note">
                      Completion is team-reported preparation, not verified diligence or a funding
                      guarantee. Evidence links are not automatically analyzed. Do not store
                      confidential information in this browser demo.
                    </p>
                  </article>
                </>
              )}
              {view === "materials" && (
                <div className="demo-card">
                  <h2>Materials for {company.name}</h2>
                  <Link to="/demo" search={navigate("packet")} className="fm-button secondary">
                    Preview investor packet <ArrowRight size={15} />
                  </Link>
                  <p>
                    Use fictional or public example links to try the workflow. The demo stores link
                    metadata only; it does not upload files or change sharing permissions.
                  </p>
                  {state.materials
                    .filter((m) => m.company === company.id)
                    .map((m) => (
                      <div className="demo-list-row" key={m.id}>
                        <div>
                          <h3>
                            {safeUrl(m.url) ? (
                              <a href={m.url} target="_blank" rel="noreferrer">
                                {m.title} ↗
                              </a>
                            ) : (
                              m.title
                            )}
                          </h3>
                          <p>Supplied by you · External link</p>
                        </div>
                        <button
                          className="demo-link"
                          onClick={() => {
                            setState((s) => ({
                              ...s,
                              materials: s.materials.filter((x) => x.id !== m.id),
                            }));
                            setToast("Link removed from this demo.");
                          }}
                        >
                          Remove link
                        </button>
                      </div>
                    ))}
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
                        setToast("Add a title and valid http or https link.");
                        return;
                      }
                      setState((s) => ({
                        ...s,
                        materials: [
                          ...s.materials,
                          { id: crypto.randomUUID(), company: company.id, title, url },
                        ],
                      }));
                      form.reset();
                      setToast("Material link saved.");
                    }}
                  >
                    <label>
                      Document title
                      <input name="title" placeholder="Seed pitch deck" required maxLength={200} />
                    </label>
                    <label>
                      Document link
                      <input name="url" type="url" placeholder="https://…" required />
                    </label>
                    <div className="full">
                      <button className="fm-button" type="submit">
                        Add material <Plus size={15} />
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {view === "integrations" && (
                <>
                  <p className="demo-note">
                    These integrations are planned. No account is connected, no permissions have
                    been granted and no data is being imported.
                  </p>
                  <div className="demo-integrations" style={{ marginTop: 24 }}>
                    {(persona === "investor"
                      ? [
                          "Affinity CRM",
                          "Google Workspace",
                          "Microsoft 365",
                          "PitchBook",
                          "DocSend",
                        ]
                      : ["Google Workspace", "Stripe", "HubSpot", "DocSend"]
                    ).map((name) => (
                      <article className="demo-card" key={name}>
                        <Link2 size={25} />
                        <h3>{name}</h3>
                        <p>
                          {
                            {
                              "Affinity CRM":
                                "Bring company records and relationship context into your deal review.",
                              "Google Workspace": "Connect selected files and company materials.",
                              "Microsoft 365": "Bring selected documents into your workspace.",
                              PitchBook:
                                "Licensed company and financing data for profile enrichment.",
                              DocSend: "Reference pitch materials shared with your team.",
                              Stripe: "Use permissioned revenue data to support traction claims.",
                              HubSpot: "Bring customer and sales context into company profiles.",
                            }[name]
                          }
                        </p>
                        <span className="fm-chip">NOT CONNECTED</span>
                        <br />
                        <button
                          className="fm-button secondary compact"
                          onClick={() => setConnector(name)}
                        >
                          View planned connection <ArrowUpRight size={13} />
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <Dialog open={Boolean(editingTask)} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent className="demo-evidence-dialog">
          <DialogTitle>{editingTask?.title}</DialogTitle>
          <DialogDescription>
            Assign responsibility and record supporting evidence. Saved on this device.
          </DialogDescription>
          {editingTask && (
            <form
              key={editingTask.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const evidence = String(f.get("evidence") || "").trim();
                if (evidence && !safeUrl(evidence)) {
                  setToast("Use a valid http or https evidence link.");
                  return;
                }
                const updated = {
                  ...editingTask,
                  owner: String(f.get("owner") || "").trim(),
                  due: String(f.get("due") || ""),
                  evidence,
                  notes: String(f.get("notes") || "").trim(),
                  status: String(f.get("status")) as Task["status"],
                };
                setState((s) => ({
                  ...s,
                  tasks: {
                    ...s.tasks,
                    [taskKey]: tasks.map((t) => (t.id === updated.id ? updated : t)),
                  },
                }));
                setEditingTask(null);
                setToast("Readiness item saved.");
              }}
            >
              <label>
                Owner
                <input name="owner" defaultValue={editingTask.owner} placeholder="Who owns this?" />
              </label>
              <label>
                Status
                <select name="status" defaultValue={editingTask.status}>
                  {["Missing", "In progress", "Complete", "Needs update"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <input name="due" type="date" defaultValue={editingTask.due} />
              </label>
              <label>
                Evidence link
                <input
                  name="evidence"
                  type="url"
                  defaultValue={editingTask.evidence}
                  placeholder="https://…"
                />
              </label>
              <label>
                Notes
                <textarea name="notes" defaultValue={editingTask.notes} />
              </label>
              <button className="fm-button" type="submit">
                Save readiness item <Check size={15} />
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(connector)} onOpenChange={(o) => !o && setConnector(null)}>
        <DialogContent>
          <DialogTitle>{connector} · planned integration</DialogTitle>
          <DialogDescription>
            This is a product preview, not an active connection.
          </DialogDescription>
          <p className="text-sm leading-relaxed">
            A future connection will require an authorized account, explicit data permissions and
            any applicable API license. This connector does not ask for credentials or import data.
            AI enrichment is not connected yet. Local deck extraction is available under Build from
            deck.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={reset} onOpenChange={setReset}>
        <DialogContent>
          <DialogTitle>Reset this device’s demo?</DialogTitle>
          <DialogDescription>
            This removes your local demo edits, notes, decisions, material links and readiness
            changes. It does not affect external accounts.
          </DialogDescription>
          <button
            className="fm-button"
            onClick={() => {
              setState(initialState());
              setReset(false);
              setToast("Demo reset.");
            }}
          >
            Reset local demo
          </button>
          <button className="fm-button secondary" onClick={() => setReset(false)}>
            Keep my changes
          </button>
        </DialogContent>
      </Dialog>
      {toast && (
        <div className="demo-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function Metrics({ company }: { company: Company }) {
  return (
    <div className="fm-preview-metrics">
      <div>
        <strong>{money(company.revenue)}</strong>
        <span>Annual revenue · demo</span>
      </div>
      <div>
        <strong>{company.growth === null ? "Not provided" : `${company.growth}%`}</strong>
        <span>YoY growth · demo</span>
      </div>
      <div>
        <strong>{money(company.ask)}</strong>
        <span>Raising · demo</span>
      </div>
    </div>
  );
}
