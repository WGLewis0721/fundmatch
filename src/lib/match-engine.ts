import type { InvestorWithThesis, StartupWithData } from "./domain";
import { formatMoney } from "./format";

/**
 * MatchEngine
 * -----------
 * Service interface behind all fit scoring. The shipped implementation is
 * deterministic and rule-weighted, so the product works with zero AI/API
 * dependency. A model-backed ranker can implement the same interface later
 * (see src/lib/ai/insight-provider.ts for the generative half).
 */

export type RuleKey =
  | "sector"
  | "stage"
  | "geography"
  | "check_size"
  | "traction"
  | "business_model"
  | "exclusions";

export interface RuleResult {
  key: RuleKey;
  label: string;
  weight: number;
  score: number; // 0..1
  hit: boolean;
  detail: string;
}

export interface MatchResult {
  score: number; // 0..100
  explanation: string;
  strengths: string[];
  risks: string[];
  rationale: RuleResult[];
  generatedBy: string;
}

export interface MatchEngine {
  readonly id: string;
  score(startup: StartupWithData, investor: InvestorWithThesis): MatchResult;
  rank(startups: StartupWithData[], investor: InvestorWithThesis): Array<{ startup: StartupWithData; match: MatchResult }>;
}

const WEIGHTS: Record<RuleKey, number> = {
  sector: 24,
  stage: 20,
  geography: 12,
  check_size: 20,
  traction: 14,
  business_model: 10,
  exclusions: 0,
};

const STAGE_ORDER = ["Pre-Seed", "Seed", "Series A", "Series B"];

function stageDistance(a: string, b: string): number {
  const ia = STAGE_ORDER.indexOf(a);
  const ib = STAGE_ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return 2;
  return Math.abs(ia - ib);
}

function growthOf(startup: StartupWithData): number | null {
  const m = startup.metrics.find((x) => x.metric_key === "growth");
  return m?.value_numeric === null || m?.value_numeric === undefined ? null : Number(m.value_numeric);
}

export class RulesMatchEngine implements MatchEngine {
  readonly id = "rules-v1";

  score(startup: StartupWithData, investor: InvestorWithThesis): MatchResult {
    const thesis = investor.thesis;
    const rationale: RuleResult[] = [];

    // Sector
    const sectors = thesis?.sectors ?? [];
    const sectorHit = sectors.includes(startup.sector);
    const adjacentHit =
      !sectorHit && startup.tags.some((tag) => sectors.some((s) => tag.toLowerCase().includes(s.toLowerCase())));
    rationale.push({
      key: "sector",
      label: "Sector",
      weight: WEIGHTS.sector,
      score: sectorHit ? 1 : adjacentHit ? 0.5 : 0,
      hit: sectorHit || adjacentHit,
      detail: sectorHit
        ? `${startup.sector} is a core sector for ${investor.firm_name}`
        : adjacentHit
          ? `Adjacent to the stated sectors via ${startup.tags[0]}`
          : `${startup.sector} sits outside the stated sectors (${sectors.join(", ") || "none set"})`,
    });

    // Stage
    const stages = thesis?.stages ?? [];
    const stageHit = stages.includes(startup.stage);
    const nearStage = !stageHit && stages.some((s) => stageDistance(s, startup.stage) === 1);
    rationale.push({
      key: "stage",
      label: "Stage",
      weight: WEIGHTS.stage,
      score: stageHit ? 1 : nearStage ? 0.45 : 0,
      hit: stageHit || nearStage,
      detail: stageHit
        ? `${startup.stage} matches the target stage range`
        : nearStage
          ? `${startup.stage} is one step outside the target range`
          : `${startup.stage} is outside the target stages (${stages.join(", ") || "none set"})`,
    });

    // Geography
    const geos = thesis?.geographies ?? [];
    const geoHit = geos.includes(startup.geography);
    rationale.push({
      key: "geography",
      label: "Geography",
      weight: WEIGHTS.geography,
      score: geoHit ? 1 : geos.length === 0 ? 0.5 : 0,
      hit: geoHit,
      detail: geoHit
        ? `${startup.geography} is in the active geography list`
        : `${startup.geography} is outside the active geographies (${geos.join(", ") || "none set"})`,
    });

    // Check size vs funding ask
    const ask = startup.funding_ask ? Number(startup.funding_ask) : null;
    const min = thesis?.check_min ? Number(thesis.check_min) : null;
    const max = thesis?.check_max ? Number(thesis.check_max) : null;
    let checkScore = 0.5;
    let checkDetail = "No funding ask or cheque range recorded";
    if (ask !== null && (min !== null || max !== null)) {
      const lo = min ?? 0;
      const hi = max ?? Number.MAX_SAFE_INTEGER;
      if (ask >= lo && ask <= hi) {
        checkScore = 1;
        checkDetail = `${formatMoney(ask)} ask sits inside the ${formatMoney(min)}–${formatMoney(max)} cheque range`;
      } else {
        const nearest = ask < lo ? lo : hi;
        const ratio = Math.min(ask, nearest) / Math.max(ask, nearest);
        checkScore = ratio > 0.6 ? 0.5 : ratio > 0.35 ? 0.25 : 0;
        checkDetail =
          ask < lo
            ? `${formatMoney(ask)} ask is below the usual ${formatMoney(min)} minimum — would need to lead or co-invest smaller`
            : `${formatMoney(ask)} ask is above the usual ${formatMoney(max)} maximum — would need a co-lead`;
      }
    }
    rationale.push({
      key: "check_size",
      label: "Cheque size",
      weight: WEIGHTS.check_size,
      score: checkScore,
      hit: checkScore >= 1,
      detail: checkDetail,
    });

    // Traction / growth
    const growth = growthOf(startup);
    const minGrowth = thesis?.min_growth_pct ? Number(thesis.min_growth_pct) : null;
    let tractionScore = 0.5;
    let tractionDetail = "No growth data available yet";
    if (growth !== null) {
      if (minGrowth === null) {
        tractionScore = growth >= 100 ? 1 : 0.6;
        tractionDetail = `${growth}% YoY growth`;
      } else if (growth >= minGrowth) {
        tractionScore = 1;
        tractionDetail = `${growth}% YoY growth clears the ${minGrowth}% traction bar`;
      } else {
        tractionScore = growth >= minGrowth * 0.7 ? 0.5 : 0.1;
        tractionDetail = `${growth}% YoY growth is under the ${minGrowth}% traction bar`;
      }
    }
    rationale.push({
      key: "traction",
      label: "Traction",
      weight: WEIGHTS.traction,
      score: tractionScore,
      hit: tractionScore >= 1,
      detail: tractionDetail,
    });

    // Business model / tags
    const models = thesis?.business_models ?? [];
    const modelHit = startup.business_model ? models.includes(startup.business_model) : false;
    rationale.push({
      key: "business_model",
      label: "Business model",
      weight: WEIGHTS.business_model,
      score: modelHit ? 1 : models.length === 0 ? 0.5 : 0.2,
      hit: modelHit,
      detail: modelHit
        ? `${startup.business_model} matches the preferred models`
        : `${startup.business_model ?? "Model"} differs from preferred models (${models.join(", ") || "none set"})`,
    });

    // Exclusions act as a hard penalty
    const exclusions = thesis?.exclusions ?? [];
    const excluded = exclusions.find((ex) =>
      [startup.sector, startup.business_model ?? "", ...startup.tags]
        .join(" ")
        .toLowerCase()
        .includes(ex.toLowerCase()),
    );
    if (excluded) {
      rationale.push({
        key: "exclusions",
        label: "Exclusion",
        weight: 0,
        score: 0,
        hit: false,
        detail: `Flagged against the "${excluded}" exclusion`,
      });
    }

    const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    const raw = rationale.reduce((sum, r) => sum + r.weight * r.score, 0);
    let score = Math.round((raw / totalWeight) * 100);
    if (excluded) score = Math.max(0, score - 40);
    score = Math.max(3, Math.min(99, score));

    const hits = rationale.filter((r) => r.score >= 1);
    const misses = rationale.filter((r) => r.score < 0.5);

    const explanation =
      hits.length > 0
        ? `${hits.map((h) => h.detail).slice(0, 3).join(". ")}.`
        : `Limited overlap with the stated thesis: ${misses[0]?.detail ?? "no matching criteria"}.`;

    const strengths = hits.map((h) => h.detail);
    const risks = misses.map((m) => m.detail);
    if (risks.length === 0) {
      risks.push("No thesis mismatch detected — diligence should focus on execution and defensibility.");
    }

    return { score, explanation, strengths, risks, rationale, generatedBy: this.id };
  }

  rank(startups: StartupWithData[], investor: InvestorWithThesis) {
    return startups
      .map((startup) => ({ startup, match: this.score(startup, investor) }))
      .sort((a, b) => b.match.score - a.match.score);
  }
}

export const matchEngine: MatchEngine = new RulesMatchEngine();
