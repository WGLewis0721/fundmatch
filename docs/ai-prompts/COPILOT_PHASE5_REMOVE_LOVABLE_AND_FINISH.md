# GitHub Copilot — remove Lovable and finish Phase 5

Use this as the next action prompt.

---

You are the infrastructure cleanup and validation engineer for **FundMatch**.

Repository: `WGLewis0721/fundmatch`
Base branch: latest `main`
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

## Decision already made

**Lovable is retired. Remove it completely from the active FundMatch production path.**

Supported production architecture:

`GitHub source → standalone Supabase → Cloudflare Workers/Nitro`

Public `/` + `/demo` stays on GitHub Pages and remains browser-only.

The separate Supabase project `fnmxlmjrkgojowpzrcwa` is **APEX**. Never modify it or use it as FundMatch.

## Part A — remove Lovable from the repo

Remove active Lovable coupling without redesigning the product:

1. Remove `@lovable.dev/vite-tanstack-config` from `package.json`.
2. Replace `vite.config.ts` with the equivalent native TanStack Start + Vite + React + Tailwind + tsconfig-paths + Nitro/Cloudflare configuration using the packages already declared by the repo. Preserve the existing `src/server.ts` server entry and current route behavior.
3. Regenerate `bun.lock` and `package-lock.json` from normal package registries so no Lovable package or Lovable npm-cache URL remains.
4. Remove Lovable package exceptions from `bunfig.toml`.
5. Remove any remaining Lovable runtime/error-reporting hook. The root error boundary should still render its existing user-facing fallback.
6. Rename any Lovable-specific environment variables to FundMatch/generic names. Migrations must use `DATABASE_URL`; scheduled-worker auth must use `FUNDMATCH_CRON_SECRET` / `FUNDMATCH_CRON_SECRET_PREVIOUS` if that helper remains.
7. Replace runtime messages such as `Connect Supabase in Lovable Cloud` with standalone Supabase configuration guidance.
8. Update comments/runbooks/configuration so active docs do not instruct anyone to use Lovable.
9. Historical audit documents may retain Lovable references only when clearly describing past events. Do not rewrite history just to remove a word.
10. Search the active source, package manifests, build config and lockfiles for `lovable`, `@lovable.dev`, `LOVABLE_`, and Lovable registry/cache URLs. Active runtime/build/config references must be zero when finished.

## Part B — standalone Supabase

FundMatch must use a dedicated standalone Supabase project, not APEX and not the retired Lovable-backed project.

If a standalone FundMatch Supabase project reference/credentials are already available in the environment, use them. If not, complete Part A and stop with exactly one environment blocker: `STANDALONE FUNDMATCH SUPABASE PROJECT REQUIRED`.

Do **not** create or substitute a database in a different account/project merely to make tests pass.

Once the standalone project exists:

1. Apply/reconcile migrations `0000` → `0001` → `0002` → `0003` in journal order using `DATABASE_URL`.
2. Confirm the private `documents` bucket exists and is not public.
3. Generate `src/integrations/supabase/types.ts` from that project.
4. Configure email/password auth with email confirmation enabled.
5. Configure Site URL and redirects for the deployed Cloudflare origin, including `/app/login` and `/app/reset`.
6. Use the project's publishable key in browser/server publishable-key variables. Keep service role server-only.

## Part C — Cloudflare `/app` deployment

Deploy **current GitHub code**, not an old preview snapshot.

1. Build using the native TanStack Start/Nitro Cloudflare path after Lovable removal.
2. Configure the standalone FundMatch Supabase URL/publishable key for the build/runtime.
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
- `/app` deployed against the standalone FundMatch project;
- `/` + `/demo` still browser-only;
- no service-role/database secret in source or public bundle;
- `bun run typecheck`, relevant tests, `bun run build`, `bun run build:pages`.

Do not run unrelated compatibility matrices, speculative load tests, broad performance tuning or new product work.

## If something fails

Fix only mechanical/configuration defects directly inside this Phase 5 boundary. If the failure requires a product/architecture decision, stop and report it to GPT-5.6 Sol instead of inventing a new design.

## Required final response

Return:

- branch + PR;
- exact standalone FundMatch Supabase project ref used;
- explicit confirmation APEX was untouched;
- Lovable-removal files and dependencies removed;
- Cloudflare deployment URL;
- migrations actually applied;
- focused Phase 5 validation results as PASS / FAIL / BLOCKED;
- exact remaining blocker(s);
- files changed;
- a **ready-to-paste GPT-5.6 Sol follow-up prompt** asking for final `ACCEPT PHASE 5` or `REJECT PHASE 5` based on your evidence.

Do not begin Phase 6.

---
