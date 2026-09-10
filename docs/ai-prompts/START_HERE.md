# Start here

The active FundMatch milestone is **Roadmap Phase 5 — Authenticated deployment acceptance**.

## Current gate status

GPT-5.6 Sol ran the Phase 5 acceptance gate on 2026-09-10 and **REJECTED Phase 5 for production acceptance**.

Read the full result first:

`docs/ai-prompts/PHASE5_ACCEPTANCE_RESULT_2026-09-10.md`

Phase 6 is blocked until the Phase 5 blockers are fixed and Sol reruns/accepts the gate.

## Sonnet 5 — next action

Start here:

`docs/ai-prompts/SONNET5_PHASE5_CONTINUE_AFTER_GATE.md`

That prompt contains the verified backend identity, live schema/RLS findings, migration order, deployment requirements, tests, hard boundaries and required final report.

Use it as the implementation contract. Branch from the latest `main`, complete Phase 5 only, open a PR, and stop for Sol review.

The key pending migrations are:

- `0002_fundmatch_accounts_persistence.sql`
- `0003_phase5_function_privileges.sql`

Do **not** touch the separate APEX Supabase project `fnmxlmjrkgojowpzrcwa`.

## GPT-5.6 Sol — after Sonnet's PR

Run:

1. `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md`
2. `docs/ai-prompts/PHASE5_ACCEPTANCE_RESULT_2026-09-10.md` as the previous-gate baseline
3. the relevant review prompts in `docs/ai-prompts/GPT56_SOL_REVIEW_PROMPTS.md`

Verify the actual deployed `/app`, live FundMatch schema/RLS/storage, auth flows and two-organization isolation before accepting Phase 5.

Phase 6 must not begin until Sol explicitly accepts Phase 5.
