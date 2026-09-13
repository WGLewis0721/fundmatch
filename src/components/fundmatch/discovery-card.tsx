import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Leaf,
  MapPin,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { COMPANIES, fit, initialState, money } from "@/lib/demo-data";
import { swipeDecision } from "@/lib/swipe-decision";

type Decision = "pass" | "save" | "interested";
type Identity = {
  id: string;
  name: string;
  sector: string;
  stage: string;
  geography: string;
  businessModel?: string;
  tagline?: string | null;
  summary?: string | null;
};

export function CompanyVisual({
  company,
  demo = false,
  priority = false,
}: {
  company: Identity;
  demo?: boolean;
  priority?: boolean;
}) {
  const photo = demo && ["dippi", "soapbox"].includes(company.id) ? company.id : null;
  const Icon =
    (
      { Consumer: Compass, Climate: Leaf, Fintech: Wallet, Logistics: Truck } as Record<
        string,
        typeof Compass
      >
    )[company.sector] ?? Boxes;
  return (
    <div className="fm-company-visual" data-sector={company.sector}>
      {photo ? (
        <img
          src={import.meta.env.BASE_URL + `media/${photo}-editorial.webp`}
          alt={
            photo === "dippi"
              ? "Concept image: a sage delivery tote with sealed wine bottles."
              : "Concept image: folded towels and a canvas laundry bag."
          }
          width="1536"
          height="1024"
          draggable={false}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      ) : (
        <div className="fm-sector-identity">
          <Icon size={56} strokeWidth={1.2} />
          <span>
            {company.sector}
            <small>{company.businessModel ?? "Company profile"}</small>
          </span>
        </div>
      )}
      <span className="fm-visual-caption">
        {demo ? "Illustrative company" : "Company-reported profile"}
      </span>
      <span className="fm-stage-tag">{company.stage}</span>
    </div>
  );
}

export function DiscoveryCard({
  company,
  score,
  metrics,
  children,
  demo = false,
  disabled = false,
  onDecide,
}: {
  company: Identity;
  score: number;
  metrics: ReactNode;
  children: ReactNode;
  demo?: boolean;
  disabled?: boolean;
  onDecide: (decision: Decision) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const committed = useRef(false);
  const [offset, setOffset] = useState(0);
  function commit(decision: Decision) {
    if (disabled || committed.current) return;
    committed.current = true;
    onDecide(decision);
    setOffset(0);
    // An unsuccessful server mutation must leave the current card actionable.
    queueMicrotask(() => {
      committed.current = false;
    });
  }
  return (
    <article
      className="fm-opportunity-card"
      tabIndex={0}
      aria-label={`${company.name}. Arrow left to pass, S to save, arrow right for interested.`}
      style={
        {
          "--drag": `${offset}px`,
          "--tilt": `${offset / 28}deg`,
          touchAction: "pan-y",
          transitionDuration: "0.226s",
        } as CSSProperties
      }
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        const decision =
          e.key === "ArrowLeft"
            ? "pass"
            : e.key === "ArrowRight"
              ? "interested"
              : e.key.toLowerCase() === "s"
                ? "save"
                : null;
        if (decision) {
          e.preventDefault();
          commit(decision);
        }
      }}
      onPointerDown={(e) => {
        if (
          disabled ||
          !e.isPrimary ||
          e.button !== 0 ||
          (e.target as HTMLElement).closest("button,a,input,select,textarea,summary")
        )
          return;
        start.current = { x: e.clientX, y: e.clientY };
        // Capture immediately. Waiting until after movement lets mobile browsers
        // cancel the pointer before FundMatch can classify a horizontal swipe.
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const dx = e.clientX - start.current.x,
          dy = e.clientY - start.current.y;
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          setOffset(Math.max(-180, Math.min(180, dx)));
        }
      }}
      onPointerCancel={() => {
        start.current = null;
        setOffset(0);
      }}
      onLostPointerCapture={() => {
        start.current = null;
        setOffset(0);
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        const decision = swipeDecision(e.clientX - start.current.x, e.clientY - start.current.y);
        start.current = null;
        if (decision) commit(decision);
        setOffset(0);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
    >
      <CompanyVisual company={company} demo={demo} />
      {Math.abs(offset) > 35 && (
        <div
          className="fm-swipe-stamp"
          data-direction={offset > 0 ? "right" : "left"}
          aria-hidden="true"
        >
          {offset > 0 ? "Interested" : "Pass"}
        </div>
      )}
      <div className="fm-opportunity-body">
        <div className="fm-opportunity-identity">
          <div>
            <span className="fm-sector-label">
              {company.sector} <span> / </span> <MapPin size={12} />
              {company.geography}
            </span>
            <h2>{company.name}</h2>
          </div>
          <div className="fm-fit-badge">
            <strong>
              {Math.max(0, Math.min(100, score))}
              <small>/100</small>
            </strong>
            <span>Thesis fit</span>
          </div>
        </div>
        <p className="fm-company-tagline">{company.tagline}</p>
        <p className="fm-company-summary">{company.summary}</p>
        {metrics}
        <div className="fm-opportunity-detail">{children}</div>
      </div>
      <div className="fm-decision-bar">
        <button disabled={disabled} className="fm-decision-pass" onClick={() => commit("pass")}>
          <X size={19} />
          <span>Pass</span>
        </button>
        <button disabled={disabled} className="fm-decision-save" onClick={() => commit("save")}>
          <Bookmark size={18} />
          <span>Save</span>
        </button>
        <button
          disabled={disabled}
          className="fm-decision-interested"
          onClick={() => commit("interested")}
        >
          <Heart size={18} />
          <span>Interested</span>
          <ArrowUpRight size={17} />
        </button>
        <small className="fm-swipe-hint">Swipe left to pass · right for interested</small>
      </div>
    </article>
  );
}

export function ProductPreview() {
  const [index, setIndex] = useState(0);
  const [persona, setPersona] = useState<"investor" | "founder">("investor");
  const company = COMPANIES[index % 2]!;
  const score = fit(company, initialState().thesis).score;
  return (
    <div className="fm-product-stage">
      <div className="fm-preview-switch" role="group" aria-label="Preview a workspace">
        <button aria-pressed={persona === "investor"} onClick={() => setPersona("investor")}>
          I’m investing
        </button>
        <button aria-pressed={persona === "founder"} onClick={() => setPersona("founder")}>
          I’m raising
        </button>
      </div>
      <div className="fm-teaser-card" key={`${persona}-${company.id}`}>
        <div className="fm-teaser-topline">
          <span>{persona === "investor" ? "Your next discovery" : "Your company, in focus"}</span>
          <span>Demo preview</span>
        </div>
        <CompanyVisual company={company} demo priority />
        <div className="fm-teaser-body">
          <div className="fm-teaser-title">
            <h2>{company.name}</h2>
            {persona === "investor" ? (
              <div className="fm-fit-badge">
                <strong>
                  {score}
                  <small>/100</small>
                </strong>
                <span>Thesis fit</span>
              </div>
            ) : (
              <span className="fm-stage-tag">Founder workspace</span>
            )}
          </div>
          <p>{company.tagline}</p>
          {persona === "investor" ? (
            <div className="fm-teaser-metrics">
              <div>
                <strong>{money(company.revenue)}</strong>
                <span>Annual revenue</span>
              </div>
              <div>
                <strong>{company.growth}%</strong>
                <span>YoY growth</span>
              </div>
              <div>
                <strong>{money(company.ask)}</strong>
                <span>Raising</span>
              </div>
            </div>
          ) : (
            <div className="fm-teaser-readiness">
              <span>
                <Check size={16} /> Company story
              </span>
              <span>
                <Check size={16} /> Raise details
              </span>
              <span>
                <ArrowUpRight size={16} /> Prepare investor materials
              </span>
            </div>
          )}
          <Link
            to="/demo"
            search={{
              persona,
              view: persona === "investor" ? "company" : "interest",
              company: company.id,
            }}
            className="fm-button"
          >
            {persona === "investor" ? "Take a closer look" : "Build your company story"}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      <div className="fm-preview-pager">
        <span>
          <strong>0{(index % 2) + 1}</strong> / 02{" "}
          <span>Fictional companies. Real interaction.</span>
        </span>
        <div>
          <button
            aria-label="Previous company preview"
            onClick={() => setIndex((i) => (i + 1) % 2)}
          >
            <ChevronLeft size={19} />
          </button>
          <button aria-label="Next company preview" onClick={() => setIndex((i) => (i + 1) % 2)}>
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
