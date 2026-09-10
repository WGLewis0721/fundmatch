import { z } from "zod";
import type { Company, Task } from "./demo-data";
import { safeUrl } from "./demo-data";
import type { StartupWithData } from "./domain";

const optionalNumber = (min?: number) => {
  const number = min === undefined ? z.number().finite() : z.number().finite().min(min);
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    number.nullable(),
  );
};

export const FounderProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter a company name.").max(120),
  tagline: z.string().trim().max(160),
  summary: z.string().trim().max(2000),
  story: z.string().trim().max(4000),
  sector: z.string().trim().min(1).max(120),
  stage: z.string().trim().min(1).max(120),
  geography: z.string().trim().min(1).max(120),
  businessModel: z.string().trim().max(120),
  website: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => !v || Boolean(safeUrl(v)), "Enter a full http or https website URL."),
  tags: z.array(z.string().trim().max(80)).max(20),
  revenue: optionalNumber(0),
  growth: optionalNumber(),
  ask: optionalNumber(0),
  team: optionalNumber(0).refine(
    (v) => v === null || Number.isInteger(v),
    "Team size must be a whole number.",
  ),
});
export type FounderProfile = z.infer<typeof FounderProfileSchema>;
export type PreparationTask = Pick<Task, "id" | "title" | "category" | "status">;
export type PacketMaterial = { id: string; title: string; url: string };
export type ReadinessCheck = {
  id: string;
  label: string;
  complete: boolean;
  destination: "profile" | "materials" | "readiness";
};

export function fromDemoCompany(company: Company): FounderProfile {
  return { ...company, story: company.story ?? "" };
}

export function fromStartup(company: StartupWithData): FounderProfile {
  const number = (key: string) => {
    const value = company.metrics.find((m) => m.metric_key === key)?.value_numeric;
    return value === null || value === undefined ? null : Number(value);
  };
  return {
    name: company.name,
    tagline: company.tagline ?? "",
    summary: company.summary ?? "",
    story: company.story ?? "",
    sector: company.sector,
    stage: company.stage,
    geography: company.geography,
    businessModel: company.business_model ?? "",
    website: company.website ?? "",
    tags: company.tags,
    revenue: number("arr"),
    growth: number("growth"),
    ask: company.funding_ask,
    team: company.team_size,
  };
}

/** Presence checks only: never infer evidence verification or funding suitability. */
export function preparationChecks(
  profile: FounderProfile,
  materials: PacketMaterial[],
  documentCount: number,
): ReadinessCheck[] {
  return [
    {
      id: "basics",
      label: "Company name and one-line story",
      complete: Boolean(profile.name.trim() && profile.tagline.trim()),
      destination: "profile",
    },
    {
      id: "summary",
      label: "Problem, customer and solution",
      complete: profile.summary.trim().length >= 40,
      destination: "profile",
    },
    {
      id: "model",
      label: "Sector, stage, location and business model",
      complete: [profile.sector, profile.stage, profile.geography, profile.businessModel].every(
        (v) => v.trim(),
      ),
      destination: "profile",
    },
    {
      id: "story",
      label: "Team, market and use-of-funds narrative",
      complete: profile.story.trim().length >= 40,
      destination: "profile",
    },
    {
      id: "revenue",
      label: "Annual revenue (zero for pre-revenue)",
      complete: profile.revenue !== null,
      destination: "profile",
    },
    {
      id: "ask",
      label: "Funding amount sought",
      complete: profile.ask !== null && profile.ask > 0,
      destination: "profile",
    },
    {
      id: "team",
      label: "Team size",
      complete: profile.team !== null && profile.team > 0,
      destination: "profile",
    },
    {
      id: "materials",
      label: "At least one supporting material",
      complete: documentCount > 0 || materials.some((m) => safeUrl(m.url)),
      destination: "materials",
    },
  ];
}

export function readinessProgress(tasks: PreparationTask[]) {
  const complete = tasks.filter((t) => t.status === "Complete").length;
  return {
    complete,
    total: tasks.length,
    percent: tasks.length ? Math.round((complete / tasks.length) * 100) : 0,
  };
}

/** Explicit allowlist: private documents, internal notes and unreviewed AI are not packet inputs. */
export function packetMaterials(materials: PacketMaterial[], selected: string[]): PacketMaterial[] {
  return materials
    .filter((m) => selected.includes(m.id) && safeUrl(m.url))
    .map(({ id, title, url }) => ({ id, title, url }));
}

export function packetFilename(name: string) {
  return `${
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "company"
  }-FundMatch-packet.html`;
}
