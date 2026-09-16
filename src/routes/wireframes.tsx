import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Compass,
  FileCheck2,
  FileText,
  FolderOpen,
  Handshake,
  HeartHandshake,
  Info,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import "../wireframes.css";

type Persona = "founder" | "investor";
type View =
  | "home"
  | "profile"
  | "readiness"
  | "materials"
  | "packet"
  | "founder-interest"
  | "discover"
  | "company"
  | "pipeline"
  | "thesis"
  | "investor-interest"
  | "intro";
type Decision = "none" | "saved" | "passed" | "interested";
type InterestStatus = "none" | "requested" | "needs_information" | "accepted" | "declined";

type ScreenProps = {
  setView: (view: View) => void;
  decision: Decision;
  setDecision: (decision: Decision) => void;
  interestStatus: InterestStatus;
  setInterestStatus: (status: InterestStatus) => void;
  processing: boolean;
  setProcessing: (value: boolean) => void;
  setPersona: (persona: Persona) => void;
};

const company = {
  name: "Dippi",
  tagline: "Making everyday hydration easier to stick with.",
  sector: "Consumer health",
  stage: "Seed",
  geography: "United States",
  raise: "$2.0M",
  revenue: "$84k MRR",
  growth: "+18% MoM",
  match: 92,
};

const investor = {
  firm: "Northstar Ventures",
  partner: "Maya Chen",
  thesis: "Seed consumer health and wellness companies with repeat-purchase behavior and early revenue traction.",
};

export const Route = createFileRoute("/wireframes")({
  component: WireframePrototype,
  head: () => ({
    meta: [
      { title: "FundMatch Interactive Wireframes" },
      {
        name: "description",
        content: "Interactive responsive wireframes for FundMatch founder and investor workflows.",
      },
    ],
  }),
});

function WireframePrototype() {
  const [persona, setPersona] = useState<Persona>("investor");
  const [view, setView] = useState<View>("discover");
  const [decision, setDecision] = useState<Decision>("none");
  const [interestStatus, setInterestStatus] = useState<InterestStatus>("none");
  const [processing, setProcessing] = useState(false);

  const switchPersona = (next: Persona) => {
    setPersona(next);
    if (next === "founder") {
      setView(interestStatus === "none" ? "home" : "founder-interest");
    } else {
      setView(decision === "none" ? "discover" : "pipeline");
    }
  };

  const nav = useMemo(
    () =>
      persona === "investor"
        ? ([
            ["discover", "Discover", Compass],
            ["pipeline", "Pipeline", LayoutDashboard],
            ["thesis", "Thesis", Settings2],
          ] as const)
        : ([
            ["home", "Home", LayoutDashboard],
            ["profile", "Profile", Building2],
            ["readiness", "Readiness", ShieldCheck],
            ["materials", "Materials", FolderOpen],
            ["packet", "Packet", FileText],
          ] as const),
    [persona],
  );

  const props: ScreenProps = {
    setView,
    decision,
    setDecision,
    interestStatus,
    setInterestStatus,
    processing,
    setProcessing,
    setPersona,
  };

  return (
    <div className="wfx-shell" data-persona={persona}>
      <header className="wfx-topbar">
        <div className="wfx-brand-wrap">
          <Link to="/" className="wfx-brand" aria-label="FundMatch home">
            <span>f</span>
            <strong>FundMatch</strong>
          </Link>
          <span className="wfx-prototype-badge">Interactive wireframe</span>
        </div>
        <div className="wfx-top-actions">
          <div className="wfx-role-switch" aria-label="Preview role">
            <button className={persona === "founder" ? "active" : ""} onClick={() => switchPersona("founder")}>
              Founder
            </button>
            <button className={persona === "investor" ? "active" : ""} onClick={() => switchPersona("investor")}>
              Investor
            </button>
          </div>
          <button className="wfx-icon-button" aria-label="Notifications">
            <Bell size={18} />
            {interestStatus === "requested" && <span className="wfx-dot" />}
          </button>
        </div>
      </header>

      <div className="wfx-layout">
        <aside className="wfx-sidebar">
          <span className="wfx-eyebrow">{persona === "investor" ? "INVESTOR WORKSPACE" : "FOUNDER WORKSPACE"}</span>
          <strong className="wfx-org">{persona === "investor" ? investor.firm : company.name}</strong>
          <nav>
            {nav.map(([target, label, Icon]) => (
              <button key={target} className={view === target ? "active" : ""} onClick={() => setView(target)}>
                <Icon size={18} />
                {label}
              </button>
            ))}
            {persona === "founder" && interestStatus !== "none" && (
              <button className={view === "founder-interest" ? "active" : ""} onClick={() => setView("founder-interest")}>
                <HeartHandshake size={18} />
                Investor interest
                <span className="wfx-nav-count">1</span>
              </button>
            )}
            {interestStatus === "accepted" && (
              <button className={view === "intro" ? "active" : ""} onClick={() => setView("intro")}>
                <MessageSquare size={18} />
                Introduction
              </button>
            )}
          </nav>
          <div className="wfx-sidebar-note">
            <Info size={15} />
            <p>Prototype data only. No Supabase, email, AI, or production actions run from this route.</p>
          </div>
        </aside>

        <main className="wfx-main">
          <div className="wfx-mobile-context">
            <span>{persona === "investor" ? investor.firm : company.name}</span>
            <small>{persona === "investor" ? "Investor workspace" : "Founder workspace"}</small>
          </div>
          <Screen view={view} persona={persona} {...props} />
        </main>
      </div>

      <nav className="wfx-bottom-nav" aria-label="Mobile navigation">
        {nav.slice(0, 4).map(([target, label, Icon]) => (
          <button key={target} className={view === target ? "active" : ""} onClick={() => setView(target)}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={() => setView(persona === "founder" ? "founder-interest" : "pipeline")}>
          <MoreHorizontal size={19} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

function Screen({ view, persona, ...props }: { view: View; persona: Persona } & ScreenProps) {
  if (view === "intro") return <IntroductionThread {...props} />;
  if (persona === "founder") {
    if (view === "profile") return <FounderProfile {...props} />;
    if (view === "readiness") return <FounderReadiness {...props} />;
    if (view === "materials") return <FounderMaterials {...props} />;
    if (view === "packet") return <FounderPacket {...props} />;
    if (view === "founder-interest") return <FounderInterest {...props} />;
    return <FounderHome {...props} />;
  }
  if (view === "company") return <CompanyDetail {...props} />;
  if (view === "pipeline") return <InvestorPipeline {...props} />;
  if (view === "thesis") return <InvestorThesis {...props} />;
  if (view === "investor-interest") return <InvestorInterest {...props} />;
  return <InvestorDiscover {...props} />;
}

function Page({ eyebrow, title, description, actions, children }: { eyebrow: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="wfx-page">
      <div className="wfx-page-head">
        <div>
          <span className="wfx-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="wfx-page-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={`wfx-card ${className}`}>{children}</article>;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="wfx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", disabled = false }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean }) {
  return (
    <button className={`wfx-button ${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "sage" | "peri" | "warn" }) {
  return <span className={`wfx-tag ${tone}`}>{children}</span>;
}

function FounderHome({ setView, interestStatus }: ScreenProps) {
  return (
    <Page eyebrow="FOUNDER OVERVIEW" title="Your next chapter." description="Get your company ready, keep materials organized, and respond to the right investors.">
      {interestStatus !== "none" && (
        <button className="wfx-alert-card" onClick={() => setView("founder-interest")}>
          <div className="wfx-alert-icon"><HeartHandshake size={22} /></div>
          <div>
            <strong>New investor interest from {investor.firm}</strong>
            <span>{investor.partner} shared why {company.name} fits their thesis.</span>
          </div>
          <ChevronRight size={20} />
        </button>
      )}
      <div className="wfx-grid two">
        <Card className="wfx-progress-card">
          <div className="wfx-card-head">
            <div><span className="wfx-eyebrow">FUNDRAISING READINESS</span><h2>72% ready</h2></div>
            <div className="wfx-ring">72</div>
          </div>
          <div className="wfx-progress"><span style={{ width: "72%" }} /></div>
          <ul className="wfx-check-list compact">
            <li className="done"><Check size={16} />Company essentials</li>
            <li className="done"><Check size={16} />Raise details</li>
            <li><ListChecks size={16} />Customer concentration</li>
            <li><FileText size={16} />Data room index</li>
          </ul>
          <Button onClick={() => setView("readiness")} variant="secondary">Review readiness <ArrowRight size={16} /></Button>
        </Card>
        <Card>
          <div className="wfx-card-head"><div><span className="wfx-eyebrow">PROFILE</span><h2>Investor-facing story</h2></div><Tag tone="sage">84% complete</Tag></div>
          <p className="wfx-muted">Your profile is discoverable once the remaining required items are complete and you choose to list it.</p>
          <div className="wfx-mini-profile">
            <div className="wfx-company-mark">d</div>
            <div><strong>{company.name}</strong><span>{company.stage} · {company.sector}</span></div>
          </div>
          <Button onClick={() => setView("profile")} variant="secondary">Continue profile <ArrowRight size={16} /></Button>
        </Card>
      </div>
      <div className="wfx-grid three">
        <QuickAction icon={<FolderOpen size={20} />} title="Materials" note="6 files · 1 link" onClick={() => setView("materials")} />
        <QuickAction icon={<FileCheck2 size={20} />} title="Investor packet" note="Preview standardized profile" onClick={() => setView("packet")} />
        <QuickAction icon={<Users size={20} />} title="Team" note="2 members · 1 invite" />
      </div>
    </Page>
  );
}

function QuickAction({ icon, title, note, onClick }: { icon: ReactNode; title: string; note: string; onClick?: () => void }) {
  return <button className="wfx-quick" onClick={onClick}><span>{icon}</span><div><strong>{title}</strong><small>{note}</small></div><ChevronRight size={18} /></button>;
}

function FounderProfile({ setView }: ScreenProps) {
  return (
    <Page eyebrow="COMPANY PROFILE" title="Tell your company’s story." description="Structured information investors can compare without flattening what makes your company different." actions={<Button onClick={() => setView("packet")}>Preview investor view</Button>}>
      <div className="wfx-form-layout">
        <div className="wfx-step-rail">
          {[["1","Essentials",true],["2","Traction",true],["3","Raise",true],["4","Team",false],["5","Review",false]].map(([n,label,done]) => <div key={String(n)} className={done ? "done" : ""}><span>{done ? <Check size={14}/> : n}</span><strong>{label}</strong></div>)}
        </div>
        <div className="wfx-form-stack">
          <Card>
            <div className="wfx-section-title"><div><h2>Company essentials</h2><p>What should an investor understand in the first 30 seconds?</p></div><Tag tone="sage">Complete</Tag></div>
            <div className="wfx-fields two">
              <Field label="Company name" value={company.name} />
              <Field label="Website" value="dippi.co" />
              <Field label="Sector" value={company.sector} />
              <Field label="Stage" value={company.stage} />
            </div>
            <Field label="One-line description" value={company.tagline} multiline />
          </Card>
          <Card>
            <div className="wfx-section-title"><div><h2>Traction</h2><p>Use current numbers and make the source easy to verify.</p></div><Tag tone="sage">Complete</Tag></div>
            <div className="wfx-fields three"><Field label="MRR" value={company.revenue}/><Field label="Growth" value={company.growth}/><Field label="Customers" value="2,840"/></div>
          </Card>
          <Card>
            <div className="wfx-section-title"><div><h2>Raise</h2><p>Set expectations before an introduction is requested.</p></div><Tag tone="peri">In progress</Tag></div>
            <div className="wfx-fields two"><Field label="Target raise" value={company.raise}/><Field label="Instrument" value="SAFE"/></div>
            <Field label="Use of funds" value="Growth hires, retail expansion, and inventory working capital." multiline />
          </Card>
          <div className="wfx-sticky-actions"><Button variant="secondary">Save draft</Button><Button onClick={() => setView("readiness")}>Save & continue <ArrowRight size={16}/></Button></div>
        </div>
      </div>
    </Page>
  );
}

function Field({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return <label className="wfx-field"><span>{label}</span>{multiline ? <textarea defaultValue={value} /> : <input defaultValue={value} />}</label>;
}

function FounderReadiness({ setView }: ScreenProps) {
  const groups = [
    ["Company story", 100, [["Problem + solution", true],["Business model", true],["Market definition", true]]],
    ["Fundraising", 75, [["Raise target", true],["Use of funds", true],["Milestones to next round", false]]],
    ["Diligence materials", 58, [["Pitch deck", true],["Financial model", true],["Customer concentration", false],["Data room index", false]]],
  ] as const;
  return (
    <Page eyebrow="READINESS" title="Ready for the room." description="Know what is solid, what is missing, and what an investor is likely to ask for next." actions={<Button onClick={() => setView("packet")}>Preview packet</Button>}>
      <div className="wfx-readiness-summary"><div><span className="wfx-score">72</span><div><strong>Fundraising readiness</strong><small>VC preparation template</small></div></div><p>2 high-priority gaps before listing broadly.</p></div>
      <div className="wfx-readiness-groups">
        {groups.map(([title, score, items]) => <Card key={title}><div className="wfx-card-head"><div><h2>{title}</h2><span className="wfx-muted">{score}% complete</span></div><strong>{score}%</strong></div><div className="wfx-progress"><span style={{width:`${score}%`}}/></div><ul className="wfx-check-list">{items.map(([item,done]) => <li key={item} className={done?"done":""}>{done?<Check size={16}/>:<span className="wfx-open-dot"/>}<span>{item}</span>{!done && <button>Resolve</button>}</li>)}</ul></Card>)}
      </div>
    </Page>
  );
}

function FounderMaterials({ processing, setProcessing }: ScreenProps) {
  return (
    <Page eyebrow="MATERIALS" title="Your story, supported." description="Private documents and links stay behind your profile until you choose what to share." actions={<Button onClick={() => {setProcessing(true); window.setTimeout(()=>setProcessing(false),1600);}}><Upload size={16}/> Add material</Button>}>
      {processing && <div className="wfx-processing"><Sparkles size={18}/><div><strong>Processing pitch-deck.pdf</strong><span>Extracting reviewable suggestions. Nothing will overwrite your profile automatically.</span></div><span className="wfx-spinner"/></div>}
      <Card>
        <div className="wfx-table-head"><strong>Private materials</strong><span>6 items</span></div>
        <div className="wfx-material-row"><div className="wfx-file-icon"><FileText size={19}/></div><div><strong>pitch-deck.pdf</strong><span>PDF · 8.4 MB · Founder-visible</span></div><Tag tone="sage">Ready</Tag><button><MoreHorizontal size={18}/></button></div>
        <div className="wfx-material-row"><div className="wfx-file-icon"><FileText size={19}/></div><div><strong>financial-model.xlsx</strong><span>Spreadsheet · 1.2 MB · Founder-visible</span></div><Tag tone="sage">Ready</Tag><button><MoreHorizontal size={18}/></button></div>
        <div className="wfx-material-row"><div className="wfx-file-icon"><Paperclip size={19}/></div><div><strong>Product demo</strong><span>External link · investor-shareable</span></div><Tag tone="peri">Linked</Tag><button><MoreHorizontal size={18}/></button></div>
      </Card>
      <Card className="wfx-suggestion-card"><div><Sparkles size={20}/><div><strong>3 sourced suggestions available</strong><p>FundMatch found structured fields in your deck that you can review before adding them to the profile.</p></div></div><Button variant="secondary">Review suggestions</Button></Card>
    </Page>
  );
}

function FounderPacket({ setView }: ScreenProps) {
  return (
    <Page eyebrow="INVESTOR PACKET" title="Your story. Ready to share." description="A standardized investor view built from the information you approved." actions={<><Button variant="secondary">Print / PDF</Button><Button>Share packet</Button></>}>
      <div className="wfx-packet">
        <div className="wfx-packet-cover"><div className="wfx-company-mark large">d</div><div><span className="wfx-eyebrow">FUNDMatch COMPANY PROFILE</span><h2>{company.name}</h2><p>{company.tagline}</p></div><Tag tone="sage">Investor ready</Tag></div>
        <div className="wfx-packet-stats"><Stat label="Stage" value={company.stage}/><Stat label="Raise" value={company.raise}/><Stat label="MRR" value={company.revenue}/><Stat label="Growth" value={company.growth}/></div>
        <div className="wfx-grid two"><Card><h3>Why now</h3><p>Repeat purchase behavior is improving while retail pilots open a new distribution channel.</p></Card><Card><h3>Use of funds</h3><p>Growth hires, retail expansion, and inventory working capital.</p></Card></div>
        <div className="wfx-packet-footer"><ShieldCheck size={17}/><span>Claims shown here come from founder-approved profile data. Source materials remain private unless shared.</span></div>
      </div>
      <div className="wfx-mobile-sticky"><Button variant="secondary" onClick={() => setView("profile")}>Edit profile</Button><Button>Share packet</Button></div>
    </Page>
  );
}

function InvestorDiscover({ setView, decision, setDecision, interestStatus }: ScreenProps) {
  const act = (next: Decision) => {
    setDecision(next);
    if (next === "interested") setView("investor-interest");
  };
  return (
    <Page eyebrow="DISCOVER" title="Discover your next big thing." description="Eligible companies ranked against the thesis your team confirmed." actions={<Button variant="secondary" onClick={() => setView("thesis")}><Settings2 size={16}/> Adjust thesis</Button>}>
      <div className="wfx-discover-layout">
        <div className="wfx-discovery-stack">
          <div className="wfx-thesis-bar"><span>Active thesis</span><strong>Seed · Consumer health · US · $500k–$3M</strong><button onClick={() => setView("thesis")}>Edit</button></div>
          <article className="wfx-company-card">
            <div className="wfx-company-visual"><span>92</span><small>FIT SCORE</small><div className="wfx-company-mark xl">d</div></div>
            <div className="wfx-company-body">
              <div className="wfx-company-top"><div><div className="wfx-tags"><Tag tone="sage">{company.stage}</Tag><Tag>{company.sector}</Tag></div><h2>{company.name}</h2><p>{company.tagline}</p></div><button className="wfx-icon-button" onClick={() => setDecision(decision === "saved" ? "none" : "saved")}><Bookmark size={20} fill={decision === "saved" ? "currentColor" : "none"}/></button></div>
              <div className="wfx-card-metrics"><Stat label="Raise" value={company.raise}/><Stat label="MRR" value={company.revenue}/><Stat label="Growth" value={company.growth}/></div>
              <div className="wfx-fit-reasons"><strong>Why it fits</strong><span><Check size={15}/>Stage and check-size fit</span><span><Check size={15}/>Early revenue traction</span><span><Check size={15}/>Repeat-purchase business model</span></div>
              <button className="wfx-text-link" onClick={() => setView("company")}>Open full company profile <ArrowRight size={15}/></button>
            </div>
            <div className="wfx-decision-bar"><button className="pass" onClick={() => act("passed")}><X size={23}/><span>Pass</span></button><button className="save" onClick={() => act("saved")}><Bookmark size={22}/><span>Save</span></button><button className="interest" onClick={() => act("interested")}><HeartHandshake size={23}/><span>Interested</span></button></div>
          </article>
          <p className="wfx-gesture-hint">On mobile: swipe left to pass, swipe right to save, or use the visible buttons. “Interested” always requires confirmation.</p>
        </div>
        <aside className="wfx-side-panel"><span className="wfx-eyebrow">TODAY</span><h3>12 eligible companies</h3><p>3 are new since your last session. Passed companies will not repeat unless you reset decisions.</p><div className="wfx-side-stat"><strong>92</strong><span>Top fit score</span></div><div className="wfx-side-stat"><strong>4</strong><span>Saved this week</span></div>{interestStatus !== "none" && <div className="wfx-inline-note"><Handshake size={17}/><span>Interest workflow started for {company.name}.</span></div>}</aside>
      </div>
    </Page>
  );
}

function CompanyDetail({ setView }: ScreenProps) {
  return (
    <Page eyebrow="COMPANY PROFILE" title={company.name} description={company.tagline} actions={<><Button variant="secondary"><Bookmark size={16}/> Save</Button><Button onClick={() => setView("investor-interest")}><HeartHandshake size={16}/> Interested</Button></>}>
      <div className="wfx-company-detail-head"><div className="wfx-company-mark huge">d</div><div className="wfx-tags"><Tag tone="sage">{company.stage}</Tag><Tag>{company.sector}</Tag><Tag>{company.geography}</Tag></div><div className="wfx-match-badge"><strong>{company.match}</strong><span>Fit score</span></div></div>
      <div className="wfx-grid three"><StatCard label="Raise" value={company.raise} note="SAFE"/><StatCard label="Revenue" value={company.revenue} note="Founder reported"/><StatCard label="Growth" value={company.growth} note="Last 3 months"/></div>
      <div className="wfx-grid two unequal">
        <div className="wfx-stack"><Card><h2>Company snapshot</h2><p>Dippi builds a consumer hydration platform around convenient repeat-purchase products and habit support.</p><div className="wfx-detail-list"><div><span>Business model</span><strong>DTC + retail</strong></div><div><span>Customer</span><strong>Health-conscious consumers</strong></div><div><span>Location</span><strong>Atlanta, GA</strong></div></div></Card><Card><h2>Traction</h2><p>Revenue is growing with improving repeat order behavior and early retail validation.</p></Card></div>
        <div className="wfx-stack"><Card className="wfx-fit-card"><div className="wfx-card-head"><h2>Why FundMatch ranked this highly</h2><Tag tone="peri">Explainable</Tag></div><ul className="wfx-check-list"><li className="done"><Check size={16}/><span><strong>Stage</strong> · Seed matches mandate</span></li><li className="done"><Check size={16}/><span><strong>Check size</strong> · Raise is within target</span></li><li className="done"><Check size={16}/><span><strong>Business model</strong> · Repeat purchase fits thesis</span></li><li><span className="wfx-open-dot"/><span><strong>Geography</strong> · Within US mandate, not preferred hub</span></li></ul></Card><Card><div className="wfx-card-head"><h2>Provenance</h2><ShieldCheck size={19}/></div><p className="wfx-muted">Profile claims were approved by the founder organization. Private documents are not exposed automatically.</p><button className="wfx-text-link">View claim sources <ArrowRight size={15}/></button></Card></div>
      </div>
      <div className="wfx-mobile-sticky"><Button variant="secondary"><Bookmark size={16}/> Save</Button><Button onClick={() => setView("investor-interest")}><HeartHandshake size={16}/> Interested</Button></div>
    </Page>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) { return <Card><Stat label={label} value={value} note={note}/></Card>; }

function InvestorPipeline({ setView, decision, interestStatus }: ScreenProps) {
  const stage = interestStatus === "accepted" ? "Meeting" : interestStatus === "requested" || decision === "interested" ? "Reviewing" : decision === "passed" ? "Passed" : "New";
  return (
    <Page eyebrow="PIPELINE" title="Good conversations start here." description="Your firm’s decisions persist across sessions and stay visible to the team.">
      <div className="wfx-pipeline-board">
        {["New","Reviewing","Meeting","Passed"].map(col => <div className="wfx-pipeline-column" key={col}><div className="wfx-column-head"><strong>{col}</strong><span>{stage===col?1:0}</span></div>{stage===col && <button className="wfx-pipeline-card" onClick={() => setView(interestStatus === "accepted" ? "intro" : "company")}><div className="wfx-company-mark">d</div><div><strong>{company.name}</strong><span>{company.stage} · {company.raise}</span></div><Tag tone={col==="Meeting"?"sage":"peri"}>{interestStatus === "accepted" ? "Intro accepted" : decision === "passed" ? "Passed" : "92 fit"}</Tag><small>{interestStatus === "requested" ? "Interest request sent" : interestStatus === "accepted" ? "Founder accepted · thread open" : "Saved from Discover"}</small></button>}<button className="wfx-column-add">+ Add note</button></div>)}
      </div>
      <div className="wfx-mobile-pipeline"><div className="wfx-tabs">{["New","Reviewing","Meeting","Passed"].map(col=><button key={col} className={stage===col?"active":""}>{col}</button>)}</div><Card>{stage === "Passed" ? <p className="wfx-muted">Dippi was passed. Reset decisions to make it eligible for discovery again.</p> : <button className="wfx-mobile-pipeline-row" onClick={() => setView(interestStatus === "accepted" ? "intro" : "company")}><div className="wfx-company-mark">d</div><div><strong>{company.name}</strong><span>{stage} · 92 fit</span></div><ChevronRight size={18}/></button>}</Card></div>
    </Page>
  );
}

function InvestorThesis({ setView }: ScreenProps) {
  return (
    <Page eyebrow="INVESTMENT THESIS" title="Your thesis. Your lens." description="Confirm the mandate FundMatch uses for eligibility and deterministic ranking." actions={<Button onClick={() => setView("discover")}>Save thesis</Button>}>
      <div className="wfx-grid two unequal">
        <div className="wfx-stack"><Card><h2>Core mandate</h2><div className="wfx-fields two"><Field label="Stages" value="Pre-seed, Seed"/><Field label="Check size" value="$500k – $3M"/><Field label="Geographies" value="United States"/><Field label="Ownership target" value="5% – 15%"/></div></Card><Card><h2>Sectors</h2><div className="wfx-chip-editor"><Tag tone="sage">Consumer health ×</Tag><Tag tone="sage">Wellness ×</Tag><Tag>Consumer software ×</Tag><button>+ Add sector</button></div></Card><Card><h2>Exclusions</h2><div className="wfx-chip-editor"><Tag tone="warn">Pre-revenue biotech ×</Tag><Tag tone="warn">Hardware-heavy ×</Tag><button>+ Add exclusion</button></div></Card></div>
        <aside className="wfx-stack"><Card className="wfx-ai-thesis"><Sparkles size={21}/><h2>Inferred summary</h2><p>{investor.thesis}</p><div className="wfx-inline-note"><Info size={16}/><span>AI can suggest thesis language, but your confirmed fields remain authoritative.</span></div></Card><Card><h2>Matching order</h2><ol className="wfx-number-list"><li><span>1</span>Hard eligibility filters</li><li><span>2</span>Deterministic score</li><li><span>3</span>Optional semantic augmentation</li><li><span>4</span>Explanation</li></ol></Card></aside>
      </div>
    </Page>
  );
}

function InvestorInterest({ setView, setDecision, setInterestStatus, setPersona }: ScreenProps) {
  const [note, setNote] = useState("Dippi fits our seed consumer-health mandate, and the repeat-purchase behavior is especially relevant to our portfolio experience.");
  const send = () => { setDecision("interested"); setInterestStatus("requested"); setView("pipeline"); };
  return (
    <Page eyebrow="INTEREST REQUEST" title="Send a permissioned interest request." description="Interested does not reveal private founder contact details. The founder decides what happens next.">
      <div className="wfx-center-column">
        <button className="wfx-back-link" onClick={() => setView("company")}><ArrowLeft size={16}/> Back to company</button>
        <Card className="wfx-interest-card">
          <div className="wfx-interest-company"><div className="wfx-company-mark large">d</div><div><strong>{company.name}</strong><span>{company.stage} · {company.raise} raise · {company.match} fit</span></div></div>
          <label className="wfx-field"><span>Why are you interested?</span><textarea value={note} onChange={e=>setNote(e.target.value)} rows={5}/><small>This message is visible to the founder before they accept an introduction.</small></label>
          <div className="wfx-permission-box"><ShieldCheck size={20}/><div><strong>Founder controls the introduction</strong><p>They can Accept, Decline, or Ask for more information. FundMatch will not expose private contact information automatically.</p></div></div>
          <div className="wfx-interest-actions"><Button variant="secondary" onClick={() => setView("company")}>Cancel</Button><Button onClick={send} disabled={!note.trim()}>Send interest request <ArrowRight size={16}/></Button></div>
        </Card>
        <button className="wfx-preview-switch" onClick={() => {send(); setPersona("founder"); setView("founder-interest");}}>Prototype shortcut: send and view founder side <ArrowRight size={15}/></button>
      </div>
    </Page>
  );
}

function FounderInterest({ setView, interestStatus, setInterestStatus }: ScreenProps) {
  const [askMode, setAskMode] = useState(false);
  if (interestStatus === "declined") return <Page eyebrow="INVESTOR INTEREST" title="Request declined." description="The investor was notified. Your private contact details were not shared."><Card className="wfx-empty"><Check size={28}/><h2>Response recorded</h2><p>You can continue preparing your profile while FundMatch surfaces future interest.</p><Button onClick={() => setView("home")}>Back to overview</Button></Card></Page>;
  if (interestStatus === "accepted") return <Page eyebrow="INVESTOR INTEREST" title="Introduction accepted." description="A shared introduction thread is now available to both organizations."><Card className="wfx-success-card"><Handshake size={30}/><div><h2>You’re connected with {investor.firm}</h2><p>Move the conversation into the permissioned thread and keep diligence context attached to the opportunity.</p></div><Button onClick={() => setView("intro")}>Open introduction <ArrowRight size={16}/></Button></Card></Page>;
  return (
    <Page eyebrow="INVESTOR INTEREST" title="An investor wants to talk." description="Review the firm, their thesis, and why they selected your company before deciding.">
      <div className="wfx-grid two unequal reverse-mobile">
        <div className="wfx-stack"><Card><div className="wfx-investor-head"><div className="wfx-firm-mark">N</div><div><span className="wfx-eyebrow">INVESTOR</span><h2>{investor.firm}</h2><p>{investor.partner} · Partner</p></div></div><div className="wfx-tags"><Tag tone="sage">Seed</Tag><Tag>Consumer health</Tag><Tag>$500k–$3M</Tag></div><p>{investor.thesis}</p></Card><Card><h2>Why they’re interested</h2><blockquote>“Dippi fits our seed consumer-health mandate, and the repeat-purchase behavior is especially relevant to our portfolio experience.”</blockquote><span className="wfx-muted">Sent with the interest request</span></Card></div>
        <Card className="wfx-response-card"><span className="wfx-eyebrow">YOUR RESPONSE</span><h2>You control the introduction.</h2><p>Accept to open a shared thread. Declining does not expose your contact details.</p>{askMode ? <><Field label="What do you need before deciding?" value="Could you share which partner would lead the conversation and your typical ownership target?" multiline/><div className="wfx-interest-actions"><Button variant="secondary" onClick={()=>setAskMode(false)}>Back</Button><Button onClick={()=>{setInterestStatus("needs_information");setAskMode(false);}}>Send question</Button></div></> : <div className="wfx-response-buttons"><Button onClick={()=>setInterestStatus("accepted")}><Check size={17}/> Accept introduction</Button><Button variant="secondary" onClick={()=>setAskMode(true)}><MessageSquare size={17}/> Ask for more information</Button><Button variant="ghost" onClick={()=>setInterestStatus("declined")}><X size={17}/> Decline</Button></div>}{interestStatus === "needs_information" && <div className="wfx-inline-note"><MessageSquare size={16}/><span>Your question was sent. The request stays open until you decide.</span></div>}</Card>
      </div>
    </Page>
  );
}

function IntroductionThread({ setView, setPersona }: ScreenProps) {
  const [messages, setMessages] = useState(["Thanks for the interest. Happy to connect and walk through the retail pilots.", "Great. I’d like to include our operating partner who focuses on consumer retention."]);
  const [draft, setDraft] = useState("");
  const send = () => { if (!draft.trim()) return; setMessages([...messages,draft.trim()]); setDraft(""); };
  return (
    <Page eyebrow="INTRODUCTION" title={`${company.name} × ${investor.firm}`} description="Permissioned conversation with shared deal context and a durable audit trail." actions={<Button variant="secondary" onClick={()=>setView("pipeline")}>View pipeline</Button>}>
      <div className="wfx-thread-layout">
        <Card className="wfx-thread-context"><div className="wfx-company-mark large">d</div><h2>{company.name}</h2><span className="wfx-muted">{company.stage} · {company.raise}</span><div className="wfx-detail-list"><div><span>Match score</span><strong>92</strong></div><div><span>Status</span><strong>Introduction accepted</strong></div><div><span>Next step</span><strong>Founder call</strong></div></div><Button variant="secondary">Open shared materials</Button></Card>
        <Card className="wfx-thread"><div className="wfx-thread-head"><div><strong>Introduction thread</strong><span>{investor.partner} + Dippi team</span></div><button className="wfx-icon-button"><MoreHorizontal size={18}/></button></div><div className="wfx-messages"><div className="wfx-system-message"><Handshake size={16}/>FundMatch opened this thread after the founder accepted the interest request.</div>{messages.map((message,index)=><div className={`wfx-message ${index%2===0?"founder":"investor"}`} key={`${message}-${index}`}><span>{index%2===0?"Dippi":investor.partner}</span><p>{message}</p></div>)}</div><div className="wfx-composer"><button className="wfx-icon-button"><Paperclip size={18}/></button><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" onKeyDown={e=>{if(e.key==="Enter")send();}}/><Button onClick={send}>Send</Button></div></Card>
        <aside className="wfx-thread-side"><Card><h3>Next step</h3><p>Schedule a founder call and attach diligence questions to the opportunity.</p><Button variant="secondary">Propose meeting</Button></Card><button className="wfx-preview-switch" onClick={()=>setPersona("founder")}>View as founder</button><button className="wfx-preview-switch" onClick={()=>setPersona("investor")}>View as investor</button></aside>
      </div>
    </Page>
  );
}
