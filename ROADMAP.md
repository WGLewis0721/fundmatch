# FundMatch Roadmap

This document is the product and implementation source of truth for FundMatch. Read it before starting new product work and update it after meaningful changes.

## Product definition

FundMatch is an AI-assisted capital discovery and fundraising-readiness platform for startup founders and investment teams.

It helps founders package their company once, understand readiness gaps, and become discoverable to investors who fit. It helps investors review cleaner company profiles, confirm thesis fit, understand why a company is relevant, investigate sourced questions, and move promising companies into an introduction/diligence workflow.

## Serious positioning

**AI-assisted deal discovery, readiness, and evidence-backed matching for founders and investment teams.**

Do not reduce FundMatch to “Tinder for VC.” The feed/swipe interaction is a useful discovery surface. The deeper product is structured company/investor data, candidate retrieval, explainable ranking, provenance, readiness, agentic intelligence, introductions, diligence, and outcome learning.

## Core product loop

```text
Connect data
→ Build profiles
→ Infer / confirm thesis
→ Retrieve eligible candidates
→ Score and explain fit
→ Surface opportunities
→ Pass / Save / Interested
→ Manage introduction / diligence
→ Record outcome
→ Improve future ranking
```

## Product goals

1. Help founders create a clean, standardized investor-facing profile.
2. Help founders understand whether they are ready to raise.
3. Help investors discover better-fit companies faster.
4. Keep candidate eligibility and match scoring explainable.
5. Preserve provenance for important claims and AI-generated suggestions.
6. Support diligence workflow: materials, notes, statuses, questions, and collaboration.
7. Keep AI-generated edits reviewable by the human/company that owns the profile.
8. Build a deterministic rules baseline before relying on ML ranking.
9. Capture marketplace outcomes so future ranking can learn from useful conversations, not just clicks.
10. Avoid unlicensed proprietary private-market data.
11. Keep the public demo clearly separated from production/private data.
12. Do not add large-scale infrastructure before measured demand justifies it.
13. Keep model reasoning subordinate to authorization, deterministic eligibility, evidence validation, and human review.

## Canonical user flows

### Founder flow

1. Create or claim company profile.
2. Enter/import company basics, traction, raise details, and materials.
3. Upload or link pitch deck and supporting documents.
4. Receive AI-assisted profile/readiness suggestions with provenance.
5. Accept, correct, or reject suggestions.
6. See fundraising-readiness checklist and gaps.
7. Generate a standardized FundMatch investor packet/profile.
8. Become discoverable to eligible investors.
9. Receive investor interest requests.
10. Review investor/firm context and Accept / Decline / Request more information.
11. Track introductions, meetings, diligence, and outcomes.

### Investor flow

1. Create firm profile.
2. Enter thesis or import permitted firm/deal data.
3. Confirm inferred investment preferences and exclusions.
4. Browse ranked company cards.
5. Pass, Save, or mark Interested.
6. Open evidence-backed fit/diligence explanations.
7. Send a permissioned interest request rather than exposing private founder contact details automatically.
8. Move accepted opportunities through pipeline.
9. Add team notes and diligence questions.
10. Record outcomes to improve future ranking.

## Architecture decisions

FundMatch remains a **modular monolith backed by managed services** until scale proves otherwise.

The recommendation boundary remains:

```text
profile data
→ deterministic eligibility
→ candidate retrieval
→ ranking
→ explanation
→ decision
→ workflow
→ outcome event
→ future learning
```

The intelligence boundary is now:

```text
product event/request
→ authorization + hard rules
→ durable queue
→ authorized RAG retrieval
→ bounded specialist worker(s)
→ validation
→ pass / retry / human review / fail
→ canonical action
```

See:

- [`docs/MATCHING_ARCHITECTURE.md`](docs/MATCHING_ARCHITECTURE.md)
- [`docs/AGENTIC_RAG_ARCHITECTURE.md`](docs/AGENTIC_RAG_ARCHITECTURE.md)
- [`docs/research/agentic-rag/README.md`](docs/research/agentic-rag/README.md)

## Current / target architecture

### 1. Public demo

**Purpose:** show the product story and interaction model without signup.

**Routes:** `/`, `/demo`, plus the fictional `/wireframes` prototype on Pages.

**Tech:** React/TanStack/Vite static Pages build, fictional browser/local state.

**Status:** Working.

**Constraint:** no confidential documents, real investor data, production credentials, or production AI.

### 2. Authenticated app

**Purpose:** real users, organizations, persistence, private documents, and marketplace workflows.

**Route:** `/app`

**Tech:** React 19 + TanStack Start/Router + TypeScript; Supabase Auth/Postgres/RLS/Storage; Drizzle migrations.

**Deployment:** Vercel + Nitro.

**Status:** latest production deployments are serving successfully and `/app/login` returns the FundMatch application. Full Phase 5 browser acceptance is still required.

### 3. System of record and authorization

**Tech:** Supabase Postgres + Row-Level Security + private Storage.

**Status:** standalone FundMatch backend exists and the Phase 5 backend schema/RLS/storage hardening is in place.

**Constraint:** service-role credentials never reach browser code or public Pages output.

### 4. Production discovery pipeline

**Purpose:** retrieve eligible companies, rank them, explain the result, and persist investor decisions.

**Tech now:** Postgres relational filters/indexes + existing deterministic `MatchEngine`.

**Target augmentation:** Postgres + `pgvector` semantic thesis/company similarity after the deterministic production loop works.

**Status:** deterministic demo exists; production candidate retrieval/ranking loop remains incomplete.

### 5. Marketplace event history

**Purpose:** retain behavioral and outcome history separately from current state.

**Tech:** append-only Postgres event records alongside current-state tables.

**Initial events:** impression, profile open, pass, save, interested, intro requested/accepted/declined, meeting, diligence, funded/no-deal, readiness changed.

**Status:** partial activity/current-state concepts exist; full production discovery/outcome event model is not complete.

### 6. Realtime

**Purpose:** deliver important workflow changes without refresh.

**Tech decision:** Supabase Realtime Broadcast for user-visible state changes.

**Status:** not yet wired as the complete production marketplace notification layer.

**Constraint:** Postgres remains source of truth; realtime is delivery only.

### 7. Durable jobs / agent runtime

**Purpose:** document intelligence, embeddings, match recomputation, validation, email, and integration jobs that survive client disconnects and transient failures.

**Tech decision:** Supabase Queues (`pgmq`) + server-side TypeScript workers/functions. Vercel hosts the current authenticated server runtime; Supabase remains canonical data/queue infrastructure.

**Foundation status:** implemented in repository migration/runtime code in the agentic RAG foundation work. End-to-end production consumers are still to be wired.

**Constraint:** jobs are bounded, retryable/idempotent, server-authorized, and auditable.

### 8. Agentic RAG and semantic retrieval

**Purpose:** retrieve only authorized evidence, run specialist analysis, validate results, and return reviewable evidence-backed output.

**Foundation:** TypeScript task/worker/result contracts, bounded orchestrator, evidence validator, OpenAI structured worker adapter, OpenAI embedding adapter, Postgres chunk/embedding schema, pgvector retrieval, agent run/step audit model.

**Target full runtime:** OpenAI Agents SDK adapter for tools/handoffs/guardrails/tracing; LangGraph only when durable checkpoint/resume complexity justifies it; Claude as an optional worker/evaluator; MCP for external AI-host interoperability.

**Status:** foundation implemented in code; production chunking/embedding/queue-consumer workflows are not yet complete.

**Constraint:** semantic similarity augments retrieval/ranking and never overrides hard exclusions, privacy, or mandate constraints.

### 9. Introductions and transactional email

**Purpose:** move Interest into a permissioned conversation.

```text
Investor Interested
→ founder notified
→ Accept / Decline / Request more information
→ accepted introduction thread
```

**Tech:** Postgres workflow records + queue + server-side email provider; Resend remains the preferred first email implementation unless requirements change.

**Status:** not implemented end-to-end.

### 10. Integrations

**Purpose:** import permitted customer-owned data and connect external workflow tools.

**Potential sources:** company websites, founder-owned files, Google/Microsoft files, CRM, investor CRM, revenue systems, DocSend-style links, licensed market-data vendors.

**Integration strategy:** native APIs where product-critical; MCP for bounded AI-host tools; Make/n8n may consume FundMatch APIs/MCP for pilot/operations integrations.

**Status:** demo/mocked only.

**Constraint:** do not scrape/redistribute proprietary private-market datasets without permission/license.

### 11. Billing

**Purpose:** commercialize after pilot value is proven.

**Tech:** Stripe.

**Status:** not implemented.

### 12. Search/cache/service decomposition — later only

Do not add as vanity milestones:

- Redis
- Elasticsearch/OpenSearch
- Kafka
- Kubernetes
- separate vector database
- large microservice fleet

Add dedicated infrastructure only after measured load/latency/operational evidence shows Postgres + pgvector + pgmq + the modular monolith cannot meet requirements economically.

## Agentic technology research decisions

The technology set was researched separately before assembly.

### OpenAI Agents SDK

Preferred future full agent-runtime adapter for agents-as-tools/handoffs, function tools, guardrails, and tracing. Keep FundMatch domain contracts framework-neutral.

### LangGraph

Use when a production workflow genuinely needs durable checkpoints, interrupt/resume, and complex branching. Do not add it merely to wrap a one-call agent.

### Claude tooling

Optional alternate worker/evaluator and internal MCP/development host. Do not require two model providers for every normal request.

### Supabase/Postgres + pgvector + pgmq

Selected first-party vector and queue stack. Keep authorization/filtering and embeddings close to canonical data.

### MCP

Planned interoperability boundary for selected FundMatch tools/resources after service interfaces stabilize. Never expose unrestricted SQL/service-role access.

### Make / n8n

External automation/integration clients only. Core matching, provenance, private retrieval, and canonical profile writes remain in version-controlled FundMatch code.

### TypeScript / Python

Production agentic orchestration remains TypeScript-first. Introduce Python later only for ML/data workloads that materially benefit from it.

## Current repository status

### Complete / working demo

- Public homepage/product film.
- Founder/investor demo workspace.
- Discovery/search/filters and Pass / Save / Interested gestures.
- Deterministic explainable `MatchEngine`.
- Editable investor thesis.
- Company profiles/provenance/materials.
- Pipeline/saved shortlist.
- Guided founder profile/readiness flow.
- Investor packet preview/export/print.
- Literal demo document extraction/review.
- VC/PE readiness templates.
- Responsive/accessibility basics.
- Interactive fictional web/mobile wireframes.

### Authenticated foundation implemented

- Supabase Auth.
- Organizations and roles.
- Email-bound invitations.
- Organization-scoped persistence.
- Private document metadata/storage model.
- RLS/storage policies and backend security tests.
- Vercel/Nitro app hosting configuration.
- Latest production deployment serving the app; full acceptance scenarios still need completion/evidence.

### Agentic foundation implemented in repository

- Technology research for OpenAI Agents SDK, LangGraph, Claude tooling, Supabase vectors/queues, MCP, n8n, Make, and TypeScript/Python.
- Assembled agentic RAG architecture.
- Typed worker/task/result contracts.
- Bounded orchestration, retries, one-level delegation, and event hooks.
- Evidence validation/review escalation.
- Server-only structured model/embedding adapters.
- Migration for pgvector, pgmq, private RAG chunks/embeddings, semantic retrieval, and run/step audits.
- Automated runtime tests.

### Still not production-complete

- full Phase 5 browser acceptance;
- production eligibility/feed persistence/event-history loop;
- investor Interest → founder response workflow;
- live queue consumers;
- chunking/embedding of private documents;
- live agentic document/readiness/diligence workflows;
- semantic production candidate matching;
- full realtime/email notifications;
- real external integrations;
- SSO;
- billing;
- learned recommendation model.

# Roadmap phases

## Phase 1 — Product/demo foundation

**Status:** Complete enough for demo use.

**Done:** homepage, demo personas, discovery, pass/save/interested, profiles, pipeline, notes, and readiness templates.

## Phase 2 — Brand and context consolidation

**Status:** Complete.

**Done:** README, roadmap, brand docs/assets, agent guidance, and product-context consolidation.

## Phase 3 — Founder Readiness MVP

**Goal:** create single-sided founder value before marketplace liquidity.

**Status:** implemented in public demo and authenticated app code; production acceptance still applies.

**Done when in production:** a real founder can create a private profile, attach materials, see gaps, and generate a clean packet in an accepted deployed workspace.

## Phase 4 — Investor Sourcing MVP

**Goal:** make FundMatch useful to one investor team before a large two-sided network exists.

**Build:** thesis builder/confirmation, production candidate retrieval, deterministic ranking, explainable fit, team notes, persistent decisions/pipeline, manual company import.

**Status:** deterministic demo exists; production loop incomplete.

## Phase 5 — Authenticated deployment acceptance — ACTIVE GATE

**Goal:** prove `/app` is a real private workspace.

**Current state:**

- standalone FundMatch Supabase project exists and backend hardening/migrations through `0005` are applied;
- app hosting has moved to Vercel;
- latest production deployment is `READY`;
- direct fetch of `/app/login` returns HTTP 200 and FundMatch HTML rather than the prior Vercel Authentication/SSO interception.

**Still verify before acceptance:** signup/login/logout/password reset, organization creation, invitation/role flow, private document upload/download/delete, and cross-organization RLS/storage isolation through the actual deployed browser application.

**Done when:** two separate test organizations cannot read or mutate each other's private data and the production app works without demo/localStorage assumptions.

## Cross-cutting Foundation A — Agentic RAG runtime

**Goal:** establish the infrastructure that later Phase 8/9 intelligence features use without prematurely claiming those user-facing phases are complete.

**Build:** technology research, architecture, worker contracts, bounded orchestrator, validators, model/embedding adapters, pgvector/pgmq migration, private chunk/embedding schema, server-only semantic retrieval, agent run/step audit records.

**Status:** implemented and applied to the live FundMatch project. Migrations `0006`/`0007` are live; Phase 8 migrations `0008`/`0009` are also live. Product-specific queue consumers are Phase 8/9 work.

**Done when:** repository tests/builds pass, migration is live, extensions/queues exist, and no browser/client receives privileged retrieval access.

## Phase 6 — Production marketplace decisions + event history

**Goal:** convert demo discovery into durable marketplace behavior.

**Build:** production eligibility query, candidate retrieval, persistent Pass/Save/Interested, append-only discovery events, score/version metadata, resume behavior.

**Tech:** Postgres/RLS + server/domain matching layer.

**Status:** implementation complete on the Phase 6 branch; production acceptance pending. Discovery sessions, hard-eligibility retrieval, append-only marketplace events, score/version/rank audit metadata, atomic decision/reset RPCs, authenticated Discover cutover, profile-open/impression wiring, hosted migrations and database tests are implemented. The branch preview builds successfully. Phase 6 remains open until the signed-in investor flow is exercised end to end against production data.

See `docs/PHASE6_MARKETPLACE_EVENTS.md`.

**Done when:** every surfaced candidate/decision is auditable and the feed resumes predictably without duplicate/invalid candidates.

## Phase 7 — Interest and introduction workflow

**Goal:** move “Interested” into a safe founder/investor workflow.

**Build:** interest records, founder notification, Accept / Decline / Request more information, introduction threads, audit history.

**Tech:** Postgres/RLS + Realtime Broadcast + queue-backed email.

**Status:** not implemented.

**Done when:** interest reaches the correct founder organization, responses are permissioned/auditable, and contact info is not exposed automatically.

## Phase 8 — AI document processing + agentic readiness loop

**Goal:** turn private uploaded materials into reviewable sourced suggestions.

**Build:**

1. parse/chunk uploaded documents;
2. persist source locators/hashes;
3. enqueue/generate embeddings;
4. run `document` worker;
5. validate exact/source claims;
6. delegate `evidence` checks only when needed;
7. run `readiness` worker;
8. persist suggestions, never silent canonical overwrites;
9. founder accepts/corrects/rejects.

**Tech:** pgmq + Postgres/pgvector + server TypeScript worker + model adapter; OpenAI Agents SDK adapter may replace the initial direct model adapter once introduced cleanly.

**Status:** the document vertical slice is implemented in repository code; the phase is **not** complete.

Implemented (steps 1–9 above, for the supported formats):

- uploading a document starts a durable `agent_runs` record and enqueues pgmq work; repeated callbacks and redelivery converge on one active run;
- a server-only worker re-derives organization/company from canonical Postgres state, fetches the file with service-role Storage access, and enforces the document → organization → company relationship before any analysis;
- **supported for analysis: PDFs with selectable text and UTF-8 `.txt`.** Scanned PDFs, PPTX, DOCX, spreadsheets and images are stored privately but reported as not analyzed. There is no OCR;
- text becomes deterministic page-anchored chunks with stable locators and content hashes, so reprocessing cannot duplicate them;
- missing embeddings are queued in batches on the `embeddings` queue and written with model/dimension metadata;
- the `document` worker runs over only that document's authorized chunks, output passes the evidence validator, and the `evidence` worker is delegated only for a bounded follow-up;
- readiness analysis is **deterministic rules** over the anchored claims in this slice, not a model worker; it proposes `In progress`, never `Complete`, and never touches an item the founder already moved;
- proposals land in `profile_suggestions` with source locator, verbatim excerpt, confidence, rationale and the run that produced them, and the founder accepts, corrects or rejects each one through `resolve_profile_suggestion`;
- conflicting values for one field survive as competing proposals rather than being silently resolved;
- runs and steps are recorded in `agent_runs`/`agent_steps`; terminal failures (authorization, unsupported content, unreadable file) are never retried, transient failures are bounded and dead-lettered.

Not yet done in this phase:

- a model-backed `readiness` worker (the slice uses deterministic rules);
- deployment/acceptance of the scheduled operational drain: the repository now has a stable cron-authenticated HTTP route plus a daily 08:00 UTC Vercel Cron definition, but the production deployment still needs to be updated and exercised;
- live provider-backed end-to-end verification: production Supabase migrations `0006`–`0009` are applied and hardened, but the document loop still needs acceptance against the deployed app with a real provider key;
- formats beyond selectable-text PDF and UTF-8 text.

**Done when:** an uploaded private deck produces founder-reviewable suggestions and readiness updates with provenance, conflicts survive as conflicts, and failures are auditable/retryable — verified on the live project, not only in repository tests.

## Phase 9 — Semantic matching + agentic match intelligence

**Goal:** improve candidate recall beyond categorical labels and explain matches from evidence.

**Build:** company/thesis embeddings, versioned embedding pipeline, authorized semantic retrieval, combined deterministic + semantic ranking, `match` worker explanations, optional `diligence`/`evidence` checks.

**Tech:** pgvector + queue-backed embeddings + deterministic `MatchEngine` + agent runtime.

**Status:** vector/runtime foundation implemented; production matching augmentation not yet wired.

**Done when:** useful candidates missed by exact labels are surfaced without violating hard constraints, and explanations cite authorized source evidence.

## Phase 10 — Realtime and notification layer

**Goal:** make important marketplace state immediate.

**Build:** durable notifications + Realtime Broadcast + queued email fallback.

**First events:** new interest, founder response, document processing completed/failed, team pipeline update, new suggestion, agent run needs review.

**Status:** not implemented as a complete layer.

## Phase 11 — Real integrations + MCP surface

**Goal:** reduce manual entry and safely expose bounded FundMatch capabilities to external systems/AI hosts.

**Build:** first customer-owned data integrations; small MCP server exposing read/status/enqueue tools; optional Make/n8n scenarios consuming FundMatch APIs/MCP.

**Status:** not implemented.

**Done when:** at least one real source is connected with clear permissions/provenance/revocation and external automation cannot bypass FundMatch authorization.

## Phase 12 — Controlled market pilot

**Goal:** test whether a focused segment repeatedly uses and values FundMatch.

**Likely cohort:** founders + angels/small VC firms/accelerators.

**Measure founder side:** profile completion, readiness completion, packet generation, suggestion acceptance/correction, response to interest.

**Measure investor side:** profile open, save, interested, intro acceptance, meeting conversion, time-to-decision, usefulness of fit/diligence explanations.

**Measure marketplace:** eligible candidates per thesis, empty-feed rate, weak-fit feedback, response latency, progression to meeting/diligence.

**Done when:** real pilot users complete the loop and produce evidence around match quality, time saved, readiness improvement, or meeting conversion.

## Phase 13 — Billing/commercialization

**Goal:** charge for demonstrated value rather than speculative features.

**Tech:** Stripe.

**Status:** not implemented.

## Phase 14 — Learned recommendation system

**Goal:** improve ranking using accumulated marketplace outcomes.

Do not start until FundMatch has enough clean real events/outcomes to evaluate against the deterministic baseline.

Potential signals:

- profile open/save/interest behavior;
- intro acceptance;
- meeting conversion;
- diligence progression;
- funded/no-deal outcomes;
- explicit weak-fit feedback.

**Done when:** offline/online evaluation shows a learned model improves useful outcomes without destroying explainability, fairness, provenance, or hard mandate constraints.

## Mobile companion — post-validation, not launch blocker

Keep responsive web primary through pilot. After validation, consider React Native/Expo for discovery, notifications, quick replies, and messaging while reusing the same backend contracts.

## IP / public-repository boundary

Appropriate public material:

- fictional demo data;
- high-level product flow;
- interaction patterns;
- generic architecture boundaries;
- generic research and technology choices.

Keep private when commercially meaningful:

- production ranking weights/proprietary features;
- proprietary prompt content/model configuration;
- investor/company datasets;
- sourcing methods;
- outcome-training data;
- internal evaluation sets;
- credentials/service-role access.

Agent audit records store structured inputs/outputs, source IDs, validation outcomes, versions, and usage metadata where appropriate. They do not store hidden chain-of-thought.

## Rules future builders must preserve

1. Read this roadmap before adding architecture.
2. Preserve public-demo vs private-app boundaries.
3. Preserve RLS and server-only privileged credentials.
4. Apply hard eligibility before semantic/model ranking.
5. Do not silently promote AI output to canonical founder/investor facts.
6. Require provenance for material AI claims.
7. Keep agent delegation bounded and idempotent.
8. Use pgvector/pgmq before adding separate vector/streaming infrastructure.
9. Keep Make/n8n/MCP as bounded consumers of FundMatch services, not bypasses around them.
10. Update README/roadmap and acceptance evidence after meaningful implementation changes.
