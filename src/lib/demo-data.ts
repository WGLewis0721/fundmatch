import { z } from "zod";
import { matchEngine } from "./match-engine";
import type { StartupWithData, InvestorWithThesis } from "./domain";

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  tagline: z.string(),
  summary: z.string(),
  story: z.string().max(4000).optional(),
  sector: z.string(),
  stage: z.string(),
  geography: z.string(),
  businessModel: z.string(),
  revenue: z.number().nonnegative().nullable(),
  growth: z.number().nullable(),
  ask: z.number().nonnegative().nullable(),
  team: z.number().nonnegative().nullable(),
  website: z.string(),
  tags: z.array(z.string()),
});
export type Company = z.infer<typeof CompanySchema>;
export const ThesisSchema = z.object({
  sectors: z.array(z.string()),
  stages: z.array(z.string()),
  geographies: z.array(z.string()),
  models: z.array(z.string()),
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  growth: z.number().nonnegative(),
  exclusions: z.array(z.string()),
});
export type Thesis = z.infer<typeof ThesisSchema>;
export const TaskSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  status: z.enum(["Missing", "In progress", "Complete", "Needs update"]),
  owner: z.string(),
  due: z.string(),
  evidence: z.string(),
  notes: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;
export const StateSchema = z.object({
  version: z.literal(1),
  companies: z.array(CompanySchema).min(1),
  thesis: ThesisSchema,
  decisions: z.record(z.enum(["pass", "save", "interested"])),
  pipeline: z.record(z.enum(["New", "Reviewing", "Meeting", "Passed"])),
  notes: z.array(
    z.object({ id: z.string(), company: z.string(), text: z.string(), date: z.string() }),
  ),
  materials: z.array(
    z.object({ id: z.string(), company: z.string(), title: z.string(), url: z.string() }),
  ),
  tasks: z.record(z.array(TaskSchema)),
});
export type DemoState = z.infer<typeof StateSchema>;
export const COMPANIES: Company[] = [
  {
    id: "dippi",
    name: "Dippi",
    tagline: "Your neighborhood. Delivered.",
    summary:
      "A local commerce marketplace bringing neighborhood liquor stores online, with convenient delivery for customers and a new sales channel for independent retailers.",
    sector: "Consumer",
    stage: "Seed",
    geography: "United States",
    businessModel: "Marketplace",
    revenue: 1800000,
    growth: 140,
    ask: 3500000,
    team: 12,
    website: "",
    tags: ["Local commerce", "Delivery", "Alcohol"],
  },
  {
    id: "soapbox",
    name: "Soapbox Caddie",
    tagline: "Laundry day. Without the laundry.",
    summary:
      "Pickup-and-delivery laundry for busy households. Recurring subscriptions connect customers with trusted local laundry partners.",
    sector: "Consumer",
    stage: "Seed",
    geography: "United States",
    businessModel: "Subscription",
    revenue: 920000,
    growth: 110,
    ask: 2000000,
    team: 9,
    website: "",
    tags: ["Laundry", "Recurring revenue", "Local services"],
  },
  {
    id: "relay",
    name: "Relay AI",
    tagline: "Busy work, quietly handled.",
    summary:
      "Workflow software that helps operations teams coordinate repetitive tasks and keep people focused on exceptions.",
    sector: "AI",
    stage: "Seed",
    geography: "United States",
    businessModel: "SaaS",
    revenue: 1200000,
    growth: 180,
    ask: 4000000,
    team: 8,
    website: "",
    tags: ["Automation", "B2B", "Operations"],
  },
  {
    id: "current",
    name: "Current Grid",
    tagline: "A smarter way to use energy.",
    summary:
      "Energy monitoring and optimization software for commercial buildings, with actionable insights for facility managers.",
    sector: "Climate",
    stage: "Series A",
    geography: "Canada",
    businessModel: "SaaS",
    revenue: 2800000,
    growth: 82,
    ask: 8000000,
    team: 19,
    website: "",
    tags: ["Energy", "Commercial buildings"],
  },
  {
    id: "ledger",
    name: "Ledger Lane",
    tagline: "Cash flow, in clear view.",
    summary:
      "A cash-flow planning workspace for small businesses that brings invoices, operating costs and forecasts together.",
    sector: "Fintech",
    stage: "Seed",
    geography: "United States",
    businessModel: "SaaS",
    revenue: 780000,
    growth: 96,
    ask: 2500000,
    team: 7,
    website: "",
    tags: ["Small business", "Finance"],
  },
  {
    id: "parcel",
    name: "Parcel North",
    tagline: "Every mile, working harder.",
    summary:
      "Route planning and dispatch software for regional delivery operators, designed to improve driver utilization.",
    sector: "Logistics",
    stage: "Series A",
    geography: "United States",
    businessModel: "SaaS",
    revenue: 3200000,
    growth: 73,
    ask: 6000000,
    team: 22,
    website: "",
    tags: ["Logistics", "Routing"],
  },
];
const groups: Record<string, string[]> = {
  Company: ["Incorporation documents", "Current ownership & cap table", "Key company agreements"],
  Team: ["Founder bios & responsibilities", "IP assignments"],
  Financials: ["Revenue, burn & runway", "Financial forecast"],
  Traction: ["Customer & retention metrics", "Growth evidence"],
  Fundraise: ["Current pitch deck", "Funding ask & use of funds"],
  "Data room": ["Document index & access review"],
};
export function makeTasks(template: string): Task[] {
  const entries =
    template === "pe"
      ? {
          ...groups,
          Financials: [
            "Historical financial statements",
            "Earnings quality & adjustments",
            "Working capital schedule",
          ],
          Company: ["Ownership & transaction structure", "Material contracts", "Entity records"],
          Fundraise: ["Transaction objectives", "Management transition plan"],
        }
      : groups;
  return Object.entries(entries).flatMap(([category, titles]) =>
    titles.map((title, i) => ({
      id: category + "-" + i,
      category,
      title,
      status: "Missing" as const,
      owner: "",
      due: "",
      evidence: "",
      notes: "",
    })),
  );
}
export function initialState(): DemoState {
  return {
    version: 1,
    companies: structuredClone(COMPANIES),
    thesis: {
      sectors: ["Consumer", "AI", "Fintech"],
      stages: ["Seed"],
      geographies: ["United States"],
      models: ["Marketplace", "SaaS", "Subscription"],
      min: 500000,
      max: 5000000,
      growth: 100,
      exclusions: [],
    },
    decisions: {},
    pipeline: { relay: "Reviewing", ledger: "New" },
    notes: [],
    materials: [],
    tasks: {},
  };
}
export const money = (n: number | null) =>
  n === null
    ? "Not provided"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
export function fit(company: Company, thesis: Thesis) {
  const now = "2026-09-07T00:00:00Z";
  const startup: StartupWithData = {
    id: company.id,
    org_id: null,
    name: company.name,
    tagline: company.tagline,
    summary: company.summary,
    story: company.story ?? company.summary,
    sector: company.sector,
    stage: company.stage,
    geography: company.geography,
    website: company.website,
    funding_ask: company.ask,
    tags: company.tags,
    business_model: company.businessModel,
    founded_year: null,
    team_size: company.team,
    brand_color: "#9caafa",
    logo_emoji: "",
    visibility: "public",
    is_demo: true,
    ai_summary: null,
    created_at: now,
    updated_at: now,
    materials: [],
    provenance: [],
    metrics:
      company.growth === null
        ? []
        : [
            {
              id: company.id + "-growth",
              startup_id: company.id,
              metric_key: "growth",
              label: "YoY growth",
              value_numeric: company.growth,
              value_display: company.growth + "%",
              period: "Illustrative",
              source_key: "demo",
              updated_at: now,
            },
          ],
  };
  const investor: InvestorWithThesis = {
    id: "northstar",
    org_id: null,
    firm_name: "Northstar Ventures",
    description: "Fictional demo investment firm",
    hq: "United States",
    aum_label: null,
    logo_emoji: "",
    is_demo: true,
    demo_label: "Fictional demo firm",
    created_at: now,
    thesis: {
      id: "thesis",
      investor_id: "northstar",
      summary: "",
      sectors: thesis.sectors,
      stages: thesis.stages,
      geographies: thesis.geographies,
      business_models: thesis.models,
      exclusions: thesis.exclusions,
      check_min: thesis.min,
      check_max: thesis.max,
      min_growth_pct: thesis.growth,
      inferred: false,
      inferred_from: [],
      updated_at: now,
    },
  };
  return matchEngine.score(startup, investor);
}
export function safeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
