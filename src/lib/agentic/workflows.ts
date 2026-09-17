import { AgentTaskSchema, type AgentTask, type AgentTrigger, type EvidenceRef } from "./contracts";

export interface WorkflowSeed {
  runId: string;
  trigger: AgentTrigger;
  payload?: Record<string, unknown>;
  evidence?: EvidenceRef[];
}

export function initialTasksForWorkflow(seed: WorkflowSeed): AgentTask[] {
  const base = {
    id: `${seed.runId}:root:1`,
    runId: seed.runId,
    attempt: 1,
    depth: 0,
    payload: seed.payload ?? {},
    evidence: seed.evidence ?? [],
  };

  switch (seed.trigger) {
    case "document_uploaded":
      return [AgentTaskSchema.parse({ ...base, agent: "document" })];
    case "thesis_updated":
      return [AgentTaskSchema.parse({ ...base, agent: "thesis" })];
    case "match_explanation_requested":
      return [AgentTaskSchema.parse({ ...base, agent: "match" })];
    case "diligence_requested":
      return [AgentTaskSchema.parse({ ...base, agent: "diligence" })];
    case "manual":
      return [AgentTaskSchema.parse({ ...base, agent: "evidence" })];
  }
}
