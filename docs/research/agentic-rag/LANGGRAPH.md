# LangGraph research for FundMatch

## What it is

LangGraph is a stateful workflow/runtime for agent systems. It models a workflow as nodes connected by transitions over shared state, with support for retries, persistence/checkpoints, interrupts, human review, subgraphs, and resumable execution.

Official sources:

- https://docs.langchain.com/oss/javascript/langgraph/install
- https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph
- https://docs.langchain.com/oss/javascript/deepagents/overview

## Why it matters to FundMatch

FundMatch has workflows that are naturally graphs rather than single prompt calls. Examples:

```text
document uploaded
 -> parse
 -> extract claims
 -> retrieve corroborating evidence
 -> validate
 -> if conflict: investigate
 -> readiness analysis
 -> human review
 -> commit approved profile changes
```

and:

```text
investor thesis changed
 -> normalize thesis
 -> hard SQL eligibility
 -> semantic retrieval
 -> match analysis
 -> evidence validation
 -> persist explanation
```

LangGraph is designed for exactly this class of multi-step, branching, retryable workflow.

## Relevant capabilities

### Explicit state

LangGraph encourages raw workflow state shared across nodes rather than hiding the entire process inside one prompt. That is a strong fit for FundMatch because evidence IDs, organization IDs, candidate IDs, model versions, validation results, and approval state need to remain inspectable.

### Durable execution and checkpoints

Agentic tasks can fail after expensive work. A state graph can resume from a checkpoint instead of rerunning every previous step. That becomes increasingly useful when FundMatch processes long documents, multiple candidates, integrations, or human approvals.

### Human-in-the-loop interrupts

FundMatch already requires human review for important founder claims. LangGraph's interrupt/resume model maps well to a workflow that pauses until a founder accepts/rejects an extracted suggestion or until an authorized reviewer approves a sensitive action.

### Subgraphs

Document processing, matching, diligence, and notification can be implemented as isolated subgraphs without splitting the application into microservices.

### Retry/error routing

Transient failures can retry; malformed model output can route to repair; missing user information can pause; exhausted failures can route to a dead-letter/manual-review path.

## Cost/complexity trade-off

FundMatch does not need LangGraph merely to call one model and one tool. Adding a second orchestration framework on top of another agent SDK can create duplicate abstractions for routing, state, retries, and tracing.

The value appears when FundMatch needs durable, resumable workflows with branching and human approval across multiple steps.

## Decision

**Use LangGraph as the likely durable workflow layer once multi-step production jobs require checkpoints and resume semantics. Do not make it the first dependency for the foundation.**

The initial FundMatch runtime should expose a small TypeScript workflow contract and persist business-level runs/steps in Postgres. That contract should be compatible with migration to LangGraph nodes/subgraphs later.

Recommended split when adopted:

```text
LangGraph
  owns durable workflow routing/checkpoints

OpenAI Agents SDK or model adapters
  own LLM/tool loops inside selected nodes

Supabase/Postgres
  owns canonical product data and audit records

pgmq
  owns durable job delivery
```

That avoids asking LangGraph to be a database or asking an agent SDK to be a durable job system.

## FundMatch candidate graphs

1. `document_intelligence_graph`
2. `thesis_recompute_graph`
3. `match_explanation_graph`
4. `diligence_review_graph`
5. `introduction_followup_graph`

Each should use typed state and bounded transitions. No open-ended agent recursion.

## What not to do

- Do not put RLS/authorization decisions inside model nodes.
- Do not store prompt-formatted strings as the canonical graph state when raw typed values are available.
- Do not let graph retries create duplicate writes; every action needs idempotency.
- Do not introduce LangGraph Server/LangSmith as a hard production dependency before FundMatch needs it.
