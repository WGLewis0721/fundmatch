# FundMatch agentic RAG research index

This folder records the technology research used to design FundMatch's agentic intelligence runtime. It separates technology evaluation from product architecture so future builders can understand why a tool was or was not selected.

## Research documents

- [`OPENAI_AGENTS_SDK.md`](OPENAI_AGENTS_SDK.md) — agents, tools, handoffs, guardrails, sessions, human review, tracing.
- [`LANGGRAPH.md`](LANGGRAPH.md) — durable state graphs, checkpoints, retries, interrupts, subgraphs.
- [`CLAUDE_TOOLING.md`](CLAUDE_TOOLING.md) — Claude tool use, subagents, MCP, provider/evaluator role.
- [`SUPABASE_PGVECTOR_PGMQ.md`](SUPABASE_PGVECTOR_PGMQ.md) — Postgres vectors, semantic retrieval, queues, embedding lifecycle.
- [`MCP.md`](MCP.md) — reusable tool/resource boundary for AI hosts and external automation.
- [`N8N.md`](N8N.md) — integration/ops automation role and boundaries.
- [`MAKE.md`](MAKE.md) — integration/ops automation role and boundaries.
- [`TYPESCRIPT_PYTHON.md`](TYPESCRIPT_PYTHON.md) — runtime language choice.

## Architecture conclusion

FundMatch should not install every agent framework simply because it exists. The selected shape is:

```text
TypeScript FundMatch application
  -> Postgres/RLS hard rules and canonical data
  -> pgmq durable jobs
  -> agentic workflow/orchestrator
  -> authorized retrieval from Postgres + pgvector
  -> specialized model workers
  -> deterministic validation + optional semantic evaluator
  -> human review where required
  -> canonical actions / events / notifications
```

### Selected now

- TypeScript domain/runtime contracts.
- Supabase Postgres/RLS/Storage.
- `pgvector` for first-party semantic retrieval.
- `pgmq` for durable AI/embedding jobs.
- Existing OpenAI Responses API adapter as the first model adapter.
- FundMatch-owned run/step audit records and validation.

### Planned adapters

- OpenAI Agents SDK: preferred first full agent runtime for handoffs, guardrails, and tracing once dependency compatibility is deliberately introduced.
- LangGraph: durable graph/checkpoint layer when production workflows need pause/resume semantics beyond the initial queue worker.
- Claude: alternate worker/evaluator and internal development/MCP host, not a mandatory second model for every request.
- MCP: interoperability surface after core service contracts stabilize.
- n8n/Make: external integration and operations clients, not core matching infrastructure.

## Governing principle

The LLM is not FundMatch's database, authorization layer, eligibility engine, or source of truth. Models propose and analyze. FundMatch retrieves authorized evidence, validates structured outputs, preserves provenance, and controls actions.

See [`../../AGENTIC_RAG_ARCHITECTURE.md`](../../AGENTIC_RAG_ARCHITECTURE.md) for the assembled implementation architecture.
