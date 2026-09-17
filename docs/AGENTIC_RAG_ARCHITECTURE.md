# FundMatch Agentic RAG Architecture

## Purpose

This document defines the production architecture for the intelligence layer that powers FundMatch. It turns the high-level pattern

```text
LLM + search/vector DB + workflow engine + prompts + API calls + validation
```

into a concrete FundMatch system.

The intelligence layer is not a chatbot bolted onto the product. It is server-side infrastructure that reacts to product events, retrieves authorized evidence, delegates narrow reasoning work, validates results, and then performs only allowed actions.

Research behind these decisions is in [`docs/research/agentic-rag/`](research/agentic-rag/README.md).

## Architecture decision

Keep FundMatch a modular monolith. Add an agentic runtime inside the existing application boundary rather than creating a fleet of AI microservices.

```text
Web / API / product event
          |
          v
   FundMatch service layer
          |
          +-----------------------+
          |                       |
          v                       v
 Postgres hard rules         enqueue durable job
 RLS + eligibility               pgmq
          |                       |
          +-----------+-----------+
                      v
              Agentic orchestrator
                      |
      +---------------+----------------+
      |               |                |
      v               v                v
 authorized RAG   specialized       action tools
 retrieval        workers           (bounded)
      |               |
      +-------+-------+
              v
         validation
              |
       pass / retry / review
              |
              v
       canonical action
              |
   Postgres + events + realtime/email
```

## Technology roles

| Concern | Selected technology | Role |
| --- | --- | --- |
| Product/runtime language | TypeScript | Shared domain contracts, orchestration, validation, APIs |
| Canonical data | Supabase Postgres | Profiles, theses, evidence metadata, runs, events |
| Authorization | Supabase Auth + RLS | Organization/data isolation |
| Private source files | Supabase Storage | Decks, diligence files, other private material |
| Durable jobs | Supabase Queues / `pgmq` | Agent and embedding work that survives disconnects/retries |
| Vector retrieval | Postgres + `pgvector` | Authorized semantic RAG and semantic matching |
| Initial model API | Existing OpenAI Responses adapter | Structured extraction/model work |
| Full agent runtime | OpenAI Agents SDK adapter, later | Tools, delegation, guardrails, tracing |
| Durable graph runtime | LangGraph, when needed | Checkpoints, interrupts, subgraphs, resumable execution |
| Alternate/evaluator model | Claude adapter | Selected workers/evals, not required for every request |
| Interoperability | MCP | Expose bounded FundMatch tools/resources to AI hosts |
| External automation | Make / n8n | CRM, notifications, partner ops, integrations after core APIs stabilize |

## Core invariant

A model never receives authority merely because it can reason.

Hard rules remain conventional software:

- organization authorization;
- row-level access;
- company discoverability;
- stage/geography/check-size/exclusion eligibility;
- existing Pass/Save/Interested state;
- idempotency;
- whether a write requires human confirmation;
- whether contact information may be exposed.

The model operates only after those constraints have been applied.

## Canonical agent types

The first runtime recognizes six agent roles. They are logical roles, not separate services.

### `document`

Input: an authorized document/chunk set.

Output: structured proposed claims with source locators and uncertainty.

May not directly update canonical company facts.

### `thesis`

Input: investor-supplied thesis text plus current confirmed preferences.

Output: proposed normalized preferences/exclusions requiring confirmation where materially inferred.

### `match`

Input: an already eligible company, confirmed investor thesis, deterministic score, and authorized evidence.

Output: evidence-backed fit explanation, mismatches, strengths, and questions.

May not declare an otherwise-ineligible company eligible.

### `readiness`

Input: approved profile facts, material inventory, and authorized evidence.

Output: reviewable gaps and suggested readiness updates.

### `diligence`

Input: authorized company evidence and investor context.

Output: inconsistencies, risks/open questions, and missing evidence. It does not make an investment recommendation.

### `evidence`

Input: another worker's structured claims plus retrieved source chunks.

Output: validation findings such as supported, unsupported, conflicting, or insufficient evidence.

This role may be deterministic for exact claims and model-assisted for semantic claims.

## Run model

Every autonomous workflow creates a durable business-level run.

```text
agent_runs
  id
  organization_id
  trigger
  subject_type
  subject_id
  status
  workflow_version
  model_provider nullable
  model_name nullable
  started_at
  completed_at nullable
  error_code nullable
  metadata jsonb

agent_steps
  id
  run_id
  sequence
  agent_type
  status
  attempt
  input_summary jsonb
  output_summary jsonb
  validation_status
  started_at
  completed_at nullable
  error_code nullable
  metadata jsonb
```

These records are FundMatch's audit trail. Vendor tracing may be enabled too, but does not replace them.

## RAG data model

FundMatch retrieves chunks, not whole confidential workspaces.

```text
document_chunks
  id
  organization_id
  company_id nullable
  investor_id nullable
  document_id nullable
  source_type
  source_locator
  content
  content_sha256
  metadata jsonb
  created_at

chunk_embeddings
  chunk_id
  embedding_model
  embedding_dimensions
  embedding vector(1536)
  embedded_at
```

The first embedding target is OpenAI `text-embedding-3-small` at 1536 dimensions. The model and dimensions are stored per embedding so future migrations are explicit.

## Retrieval pipeline

RAG retrieval always applies security and deterministic filters before semantic ranking.

```text
request / workflow state
      |
      v
resolve authenticated organization + subject
      |
      v
SQL scope / hard eligibility
      |
      v
keyword / metadata / vector candidate retrieval
      |
      v
bounded top-k evidence set
      |
      v
model worker
```

For matching, company eligibility happens before vector similarity. For document QA, organization/document authorization happens before chunk ranking.

## Agentic workflow examples

### Document intelligence

```text
document uploaded
 -> enqueue `document_uploaded`
 -> parse/chunk
 -> enqueue missing embeddings
 -> retrieve document evidence
 -> document worker extracts claims
 -> deterministic source-locator checks
 -> evidence worker validates ambiguous claims/conflicts
 -> readiness worker evaluates gaps
 -> persist suggestions
 -> notify founder
 -> human accept/correct/reject
 -> commit canonical facts
```

### Thesis recomputation

```text
investor thesis edited
 -> normalize proposed thesis
 -> investor confirms material inference
 -> SQL eligibility query
 -> semantic candidate retrieval
 -> deterministic MatchEngine score
 -> match worker explains top candidates
 -> evidence validation
 -> persist explanation + scoring version
 -> surface feed
```

### Diligence on demand

```text
investor opens company / asks a diligence question
 -> authorize company evidence
 -> retrieve relevant chunks
 -> diligence worker
 -> evidence validation
 -> present findings + sources + uncertainty
```

## Delegation rules

Subagents are used only when they improve isolation, parallelism, or specialist validation.

Examples:

- Match worker discovers a revenue contradiction -> delegate an evidence task.
- A deck has independent product/market/financial sections -> document analysis can parallelize bounded sections.
- A simple deterministic lookup -> do not spawn an agent.

The maximum delegation depth should remain bounded. Initial FundMatch runtime uses one orchestrator level plus worker tasks; no recursive autonomous swarm.

## Validation pipeline

Model output is not accepted merely because it parses.

```text
schema validation
 -> authorization/context validation
 -> source locator validation
 -> evidence presence
 -> deterministic business rules
 -> contradiction checks
 -> confidence/review policy
 -> optional semantic evaluator
 -> pass / retry / human review / fail
```

### Required validation outcomes

- `valid`
- `needs_review`
- `retryable`
- `rejected`

No silent fallback from rejected AI output to canonical writes.

## Source-of-truth tiers

FundMatch distinguishes:

```text
1. source material
   founder/investor/document supplied

2. AI proposal / interpretation
   extracted, normalized, explained, or flagged

3. canonical FundMatch state
   accepted/verified records used by product logic
```

A model may create tier 2. Only deterministic rules or an authorized review workflow can promote it to tier 3.

## Queue design

Initial queues:

- `agent_runs`
- `embeddings`

Queue messages contain IDs and bounded metadata rather than entire documents.

Example:

```json
{
  "run_id": "uuid",
  "trigger": "document_uploaded",
  "organization_id": "uuid",
  "subject_type": "document",
  "subject_id": "uuid",
  "workflow_version": "agentic-v1"
}
```

Every consumer is idempotent. Successful messages are archived for operational history where useful.

## Prompt management

Prompts are code/configuration with versions, not ad hoc strings spread throughout UI components.

Every model step records:

- prompt/workflow version;
- provider/model;
- source IDs retrieved;
- structured output version;
- validation result;
- latency/usage metadata when available.

Proprietary production prompts and ranking details should not be exposed in the public demo.

## Model-provider strategy

Start with one provider per workflow. Do not require OpenAI and Claude in series for ordinary requests.

Provider abstraction:

```ts
interface ModelWorker<I, O> {
  readonly id: string;
  run(input: I, context: AgentContext, signal?: AbortSignal): Promise<O>;
}
```

OpenAI, Claude, deterministic implementations, and future providers can implement the same contract.

## OpenAI Agents SDK adoption

The current repository already has a direct OpenAI Responses adapter. The first runtime foundation stays framework-neutral. When the Agents SDK is introduced, it should implement the same FundMatch interfaces and provide:

- agents-as-tools / handoffs;
- function tools;
- guardrails;
- tracing;
- sessions only where they add value.

Do not couple database schemas to SDK-specific trace/session IDs.

## LangGraph adoption trigger

Adopt LangGraph when at least one production workflow needs durable pause/resume or branching that is becoming awkward to manage with queue jobs and bounded TypeScript orchestration.

Likely first candidate: document processing with human review and retryable substeps.

Until then, a small explicit orchestrator plus Postgres run records and pgmq is easier to operate.

## MCP boundary

Once service interfaces stabilize, expose selected read/status/enqueue operations through an MCP server. MCP is not the internal database access layer and receives no unrestricted SQL capability.

## Make/n8n boundary

Make/n8n may consume FundMatch APIs/MCP for integrations. They do not own core matching, provenance, or canonical profile writes.

## Failure policy

- transient provider/network errors -> retry with bounded backoff;
- invalid structured output -> one bounded repair/retry path;
- unsupported evidence -> reject or request more retrieval;
- conflicting evidence -> mark for review, never silently select a preferred claim;
- authorization failure -> terminal failure, no model retry;
- exhausted job -> dead-letter/manual operations state with visible run error.

## Cost controls

- retrieve before prompting;
- cap top-k chunks and chunk size;
- use deterministic rules before models;
- only invoke evidence/diligence workers when needed;
- batch embeddings;
- record usage by run/step;
- do not spawn subagents for simple lookups.

## Acceptance criteria for the foundation

The agentic runtime foundation is complete when:

1. vector and queue extensions are version-controlled in migrations;
2. RAG chunks and embeddings have an organization-scoped schema;
3. agent runs/steps are durable and auditable;
4. a typed TypeScript orchestrator can execute bounded workers, delegate bounded follow-up tasks, and validate output;
5. model providers remain behind interfaces;
6. canonical writes stay outside the model worker;
7. README/roadmap describe the architecture accurately;
8. CI still passes.

This foundation does not mean every workflow is live. It creates the technology layer needed to build Phase 8/9 production document intelligence and semantic matching without redesigning the system again.
