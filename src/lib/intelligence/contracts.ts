import { z } from "zod";
export const FIELDS = [
  "name",
  "description",
  "team",
  "business_model",
  "sector",
  "stage",
  "geography",
  "revenue",
  "growth",
  "funding_ask",
  "use_of_funds",
] as const;
export const FieldSchema = z.enum(FIELDS);
export type Field = z.infer<typeof FieldSchema>;
export const LIMITS = { bytes: 10 * 1024 * 1024, pages: 60, characters: 120000, claims: 150 };
export const PageSchema = z
  .object({
    number: z.number().int().min(1).max(LIMITS.pages),
    text: z.string().max(LIMITS.characters),
  })
  .strict();
export const DocumentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(255),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    pages: z.array(PageSchema).min(1).max(LIMITS.pages),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (
      new Set(d.pages.map((p) => p.number)).size !== d.pages.length ||
      d.pages.some((p, i) => p.number !== i + 1)
    )
      ctx.addIssue({ code: "custom", message: "Pages must be consecutive and unique." });
    if (d.pages.reduce((n, p) => n + p.text.length, 0) > LIMITS.characters)
      ctx.addIssue({ code: "custom", message: "Document text limit exceeded." });
  });
export type SourceDocument = z.infer<typeof DocumentSchema>;
export const CandidateSchema = z
  .object({
    field: FieldSchema,
    value: z.string().min(1).max(2000),
    page: z.number().int().min(1),
    quote: z.string().min(1).max(3000),
    uncertainty: z.enum(["explicit", "ambiguous"]),
  })
  .strict();
export const CandidateBatchSchema = z
  .object({ claims: z.array(CandidateSchema).max(LIMITS.claims) })
  .strict();
export type Candidate = z.infer<typeof CandidateSchema>;
export type Claim = Candidate & {
  id: string;
  source: { documentId: string; documentName: string; sha256: string };
  status: "unreviewed";
  conflict: boolean;
};
export interface Extraction {
  id: string;
  document: SourceDocument;
  claims: Claim[];
  missing: Field[];
  warnings: string[];
  method: "literal" | "openai";
  createdAt: string;
}
export const DecisionSchema = z
  .object({
    claimId: z.string(),
    action: z.enum(["accept", "correct", "reject"]),
    correctedValue: z.string().max(2000).optional(),
    reason: z.string().max(2000).optional(),
  })
  .strict();
export const ConfirmationSchema = z
  .object({
    extractionId: z.string(),
    expectedVersion: z.number().int().nonnegative(),
    idempotencyKey: z.string().min(8).max(128),
    decisions: z.array(DecisionSchema).max(LIMITS.claims),
  })
  .strict();
export type Confirmation = z.infer<typeof ConfirmationSchema>;
export interface ConfirmedClaim {
  uncertainty: Candidate["uncertainty"];
  field: Field;
  value: string;
  originalValue: string;
  citation: Claim["source"] & { page: number; quote: string };
  reviewerId: string;
  reviewedAt: string;
  correctionReason: string | null;
}
export interface ConfirmedProfile {
  id: string;
  version: number;
  claims: ConfirmedClaim[];
}
export interface InvestorPreferences {
  sectors: string[];
  stages: string[];
  geographies: string[];
  businessModels: string[];
  exclusions: string[];
  checkMin: number | null;
  checkMax: number | null;
  currency: string;
  minGrowth: number | null;
}
export interface MatchCriterion {
  field: Field;
  status: "match" | "mismatch" | "unknown" | "excluded";
  detail: string;
  citation: ConfirmedClaim["citation"] | null;
}
export interface SourcedMatch {
  eligible: boolean;
  score: number | null;
  coverage: number;
  criteria: MatchCriterion[];
  explanations: string[];
  questions: string[];
  method: "confirmed-evidence-rules";
}
export interface ReadinessSuggestion {
  id: string;
  title: string;
  proposedStatus: "Needs review";
  evidence: ConfirmedClaim["citation"][];
  explanation: string;
  requiresHumanConfirmation: true;
}
export interface Extractor {
  extract(document: SourceDocument, signal?: AbortSignal): Promise<Candidate[]>;
}
/** Fable supplies this gateway only in an authenticated workspace. */
export interface IntelligenceGateway {
  upload(file: File, signal: AbortSignal): Promise<{ documentId: string }>;
  process(documentId: string, signal: AbortSignal): Promise<Extraction>;
  confirm(input: Confirmation): Promise<ConfirmedProfile>;
}
export class IntelligenceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "IntelligenceError";
  }
}
