# TypeScript and Python runtime research for FundMatch

## Context

FundMatch is already a TypeScript application using React/TanStack, Bun, Supabase, and server-side TypeScript. The current AI extraction adapter is also TypeScript. Introducing Python is therefore a product/operations decision, not a requirement for agentic RAG.

## TypeScript strengths for FundMatch

- Same language and domain types across web/server/agent contracts.
- Existing Zod validation and TypeScript interfaces can be reused.
- OpenAI Agents SDK, LangGraph JS, MCP TypeScript SDK, Supabase JS, and ordinary HTTP clients all support the runtime.
- Easier to keep authorization and domain services in one codebase.
- Fewer deployment/runtime surfaces during the pilot.
- Bun/Node/Vercel integration matches the current repository.

## Python strengths

Python remains attractive for:

- data science and offline ranking experiments;
- notebooks/evaluation pipelines;
- advanced ML/recommendation training;
- specialized extraction libraries;
- future batch analytics where the Python ecosystem is materially stronger.

## Decision

**Keep production agentic RAG orchestration TypeScript-first. Introduce Python only for workloads that materially benefit from the Python ecosystem.**

This matches the existing modular-monolith principle and avoids creating a second service solely because many AI examples are written in Python.

Recommended boundary if Python is introduced later:

```text
TypeScript application/runtime
  -> durable queue / versioned job contract
  -> Python batch worker
  -> structured result
  -> validation
  -> Postgres
```

Do not let a Python worker become an unaudited side channel that writes arbitrary production records.

## Plain-language rule

Use the smallest runtime that solves the problem:

- TypeScript for product orchestration, APIs, MCP, queue workers, retrieval, validations, and model calls.
- SQL/Postgres for hard filters, authorization-adjacent data logic, persistence, event history, and vector search.
- Python later for serious ML/data work when it clearly earns its operational cost.

## Framework-neutral contracts

The core agent interfaces should remain ordinary TypeScript:

```ts
interface AgentWorker<Input, Output> {
  id: string;
  run(input: Input, context: AgentContext): Promise<Output>;
}
```

That keeps FundMatch testable even if the implementation behind `run()` is OpenAI Agents SDK, Claude, LangGraph, a deterministic function, or a future Python service.
