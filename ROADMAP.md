# FundMatch Roadmap

This document is the product and implementation source of truth for FundMatch. Read it before starting any new work and update it after meaningful changes.

## Product definition

FundMatch is an AI-assisted capital discovery and fundraising-readiness platform for startup founders and investment teams.

It helps founders package their company once, understand readiness gaps, and get discovered by investors who fit. It helps investors review cleaner company profiles, confirm thesis fit, understand why a company is relevant, and move promising companies into pipeline and diligence.

## Serious positioning

**AI-powered deal discovery and matching for founders and investment teams.**

Do not reduce the product to “Tinder for VC.” The swipe/feed interaction is useful as a simple discovery surface, but the deeper product is structured company/investor data, explainable matching, provenance, readiness, diligence, and workflow.

## Core product loop

```text
Connect data → Build profiles → Infer thesis → Score fit → Surface opportunities → Take action → Learn from outcomes
```

## Product goals

1. Help founders create a clean, standardized investor-facing profile.
2. Help founders understand whether they are ready to raise.
3. Help investors discover better-fit companies faster.
4. Make match scoring explainable instead of mysterious.
5. Preserve provenance for important claims and AI-generated suggestions.
6. Support diligence workflow: materials, notes, statuses, and collaboration.
7. Keep AI-generated edits reviewable by the human/company that owns the profile.
8. Build a rules-based baseline before relying on LLM/ML ranking.
9. Avoid unlicensed proprietary private-market data.
10. Keep the public demo clearly separated from production/private data.

## Canonical user flows

### Founder flow

1. Create or claim company profile.
2. Enter or import company basics, traction, raise details, and materials.
3. Upload or link pitch deck and supporting documents.
4. Receive AI-assisted profile suggestions with source/provenance.
5. Accept or reject suggestions.
6. See fundraising-readiness checklist and gaps.
7. Generate a standardized FundMatch investor packet/profile.
8. Become discoverable to matching investors.
9. Track views, saves, interest, intro requests, and readiness status.

### Investor flow

1. Create firm profile.
2. Enter thesis or import permitted firm/deal data.
3. Confirm inferred investment preferences and exclusions.
4. Browse ranked company cards.
5. Pass, Save, or mark Interested.
6. Move promising companies through pipeline.
7. Add team notes and diligence questions.
8. Review provenance and materials before meetings.
9. Feed outcomes back into future ranking.

## Current architecture

### 1. Public demo

**Purpose:** show the product story and interaction model without signup.

**Routes:** `/`, `/demo`

**Tech:** React/TanStack/Vite static Pages build, local/browser storage.

**Status:** Working.

**Important constraint:** no real backend, no real documents, no confidential data, no real investors, no live AI.

### 2. Authenticated app

**Purpose:** real users, organizations, server-side persistence, and private documents.

**Route:** `/app`

**Tech:** TanStack Start/Vite app, Supabase Auth, Supabase Postgres, Row-Level Security, private Supabase Storage bucket, Drizzle migrations.

**Deployment target:** Cloudflare Workers/Nitro or another Node-compatible host, separate from GitHub Pages.

**Status:** Implemented in code; requires environment configuration and deployment acceptance before being treated as live production.

### 3. Data model and security

**Purpose:** organization-scoped app data.

**Tech:** Supabase Postgres + RLS, storage policies, service-role-only worker paths.

**Status:** Implemented in migrations and documented in `docs/BACKEND.md`.

**Important constraint:** service role key must never reach the browser.

### 4. AI worker / Astra interface

**Purpose:** process uploaded documents, suggest profile updates, suggest readiness improvements, and persist richer match explanations.

**Tech:** TBD worker/runtime. The database interface is documented in `docs/ASTRA_INTERFACE.md`; runtime is not finalized.

**Status:** Interface documented; live AI worker not implemented.

### 5. Integrations

**Purpose:** import permitted data from founder and investor tools.

**Possible later sources:** websites, decks, DocSend-style links, CRM, Stripe/revenue systems, Google/Microsoft files, investor CRM, market-data vendors.

**Tech:** TBD per integration.

**Status:** mocked/demo only.

**Important constraint:** do not scrape or redistribute proprietary private-market datasets without licensing.

### 6. Introductions and email delivery

**Purpose:** allow founders/investors to request, manage, and deliver introductions.

**Tech:** TBD transactional email provider and workflow model.

**Status:** not implemented.

### 7. Billing and production commercialization

**Purpose:** monetize FundMatch if it becomes an active product.

**Potential models:** founder readiness subscription, investor seat subscription, pay-per-standardized-packet, firm pilot package, data/workflow license.

**Tech:** TBD.

**Status:** not implemented.

## Current repository status

### Complete / working demo

- Public homepage and product film.
- Public `/demo` founder/investor workspace.
- Demo company discovery.
- Search and filters.
- Pass / Save / Interested actions.
- Rules-based MatchEngine with explainable scores.
- Editable investor thesis.
- Company profiles and provenance sections.
- Pipeline stages.
- Saved shortlist.
- Founder profile editing for Dippi and Soapbox Caddie.
- VC and PE readiness templates.
- Local persistence and reset.
- Responsive UI and accessibility basics.

### Implemented but needs production acceptance

- Authenticated app under `/app`.
- Supabase Auth flow.
- Organizations and roles.
- Email-bound invitations.
- Organization-scoped persistence.
- Private document metadata/storage model.
- RLS and storage policies.
- Backend deployment docs.

### Not implemented / demo only

- Live AI extraction.
- Live LLM summaries.
- Production-grade AI ranking.
- Investor introductions.
- Email delivery.
- Real CRM/data integrations.
- SSO.
- Licensed private-market data ingestion.
- Billing.
- Outcome-trained recommendation models.

## Roadmap phases

## Phase 1 — Product/demo foundation

**Goal:** make FundMatch understandable and demonstrable without signup.

**Build:** homepage, product film, demo founder/investor personas, discovery feed, pass/save/interested behavior, profile pages, pipeline, notes, readiness templates.

**Status:** Complete enough for demo use.

**Done when:** a viewer can understand the founder/investor matching story and click through a complete fictional workflow with explicit demo labels.

## Phase 2 — Brand and context consolidation

**Goal:** preserve product context, visual direction, and AI handoff material in the repo and Gray Matter project folder.

**Build:** refreshed README, roadmap, brand docs, repo-native graphics, source/asset manifest, AI handoff guidance.

**Status:** In progress in this documentation branch.

**Done when:** README, `ROADMAP.md`, `docs/brand/BRAND.md`, `docs/brand/ASSET_MANIFEST.md`, and repo graphics exist and point future agents in the same direction.

## Phase 3 — Founder Readiness MVP

**Goal:** create single-sided value for founders before depending on marketplace liquidity.

**Build:** guided company profile builder, fundraising-readiness checklist, deck/materials checklist, standardized FundMatch investor packet/profile, missing-materials indicators, provenance labels, founder review/accept/reject of AI suggestions.

**Tech:** existing React app + Supabase authenticated app where real data is used. AI worker runtime is TBD.

**Status:** Partially represented by existing readiness templates; not yet a complete founder-readiness product.

**Done when:** a founder can create a profile, see readiness gaps, attach/link materials, and generate a clean standardized investor-facing FundMatch packet.

## Phase 4 — Investor Sourcing MVP

**Goal:** make FundMatch useful to one investor team even before a large two-sided network exists.

**Build:** thesis builder, thesis confirmation, company card ranking, explainable fit, risks/questions, team notes, pipeline, manual company import.

**Tech:** existing React app + Supabase. AI augmentation TBD.

**Status:** deterministic demo exists; production investor workflow not complete.

**Done when:** an investor team can define a thesis, review imported/created companies against it, and move companies through a persistent team pipeline.

## Phase 5 — Authenticated deployment acceptance

**Goal:** verify `/app` works as a real private workspace.

**Build:** configure Supabase environment variables, deploy authenticated app, run signup/login/org creation/invitation/document upload/download/delete, verify RLS and private storage behavior.

**Tech:** Supabase + Cloudflare Workers/Nitro or another Node-compatible host.

**Status:** implemented in code; acceptance pending.

**Done when:** two separate organizations cannot read or mutate each other’s data, private document links remain private, and `/app` can be used without demo/localStorage assumptions.

## Phase 6 — AI document processing loop

**Goal:** turn uploaded decks/materials into reviewable suggestions.

**Build:** worker sees uploaded documents, marks status processing, extracts structured fields, writes `profile_suggestions`, updates readiness rows, records provenance, and handles failures safely.

**Tech:** worker/runtime TBD; Supabase service role server-side only; LLM/provider TBD.

**Status:** database interface documented; worker not implemented.

**Done when:** an uploaded deck can produce founder-reviewable profile suggestions and readiness updates without silently overwriting company claims.

## Phase 7 — Standardized FundMatch packet

**Goal:** give founders a concrete output investors can read.

**Build:** generated profile/packet view with company summary, traction, raise details, team, market, materials, readiness status, risks/questions, and source labels.

**Tech:** existing app; PDF/export tech TBD if needed.

**Status:** not implemented.

**Done when:** a founder can produce a clean standardized investor packet from confirmed profile/material data.

## Phase 8 — Real integrations

**Goal:** reduce manual entry using permitted customer-owned data sources.

**Build:** first one or two integrations, likely founder-side documents/drive/deck links first, then investor CRM or email/calendar later.

**Tech:** TBD per integration.

**Status:** not implemented.

**Done when:** one real data source can be connected/imported with clear permissions, provenance, and revocation behavior.

## Phase 9 — Introduction workflow

**Goal:** move from interest to conversation.

**Build:** intro request, accept/decline, founder/investor messaging state, email notifications, audit history.

**Tech:** TBD email provider and workflow model.

**Status:** not implemented.

**Done when:** an investor can request an intro and the founder can safely respond through a tracked workflow.

## Phase 10 — Market pilot

**Goal:** test whether a focused customer segment will use and pay for FundMatch.

**Build:** pilot onboarding, pricing offer, support workflow, analytics, measurable outcomes.

**Likely first pilot:** founder readiness product or small VC investor sourcing assistant, not the full two-sided marketplace.

**Status:** not started.

**Done when:** real pilot users complete the chosen workflow and produce evidence around time saved, readiness improvement, match quality, or meeting conversion.

## Recommended next step

Build **Phase 3 — Founder Readiness MVP** first.

Reason: it creates immediate single-sided value, avoids the two-sided cold-start problem, strengthens the company profile data model, and supports the later investor matching story.

## AI agent rules

Every future AI coding session must:

1. Read this roadmap first.
2. Inspect the current repository before making claims.
3. Work on only one phase or milestone at a time.
4. Keep demo behavior clearly labeled.
5. Never mark mocked integrations as live.
6. Never put service role keys or secrets in browser code.
7. Preserve provenance for important claims.
8. Keep AI-generated profile changes human-reviewable.
9. Avoid unlicensed proprietary private-market data.
10. Update this roadmap after meaningful changes.
