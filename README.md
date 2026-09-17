# FundMatch

**Great companies. Right investors.**

FundMatch is an AI-assisted capital discovery and fundraising-readiness platform for startup teams and investment teams.

The simple surface is a modern discovery feed: investors can **Pass**, **Save**, or mark a company **Interested**. The serious product underneath is a structured profile, readiness, provenance, matching, diligence, workflow, and agentic intelligence system that turns messy founder and investor data into cleaner capital conversations.

> FundMatch is not just “Tinder for VC.” The swipe/feed interaction is the consumption layer. The core value is profile standardization, investment-thesis understanding, explainable matching, fundraising readiness, evidence-backed diligence, introductions, and learning from real outcomes.

## Product thesis

Private-market discovery is fragmented.

Founders repeatedly package the same story, deck, traction, metrics, and raise details for different investors. Investors review too many weak-fit companies across CRMs, email, pitch decks, warm introductions, public websites, databases, and notes.

FundMatch's core loop is:

```text
Connect data
→ Build profiles
→ Infer / confirm thesis
→ Retrieve eligible candidates
→ Score and explain fit
→ Surface opportunities
→ Pass / Save / Interested
→ Manage introductions and diligence
→ Learn from outcomes
```

## Who it is for

### Founders

FundMatch helps startup teams prepare a clear investor-facing profile, understand readiness gaps, standardize materials, and become discoverable to investors whose thesis actually fits.

> Tell your story once. Get ready to be discovered by investors who fit.

### Investors

FundMatch helps investment teams confirm an investment thesis, review standardized company cards, understand why a company fits, and move promising companies into pipeline and diligence.

> Find companies that match your thesis before your team wastes time on weak-fit deals.

## Architecture direction

FundMatch remains a **modular monolith backed by managed services**. The project deliberately avoids a premature microservice/search/streaming stack.

| Layer | Technology | Purpose |
| --- | --- | --- |
| Public site/demo | React + TanStack + Vite, GitHub Pages | Product story and fictional no-signup demo |
| Authenticated web app | React 19 + TanStack Start/Router + TypeScript | Founder and investor production workspace |
| Production host | Vercel + Nitro | Authenticated web/server runtime |
| System of record | Supabase Postgres | Profiles, theses, decisions, workflow, audit records |
| Auth / authorization | Supabase Auth + Row-Level Security | Identity and organization isolation |
| Private documents | Supabase Storage | Founder/investor materials |
| Durable background jobs | Supabase Queues (`pgmq`) | Agent runs, embeddings, later email/import work |
| Semantic retrieval | Postgres + `pgvector` | First-party RAG and thesis/company semantic recall |
| Initial model API | OpenAI Responses + Embeddings APIs | Structured extraction, analysis, embeddings |
| Agent runtime | FundMatch TypeScript contracts/orchestrator | Bounded workers, delegation, validation, audit hooks |
| Full agent SDK adapter | OpenAI Agents SDK, planned | Handoffs/tools/guardrails/tracing behind FundMatch interfaces |
| Durable workflow graph | LangGraph, when justified | Checkpoints, interrupts, resumable multi-step workflows |
| Interoperability | MCP, planned | Bounded FundMatch tools/resources for AI hosts |
| External automation | Make/n8n, optional | CRM, notifications, pilot integrations, operations |
| Billing | Stripe later | Commercialization |

Do **not** add Redis, Kafka, Elasticsearch/OpenSearch, Kubernetes, a separate vector database, or a microservice fleet until measured production load creates a problem the current stack cannot solve economically.

See [`docs/MATCHING_ARCHITECTURE.md`](docs/MATCHING_ARCHITECTURE.md) and [`docs/AGENTIC_RAG_ARCHITECTURE.md`](docs/AGENTIC_RAG_ARCHITECTURE.md).

## Agentic intelligence layer

FundMatch now has a version-controlled foundation for the technology pattern:

```text
LLM
+ authorized search/vector retrieval
+ workflow/orchestration
+ prompts
+ API calls
+ validation
+ controlled actions
```

The intelligence layer is server-side infrastructure, not a generic chatbot.

```text
product event / request
        ↓
FundMatch authorization + hard rules
        ↓
pgmq durable job
        ↓
authorized retrieval from Postgres + pgvector
        ↓
TypeScript orchestrator
        ↓
specialized worker(s)
        ↓
validation
        ↓
pass / retry / human review / fail
        ↓
canonical Postgres action + event
```

The first logical worker roles are:

- `document` — extract/organize sourced company claims;
- `thesis` — normalize investor-supplied thesis information;
- `match` — explain fit for already-eligible candidates;
- `readiness` — identify fundraising-readiness gaps;
- `diligence` — identify sourced inconsistencies/open questions;
- `evidence` — validate another worker's claims against supplied evidence.

Sub-agent delegation is intentionally bounded to one level in the initial runtime. FundMatch does not run an open-ended autonomous swarm.

### AI authority boundary

AI may propose, extract, normalize, summarize, compare, and flag. AI does **not** own:

- organization authorization or RLS;
- hard investor eligibility/exclusions;
- canonical company facts;
- private contact exposure;
- final human acceptance of material founder-profile changes;
- claims about probability of funding or investment advice.

The source-of-truth hierarchy is:

```text
source material
→ AI proposal / interpretation
→ validated + authorized human/system confirmation
→ canonical FundMatch state
```

## Agentic RAG database foundation

Migration `0006_agentic_rag_foundation.sql` introduces the production foundation for:

- `vector` / pgvector;
- `pgmq` queues;
- `agent_runs` and `agent_steps` audit records;
- private `document_chunks`;
- versioned `chunk_embeddings` using a 1536-dimension schema;
- a server-only semantic retrieval function;
- durable `agent_runs` and `embeddings` queues.

Private chunk text and vectors are server-only. Browser clients do not receive generic vector-search access.

## Queued document processing

Migration `0008_phase8_document_processing.sql` wires that foundation into the document lifecycle.

```text
private upload -> mark_document_uploaded
  -> start_document_run  (durable agent_runs row + pgmq message, idempotent)
  -> server worker       (service role; re-reads canonical state)
  -> page-anchored chunks + queued embeddings
  -> document agent over that document's chunks only
  -> evidence validation, bounded evidence follow-up when needed
  -> readiness rules
  -> profile_suggestions with source locator and excerpt
  -> founder accepts / corrects / rejects
  -> resolve_profile_suggestion writes the canonical fact
```

**Supported for analysis today:** PDFs with selectable text and UTF-8 `.txt`. PowerPoint, Word, spreadsheets, images and scanned PDFs are stored privately but reported as not analyzed — there is no OCR behind this.

Operational properties worth knowing:

- `agent_runs` is the durable ledger and pgmq is delivery, so a lost message, a skipped upload callback or a deployment without pgmq still converges through the sweeper;
- chunk rows are keyed by organization, locator and content hash, so reprocessing the same file is a no-op;
- the worker trusts no identifier from a queue payload: organization and company are re-read from `public.documents`;
- when no model key is configured the pipeline still runs, using the deterministic labelled-line reader, and records which method produced each proposal;
- authorization failures, unsupported content and unreadable files fail terminally rather than burning retries; transient failures are bounded and dead-lettered;
- a model proposal is never a company fact. `profile_suggestions` is the only promotion path, and it requires a human decision.

The drain is exposed as a cron-secret-authenticated server function (`FUNDMATCH_CRON_SECRET`); scheduling it in production is still outstanding.

## Matching model

FundMatch matching evolves in layers:

```text
Hard eligibility filters
→ deterministic rules baseline
→ semantic thesis/company similarity
→ business/diversity rules
→ evidence-backed explanation
→ behavioral/outcome learning later
```

The current `MatchEngine` remains the baseline. Semantic retrieval augments recall and explanation; it does not override hard constraints.

A FundMatch fit score is not a probability of investment and is not investment advice.

## Interest is a workflow, not an automatic dating-style match

FundMatch does not literally copy Tinder's mutual-like behavior.

```text
Investor marks Interested
→ founder receives a permissioned request
→ founder Accepts / Declines / Requests more information
→ accepted interest becomes an introduction thread
→ meeting / diligence / outcome events are tracked
```

Private contact information is not automatically exposed.

## Two products in one repository

| Surface | Routes | Purpose | Backend | Status |
| --- | --- | --- | --- | --- |
| Public demo | `/`, `/demo` | No-signup product story and fictional product demo | Browser storage only | Working |
| Authenticated app | `/app` | Real accounts, organizations, persistence, private documents | Supabase Auth/Postgres/RLS/Storage | Implemented; production acceptance still required |
| Wireframe prototype | `/wireframes` on Pages | Fictional/local UI review surface | None | Working |

The public demo and authenticated app remain logically separate. The Pages bundle must not contain production secrets or privileged backend code.

## What works today

### Public demo

- Homepage and product film.
- Founder/investor preview and no-signup demo workspaces.
- Company discovery, search, filters, Pass / Save / Interested, and horizontal gestures.
- Deterministic rules-based `MatchEngine` with explanations.
- Editable investor thesis.
- Company profiles, source transparency, materials, notes, pipeline, and saved shortlist.
- Guided founder profile builder and fundraising-readiness flow.
- Standardized investor packet with safe export/print flow.
- Literal PDF/text extraction and human review in the demo.
- Responsive/accessibility basics and interactive web/mobile wireframes.

### Authenticated app implemented in code

- Signup/login/logout/password recovery.
- Organizations and owner/admin/member roles.
- Email-bound invitations.
- Organization-scoped persistence.
- Guided founder builder and investor packet.
- Private document metadata/storage model, authorized download/delete behavior, and RLS policies.
- Vercel/Nitro deployment configuration with Supabase as backend.

### Agentic intelligence foundation implemented in code

- Framework-neutral TypeScript worker/task/result contracts.
- Bounded orchestration with retries and one-level delegation.
- Evidence validation that rejects citations outside the authorized task evidence.
- Review escalation for conflicting/low-confidence claims.
- Server-only structured OpenAI worker adapter.
- Server-only OpenAI embedding adapter pinned to the agentic-v1 1536-dimension contract.
- Version-controlled pgvector/pgmq/audit/retrieval migration.
- Technology research and assembled architecture docs.

This foundation does **not** mean every AI workflow is production-wired yet.

## What is still not production-real

Do not present these as live customer capabilities yet:

- completed Phase 5 authenticated browser acceptance;
- the document pipeline verified against the live FundMatch project: migrations `0006`–`0008` still need to be applied there, and the loop has not been exercised end to end with a real provider key;
- a scheduled production drain (the worker entry point exists; nothing schedules it yet);
- analysis of scanned PDFs, PowerPoint, Word, spreadsheets or images — no OCR exists;
- a model-backed readiness worker (readiness proposals are deterministic rules today);
- production semantic candidate matching;
- live investor-interest/founder-response workflow;
- transactional email;
- full realtime marketplace notification layer;
- real CRM/data-provider integrations;
- licensed private-market data ingestion;
- outcome-trained recommendation models;
- production billing;
- SSO.

The `/demo` workspace is fictional browser data. Never put confidential fundraising materials, financial data, or credentials into it.

## Marketplace event model

FundMatch preserves current state and will add append-only event history for meaningful marketplace behavior:

- candidate impression;
- profile opened;
- passed;
- saved;
- interested;
- intro requested / accepted / declined;
- meeting scheduled;
- diligence started;
- funded / no-deal;
- readiness changed.

That history is eventually used to improve recommendation quality against real outcomes instead of optimizing only for clicks/swipes.

## Research behind the agentic stack

Each technology was researched separately before assembly:

- [`docs/research/agentic-rag/OPENAI_AGENTS_SDK.md`](docs/research/agentic-rag/OPENAI_AGENTS_SDK.md)
- [`docs/research/agentic-rag/LANGGRAPH.md`](docs/research/agentic-rag/LANGGRAPH.md)
- [`docs/research/agentic-rag/CLAUDE_TOOLING.md`](docs/research/agentic-rag/CLAUDE_TOOLING.md)
- [`docs/research/agentic-rag/SUPABASE_PGVECTOR_PGMQ.md`](docs/research/agentic-rag/SUPABASE_PGVECTOR_PGMQ.md)
- [`docs/research/agentic-rag/MCP.md`](docs/research/agentic-rag/MCP.md)
- [`docs/research/agentic-rag/N8N.md`](docs/research/agentic-rag/N8N.md)
- [`docs/research/agentic-rag/MAKE.md`](docs/research/agentic-rag/MAKE.md)
- [`docs/research/agentic-rag/TYPESCRIPT_PYTHON.md`](docs/research/agentic-rag/TYPESCRIPT_PYTHON.md)

See the research index at [`docs/research/agentic-rag/README.md`](docs/research/agentic-rag/README.md).

## Run locally

Node 22.12+ and Bun 1.4.2 are expected.

```sh
bun install --frozen-lockfile
bun run dev
```

Useful commands:

```sh
bun run build
bun run typecheck
bun test
bun run build:pages
bun run lint
```

The authenticated app needs the Supabase values from `.env.example`. Agentic model/embedding work additionally requires server-only `OPENAI_API_KEY` and an explicitly configured `FUNDMATCH_AGENT_MODEL`.

## Production deployment

The authenticated application is hosted on Vercel using TanStack Start + Nitro. Supabase remains the backend for Auth/Postgres/RLS/Storage.

See [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md).

The static product demo can continue to use GitHub Pages:

`https://wglewis0721.github.io/fundmatch/`

A successful Vercel deployment alone is not Phase 5 acceptance. Signup/login, organization creation, invitations, private document operations, and cross-organization isolation still need browser-level acceptance evidence.

## Security / IP boundary

Public material may include fictional demo data, interaction patterns, high-level architecture, and generic explanations.

Keep private once commercially meaningful:

- ranking weights and proprietary features;
- production prompts/model configuration;
- investor/company proprietary datasets;
- sourcing methods;
- outcome-training data;
- service-role/database credentials;
- internal data that creates a competitive advantage.

Agent runs should store structured summaries and audit metadata, not hidden chain-of-thought.

## Current documentation

- [`ROADMAP.md`](ROADMAP.md) — product and implementation source of truth.
- [`docs/AGENTIC_RAG_ARCHITECTURE.md`](docs/AGENTIC_RAG_ARCHITECTURE.md) — assembled agentic runtime architecture.
- [`docs/DOCUMENT_PROCESSING.md`](docs/DOCUMENT_PROCESSING.md) — running and triaging the queued document pipeline.
- [`docs/research/agentic-rag/README.md`](docs/research/agentic-rag/README.md) — technology research index.
- [`docs/MATCHING_ARCHITECTURE.md`](docs/MATCHING_ARCHITECTURE.md) — recommendation architecture and scale strategy.
- [`docs/IMPLEMENTATION_NEXT_STEPS.md`](docs/IMPLEMENTATION_NEXT_STEPS.md) — build sequence toward pilot.
- [`docs/BACKEND.md`](docs/BACKEND.md) — Supabase/RLS/private-document backend.
- [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) — authenticated deployment.
- [`docs/ASTRA_INTERFACE.md`](docs/ASTRA_INTERFACE.md) — prior document-processing interface and worker boundaries.
- [`docs/FOUNDER_READINESS.md`](docs/FOUNDER_READINESS.md) — readiness implementation.
- [`docs/TEST_EVIDENCE.md`](docs/TEST_EVIDENCE.md) — backend/security evidence.
- [`docs/brand/BRAND.md`](docs/brand/BRAND.md) — positioning and brand system.

## Best next product move

The new intelligence foundation does not replace the ordered marketplace work.

```text
1. Complete authenticated deployment acceptance
2. Production candidate retrieval + persistent decisions/event history
3. Investor interest → founder response workflow
4. Wire agent_runs/embeddings queue consumers
5. Chunk + embed private documents with provenance
6. Run document/readiness workers with validation + human review
7. Add semantic matching augmentation with pgvector
8. Add realtime/email notification layer
9. Controlled founder / angel / small-VC pilot
10. Learn from real marketplace outcomes before training a learned ranker
```

Do not redesign the interface again before proving the private marketplace and intelligence loops.
