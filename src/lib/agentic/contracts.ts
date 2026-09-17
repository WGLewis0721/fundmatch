import { z } from "zod";

export const AGENT_TYPES = [
  "document",
  "thesis",
  "match",
  "readiness",
  "diligence",
  "evidence",
] as const;

export const AgentTypeSchema = z.enum(AGENT_TYPES);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const AGENT_TRIGGERS = [
  "document_uploaded",
  "thesis_updated",
  "match_explanation_requested",
  "diligence_requested",
  "manual",
] as const;

export const AgentTriggerSchema = z.enum(AGENT_TRIGGERS);
export type AgentTrigger = z.infer<typeof AgentTriggerSchema>;

export const EvidenceRefSchema = z
  .object({
    id: z.string().min(1),
    sourceType: z.string().min(1).max(80),
    sourceId: z.string().min(1),
    locator: z.string().min(1).max(500),
    contentSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const AgentClaimSchema = z
  .object({
    id: z.string().min(1),
    statement: z.string().min(1).max(4000),
    evidenceIds: z.array(z.string().min(1)).min(1).max(20),
    confidence: z.number().min(0).max(1),
    uncertainty: z.enum(["explicit", "inferred", "conflicting"]),
  })
  .strict();

export type AgentClaim = z.infer<typeof AgentClaimSchema>;

export const AgentTaskSchema = z
  .object({
    id: z.string().min(1),
    runId: z.string().min(1),
    parentTaskId: z.string().min(1).optional(),
    agent: AgentTypeSchema,
    attempt: z.number().int().min(1).max(3).default(1),
    depth: z.number().int().min(0).max(1).default(0),
    payload: z.record(z.unknown()).default({}),
    evidence: z.array(EvidenceRefSchema).max(100).default([]),
  })
  .strict();

export type AgentTask = z.infer<typeof AgentTaskSchema>;

export const FollowUpTaskSchema = z
  .object({
    agent: AgentTypeSchema,
    reason: z.string().min(1).max(1000),
    payload: z.record(z.unknown()).default({}),
    evidence: z.array(EvidenceRefSchema).max(100).default([]),
  })
  .strict();

export type FollowUpTask = z.infer<typeof FollowUpTaskSchema>;

export const AgentWorkerResultSchema = z
  .object({
    summary: z.string().min(1).max(8000),
    data: z.record(z.unknown()).default({}),
    claims: z.array(AgentClaimSchema).max(100).default([]),
    followUps: z.array(FollowUpTaskSchema).max(8).default([]),
  })
  .strict();

export type AgentWorkerResult = z.infer<typeof AgentWorkerResultSchema>;

export const VALIDATION_OUTCOMES = ["valid", "needs_review", "retryable", "rejected"] as const;
export const ValidationOutcomeSchema = z.enum(VALIDATION_OUTCOMES);
export type ValidationOutcome = z.infer<typeof ValidationOutcomeSchema>;

export const ValidationResultSchema = z
  .object({
    outcome: ValidationOutcomeSchema,
    reasons: z.array(z.string().min(1).max(1000)).max(50).default([]),
  })
  .strict();

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export interface AgentContext {
  userId: string;
  organizationId: string;
  subjectType: "document" | "company" | "investor" | "match" | "other";
  subjectId: string;
  trigger: AgentTrigger;
  workflowVersion: string;
}

export interface AgentWorker {
  readonly id: AgentType;
  run(task: AgentTask, context: AgentContext, signal?: AbortSignal): Promise<AgentWorkerResult>;
}

export interface AgentValidator {
  validate(
    task: AgentTask,
    result: AgentWorkerResult,
    context: AgentContext,
  ): Promise<ValidationResult> | ValidationResult;
}

export interface AgentRunEvent {
  type: "task_started" | "task_completed" | "task_failed" | "task_retried" | "task_delegated";
  task: AgentTask;
  result?: AgentWorkerResult;
  validation?: ValidationResult;
  error?: string;
}

export interface AgentRunResult {
  runId: string;
  status: "completed" | "needs_review" | "failed";
  completed: Array<{
    task: AgentTask;
    result: AgentWorkerResult;
    validation: ValidationResult;
  }>;
  errors: Array<{ task: AgentTask; error: string }>;
}
