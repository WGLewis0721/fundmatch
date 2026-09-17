# OpenAI Agents SDK research for FundMatch

## What it is

The OpenAI Agents SDK for TypeScript is a small agent runtime built around agents, tools, handoffs/agents-as-tools, guardrails, sessions, human-in-the-loop flows, and tracing. It provides a built-in agent loop rather than requiring FundMatch to manually reimplement tool-call iteration.

Official sources:

- https://openai.github.io/openai-agents-js/
- https://openai.github.io/openai-agents-js/guides/quickstart/
- https://openai.github.io/openai-agents-js/guides/guardrails/
- https://openai.github.io/openai-agents-js/guides/tracing/

## Relevant capabilities

### Agents and agents-as-tools

FundMatch can define narrow workers such as `document`, `thesis`, `match`, `readiness`, `diligence`, and `evidence` agents. A parent orchestrator can call those workers as tools or hand work off to them.

This maps directly to FundMatch's requirement that specialized workers operate on different evidence while the application, not the model, remains authoritative for permissions and hard eligibility.

### Guardrails

The SDK supports input, output, and tool guardrails. For FundMatch these are useful for:

- rejecting unsupported output shapes;
- blocking tool calls that do not carry verified organization/workspace context;
- preventing model output from becoming a canonical company fact without provenance;
- rejecting an explanation that lacks evidence references;
- stopping expensive agent runs early when required inputs are missing.

Guardrails complement, but do not replace, Postgres RLS, server authorization, deterministic business rules, or FundMatch's human-review requirements.

### Tracing

The SDK records model generations, tool calls, handoffs, guardrails, and custom events. That is useful for debugging agentic workflows and later evaluating prompt/model changes.

FundMatch should still persist its own business-level `agent_runs` and `agent_steps` records because OpenAI traces are provider/runtime telemetry, not the product's durable audit record.

### Sessions and human review

Persistent sessions and human-in-the-loop primitives can support long-running tasks, but FundMatch should keep canonical workflow state in Postgres so a user is not locked to one model vendor's session abstraction.

## Fit with the current repository

FundMatch is TypeScript-first and already has a server-only OpenAI Responses API adapter in `src/lib/intelligence/openai.server.ts`. That makes the TypeScript SDK a natural candidate if/when we want SDK-managed handoffs, tools, guardrails, and tracing.

The current repo uses Zod 3 imports. The current Agents SDK documentation expects Zod v4-compatible schemas. Do not force a repo-wide Zod migration only to introduce the SDK. FundMatch can keep framework-neutral agent contracts now and adopt the SDK behind an adapter when dependency compatibility is deliberately handled.

## Decision

**Use the OpenAI Agents SDK as the preferred first full agent runtime, but do not make FundMatch's domain contracts depend on it.**

The FundMatch architecture should expose plain TypeScript interfaces for agents, validators, retrieval, and actions. A later `OpenAIAgentRuntime` adapter can implement those interfaces and provide sub-agent delegation, guardrails, and tracing.

This preserves:

- provider portability;
- testability without an API key;
- deterministic fallback behavior;
- the option to use Claude for selected jobs or evaluation;
- the ability to switch orchestration technology without rewriting the product domain.

## FundMatch implementation pattern

```text
FundMatch event / request
  -> TypeScript workflow/orchestrator
  -> retrieve authorized evidence
  -> OpenAI agent runtime
       -> document / thesis / match / diligence / evidence workers
       -> tool calls
       -> guardrails
  -> FundMatch validation layer
  -> human review where required
  -> canonical Postgres write / queue / notification
```

## What not to do

- Do not let the SDK become the system of record.
- Do not let an agent bypass RLS or hard thesis filters.
- Do not expose service-role credentials as agent tools.
- Do not persist chain-of-thought as a product record.
- Do not treat an agent's confidence score as investment probability.
