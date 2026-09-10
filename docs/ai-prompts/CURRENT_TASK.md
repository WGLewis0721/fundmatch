# Current FundMatch AI task

## Active milestone

**Roadmap Phase 5 — Authenticated deployment acceptance**

**Primary builder:** Sonnet 5  
**Architecture/security reviewer:** GPT-5.6 Sol  
**Downstream refinement:** Opus  
**Downstream product/visual polish:** Astra

## Builder prompt

Run **Prompt 1 — Authenticated production deployment** from [`SONNET5_BUILD_PROMPTS.md`](SONNET5_BUILD_PROMPTS.md).

Before implementation, read:

- `AGENTS.md`
- `ROADMAP.md`
- `README.md`
- `docs/MATCHING_ARCHITECTURE.md`
- `docs/IMPLEMENTATION_NEXT_STEPS.md`
- `docs/BACKEND.md`
- `docs/PHASE5_ACCEPTANCE_AUDIT.md`

## Critical live-backend finding

The intended FundMatch database is attached to the original Lovable FundMatch project and is reachable there. The directly connected standalone Supabase project is APEX and must not be used.

The live FundMatch database still has the old permissive RLS policy set and is missing the newer Phase 5 tables/private-document layer from migration `0002_fundmatch_accounts_persistence.sql`.

Do not treat `/app` as safe for real private data until migration reconciliation, deployment and two-organization acceptance all pass.

## Stop condition

Do **not** begin production candidate retrieval (Roadmap Phase 6) until GPT-5.6 Sol reviews and accepts Phase 5 evidence.
