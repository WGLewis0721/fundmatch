# FundMatch

FundMatch is an AI-assisted deal discovery app for startup teams and VC/PE investors.

The product idea is simple: founders build or claim a company profile, investors define an investment thesis, and FundMatch ranks high-fit opportunities in a swipe-style discovery flow. The app keeps the serious parts visible too: data provenance, diligence notes, investor pipeline, integrations, and match reasoning.

## What is in this repo

This repo contains the current Lovable-built FundMatch pilot:

- React + TypeScript app using TanStack Start
- FundMatch discovery and pipeline UI
- Founder and investor flows
- Deterministic match engine
- AI insight provider abstraction
- Supabase integration structure
- Drizzle schema and demo seed migrations
- Demo companies including Dippi and Soapbox Caddie
- Integration-ready screens for Affinity, PitchBook, DocSend, Google Workspace, Microsoft 365, Stripe, HubSpot

## Core product loop

1. A founder creates or claims a startup profile.
2. FundMatch structures the company data and tracks where fields came from.
3. An investor defines or imports an investment thesis.
4. The match engine scores fit by sector, stage, geography, check size, traction, and tags.
5. The investor can pass, save, mark interested, add notes, and move a company into pipeline.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Useful commands

```bash
npm run build
npm run lint
npm run format
```

## What is real vs mocked

Real in this pilot:

- app structure
- routes and screens
- data model
- deterministic matching logic
- seeded demo data
- Supabase/Drizzle integration scaffolding
- investor/founder workflow design

Still mocked or integration-ready:

- live LLM calls
- live Affinity/PitchBook/DocSend/Stripe/HubSpot connections
- production SSO setup
- paid-data licensing
- production security review

## Lovable project

Current Lovable editor project:

https://lovable.dev/projects/34443a2f-0671-4404-94db-fe807d4a7448
