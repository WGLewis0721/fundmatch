# Sonnet 5 handoff — Roadmap Phase 5

You are the primary implementation engineer for FundMatch.

## Mission

Complete **Roadmap Phase 5 — Authenticated deployment acceptance** and stop. Do not begin production discovery/ranking work.

## Repository

`WGLewis0721/fundmatch`

Read these files first:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `README.md`
4. `docs/MATCHING_ARCHITECTURE.md`
5. `docs/IMPLEMENTATION_NEXT_STEPS.md`
6. `docs/BACKEND.md`
7. `docs/PHASE5_ACCEPTANCE_AUDIT.md`
8. `docs/TEST_EVIDENCE.md`
9. `docs/ai-prompts/SONNET5_BUILD_PROMPTS.md`
10. `docs/ai-prompts/SONNET_TO_SOL_HANDOFF_TEMPLATE.md`

Use Prompt 1 from the Sonnet prompt file as the implementation contract.

## Verified starting state

The intended FundMatch Supabase project reference in the repo is:

`ejzizfvjnpzieigviglc`

The backend is attached to the original Lovable project:

`34443a2f-0671-4404-94db-fe807d4a7448`

A separate directly connected Supabase project currently contains APEX tables such as `workspaces`, `subscriptions`, `stripe_connections`, `apex_billing_accounts`, and related credit-ledger tables. **Do not modify that project. It is not FundMatch.**

The live FundMatch database is enabled and currently contains the original FundMatch tables, but it is still on the older permissive security model.

Observed live policies include:

- `profiles readable by authenticated`
- `orgs read`
- `orgs write`
- `members read`
- `members insert own`
- `members delete own`
- `startups read`
- `startups write`
- `metrics read`
- `metrics write`
- `materials read`
- `materials write`
- `investors read`
- `investors write`
- `theses read`
- `theses write`
- `matches read`
- `matches write`
- `swipes read`
- `swipes own write`
- `saved read`
- `saved own write`
- `pipeline read`
- `pipeline write`
- `notes read`
- `notes write`
- `intros read`
- `intros write`
- `activity read`
- `activity write`

The live database was also observed to be missing the newer Phase 5 tables expected from `drizzle/migrations/0002_fundmatch_accounts_persistence.sql`:

- `organization_invitations`
- `readiness_items`
- `documents`
- `profile_suggestions`

Treat this as migration/deployment/acceptance work, not a backend redesign.

## Required implementation

1. Inspect the live FundMatch schema before applying anything.
2. Reconcile it against repository migrations `0000`, `0001`, and `0002`.
3. Apply only the missing intended FundMatch migration changes.
4. Replace the permissive RLS policies with the organization-scoped policy model in the repository.
5. Verify all `SECURITY DEFINER` helpers/RPCs have explicit grants/revocations and enforce caller/organization authorization.
6. Create/verify the private `documents` bucket and storage policies exactly as intended.
7. Wire the authenticated `/app` deployment environment without committing secrets.
8. Deploy the authenticated app using the documented existing architecture. Do not redesign hosting unless the documented target is impossible; if blocked, document the blocker rather than inventing a replacement platform.
9. Verify signup, email-confirmation behavior, login, logout and password reset.
10. Verify startup and investment-firm organization creation.
11. Verify invitation acceptance and member-role boundaries.
12. Verify founder profile/readiness/material persistence.
13. Verify investor profile/thesis persistence.
14. Verify document upload/download/delete.
15. Run a two-organization acceptance test proving cross-org private row isolation.
16. Run a two-organization storage test proving cross-org file isolation.
17. Confirm the public `/` and `/demo` build remains browser-only and contains no backend/service-role secrets.
18. Run typecheck, tests, relevant DB/RLS tests and production builds.
19. Update `docs/TEST_EVIDENCE.md`, `docs/BACKEND.md`, and `ROADMAP.md` only with facts actually verified.

## Supabase security review requirements

Pay special attention to:

- no authorization decisions using user-editable `user_metadata`;
- `UPDATE` RLS policies having both `USING` and `WITH CHECK` where applicable;
- `TO authenticated` never being treated as sufficient authorization by itself;
- `SECURITY DEFINER` functions not being executable by `PUBLIC`/`anon` unless explicitly intended;
- explicit `auth.uid()`/organization checks inside privileged helpers;
- views, if any, not bypassing RLS unexpectedly;
- Storage upsert permissions matching intended insert/select/update behavior;
- service-role credentials never reaching the browser or Pages bundle.

## Do not build

Do not add:

- semantic/pgvector matching;
- production candidate retrieval;
- realtime notifications;
- queued AI extraction;
- billing;
- integrations;
- generic messaging/chat;
- UI redesign;
- Redis/Kafka/OpenSearch/Kubernetes/microservices.

## Deliverable

Return a PR-ready implementation and report:

- exact live backend used;
- migration/schema changes;
- files changed;
- deployment URL;
- tests/builds run and results;
- two-org RLS evidence;
- two-org Storage evidence;
- auth-flow evidence;
- remaining blockers;
- explicit statement whether Phase 5 is ready for GPT-5.6 Sol acceptance review.

Then **always include a complete ready-to-paste GPT-5.6 Sol follow-up prompt** using `docs/ai-prompts/SONNET_TO_SOL_HANDOFF_TEMPLATE.md`. Fill it with the actual implementation context, branch/PR/SHA, backend identity, deployment state, migrations, verification evidence, security notes, blockers, files to inspect first, and the exact acceptance task for Sol.

The handoff prompt must tell Sol to independently review the PR, rerun the Phase 5 gate, return an explicit ACCEPT/REJECT decision, and either identify the next roadmap phase or generate the corrective Sonnet prompt. The user should never need to reconstruct context manually.

Stop after Phase 5. Do not merge unless explicitly instructed.
