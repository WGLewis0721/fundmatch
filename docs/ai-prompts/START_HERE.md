# Start here

The active FundMatch milestone is **Roadmap Phase 5 — Authenticated deployment acceptance**.

## Current gate status

GPT-5.6 Sol previously **REJECTED Phase 5 for production acceptance** because the live FundMatch backend/deployment did not yet satisfy the Phase 5 boundary.

Read:

`docs/ai-prompts/PHASE5_ACCEPTANCE_RESULT_2026-09-10.md`

Phase 6 remains blocked until Phase 5 implementation is corrected, GitHub Copilot performs the required validation, and Sol accepts the evidence.

## Resource-efficient agent split

For this phase and all later phases:

```text
Sonnet 5 = implement
GPT-5.6 Sol = architecture/security/code review
GitHub Copilot = extended mechanical validation + evidence
GPT-5.6 Sol = final ACCEPT / REJECT
Opus/Astra = refinement/polish after acceptance
```

Sonnet and Sol should not spend their context windows on exhaustive validation that Copilot can perform.

## Sonnet 5 — next action

Start with:

`docs/ai-prompts/SONNET5_PHASE5_CONTINUE_AFTER_GATE.md`

Also read:

- `docs/ai-prompts/SONNET_TO_SOL_HANDOFF_TEMPLATE.md`
- `docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md`
- Phase 5 in `docs/ai-prompts/GITHUB_COPILOT_VALIDATION_PROMPTS.md`

Sonnet should implement Phase 5, run only minimum sanity checks, open a PR, propose the exact Copilot validations, and output a ready-to-paste Sol context prompt.

Before implementation, confirm the session has credentialed access to FundMatch project `ejzizfvjnpzieigviglc` or the appropriate Lovable-backed database/deployment path. Do not touch the separate APEX Supabase project `fnmxlmjrkgojowpzrcwa`.

Key pending migrations remain:

- `0002_fundmatch_accounts_persistence.sql`
- `0003_phase5_function_privileges.sql`

## GPT-5.6 Sol — after Sonnet's PR

Use Sonnet's generated Sol prompt.

Sol should inspect the actual PR/diff and review architecture, RLS design, privileged-function boundaries, migration safety, deployment truthfulness, and scope. Sol should **not** personally execute the entire signup/recovery/browser/two-org/Storage/regression matrix.

Sol must conclude the review with a ready-to-paste GitHub Copilot validation prompt using:

- `docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md`
- Phase 5 in `docs/ai-prompts/GITHUB_COPILOT_VALIDATION_PROMPTS.md`
- `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md` as the acceptance criteria source

## GitHub Copilot — validation

Copilot performs the requested extended Phase 5 checks and returns evidence plus a ready-to-paste Sol follow-up prompt.

## GPT-5.6 Sol — final decision

After Copilot evidence, use Prompt G in `GPT56_SOL_REVIEW_PROMPTS.md` and return:

- `ACCEPT PHASE 5` → identify the next roadmap phase/Sonnet prompt; or
- `REJECT PHASE 5` → write the exact corrective Sonnet prompt.

Do not begin Phase 6 before explicit Sol acceptance.
