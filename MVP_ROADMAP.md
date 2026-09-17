# FundMatch MVP Roadmap

This document is the **shortest path from the current FundMatch build to a real-user MVP**.

It complements `ROADMAP.md`. The main roadmap remains the long-term product and architecture source of truth. This file deliberately narrows scope to the minimum product that can prove whether founders and investors receive enough value from FundMatch to continue investing in the product.

## MVP definition

FundMatch reaches MVP when:

> A real founder and a real investor can independently join FundMatch, create useful profiles, discover one another based on legitimate and explainable fit, express interest, and complete a permissioned introduction without an operator manually changing production data.

The MVP is **not** roadmap completion. Semantic ranking, broad integrations, native mobile, billing, learned recommendations, and large-scale infrastructure are not required to begin a controlled pilot.

## MVP core loop

```text
Founder
  → Sign up
  → Create startup organization/profile
  → Enter raise + company information
  → Upload supported pitch material
  → Review readiness / sourced suggestions
  → Publish discoverable investor-facing profile

Investor
  → Sign up
  → Create investor organization/profile
  → Define investment thesis
  → Receive eligible ranked startups
  → Review explainable fit
  → Pass / Save / Interested

Interested
  → Founder receives permissioned request
  → Founder reviews investor + request
  → Accept / Decline / Request more information
  → Accepted request becomes introduction
  → Both sides can move into the next conversation/diligence step

System
  → Preserve authorization and tenant isolation
  → Record auditable marketplace events
  → Never expose private contact information before permission
  → Never silently promote AI suggestions to canonical facts
```

## Current MVP position

### Already implemented enough to use as the MVP foundation

- public product/demo experience;
- authenticated application foundation;
- Supabase Auth/Postgres/RLS/Storage;
- organization and role model;
- founder profile/readiness surfaces;
- investor thesis/profile surfaces;
- deterministic `rules-v1` matching baseline;
- production hard-eligibility retrieval;
- production discovery sessions;
- ranked investor discovery feed;
- persistent Pass / Save / Interested decisions;
- append-only marketplace event history;
- impression and profile-open auditing;
- score/version/rank metadata;
- predictable discovery resume behavior;
- history-preserving decision reset;
- Phase 6 hosted migrations and privilege hardening;
- Phase 6 production acceptance.

Phase 6 is considered complete for MVP planning.

### Substantially implemented but still needs MVP acceptance

The Phase 8 document vertical slice already provides much of the founder intelligence needed for MVP:

- private document upload lifecycle;
- selectable-text PDF and UTF-8 text analysis;
- deterministic chunking and source locators;
- durable agent runs and queue foundation;
- embeddings foundation;
- sourced profile suggestions;
- evidence validation;
- founder Accept / Correct / Reject;
- deterministic readiness updates.

MVP does **not** require OCR, scanned-deck support, Office document parsing, or a sophisticated model-backed readiness worker.

## MVP Milestone 1 — Production identity and tenant acceptance

**Goal:** prove the clean production environment can safely support independent real users.

Verify through the deployed application:

1. founder signup, login, logout and password recovery;
2. investor signup, login, logout and password recovery;
3. startup organization creation;
4. investor organization creation;
5. profile and thesis persistence;
6. invitation and role behavior required for the pilot;
7. private document upload/download/delete;
8. cross-organization Postgres RLS isolation;
9. cross-organization Storage isolation;
10. no production workflow depends on demo/localStorage state.

**Exit:** two independently created organizations can use FundMatch and cannot read or mutate each other's private data.

**MVP status:** acceptance required.

## MVP Milestone 2 — Production discovery

**Goal:** give an investor a trustworthy, resumable discovery experience.

Required behavior:

- hard eligibility executes before ranking;
- `rules-v1` ranks eligible startups;
- cards explain relevant fit;
- Pass / Save / Interested persists;
- impressions and profile opens are auditable;
- refresh/resume does not create invalid duplicate behavior;
- reset clears current decisions without deleting history.

**Exit:** a signed-in investor can discover eligible companies, make decisions, leave, return, and continue predictably.

**MVP status:** COMPLETE — delivered and accepted through Phase 6.

## MVP Milestone 3 — Permissioned interest and introduction

**Goal:** close the two-sided marketplace loop.

Build the minimum Phase 7 workflow:

### Data

Add a durable interest/request concept with states such as:

```text
requested
viewed
needs_information
accepted
declined
withdrawn
```

Add an introduction/thread record only after founder acceptance.

### Investor behavior

`Interested` should:

1. preserve the existing Phase 6 decision/event;
2. create or transition a permissioned interest request;
3. notify the correct founder organization;
4. never expose founder private contact information automatically.

### Founder behavior

Founder can:

- view the interested investor/firm and relevant request context;
- Accept;
- Decline;
- Request more information.

### Accepted interest

Acceptance should:

- create an introduction workflow/thread;
- record immutable audit history;
- expose only the information allowed by the workflow;
- make the accepted opportunity visible to both authorized sides.

### Notification

For MVP, queued transactional email plus an in-app durable notification is sufficient. A complete realtime layer is not required.

**Exit:** a real investor can mark Interested and a real founder can respond, producing a permissioned introduction without database intervention.

**MVP status:** NEXT BUILD / MVP-CLOSING FEATURE.

## MVP Milestone 4 — Narrow founder document/readiness acceptance

**Goal:** provide real founder-side value without waiting for the entire AI roadmap.

MVP-supported path:

```text
selectable-text PDF pitch deck
  → private upload
  → authorized processing
  → sourced extraction/suggestions
  → readiness observations
  → founder Accept / Correct / Reject
  → approved canonical profile changes
```

Required before MVP pilot:

- deploy and verify the worker/queue drain;
- verify production server configuration;
- run one provider-backed end-to-end deck;
- prove document authorization/tenant isolation;
- prove provenance survives from source to suggestion;
- prove AI output cannot silently overwrite founder facts;
- surface understandable failure state when a document is unsupported or unreadable.

Not required for MVP:

- OCR;
- scanned PDFs;
- DOCX/PPTX/spreadsheet/image analysis;
- model-backed readiness scoring;
- multiple model providers;
- autonomous multi-agent behavior.

**Exit:** a founder can upload one supported real pitch deck and receive useful, sourced, reviewable assistance in production.

**MVP status:** substantially implemented; production acceptance remains.

## MVP Milestone 5 — Pilot notifications and observability

**Goal:** make the marketplace usable without requiring users to sit in FundMatch waiting for changes.

Minimum notifications:

- investor interest received;
- founder accepted/declined/requested more information;
- introduction created;
- document processing completed/failed.

Minimum operational visibility:

- signup failures;
- authorization failures;
- document processing failures;
- interest workflow failures;
- email delivery failures;
- marketplace event counts needed to reconstruct the funnel.

Realtime Broadcast is optional for MVP if durable in-app state + transactional email reliably communicates these changes.

**Exit:** users can leave the app and still know when an action requires them, while operators can diagnose failures.

**MVP status:** build the narrow version alongside/after Milestone 3.

## MVP Milestone 6 — Controlled pilot release

**Goal:** stop expanding the feature list and test the actual value proposition.

Start with a deliberately small founder/investor cohort.

Founder measures:

- signup → completed profile;
- pitch material uploaded;
- readiness/suggestion review completion;
- published/discoverable profile;
- response rate to investor interest;
- time to founder response.

Investor measures:

- signup → completed thesis;
- eligible candidates surfaced;
- profile-open rate;
- Save / Interested rate;
- time to decision;
- founder response;
- introduction conversion.

Marketplace measures:

- eligible candidates per thesis;
- empty-feed rate;
- repeated-candidate rate;
- interest → founder response;
- interest → accepted introduction;
- weak-fit feedback;
- time from discovery to introduction.

**Exit:** real users complete the loop and FundMatch has evidence about whether matching, readiness, and permissioned introductions are valuable enough to improve and commercialize.

**MVP status:** follows Milestones 1–5.

## Explicitly post-MVP

Do **not** hold MVP for these roadmap items:

### Semantic matching / Phase 9

Use deterministic eligibility + `rules-v1` for the MVP. Add pgvector semantic augmentation after the pilot can compare it against real behavior.

### Full realtime / Phase 10

MVP needs reliable state and notification delivery, not a complete realtime experience.

### Integrations and MCP / Phase 11

Manual entry and private document upload are acceptable for the first cohort.

### Broad market pilot / Phase 12

The MVP ends by entering a small controlled pilot. Expansion comes after evidence.

### Billing / Phase 13

Do not make Stripe a prerequisite for proving product value. The initial controlled cohort may be free.

### Learned recommendation system / Phase 14

Do not train ranking from sparse or synthetic behavior. Preserve clean events now and learn only after enough real outcomes exist.

### Native mobile

Responsive web remains primary through validation.

### Scale infrastructure

No Redis, Elasticsearch/OpenSearch, Kafka, Kubernetes, separate vector database, or microservice fleet without measured need.

## MVP release checklist

FundMatch may be labeled **MVP v1** when all of the following are true:

- [ ] Production founder authentication flow accepted.
- [ ] Production investor authentication flow accepted.
- [ ] Two independent organizations pass RLS/Storage isolation acceptance.
- [ ] Founder can create and publish a usable startup profile.
- [ ] Investor can create and persist a usable thesis.
- [x] Production hard eligibility and deterministic ranking work.
- [x] Discovery sessions resume predictably.
- [x] Pass / Save / Interested persist.
- [x] Discovery decisions and important views are auditable.
- [ ] Interested reaches the correct founder as a permissioned request.
- [ ] Founder can Accept / Decline / Request more information.
- [ ] Accepted interest creates an authorized introduction workflow.
- [ ] Private contact information is not exposed before permission.
- [ ] One supported real pitch deck completes the production document/readiness loop.
- [ ] Founder can review sourced suggestions before canonical promotion.
- [ ] Minimum email/in-app notifications work.
- [ ] Critical workflow failures are observable.
- [ ] A clean two-user/two-organization end-to-end acceptance run passes without manual database intervention.

## Recommended execution order from today

```text
1. Re-run clean-account Phase 5 identity + tenant acceptance
        ↓
2. Build Phase 7 minimum interest/introduction workflow
        ↓
3. Production-accept the narrow Phase 8 PDF/readiness loop
        ↓
4. Add minimum durable notifications + transactional email
        ↓
5. Run complete two-user/two-org acceptance
        ↓
6. Tag FundMatch MVP v1
        ↓
7. Begin controlled pilot
```

## MVP scope rule

Before adding a feature, ask:

> Is this required for a founder and investor to complete the core FundMatch loop safely, independently, and measurably?

If **yes**, it belongs in the MVP path.

If **no**, it stays on the main roadmap until the controlled pilot produces evidence that it should move forward.

## Relationship to the main roadmap

`ROADMAP.md` remains the long-term source of truth for FundMatch's product and architecture.

This MVP roadmap controls **near-term sequencing and release scope** until FundMatch MVP v1 enters the controlled pilot. When the two documents differ in scope, this document answers **what must ship now**; the main roadmap answers **what FundMatch ultimately intends to become**.
