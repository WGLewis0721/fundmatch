import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Organization = Tables["organizations"]["Row"];
export type StartupProfile = Tables["startup_profiles"]["Row"];
export type CompanyMetric = Tables["company_metrics"]["Row"];
export type FounderMaterial = Tables["founder_materials"]["Row"];
export type InvestorProfile = Tables["investor_profiles"]["Row"];
export type InvestorThesis = Tables["investor_theses"]["Row"];
export type DataSource = Tables["data_sources"]["Row"];
export type Integration = Tables["integrations"]["Row"];
export type Provenance = Tables["source_provenance"]["Row"];
export type PipelineItem = Tables["pipeline_items"]["Row"];
export type TeamNote = Tables["team_notes"]["Row"];
export type IntroRequest = Tables["intro_requests"]["Row"];
export type ActivityEvent = Tables["activity_events"]["Row"];
export type Swipe = Tables["swipes"]["Row"];
export type MatchRow = Tables["matches"]["Row"];

export type Persona = "founder" | "investor" | "admin";
export type PipelineStatus = "new" | "reviewing" | "meeting" | "passed";
export type SwipeDecision = "pass" | "save" | "interested";

export type StartupWithData = StartupProfile & {
  metrics: CompanyMetric[];
  provenance: Provenance[];
  materials: FounderMaterial[];
};

export type InvestorWithThesis = InvestorProfile & { thesis: InvestorThesis | null };

export const SECTORS = [
  "AI",
  "B2B SaaS",
  "Climate",
  "Consumer",
  "Fintech",
  "Healthcare",
  "Logistics",
] as const;

export const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B"] as const;

export const GEOGRAPHIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "Mexico",
] as const;

export const BUSINESS_MODELS = [
  "SaaS",
  "Marketplace",
  "Subscription",
  "Transactional",
] as const;

export const PIPELINE_STATUSES: { value: PipelineStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "meeting", label: "Meeting" },
  { value: "passed", label: "Passed" },
];

export function metric(startup: StartupWithData, key: string): CompanyMetric | undefined {
  return startup.metrics.find((m) => m.metric_key === key);
}

export function metricValue(startup: StartupWithData, key: string): string {
  return metric(startup, key)?.value_display ?? "—";
}

export function profileCompleteness(startup: StartupWithData): number {
  const checks: boolean[] = [
    Boolean(startup.name),
    Boolean(startup.tagline),
    Boolean(startup.summary && startup.summary.length > 40),
    Boolean(startup.story && startup.story.length > 40),
    Boolean(startup.website),
    Boolean(startup.sector),
    Boolean(startup.stage),
    Boolean(startup.geography),
    Boolean(startup.funding_ask),
    startup.tags.length > 0,
    Boolean(startup.team_size),
    Boolean(metric(startup, "arr")),
    Boolean(metric(startup, "growth")),
    startup.materials.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
