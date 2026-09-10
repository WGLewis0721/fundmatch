# GPT-5.6 Sol — Phase 5 preimplementation review

**Date:** 2026-09-10  
**Result:** Builder may begin Phase 5 after reading the findings below.

## Findings

### P0 — Live FundMatch database is still on permissive pre-Phase-5 RLS

The live Lovable-backed FundMatch database still exposes the original broad policies and is missing the Phase 5 private-workspace tables/storage model. It is not approved for real confidential data yet.

See `docs/PHASE5_ACCEPTANCE_AUDIT.md`.

### P0 — Do not use the connected APEX Supabase project

The standalone Supabase project currently visible to ChatGPT is APEX, not FundMatch. FundMatch work must remain on the Lovable-backed FundMatch database identified in the audit.

### P1 — SECURITY DEFINER helper exposure found in pending migration

Migration `0002_fundmatch_accounts_persistence.sql` creates several RLS helper functions as `SECURITY DEFINER`. PostgreSQL grants EXECUTE to `PUBLIC` by default unless explicitly revoked. The user-facing RPCs in `0002` already revoke/grant explicitly, but the internal RLS helper functions did not all have an explicit privilege boundary.

Two helpers, `startup_org(uuid)` and `investor_org(uuid)`, also returned organization IDs without independently requiring membership, which could turn them into direct metadata lookup RPCs for unrelated authenticated users.

### Fix added before production migration

Added migration:

`drizzle/migrations/0003_phase5_function_privileges.sql`

It:

- revokes anonymous/PUBLIC access to RLS helper functions;
- grants intended helper execution to `authenticated` and `service_role` where required by policies;
- scopes `startup_org()` and `investor_org()` results to organizations the caller belongs to;
- removes direct authenticated execution of trigger-only helpers;
- removes direct authenticated execution of the auth trigger helper;
- preserves the existing RLS architecture rather than introducing a new service boundary.

Migration `0003` is registered in the Drizzle journal and the local migration test script.

### Regression test added

Added:

`tests/db/function-privileges.test.ts`

The test covers:

- anonymous callers cannot execute SECURITY DEFINER RLS helpers;
- trigger-only helper functions are not executable by authenticated clients;
- `startup_org()` and `investor_org()` return only the caller's organization and do not disclose unrelated organization IDs.

## Builder requirement

Sonnet 5 must apply/reconcile **both `0002` and `0003`** as part of Phase 5 and run the full database/RLS test suite before live acceptance.

Do not mark Phase 5 accepted based only on static migrations or local tests. Live two-organization database and Storage isolation remain mandatory.
