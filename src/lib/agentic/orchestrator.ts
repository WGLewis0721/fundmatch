import {
  AgentTaskSchema,
  AgentWorkerResultSchema,
  type AgentContext,
  type AgentRunEvent,
  type AgentRunResult,
  type AgentTask,
  type AgentValidator,
  type AgentWorker,
} from "./contracts";
import { defaultAgentValidator } from "./validation";

export interface AgentOrchestratorOptions {
  maxTasks?: number;
  maxAttempts?: number;
  validator?: AgentValidator;
  onEvent?: (event: AgentRunEvent) => Promise<void> | void;
}

export class AgentOrchestrator {
  private readonly workers = new Map<AgentWorker["id"], AgentWorker>();
  private readonly maxTasks: number;
  private readonly maxAttempts: number;
  private readonly validator: AgentValidator;
  private readonly onEvent?: AgentOrchestratorOptions["onEvent"];

  constructor(workers: AgentWorker[], options: AgentOrchestratorOptions = {}) {
    for (const worker of workers) {
      if (this.workers.has(worker.id)) throw new Error(`Duplicate agent worker: ${worker.id}`);
      this.workers.set(worker.id, worker);
    }
    this.maxTasks = options.maxTasks ?? 16;
    this.maxAttempts = options.maxAttempts ?? 2;
    this.validator = options.validator ?? defaultAgentValidator;
    this.onEvent = options.onEvent;
  }

  async run(initialTasks: AgentTask[], context: AgentContext, signal?: AbortSignal): Promise<AgentRunResult> {
    const queue = initialTasks.map((task) => AgentTaskSchema.parse(task));
    const completed: AgentRunResult["completed"] = [];
    const errors: AgentRunResult["errors"] = [];
    let needsReview = false;
    let executed = 0;

    while (queue.length) {
      if (signal?.aborted) throw new DOMException("Agent run cancelled.", "AbortError");
      if (executed >= this.maxTasks) {
        const task = queue.shift()!;
        errors.push({ task, error: `Agent run exceeded maxTasks=${this.maxTasks}.` });
        break;
      }

      const task = queue.shift()!;
      executed += 1;
      const worker = this.workers.get(task.agent);
      if (!worker) {
        errors.push({ task, error: `No worker registered for ${task.agent}.` });
        await this.emit({ type: "task_failed", task, error: errors.at(-1)!.error });
        continue;
      }

      await this.emit({ type: "task_started", task });

      try {
        const result = AgentWorkerResultSchema.parse(await worker.run(task, context, signal));
        const validation = await this.validator.validate(task, result, context);

        if (validation.outcome === "retryable" && task.attempt < this.maxAttempts) {
          const retry = AgentTaskSchema.parse({ ...task, attempt: task.attempt + 1 });
          queue.unshift(retry);
          await this.emit({ type: "task_retried", task: retry, result, validation });
          continue;
        }

        if (validation.outcome === "rejected" || validation.outcome === "retryable") {
          const error = validation.reasons.join(" ") || "Agent output failed validation.";
          errors.push({ task, error });
          await this.emit({ type: "task_failed", task, result, validation, error });
          continue;
        }

        if (validation.outcome === "needs_review") needsReview = true;
        completed.push({ task, result, validation });
        await this.emit({ type: "task_completed", task, result, validation });

        if (result.followUps.length && task.depth >= 1) {
          errors.push({ task, error: "Worker requested delegation beyond the allowed depth." });
          continue;
        }

        for (const [index, followUp] of result.followUps.entries()) {
          const delegated = AgentTaskSchema.parse({
            id: `${task.id}:followup:${index + 1}`,
            runId: task.runId,
            parentTaskId: task.id,
            agent: followUp.agent,
            attempt: 1,
            depth: task.depth + 1,
            payload: { ...followUp.payload, delegationReason: followUp.reason },
            evidence: followUp.evidence.length ? followUp.evidence : task.evidence,
          });
          queue.push(delegated);
          await this.emit({ type: "task_delegated", task: delegated });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (task.attempt < this.maxAttempts) {
          const retry = AgentTaskSchema.parse({ ...task, attempt: task.attempt + 1 });
          queue.unshift(retry);
          await this.emit({ type: "task_retried", task: retry, error: message });
        } else {
          errors.push({ task, error: message });
          await this.emit({ type: "task_failed", task, error: message });
        }
      }
    }

    return {
      runId: initialTasks[0]?.runId ?? "",
      status: errors.length ? "failed" : needsReview ? "needs_review" : "completed",
      completed,
      errors,
    };
  }

  private async emit(event: AgentRunEvent) {
    await this.onEvent?.(event);
  }
}
