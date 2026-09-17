import { describe, expect, test } from "bun:test";
import {
  AgentOrchestrator,
  EvidenceValidator,
  initialTasksForWorkflow,
  type AgentContext,
  type AgentWorker,
} from "../src/lib/agentic";

const evidence = {
  id: "deck-p6",
  sourceType: "pitch_deck",
  sourceId: "deck-1",
  locator: "page 6",
};

const context: AgentContext = {
  userId: "user-1",
  organizationId: "org-1",
  subjectType: "document",
  subjectId: "deck-1",
  trigger: "document_uploaded",
  workflowVersion: "agentic-v1",
};

describe("agentic runtime", () => {
  test("workflow planner maps product triggers to narrow workers", () => {
    expect(initialTasksForWorkflow({ runId: "run-1", trigger: "document_uploaded" })[0]?.agent).toBe(
      "document",
    );
    expect(initialTasksForWorkflow({ runId: "run-2", trigger: "thesis_updated" })[0]?.agent).toBe(
      "thesis",
    );
  });

  test("validated worker can delegate one bounded evidence follow-up", async () => {
    const documentWorker: AgentWorker = {
      id: "document",
      async run() {
        return {
          summary: "Extracted one explicit traction claim.",
          data: {},
          claims: [
            {
              id: "claim-1",
              statement: "ARR is $1.8M.",
              evidenceIds: ["deck-p6"],
              confidence: 0.95,
              uncertainty: "explicit",
            },
          ],
          followUps: [
            {
              agent: "evidence",
              reason: "Verify the material traction claim.",
              payload: { claimId: "claim-1" },
              evidence: [evidence],
            },
          ],
        };
      },
    };

    const evidenceWorker: AgentWorker = {
      id: "evidence",
      async run() {
        return {
          summary: "Evidence reference is present.",
          data: { supported: true },
          claims: [],
          followUps: [],
        };
      },
    };

    const run = new AgentOrchestrator([documentWorker, evidenceWorker]);
    const tasks = initialTasksForWorkflow({
      runId: "run-1",
      trigger: "document_uploaded",
      evidence: [evidence],
    });
    const result = await run.run(tasks, context);

    expect(result.status).toBe("completed");
    expect(result.completed).toHaveLength(2);
    expect(result.completed[1]?.task.parentTaskId).toBe("run-1:root:1");
    expect(result.completed[1]?.task.depth).toBe(1);
  });

  test("evidence validator rejects claims that cite evidence outside the authorized task", () => {
    const validator = new EvidenceValidator();
    const task = initialTasksForWorkflow({
      runId: "run-2",
      trigger: "document_uploaded",
      evidence: [evidence],
    })[0]!;

    const validation = validator.validate(
      task,
      {
        summary: "Bad output",
        data: {},
        claims: [
          {
            id: "claim-2",
            statement: "Unsupported claim",
            evidenceIds: ["other-document"],
            confidence: 0.99,
            uncertainty: "explicit",
          },
        ],
        followUps: [],
      },
      context,
    );

    expect(validation.outcome).toBe("rejected");
  });

  test("conflicting claims stop automatic completion and require review", async () => {
    const worker: AgentWorker = {
      id: "document",
      async run() {
        return {
          summary: "Conflicting revenue evidence found.",
          data: {},
          claims: [
            {
              id: "claim-3",
              statement: "Revenue differs across source periods.",
              evidenceIds: ["deck-p6"],
              confidence: 0.8,
              uncertainty: "conflicting",
            },
          ],
          followUps: [],
        };
      },
    };

    const run = new AgentOrchestrator([worker]);
    const result = await run.run(
      initialTasksForWorkflow({ runId: "run-3", trigger: "document_uploaded", evidence: [evidence] }),
      context,
    );

    expect(result.status).toBe("needs_review");
    expect(result.errors).toHaveLength(0);
  });

  test("delegation depth is capped to prevent recursive agent swarms", async () => {
    const documentWorker: AgentWorker = {
      id: "document",
      async run() {
        return {
          summary: "Delegate evidence review.",
          data: {},
          claims: [],
          followUps: [{ agent: "evidence", reason: "review", payload: {}, evidence: [] }],
        };
      },
    };
    const evidenceWorker: AgentWorker = {
      id: "evidence",
      async run() {
        return {
          summary: "Attempt another delegation.",
          data: {},
          claims: [],
          followUps: [{ agent: "readiness", reason: "too deep", payload: {}, evidence: [] }],
        };
      },
    };

    const run = new AgentOrchestrator([documentWorker, evidenceWorker]);
    const result = await run.run(
      initialTasksForWorkflow({ runId: "run-4", trigger: "document_uploaded" }),
      context,
    );

    expect(result.status).toBe("failed");
    expect(result.errors.some((item) => item.error.includes("allowed depth"))).toBe(true);
  });
});
