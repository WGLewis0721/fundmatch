# Start here

The active FundMatch milestone is **Roadmap Phase 5 — Authenticated deployment acceptance**.

## Current gate status

GPT-5.6 Sol ran the Phase 5 acceptance gate on 2026-09-10 and **REJECTED Phase 5 for production acceptance**.

Read the full result first:

`docs/ai-prompts/PHASE5_ACCEPTANCE_RESULT_2026-09-10.md`

Phase 6 is blocked until the Phase 5 blockers are fixed and Sol reruns/accepts the gate.

## Sonnet 5 continuation attempt — blocked on environment access (2026-09-10)

A Sonnet 5 continuation session attempted the work below and could not reach
the live FundMatch backend or any deployment platform from that session
(its Supabase MCP connection only exposed the APEX project). Read:

`docs/ai-prompts/SONNET5_PHASE5_BLOCKED_2026-09-10.md`

That document records exactly what was verified without live-backend access
(migrations apply cleanly locally, full test suite passes, typecheck clean,
both builds succeed, no backend secrets in the public bundle) and exactly
what a future session needs (real credentials/access to FundMatch project
`ejzizfvjnpzieigviglc` and a deployment path for `/app`) before the
remaining live blockers can be closed out.

## Sonnet 5 — next action

Start here:

`docs/ai-prompts/SONNET5_PHASE5_CONTINUE_AFTER_GATE.md`

That prompt contains the verified backend identity, live schema/RLS findings, migration order, deployment requirements, tests, hard boundaries and required final report.

Also read:

`docs/ai-prompts/SONNET_TO_SOL_HANDOFF_TEMPLATE.md`

**Every Sonnet 5 turn must end with a filled, ready-to-paste GPT-5.6 Sol follow-up prompt.** The handoff must preserve the exact phase, branch, PR, head SHA, backend/deployment state, migrations/external changes, tests and security evidence, blockers, files Sol should review first, and the exact acceptance task. The user should not have to reconstruct context between models.

Use the Phase 5 continuation prompt as the implementation contract. Branch from the latest `main`, complete Phase 5 only, open a PR, and stop for Sol review. **Before starting, confirm the session actually has credentialed access to FundMatch project `ejzizfvjnpzieigviglc`** (Supabase MCP scoped to that project, or the `LOVABLE_DB_MIGRATION_URL` secret) and a way to deploy `/app` — otherwise the live-backend blockers cannot be closed and the session will land in the same blocked state recorded above.

The key pending migrations are:

- `0002_fundmatch_accounts_persistence.sql`
- `0003_phase5_function_privileges.sql`

Do **not** touch the separate APEX Supabase project `fnmxlmjrkgojowpzrcwa`.

## GPT-5.6 Sol — after Sonnet's PR

Sonnet's final response should already contain a self-contained GPT-5.6 Sol follow-up prompt generated from `SONNET_TO_SOL_HANDOFF_TEMPLATE.md`. Give that prompt to Sol.

Sol should then run:

1. `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md`
2. `docs/ai-prompts/PHASE5_ACCEPTANCE_RESULT_2026-09-10.md` as the previous-gate baseline
3. the relevant review prompts in `docs/ai-prompts/GPT56_SOL_REVIEW_PROMPTS.md`

Verify the actual deployed `/app`, live FundMatch schema/RLS/storage, auth flows and two-organization isolation before accepting Phase 5.

If Sol accepts the phase, Sol should identify the exact next roadmap phase and provide the next scoped Sonnet prompt. If Sol rejects it, Sol should provide the exact corrective Sonnet prompt. Phase 6 must not begin until Sol explicitly accepts Phase 5.
