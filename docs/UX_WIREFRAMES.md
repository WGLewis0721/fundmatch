# FundMatch Interactive Wireframes

Route: `/wireframes`

This prototype is intentionally isolated from the authenticated `/app` workspace. It uses only local React state and fictional/demo data. It must not read or write Supabase, send email, call production AI, or expose private user data.

## Purpose

Validate the product and interaction model before spending time on polished visual design or native mobile implementation.

The wireframes follow the current roadmap order:

1. Founder readiness value
2. Investor sourcing and thesis-driven discovery
3. Authenticated/private-workspace assumptions
4. Persistent marketplace decisions
5. Permissioned investor interest and founder response
6. Accepted introduction workflow
7. Later overlays for AI processing, realtime notifications, integrations, and billing

## Core UX principle

`Interested` is not a contact reveal and is not an automatic introduction.

The intended flow is:

```text
Investor discovers company
→ Investor opens company / fit explanation
→ Investor chooses Interested
→ Investor sends a short reason/context
→ Founder receives permissioned request
→ Founder reviews firm + thesis + reason
→ Founder Accepts / Declines / Asks for more information
→ Acceptance opens a shared introduction thread
```

The founder remains in control of private contact information.

## Founder screens

### Overview

Primary jobs:
- understand overall fundraising readiness;
- see profile completion;
- see important investor interest;
- jump to materials and packet.

### Company profile

Structured profile builder for:
- essentials;
- traction;
- raise;
- team;
- final review.

The prototype keeps the information architecture explicit rather than presenting one large form.

### Readiness

Shows progress by preparation area and identifies unresolved gaps. The screen should answer: "What would prevent me from having a productive investor conversation right now?"

### Materials

Private founder-controlled materials. The prototype includes an illustrative processing state and sourced-suggestion notice to reserve UX space for roadmap Phase 8 without implying live AI exists today.

### Investor packet

Standardized investor-facing summary assembled from approved profile information. Private source documents remain separate.

### Investor interest

Founder reviews:
- investor firm and partner;
- thesis context;
- investor-provided reason for interest;
- Accept / Ask for more information / Decline actions.

### Introduction thread

Created only after acceptance. It keeps conversation and opportunity context together.

## Investor screens

### Discover

Ranked eligible-company card containing:
- score;
- stage / sector;
- raise and traction;
- concise fit reasons;
- Pass / Save / Interested;
- explicit link to the full company profile.

Mobile may support gestures, but visible buttons remain available for clarity and accessibility. `Interested` always requires a confirmation step.

### Company detail

Expanded company profile with:
- company snapshot;
- traction;
- fit explanation;
- claim/provenance language;
- Save / Interested actions.

### Pipeline

Durable decision state across New / Reviewing / Meeting / Passed. Mobile uses a stage-tab treatment instead of four simultaneous columns.

### Investment thesis

Confirmed mandate is visually separated from any inferred/AI summary. Hard eligibility remains authoritative.

### Interest request

Requires investor context/reason before sending and explicitly explains founder control over the introduction.

### Introduction thread

Shared only after founder acceptance.

## Responsive behavior

### Desktop

- persistent left workspace navigation;
- multi-column dashboard and detail layouts;
- kanban-style investor pipeline;
- context sidebars where useful.

### Tablet

- compact icon navigation;
- reduced secondary context;
- same underlying information architecture.

### Mobile responsive web

- bottom navigation;
- single-column content;
- sticky primary actions;
- discovery card optimized for thumb actions;
- pipeline becomes stage tabs rather than horizontal kanban;
- company actions remain visible without relying on swipe;
- deep preparation still works, but desktop remains preferred for documents/diligence.

Native React Native/Expo work remains post-validation per the roadmap.

## Prototype shortcuts

The role switch is intentionally visible. It allows product review of the same workflow from both sides without authentication setup.

Recommended validation path:

```text
Investor → Discover
→ open Dippi
→ Interested
→ send interest request
→ switch to Founder
→ review Investor Interest
→ Accept introduction
→ open Introduction thread
→ switch between Founder and Investor
```

## Not production behavior

The wireframe route must not be mistaken for finished application behavior. In particular:

- fit scores are fictional;
- state resets on refresh;
- form changes do not persist;
- notifications are illustrative;
- document processing is simulated;
- messaging is local-only;
- no private data is loaded;
- no email is sent;
- no billing exists here.

## Implementation handoff

Use this prototype to validate navigation, hierarchy, permission boundaries, responsive behavior, and workflow state before porting changes into `/app`.

Production implementation should reuse the existing Supabase/RLS/domain contracts rather than copying local prototype state into production code.
