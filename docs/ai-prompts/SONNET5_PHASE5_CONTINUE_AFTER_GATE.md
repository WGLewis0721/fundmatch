# Sonnet 5 — continue FundMatch Phase 5 after Sol acceptance rejection

Use this prompt as the next implementation turn.

---

You are the primary implementation engineer for **FundMatch**. Continue from the current repository state; do not restart the project or redesign the architecture.

Repository: `WGLewis0721/fundmatch`
Branch from the latest `main` before making changes.

## Read first

Read these files in this order before editing anything:

1. `AGENTS.md`
2. `docs/ai-prompts/START_HERE.md`
3. `docs/ai-prompts/PHASE5_ACCEPTANCE_RESULT_2026-09-10.md`
4. `docs/ai-prompts/PHASE5_SONNET_HANDOFF.md`
5. Prompt 1 in `docs/ai-prompts/SONNET5_BUILD_PROMPTS.md`
6. `ROADMAP.md`
7. `docs/MATCHING_ARCHITECTURE.md`
8. `docs/IMPLEMENTATION_NEXT_STEPS.md`
9. `docs/BACKEND.md`
10. `docs/TEST_EVIDENCE.md`
11. `drizzle/migrations/0002_fundmatch_accounts_persistence.sql`
12. `drizzle/migrations/0003_phase5_function_privileges.sql`

## Mission

Fix only the blockers that caused GPT-5.6 Sol to **REJECT Roadmap Phase 5 — Authenticated deployment acceptance**. Stop when Phase 5 is PR-ready for a second Sol acceptance review. Do **not** begin Phase 6 candidate retrieval/ranking.

## Verified environment identity

The intended FundMatch backend is attached to Lovable project:

`34443a2f-0671-4404-94db-fe807d4a7448`

The repo's FundMatch Supabase project reference is:

`ejzizfvjnpzieigviglc`

A different directly connected Supabase project has ref:

`fnmxlmjrkgojowpzrcwa`

That project contains APEX tables such as `workspaces`, `subscriptions`, `stripe_connections`, `apex_billing_accounts`, and credit-ledger tables. **It is not FundMatch. Do not modify it.**

## Sol gate findings you must start from

The current FundMatch database is reachable through the original Lovable project, but it is still on the old schema/security state.

The live database is missing:

- `organization_invitations`
- `readiness_items`
- `documents`
- `profile_suggestions`
- the private `documents` Storage bucket
- the Phase 5 RPC/helper functions expected by the current app

The live database still has old permissive policies. Sol directly observed examples equivalent to:

- `profiles readable by authenticated`: `USING (true)`
- `orgs read`: `USING (true)`
- `orgs write`: `USING (true) WITH CHECK (true)`
- `startups read`: `USING (true)`
- `startups write`: `USING (true) WITH CHECK (true)`
- `matches read`: `USING (true)`
- `matches write`: `USING (true) WITH CHECK (true)`
- `members insert own`: old self-membership path still present

Do **not** put real fundraising/customer data into that backend until the new organization-scoped policies are installed and verified.

The original Lovable project is currently unpublished and reports an older Lovable commit than current GitHub `main`. Do not simply publish that stale state and call Phase 5 complete.

The public GitHub Pages build on `main` is healthy. GitHub Actions run `34497237893` passed `bun run build`, `bun run typecheck`, `bun test`, `bun run build:pages`, artifact upload and Pages deployment. That does not substitute for live DB/RLS/storage acceptance.

## Required work — execute in this order

1. Create a fresh implementation branch from current `main`.
2. Inspect the live FundMatch schema/migration state before changing it. Do not blindly replay `0000`/`0001` over an existing database.
3. Reconcile the existing old FundMatch schema with the intended changes in `0002_fundmatch_accounts_persistence.sql`.
4. Apply the missing Phase 5 schema/security changes to the **FundMatch** backend only.
5. Apply `0003_phase5_function_privileges.sql` immediately after the `0002` changes. This migration was added by Sol after identifying overly broad `SECURITY DEFINER` helper execute privileges.
6. Verify the old permissive policies no longer exist. Verify the new organization-scoped policies and both `USING`/`WITH CHECK` rules where applicable.
7. Verify all `SECURITY DEFINER` RPCs/helpers have explicit execute grants/revocations, safe `search_path`, and caller/org authorization. Anonymous users must not be able to call internal lookup helpers. Unrelated authenticated users must not be able to use helper functions to discover another organization's private IDs.
8. Create/verify the private `documents` Storage bucket and its object policies. No public bucket or public object URLs.
9. Regenerate `src/integrations/supabase/types.ts` from the reconciled FundMatch schema if tooling allows. Do not handwave type drift.
10. Wire the current authenticated `/app` build to the intended FundMatch backend without committing secrets.
11. Deploy the **current** authenticated application using the existing documented deployment architecture. Do not replace the architecture with a new platform merely to get a URL.
12. Configure/verify auth redirect URLs for `/app/login` and `/app/reset` on the actual deployed origin.
13. Exercise signup, email confirmation, login, logout and password recovery end-to-end.
14. Create two independent test identities and organizations: one startup organization and one investment firm.
15. Verify organization creation, invitation acceptance, member roles and last-owner protection.
16. Verify founder profile/readiness/material persistence and investor profile/thesis persistence across reload/session boundaries.
17. Verify private document upload, authorized download and delete.
18. Attack the backend from the other organization and prove private startup/investor rows, notes, readiness, documents and storage objects cannot be read or mutated cross-org.
19. Run the focused helper privilege regression tests added for `0003` plus the existing DB/RLS suite.
20. Run `bun run typecheck`, `bun test`, the relevant DB tests, `bun run build`, and `bun run build:pages`.
21. Confirm `/` and `/demo` remain fictional/browser-only and no service-role credential or other secret appears in public source/build assets.
22. Update `docs/TEST_EVIDENCE.md`, `docs/BACKEND.md`, `ROADMAP.md`, and the Phase 5 acceptance material with only what you actually proved.
23. Open a PR to `main`. Do not merge it yourself. Stop and return it for GPT-5.6 Sol review.

## Hard boundaries

Do not implement Phase 6 or later work. No pgvector/semantic ranking, new candidate retrieval, realtime notification layer, queued AI extraction, billing, integrations, generic chat, Redis, Kafka, OpenSearch/Elasticsearch, Kubernetes, microservice split, or UI redesign.

Do not create a replacement database because another connector is easier to access. Do not touch APEX. Do not weaken RLS to make tests pass. Do not expose the service role to the client. Do not mark an untested capability production-ready.

## Required final report

Return:

- branch and PR number/URL;
- exact FundMatch backend/project used;
- exact migration/schema changes applied;
- confirmation that APEX was untouched;
- deployment URL for `/app`;
- auth-flow results;
- two-org RLS isolation evidence;
- private Storage isolation evidence;
- helper/RPC privilege evidence;
- test/build commands and results;
- files changed;
- remaining blockers, if any;
- explicit statement: `READY FOR GPT-5.6 SOL PHASE 5 ACCEPTANCE REVIEW` or `NOT READY`, with reason.

Do not continue beyond Phase 5.

---
