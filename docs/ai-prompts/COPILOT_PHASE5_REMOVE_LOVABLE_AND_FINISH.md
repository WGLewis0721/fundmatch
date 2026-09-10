# GitHub Copilot — remove Lovable and finish Phase 5

Use this as the next action prompt.

---

You are the infrastructure cleanup and validation engineer for **FundMatch**.

Repository: `WGLewis0721/fundmatch`
Active branch/PR: `chore/remove-lovable-phase5` / PR #16
Active milestone: **Roadmap Phase 5 — Authenticated deployment acceptance**

Read first:

1. `AGENTS.md`
2. `docs/ai-prompts/START_HERE.md`
3. `ROADMAP.md`
4. `README.md`
5. `docs/BACKEND.md`
6. `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md`
7. Phase 5 in `docs/ai-prompts/GITHUB_COPILOT_VALIDATION_PROMPTS.md`
8. `drizzle/migrations/0000_fundmatch_core_schema.sql`
9. `drizzle/migrations/0001_fundmatch_seed_demo_data.sql`
10. `drizzle/migrations/0002_fundmatch_accounts_persistence.sql`
11. `drizzle/migrations/0003_phase5_function_privileges.sql`

## Decisions already made

**Lovable is retired. Remove it completely from the active FundMatch production path.**

Supported production architecture:

`GitHub source → standalone Supabase → Cloudflare Workers/Nitro`

Public `/` + `/demo` stays on GitHub Pages and remains browser-only.

Use this dedicated standalone FundMatch backend and no other project:

- Project name: `FundMatch`
- Supabase project ref: `dkanoobzseckccbwnpyi`
- API URL: `https://dkanoobzseckccbwnpyi.supabase.co`
- Region: `us-east-1`
- Organization: `Apex`

The separate Supabase project `fnmxlmjrkgojowpzrcwa` is the **APEX application project**. Never modify it or use it as FundMatch.

Do not use the retired Lovable-backed FundMatch project.

## Part A — finish Lovable removal from the repo

A partial cleanup is already on this branch. Complete it without redesigning the product:

1. Remove `@lovable.dev/vite-tanstack-config` from `package.json`.
2. Replace `vite.config.ts` with the equivalent native TanStack Start + Vite + React + Tailwind + tsconfig-paths + Nitro/Cloudflare configuration. Preserve `src/server.ts`, current route behavior, environment injection and build output expectations.
3. Regenerate `bun.lock` and `package-lock.json` from normal package registries so no Lovable package or Lovable npm-cache URL remains.
4. Confirm `bunfig.toml` has no Lovable package exception.
5. Confirm the Lovable error-reporting hook has been removed while the existing root error fallback still works.
6. Use only generic/FundMatch environment variables: `DATABASE_URL`, `FUNDMATCH_CRON_SECRET`, `FUNDMATCH_CRON_SECRET_PREVIOUS`, and the documented Supabase variables.
7. Confirm runtime messages contain no instruction to connect Supabase through Lovable.
8. Search active source, package manifests, build config and lockfiles for `lovable`, `@lovable.dev`, `LOVABLE_`, and Lovable registry/cache URLs. Active runtime/build/config references must be zero when finished. Historical audit prose may remain when clearly historical.

## Part B — configure the standalone FundMatch Supabase project

Use only `dkanoobzseckccbwnpyi`.

1. Apply/reconcile migrations `0000` → `0001` → `0002` → `0003` in journal order. Do not apply the local Supabase shim to the real project.
2. Confirm the private `documents` bucket exists and `public = false`.
3. Confirm the old permissive policies from `0000` have been replaced by the organization-scoped policies from `0002`.
4. Confirm the helper/RPC execution hardening from `0003` is present.
5. Generate `src/integrations/supabase/types.ts` from this project.
6. Configure email/password Auth with email confirmation enabled.
7. After Cloudflare deployment, configure the Site URL and redirect allow list for the deployed origin, including `/app/login` and `/app/reset`.
8. Use this project's publishable key for browser/server publishable-key variables. Keep service-role/database secrets server-only.

If your execution environment lacks Supabase credentials or access needed for a specific action, do not substitute another project and do not touch APEX. Report the exact blocked action while continuing any safe repo/deployment work that does not require that missing access.

## Part C — Cloudflare `/app` deployment

Deploy **current GitHub code**, not an old preview snapshot.

1. Build using the native TanStack Start/Nitro Cloudflare path after Lovable removal.
2. Configure `https://dkanoobzseckccbwnpyi.supabase.co` and its publishable key for the build/runtime.
3. Configure only required server secrets in Cloudflare.
4. Deploy the authenticated application to Cloudflare Workers.
5. Record the final production `/app` URL.
6. Leave GitHub Pages pointed at the browser-only public demo build.

Do not move hosting to another platform unless the documented Cloudflare target is technically impossible; report the blocker instead.

## Part D — focused Phase 5 validation

After deployment, perform the Phase 5 validations from `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md` and Phase 5 in `GITHUB_COPILOT_VALIDATION_PROMPTS.md`.

Prioritize only what is required to accept Phase 5:

- schema/migration state (`0000`-`0003`);
- old permissive policy removal;
- organization-scoped RLS;
- helper/RPC execute boundaries;
- private documents bucket + Storage policies;
- signup, confirmation, login, logout, recovery;
- startup and investment-firm organization creation;
- invitation/member-role/last-owner behavior;
- founder/investor persistence;
- document upload/download/delete;
- two-org cross-tenant row/storage denial;
- `/app` deployed against `dkanoobzseckccbwnpyi`;
- `/` + `/demo` still browser-only;
- no service-role/database secret in source or public bundle;
- `bun run typecheck`, relevant tests, `bun run build`, `bun run build:pages`.

Do not run unrelated compatibility matrices, speculative load tests, broad performance tuning or new product work.

## If something fails

Fix only mechanical/configuration defects directly inside this Phase 5 boundary. If the failure requires a product/architecture decision, stop and report it to GPT-5.6 Sol instead of inventing a new design.

## Required final response

Return:

- branch + PR;
- exact confirmation that standalone FundMatch project `dkanoobzseckccbwnpyi` was used;
- explicit confirmation APEX `fnmxlmjrkgojowpzrcwa` was untouched;
- Lovable-removal files and dependencies removed;
- Cloudflare deployment URL;
- migrations actually applied;
- focused Phase 5 validation results as PASS / FAIL / BLOCKED;
- exact remaining blocker(s);
- files changed;
- a **ready-to-paste GPT-5.6 Sol follow-up prompt** asking for final `ACCEPT PHASE 5` or `REJECT PHASE 5` based on your evidence.

Do not begin Phase 6.

---
