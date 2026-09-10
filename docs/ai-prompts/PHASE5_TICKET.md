# Phase 5 implementation ticket — Sonnet 5

**Objective:** complete authenticated deployment acceptance for FundMatch and stop before Phase 6.

**Primary prompt:** `docs/ai-prompts/PHASE5_SONNET_HANDOFF.md`

**Required preflight:** `docs/ai-prompts/PHASE5_PREIMPLEMENTATION_REVIEW.md`

**Acceptance gate:** `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md`

## Critical facts

- Intended FundMatch Supabase ref: `ejzizfvjnpzieigviglc`.
- Original Lovable project: `34443a2f-0671-4404-94db-fe807d4a7448`.
- Connected standalone Supabase project `fnmxlmjrkgojowpzrcwa` is APEX. Do not modify it.
- Live FundMatch database still has pre-Phase-5 permissive RLS.
- Apply/reconcile `0002_fundmatch_accounts_persistence.sql` and `0003_phase5_function_privileges.sql`.
- Live two-organization row and private-Storage isolation is mandatory before acceptance.

## Completion output

Return a PR with exact deployment URL, schema/migration evidence, auth evidence, two-org RLS evidence, private Storage evidence, tests/builds, remaining blockers, and a statement that the PR is ready for GPT-5.6 Sol acceptance review.
