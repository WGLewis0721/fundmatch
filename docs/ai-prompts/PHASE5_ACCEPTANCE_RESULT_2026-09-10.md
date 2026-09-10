# Phase 5 acceptance result — 2026-09-10

**Reviewer:** GPT-5.6 Sol

**Result:** **REJECT Phase 5 — production acceptance not yet achieved.**

Phase 6 must not begin until the blockers below are fixed and this gate is rerun.

## Scope reviewed

- GitHub repository: `WGLewis0721/fundmatch`
- Current default branch: `main`
- Intended FundMatch backend ref: `ejzizfvjnpzieigviglc`
- Original Lovable project: `34443a2f-0671-4404-94db-fe807d4a7448`
- Separate Supabase project `fnmxlmjrkgojowpzrcwa` was identified as APEX and was not modified.

## Merge/repository state

There was no unmerged Phase 5 implementation PR to merge. The Phase 5 audit, handoff, migration hardening, tests and active-task documentation were already committed to `main`.

Unrelated draft PR #5 remains open and was intentionally not merged as part of this gate.

## Gate results

### Backend identity — PASS

The FundMatch backend is the database attached to the original Lovable project above. The separate connected Supabase project contains APEX-specific tables and was not touched.

### Repository build/typecheck/unit regression — PASS

GitHub Actions run `34497237893` on `main` completed successfully. Its build job passed:

- dependency install
- `bun run build`
- `bun run typecheck`
- `bun test`
- `bun run build:pages`
- Pages artifact upload

The deploy job for the public GitHub Pages demo also completed successfully.

Important boundary: this does **not** prove the live FundMatch database/RLS/storage acceptance tests because the normal `bun test` suite skips database-policy tests unless the dedicated database test URL is configured.

### Live Phase 5 schema — FAIL

The live FundMatch database does not currently contain the Phase 5 tables expected from `0002_fundmatch_accounts_persistence.sql`:

- `organization_invitations`
- `readiness_items`
- `documents`
- `profile_suggestions`

The Phase 5 RPC/helper functions checked during the gate are also absent from the live database.

### Live RLS authorization model — FAIL / P0

The old permissive policies are still installed. Observed examples include:

- `profiles readable by authenticated` — `SELECT`, `USING (true)`
- `orgs read` — `SELECT`, `USING (true)`
- `orgs write` — `ALL`, `USING (true)`, `WITH CHECK (true)`
- `startups read` — `SELECT`, `USING (true)`
- `startups write` — `ALL`, `USING (true)`, `WITH CHECK (true)`
- `matches read` — `SELECT`, `USING (true)`
- `matches write` — `ALL`, `USING (true)`, `WITH CHECK (true)`
- `members insert own` — allows an authenticated user to insert their own membership row under the old model.

This is incompatible with the intended organization-isolated private application. Do not put real confidential fundraising material into the current live backend until this is replaced and retested.

### Private document storage — FAIL / P0

`storage.buckets` currently contains no buckets. The required private `documents` bucket and its RLS storage policies are not installed.

### Function privilege hardening — NOT YET DEPLOYED

The repo now includes `0003_phase5_function_privileges.sql` and focused regression coverage to ensure helper functions cannot become public lookup endpoints. This hardening has not been applied to the live FundMatch database because `0002` itself has not yet been reconciled/applied there.

### Auth flows — NOT ACCEPTED

Signup, confirmation, login, logout and password recovery are implemented in source, but this gate did not accept them as production-real because the authenticated app is not deployed against the reconciled Phase 5 backend and the required end-to-end email/redirect tests have not been completed.

### Organization workflow — NOT ACCEPTED

The current live backend lacks the Phase 5 organization creation/invitation RPC model. Startup/investment-firm creation, invitations, roles and last-owner protections therefore remain unaccepted in production.

### Persistence and two-org isolation — FAIL / NOT TESTABLE YET

A meaningful two-organization production isolation test cannot pass against the intended Phase 5 model while the old permissive policies remain live. The new schema/policies must be installed first, then tested using two independent users/organizations.

### Authenticated deployment — FAIL / P0

The original Lovable project reports `is_published: false` and its latest Lovable commit is `cce45ab85294cdbf1e3a62c64dfd1d0cd711bd72`, which predates the current GitHub `main` Phase 5 work. Do not publish that stale build as the accepted authenticated app.

The public GitHub Pages demo is deployed successfully, but it is intentionally not the private `/app` production deployment.

## Required blockers before rerun

1. Sync/checkout current `main` and confirm the intended FundMatch project/backend identity.
2. Reconcile the live schema against repository migrations instead of blindly replaying already-applied schema.
3. Apply the missing Phase 5 changes from `0002_fundmatch_accounts_persistence.sql` safely.
4. Apply `0003_phase5_function_privileges.sql` immediately after `0002`.
5. Verify all old permissive policies are gone and the organization-scoped policies are active.
6. Verify helper/RPC function execute privileges and caller checks.
7. Create/verify the private `documents` bucket and storage policies.
8. Regenerate Supabase TypeScript types from the real FundMatch schema if the environment permits.
9. Deploy the current authenticated `/app` with the intended FundMatch environment variables/secrets using the documented architecture.
10. Complete signup/confirmation/login/logout/recovery acceptance.
11. Create two independent organizations and test row-level isolation directly.
12. Test private document upload/download/delete and cross-org denial.
13. Run DB/RLS tests against the real/representative migrated schema, plus normal build/typecheck/unit/Pages regression.
14. Update `docs/TEST_EVIDENCE.md`, `docs/BACKEND.md` and `ROADMAP.md` only with verified results.
15. Return the implementation for GPT-5.6 Sol to rerun this gate.

## Gate decision

**REJECT Phase 5.**

Reason: the public code/build is healthy, but the actual private backend is still on the old permissive authorization model, Phase 5 tables/storage are missing, and `/app` has not been deployed/accepted against the intended backend.

**Phase 6 remains blocked.**
