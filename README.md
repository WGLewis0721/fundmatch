# FundMatch

**Great companies. Right investors.**

FundMatch is an AI-assisted capital discovery and fundraising-readiness platform for startup teams and investment teams.

The simple surface is a modern discovery feed: investors can **Pass**, **Save**, or mark a company **Interested**. The serious product underneath is a structured profile, readiness, provenance, matching and workflow system that turns messy founder and investor data into cleaner capital conversations.

> FundMatch is not just “Tinder for VC.” The swipe/feed interaction is the consumption layer. The core value is profile standardization, investment-thesis understanding, explainable matching, fundraising readiness, diligence workflow, and learning from real outcomes.

The interface uses a 60/30/10 off-white, sage and periwinkle identity with original editorial artwork and a shared founder/investor workspace.

## Product thesis

Private-market discovery is fragmented.

Founders repeatedly package the same story, deck, traction, metrics and raise details for different investors. Investors review too many weak-fit companies across CRMs, email, pitch decks, warm introductions, public websites, databases and notes.

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

FundMatch helps startup teams prepare a clear investor-facing profile, understand readiness gaps, standardize materials and become discoverable to investors whose thesis actually fits.

Founder promise:

> Tell your story once. Get ready to be discovered by investors who fit.

### Investors

FundMatch helps investment teams confirm an investment thesis, review standardized company cards, understand why a company fits, and move promising companies into pipeline and diligence.

Investor promise:

> Find companies that match your thesis before your team wastes time on weak-fit deals.

## Architecture direction

The current stack is intentionally a **modular monolith**, not a premature microservice platform.

### Current foundation

| Layer | Technology | Purpose |
| --- | --- | --- |
| Public site/demo | React + TanStack + Vite, GitHub Pages | Product story and fictional no-signup demo |
| Authenticated web app | React 19 + TanStack Start/Router + TypeScript | Founder and investor production workspace |
| App hosting | Cloudflare Workers/Nitro target | Authenticated web delivery |
| System of record | Supabase Postgres | Profiles, theses, decisions, pipeline, workflow |
| Auth / authorization | Supabase Auth + Row-Level Security | Identity and organization isolation |
| Private documents | Supabase Storage | Founder/investor materials |
| Realtime | Supabase Realtime Broadcast | Interest, workflow and processing updates |
| Background jobs | Supabase Queues (`pgmq`) | AI extraction, embeddings, email and imports |
| Privileged compute | Supabase Edge Functions / server workers | Service-role operations and external APIs |
| Semantic retrieval | Postgres + `pgvector` | Thesis/company semantic candidate recall |
| Billing | Stripe later | Commercialization |

This direction borrows the **candidate retrieval → ranking → decision → outcome feedback** structure used by mature recommendation products while keeping the deployment complexity appropriate for an early marketplace.

Do **not** add Redis, Kafka, Elasticsearch/OpenSearch, Kubernetes or a microservice fleet until measured production load justifies them. See [`docs/MATCHING_ARCHITECTURE.md`](docs/MATCHING_ARCHITECTURE.md).

## Matching model

FundMatch matching should evolve in layers:

```text
Hard eligibility filters
→ deterministic rules baseline
→ semantic thesis/company similarity
→ business/diversity rules
→ explainable result
→ behavioral/outcome learning later
```

The current `MatchEngine` remains the baseline. It scores sector, stage, geography, funding ask/check-range approximation, growth and business model, with penalties for exclusions.

That score is not a probability of investment and is not investment advice.

Production ranking weights, prompts, model parameters and proprietary feature engineering should remain server-side/private once they become a competitive advantage.

## Interest is a workflow, not an automatic dating-style match

FundMatch should not literally copy Tinder's mutual-like behavior.

Recommended flow:

```text
Investor marks Interested
→ founder receives a permissioned request
→ founder Accepts / Declines / Requests more information
→ accepted interest becomes an introduction thread
→ meeting / diligence / outcome events are tracked
```

This creates the marketplace loop FundMatch needs without automatically exposing private contact information.

## Two products in one repository

| Surface | Routes | Purpose | Backend | Status |
| --- | --- | --- | --- | --- |
| Public demo | `/`, `/demo` | No-signup product story, founder/investor demo and product film | Browser storage only | Working demo |
| Authenticated app | `/app` | Real accounts, organizations, persistence and private documents | Supabase Auth, Postgres/RLS, Storage | Implemented in code; deployment acceptance required |

The public demo and authenticated app are intentionally separate. Keep GitHub Pages pointed at the demo build only. The Pages bundle must not contain production secrets or privileged backend code.

## What works today

### Public demo

- Home page and full-screen product film player.
- Founder/investor preview in the hero.
- No-signup founder and investor demo workspaces.
- Company discovery with search, filters and **Pass / Save / Interested** actions.
- Horizontal decision gestures and keyboard alternatives.
- Deterministic rules-based `MatchEngine` with explanations.
- Editable investor thesis and ranked insights.
- Company profiles, source transparency, supporting-material links and review notes.
- Pipeline stages and saved shortlist.
- Three-step founder profile builder for Dippi and Soapbox Caddie.
- Missing-profile/material indicators connected to preparation workflow.
- Standardized investor packet with checklist status, source labels, selected external links, HTML download and print/save-PDF.
- Literal PDF/text extraction and human review under Build from deck (in-memory demo, not live AI).
- Fundraising Readiness templates for VC and PE preparation.
- Local persistence with schema validation and reset.
- Responsive layouts, focus states, dialogs and empty states.

### Authenticated app implemented in code

- Signup, login, logout and password recovery.
- Organization creation and roles: owner, admin, member.
- Email-bound invitations.
- Server-side persistence for company profiles, metrics, theses, decisions, pipeline stages, team notes, materials and readiness checklists.
- Guided founder builder and investor packet backed by the authenticated data layer.
- Private document upload model with validation, authorized downloads and deletion.
- Supabase RLS policies scoped to authorized organizations.

See [`docs/BACKEND.md`](docs/BACKEND.md).

## What is still not production-real

Do **not** present these as live features yet:

- Completed authenticated production deployment acceptance.
- Live AI extraction from uploaded documents.
- Live LLM summaries and semantic production matching.
- Real investor introductions or founder acceptance workflow.
- Investor/founder messaging.
- Transactional email delivery.
- Real Affinity, PitchBook, DocSend, Stripe, HubSpot, Google or Microsoft integrations.
- Licensed market-data ingestion.
- Secure data-room workflows beyond the private-document foundation.
- Outcome-trained recommendation models.
- Production billing.
- SSO.

The `/demo` workspace is fictional browser data. Do not put confidential documents, financial data, credentials or real fundraising material into the public demo.

## Marketplace event model

FundMatch should eventually preserve both **current state** and **event history**.

Examples of events worth retaining:

- candidate impression
- profile opened
- passed
- saved
- interested
- intro requested / accepted / declined
- meeting scheduled
- diligence started
- funded / no-deal
- readiness changed

That history is what eventually lets FundMatch learn which recommendations actually create useful conversations rather than optimizing only for swipes.

## AI role

FundMatch is mostly conventional software with an AI intelligence layer.

AI should help with:

- company profile generation and normalization
- deck/document summarization
- investment-thesis inference
- embeddings / semantic retrieval
- match-ranking augmentation
- “why this fits” explanations
- strengths, risks and open questions
- readiness suggestions
- profile suggestions that humans accept or reject

AI should **not** silently overwrite founder profiles, invent traction, invent investor preferences, bypass hard eligibility constraints, or turn an LLM score into a claim about funding probability.

Important claims need provenance and human confirmation.

See [`docs/ASTRA_INTERFACE.md`](docs/ASTRA_INTERFACE.md).

## Fundraising readiness

A major single-sided value proposition is helping founders know whether they have their ducks in a row before raising.

Readiness covers:

- company basics
- pitch deck
- team/founder background
- market/problem clarity
- business model and pricing
- traction and customer proof
- financials and revenue evidence
- legal/corporate basics
- fundraising ask and use of funds
- investor materials/data-room preparation
- risks and open questions

The early version does not need to perfectly analyze every document. It creates value by collecting the right materials, showing what is missing, and standardizing the company into a clean FundMatch investor packet.

## Product examples

FundMatch uses fictional startups to demonstrate the workflow:

- **Dippi** — on-demand liquor delivery connecting local stores and consumers.
- **Soapbox Caddie** — pickup-and-delivery laundry service for busy households.

These are demo examples, not real fundraising opportunities.

## Run locally

Node 22.12+ and Bun 1.4.2 are expected.

```sh
bun install --frozen-lockfile
bun run dev
```

Useful commands:

```sh
bun run build       # full TanStack Start/Nitro app including /app
bun run typecheck
bun test
bun run build:pages # static GitHub Pages build in dist/
bun run lint
```

The authenticated app at `/app` needs the Supabase values from `.env.example`. Without them, it should show a backend-not-configured screen instead of failing.

## Deploy the public demo with GitHub Pages

The workflow `.github/workflows/pages.yml` builds and deploys the static Pages output.

Expected public demo URL:

`https://wglewis0721.github.io/fundmatch/`

The Pages build handles the `/fundmatch/` base path and emits a real `/demo/index.html` so direct links and refreshes work.

## Security / IP boundary

The public demo should show enough to understand FundMatch without exposing the future moat.

Public is appropriate for:

- marketing copy
- fictional demo companies
- interaction patterns
- high-level architecture
- screenshots / product film
- generic explanation of fit

Keep private once commercially meaningful:

- production source code
- ranking weights and proprietary feature engineering
- prompts/model configuration
- investor/company proprietary datasets
- sourcing methods
- outcome-training data
- internal roadmap details that create competitive advantage
- production credentials and service-role access

## Current documentation

- [`ROADMAP.md`](ROADMAP.md) — product and implementation source of truth.
- [`docs/MATCHING_ARCHITECTURE.md`](docs/MATCHING_ARCHITECTURE.md) — discovery/recommendation architecture and scale strategy.
- [`docs/IMPLEMENTATION_NEXT_STEPS.md`](docs/IMPLEMENTATION_NEXT_STEPS.md) — executable sequence from current build to controlled pilot.
- [`docs/BACKEND.md`](docs/BACKEND.md) — authenticated app, Supabase setup, RLS, private documents and deployment.
- [`docs/ASTRA_INTERFACE.md`](docs/ASTRA_INTERFACE.md) — upload processing, profile suggestions, readiness suggestions and AI worker boundaries.
- [`docs/FOUNDER_READINESS.md`](docs/FOUNDER_READINESS.md) — founder-readiness implementation and acceptance gap.
- [`docs/TEST_EVIDENCE.md`](docs/TEST_EVIDENCE.md) — backend testing/security evidence.
- [`docs/brand/BRAND.md`](docs/brand/BRAND.md) — positioning, tokens, graphics and copy rules.
- [`docs/brand/ASSET_MANIFEST.md`](docs/brand/ASSET_MANIFEST.md) — graphics/source index.

## Best next product move

Do **not** redesign the interface again before proving the private marketplace loop.

The next order is:

```text
1. Complete authenticated deployment acceptance
2. Production candidate retrieval + persistent decisions
3. Investor interest → founder response workflow
4. Append-only discovery/outcome events
5. Queued AI document processing
6. Semantic matching augmentation with pgvector
7. Realtime + email notifications
8. Controlled founder / angel / small-VC pilot
```

See [`docs/IMPLEMENTATION_NEXT_STEPS.md`](docs/IMPLEMENTATION_NEXT_STEPS.md) before starting the next implementation phase.
