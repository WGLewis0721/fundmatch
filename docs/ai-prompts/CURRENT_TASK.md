# Current FundMatch AI task

## Active milestone

**Roadmap Phase 5 — Authenticated deployment acceptance**

Lovable is retired. The production target is:

`GitHub → standalone Supabase → Cloudflare Workers/Nitro`

## Current owner

**GitHub Copilot** owns the immediate mechanical cleanup, standalone-backend migration, deployment and focused validation work.

Run:

`docs/ai-prompts/COPILOT_PHASE5_REMOVE_LOVABLE_AND_FINISH.md`

GPT-5.6 Sol remains the final Phase 5 acceptance authority after Copilot returns evidence.

## Critical facts

- APEX Supabase project `fnmxlmjrkgojowpzrcwa` is not FundMatch and must not be modified.
- The prior Lovable-backed FundMatch project is retired from the production path.
- FundMatch now needs its own standalone Supabase project.
- The current GitHub app must deploy to Cloudflare from native TanStack Start/Nitro build tooling with no `@lovable.dev/*` dependency.
- Phase 5 acceptance still requires the focused auth, RLS, Storage, persistence and two-organization checks in `PHASE5_ACCEPTANCE_CHECKLIST.md`.

## Stop condition

Do **not** begin Roadmap Phase 6 until GitHub Copilot completes the requested Phase 5 evidence and GPT-5.6 Sol explicitly returns `ACCEPT PHASE 5`.
