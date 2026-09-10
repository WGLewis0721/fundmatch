# FundMatch Roadmap

This document is the product and implementation source of truth for FundMatch. Read it before starting new product work and update it after meaningful changes.

## Product definition

FundMatch is an AI-assisted capital discovery and fundraising-readiness platform for startup founders and investment teams.

It helps founders package their company once, understand readiness gaps and become discoverable to investors who fit. It helps investors review cleaner company profiles, confirm thesis fit, understand why a company is relevant, and move promising companies into an introduction/diligence workflow.

## Serious positioning

**AI-assisted deal discovery and matching for founders and investment teams.**

Do not reduce FundMatch to “Tinder for VC.” The feed/swipe interaction is a useful discovery surface. The deeper product is structured company/investor data, candidate retrieval, explainable ranking, provenance, readiness, introductions, diligence and outcome learning.

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
6. Support diligence workflow: materials, notes, statuses and collaboration.
7. Keep AI-generated edits reviewable by the human/company that owns the profile.
8. Build a deterministic rules baseline before relying on ML ranking.
9. Capture marketplace outcomes so future ranking can learn from useful conversations, not just clicks.
10. Avoid unlicensed proprietary private-market data.
11. Keep the public demo clearly separated from production/private data.
12. Do not add large-scale infrastructure before measured demand justifies it.

## Canonical user flows

### Founder flow

1. Create or claim company profile.
2. Enter/import company basics, traction, raise details and materials.
3. Upload or link pitch deck and supporting documents.
4. Receive AI-assisted profile suggestions with provenance.
5. Accept or reject suggestions.
6. See fundraising-readiness checklist and gaps.
7. Generate a standardized FundMatch investor packet/profile.
8. Become discoverable to eligible investors.
9. Receive investor interest requests.
10. Review investor/firm context and Accept / Decline / Request more information.
11. Track introductions, meetings, diligence and outcomes.

### Investor flow

1. Create firm profile.
2. Enter thesis or import permitted firm/deal data.
3. Confirm inferred investment preferences and exclusions.
4. Browse ranked company cards.
5. Pass, Save or mark Interested.
6. Send a permissioned interest request rather than exposing private founder contact details automatically.
7. Move accepted opportunities through pipeline.
8. Add team notes and diligence questions.
9. Review provenance/materials before meetings.
10. Record outcomes to improve future ranking.

## Architecture decision

FundMatch should remain a **modular monolith backed by managed services** until scale proves otherwise.

The useful lesson from Tinder/Hinge-style systems is the recommendation pipeline boundary — candidate retrieval, ranking, decision, workflow and feedback — not their mature-company deployment complexity.

See [`docs/MATCHING_ARCHITECTURE.md`](docs/MATCHING_ARCHITECTURE.md) for the full decision record.

## Current / target architecture

### 1. Public demo

**Purpose:** show the product story and interaction model without signup.

**Routes:** `/`, `/demo`

**Tech:** React/TanStack/Vite static Pages build, fictional browser data/local storage.

**Status:** Working.

**Constraint:** no real backend, confidential documents, real investors or production AI.

### 2. Authenticated app

**Purpose:** real users, organizations, persistence, private documents and marketplace workflows.

**Route:** `/app`

**Tech:** React 19 + TanStack Start/Router + TypeScript; Supabase Auth/Postgres/RLS/Storage; Drizzle migrations.

**Deployment:** Cloudflare Workers/Nitro target for the authenticated web application.

**Status:** Implemented in code; production deployment acceptance pending.

### 3. System of record and authorization

**Tech:** Supabase Postgres + Row-Level Security + private Storage.

**Status:** Implemented in migrations and documented in `docs/BACKEND.md`.

**Constraint:** service-role credentials never reach browser code.

### 4. Production discovery pipeline

**Purpose:** retrieve eligible companies, rank them, explain the result and persist investor decisions.

**Tech now:** Postgres relational filters/indexes + existing deterministic MatchEngine.

**Target augmentation:** `pgvector` semantic thesis/company similarity after deterministic production matching works.

**Status:** deterministic demo exists; production candidate retrieval/ranking loop incomplete.

**Pipeline:**

```text
Eligibility filters
→ candidate retrieval
→ deterministic score
→ optional semantic augmentation
→ business/diversity rules
→ explanation
→ Pass / Save / Interested
```

### 5. Marketplace event history

**Purpose:** retain behavioral and outcome history separately from current state.

**Recommended tech:** append-only Postgres event table(s).

**Initial events:** impression, profile open, pass, save, interested, intro requested/accepted/declined, meeting, diligence, funded/no-deal.

**Status:** current state/activity concepts exist; full discovery/outcome event model not complete.

### 6. Realtime

**Purpose:** deliver important workflow changes without refresh.

**Tech decision:** Supabase Realtime **Broadcast** for new interest, founder response, team pipeline changes, document processing and suggestion availability.

**Status:** not yet wired as the production marketplace notification layer.

**Constraint:** Postgres remains source of truth; realtime is delivery.

### 7. Background jobs / AI worker

**Purpose:** durable document extraction, embeddings, match recomputation, email and integration jobs.

**Tech decision:** Supabase Queues (`pgmq`) + server-side worker/Edge Function. Supabase Edge Functions are the preferred first privileged runtime because they sit beside Auth/Postgres/Storage; Cloudflare Workers may call the same server interfaces where appropriate.

**Status:** database/Astra interfaces exist; durable queue worker is not implemented.

**Constraint:** privileged operations require service-role access server-side only. Jobs must be retryable/idempotent.

### 8. Semantic retrieval

**Purpose:** find companies whose meaning fits a thesis even when exact labels differ.

**Tech decision:** Postgres + `pgvector`; normal SQL remains responsible for hard eligibility filters.

**Status:** not implemented.

**Constraint:** semantic similarity augments ranking; it does not override explicit exclusions or hard mandate constraints.

### 9. Introductions and transactional email

**Purpose:** move interest into a permissioned conversation.

**Workflow:** investor Interested → founder notified → Accept / Decline / Request more information → accepted introduction thread.

**Tech:** Postgres workflow records + queue + server-side email provider. Preferred first email provider: Resend, unless deployment requirements change.

**Status:** not implemented.

### 10. Integrations

**Purpose:** import permitted customer-owned data.

**Potential sources:** company websites, decks, Google/Microsoft files, Stripe/revenue systems, DocSend-style links, CRM, investor CRM, licensed market-data vendors.

**Tech:** server-side OAuth/integration workers + queues per provider.

**Status:** demo/mocked only.

**Constraint:** do not scrape or redistribute proprietary private-market datasets without permission/license.

### 11. Billing

**Purpose:** commercialize FundMatch after pilot value is proven.

**Potential models:** founder readiness subscription, investor seats, firm pilot package, workflow/data license.

**Tech decision:** Stripe when billing begins.

**Status:** not implemented.

### 12. Search/cache/service decomposition — later only

Do not add these as roadmap vanity milestones:

- Redis
- Elasticsearch/OpenSearch
- Kafka
- Kubernetes
- large microservice fleet

Add dedicated search when Postgres/full-text/pgvector misses measured retrieval latency or throughput targets. Add Redis when hot-read/recommendation caching meaningfully reduces database load. Add event streaming when event volume and independent consumers exceed Postgres event tables + queues. Split services when independent deployment/ownership/scale requires it.

## Current repository status

### Complete / working demo

- Public homepage and product film.
- Investor/founder hero preview.
- Public `/demo` founder/investor workspace.
- Company discovery, search and filters.
- Pass / Save / Interested actions and horizontal gestures.
- Rules-based MatchEngine with explainable scores.
- Editable investor thesis.
- Company profiles and provenance sections.
- Pipeline stages and saved shortlist.
- Guided founder profile editing for Dippi and Soapbox Caddie.
- Profile essentials and missing-material indicators.
- Investor packet preview, selected-link HTML export and print/save-PDF.
- Literal PDF/text extraction and review in the demo (component memory only; no live AI).
- VC/PE readiness templates.
- Local persistence/reset.
- Responsive UI/accessibility basics.

### Implemented but needs production acceptance

- Authenticated app under `/app`.
- Supabase Auth flow.
- Organizations and roles.
- Email-bound invitations.
- Organization-scoped persistence.
- Private document metadata/storage model.
- RLS/storage policies.
- Backend deployment docs.

### Not implemented / production gap

- Accepted production deployment of `/app`.
- Production candidate retrieval/ranking loop.
- Append-only discovery/outcome event model.
- Investor interest → founder response workflow.
- Live AI extraction/LLM summaries.
- Queue-backed worker runtime.
- Semantic `pgvector` matching.
- Realtime marketplace notifications.
- Transactional email delivery.
- Real CRM/data integrations.
- SSO.
- Licensed private-market data ingestion.
- Billing.
- Outcome-trained recommendation models.

# Roadmap phases

## Phase 1 — Product/demo foundation

**Goal:** make FundMatch understandable and demonstrable without signup.

**Status:** Complete enough for demo use.

**Done:** homepage, demo personas, discovery, pass/save/interested, profiles, pipeline, notes and readiness templates.

## Phase 2 — Brand and context consolidation

**Goal:** preserve product context, visual direction and AI handoff material.

**Status:** Complete.

**Done:** README, roadmap, brand docs, graphics, asset manifest and agent guidance.

## Phase 3 — Founder Readiness MVP

**Goal:** create single-sided founder value before relying on marketplace liquidity.

**Status:** Implemented in public demo and authenticated app code; production acceptance pending.

**Delivered:** guided profile builder, readiness/material gaps and standardized investor packet.

**Done when in production:** a real founder can create a private profile, attach materials, see gaps and generate a clean packet in an accepted deployed workspace.

## Phase 4 — Investor Sourcing MVP

**Goal:** make FundMatch useful to one investor team before a large two-sided network exists.

**Build:** thesis builder/confirmation, production candidate retrieval, deterministic ranking, explainable fit, team notes, persistent decisions/pipeline and manual company import.

**Tech:** Supabase Postgres/RLS + existing rules engine. Add `pgvector` only after deterministic production matching works.

**Status:** deterministic demo exists; production loop incomplete.

**Done when:** an investor can log in, define a thesis, review ranked real test/pilot companies, take persistent decisions and resume later without duplicate/invalid candidates.

## Phase 5 — Authenticated deployment acceptance — NEXT

**Goal:** prove `/app` is a real private workspace.

**Build/verify:** configure intended FundMatch Supabase project, deploy authenticated app, run signup/login/org creation/invitation/document upload/download/delete and verify RLS/private storage behavior.

**Tech:** Supabase + Cloudflare Workers/Nitro.

**Status:** code exists; acceptance pending. GPT-5.6 Sol rejected the 2026-09-10 gate (live schema/RLS/storage/deployment blockers); a same-day Sonnet 5 continuation session could not close those blockers because it had no credentialed access to the live FundMatch Supabase project or to any deployment platform — see `docs/ai-prompts/SONNET5_PHASE5_BLOCKED_2026-09-10.md`. Repository-side code health (migrations apply cleanly locally, full test suite, typecheck, both builds) was reconfirmed; no live-backend or deployment work could be attempted.

**Done when:** two separate test organizations cannot read or mutate each other's private data and the production app works without demo/localStorage assumptions.

## Phase 6 — Production marketplace decisions + event history

**Goal:** convert the demo discovery loop into durable marketplace behavior.

**Build:** production eligibility query, candidate retrieval, persistent Pass/Save/Interested, append-only discovery events, score/version metadata and resume behavior.

**Tech:** Postgres/RLS + server/domain matching layer.

**Status:** not complete.

**Done when:** every surfaced candidate and decision is auditable and the feed can resume predictably across sessions.

## Phase 7 — Interest and introduction workflow

**Goal:** move “Interested” into a safe founder/investor workflow.

**Build:** interest records, founder notification, Accept / Decline / Request more information, introduction threads, audit history.

**Tech:** Postgres/RLS + Realtime Broadcast + queue-backed transactional email.

**Status:** not implemented.

**Done when:** investor interest reaches the correct founder organization, founder response is permissioned/auditable, and contact information is not exposed automatically.

## Phase 8 — AI document processing loop

**Goal:** turn private uploaded materials into reviewable sourced suggestions.

**Build:** queue uploaded documents, process them in a privileged worker, extract structured fields, write profile/readiness suggestions, preserve provenance and report failures.

**Tech:** Supabase Queues + Edge Function/worker + service role server-side only + chosen LLM/extraction provider.

**Status:** interface documented; live queue worker not implemented.

**Done when:** an uploaded private deck produces founder-reviewable suggestions and readiness updates without silently overwriting company claims.

## Phase 9 — Semantic matching augmentation

**Goal:** improve candidate recall beyond exact categorical labels.

**Build:** company/thesis embeddings, versioned embedding pipeline, semantic candidate similarity and combined explanations.

**Tech:** `pgvector` + queue-backed embedding generation.

**Status:** not implemented.

**Done when:** semantic augmentation demonstrably surfaces useful candidates missed by exact labels while hard eligibility/exclusions remain authoritative.

## Phase 10 — Realtime and notification layer

**Goal:** make important marketplace state feel immediate.

**Build:** durable notifications + Realtime Broadcast + queued email fallback.

**First events:** new interest, founder response, document processing completed/failed, team pipeline update, new suggestion.

**Status:** not implemented as a complete layer.

**Done when:** users see important changes without manual refresh and offline users receive controlled transactional email.

## Phase 11 — Real integrations

**Goal:** reduce manual entry using permitted customer-owned sources.

**Build:** first one or two integrations, likely founder-owned documents/files first, then investor CRM/calendar later.

**Status:** not implemented.

**Done when:** one real source can be connected/imported with clear permissions, provenance and revocation behavior.

## Phase 12 — Controlled market pilot

**Goal:** test whether a focused segment repeatedly uses and values FundMatch.

**Likely cohort:** founders + angels/small VC firms/accelerators rather than a broad marketplace launch.

**Measure founder side:** profile completion, readiness completion, packet generation, response to investor interest.

**Measure investor side:** profile open, save, interested, intro acceptance, meeting conversion and time-to-decision.

**Measure marketplace:** eligible candidates per thesis, empty-feed rate, weak-fit feedback, response latency and progression to meeting/diligence.

**Done when:** real pilot users complete the loop and provide evidence around match quality, time saved, readiness improvement or meeting conversion.

## Phase 13 — Billing/commercialization

**Goal:** charge for demonstrated value rather than speculative features.

**Tech:** Stripe.

**Status:** not implemented.

**Done when:** a validated pilot offer can be purchased and provisioned reliably.

## Phase 14 — Learned recommendation system

**Goal:** improve ranking using accumulated marketplace outcomes.

Do not start until FundMatch has enough clean real events/outcomes to train/evaluate against the deterministic baseline.

Potential signals:

- profile open/save/interest behavior
- intro acceptance
- meeting conversion
- diligence progression
- funded/no-deal outcomes
- explicit weak-fit feedback

**Done when:** an offline/online evaluation shows a learned model improves useful outcomes without destroying explainability, fairness or hard mandate constraints.

## Mobile companion — post-validation, not launch blocker

Dating products are mobile-first, but FundMatch includes diligence, document preparation and team pipeline work that benefits from desktop/web.

Keep responsive web primary through pilot. After validation, consider React Native/Expo for discovery, notifications, quick replies and messaging while reusing the same backend contracts.

## IP / public-repository boundary

The public product may describe architecture at a high level, but do not publish the future secret sauce.

Appropriate public material:

- fictional demo data
- high-level product flow
- interaction patterns
- generic architecture boundaries

Keep private when commercially meaningful:

- production source code
- ranking weights / proprietary features
- prompts/model configuration
- proprietary sourcing methods
- private investor/company datasets
- behavioral/outcome training data
- production credentials

Before external pilots, prefer a private core repository or public-demo/private-core split.

## Visual identity milestone — September 2026

**Status:** implemented.

- 60/30/10 off-white, sage and periwinkle hierarchy.
- Original editorial imagery and typography.
- Product-led homepage preview.
- Shared investor/founder workspace styling.
- Responsive/focus/reduced-motion support.
- Discovery cards with Pass/Save/Interested interactions.

Visual refinement is no longer the highest-priority work. Do not redesign the interface again before proving the production marketplace loop unless usability testing reveals a real problem.

## Recommended execution order

```text
1. Phase 5  — authenticated deployment acceptance
2. Phase 4  — production investor sourcing loop
3. Phase 6  — durable decisions + discovery event history
4. Phase 7  — investor interest → founder response
5. Phase 8  — queue-backed AI document processing
6. Phase 9  — semantic matching augmentation
7. Phase 10 — realtime + email notifications
8. Phase 12 — controlled market pilot
9. Phase 13 — billing
10. Phase 14 — learned recommendations only after real outcome data
```

See [`docs/IMPLEMENTATION_NEXT_STEPS.md`](docs/IMPLEMENTATION_NEXT_STEPS.md) for the executable checklist.

## AI agent rules

Every future AI coding session must:

1. Read this roadmap first.
2. Read `docs/MATCHING_ARCHITECTURE.md` before changing matching/infrastructure.
3. Inspect current repository state before making claims.
4. Work on one phase/milestone at a time.
5. Keep demo behavior clearly labeled.
6. Never mark mocked integrations as live.
7. Never put service-role keys or secrets in browser code.
8. Preserve provenance for important claims.
9. Keep AI-generated profile changes human-reviewable.
10. Keep hard eligibility rules outside LLM control.
11. Avoid unlicensed proprietary private-market data.
12. Do not expose proprietary production ranking details in public docs.
13. Avoid premature Redis/Kafka/search/Kubernetes/microservice work.
14. Update this roadmap after meaningful changes.
