import type {
  AgentContext,
  AgentTask,
  AgentValidator,
  AgentWorkerResult,
  ValidationResult,
} from "./contracts";

export class EvidenceValidator implements AgentValidator {
  validate(task: AgentTask, result: AgentWorkerResult, _context: AgentContext): ValidationResult {
    const allowedEvidence = new Set(task.evidence.map((item) => item.id));
    const reasons: string[] = [];
    let needsReview = false;

    for (const claim of result.claims) {
      const unknown = claim.evidenceIds.filter((id) => !allowedEvidence.has(id));
      if (unknown.length) {
        reasons.push(`Claim ${claim.id} cites evidence not supplied to the task: ${unknown.join(", ")}.`);
      }
      if (claim.uncertainty === "conflicting") {
        needsReview = true;
        reasons.push(`Claim ${claim.id} contains conflicting evidence and requires review.`);
      }
      if (claim.confidence < 0.5) {
        needsReview = true;
        reasons.push(`Claim ${claim.id} is below the automatic confidence threshold.`);
      }
    }

    if (reasons.some((reason) => reason.includes("not supplied"))) {
      return { outcome: "rejected", reasons };
    }

    if (needsReview) {
      return { outcome: "needs_review", reasons };
    }

    return { outcome: "valid", reasons };
  }
}

export class CompositeValidator implements AgentValidator {
  constructor(private readonly validators: AgentValidator[]) {}

  async validate(
    task: AgentTask,
    result: AgentWorkerResult,
    context: AgentContext,
  ): Promise<ValidationResult> {
    const reasons: string[] = [];
    let outcome: ValidationResult["outcome"] = "valid";

    const rank: Record<ValidationResult["outcome"], number> = {
      valid: 0,
      needs_review: 1,
      retryable: 2,
      rejected: 3,
    };

    for (const validator of this.validators) {
      const current = await validator.validate(task, result, context);
      reasons.push(...current.reasons);
      if (rank[current.outcome] > rank[outcome]) outcome = current.outcome;
    }

    return { outcome, reasons };
  }
}

export const defaultAgentValidator = new CompositeValidator([new EvidenceValidator()]);
