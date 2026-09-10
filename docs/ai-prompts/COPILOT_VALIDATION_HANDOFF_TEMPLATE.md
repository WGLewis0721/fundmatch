# GitHub Copilot validation handoff template

Use this template whenever Sonnet 5 or GPT-5.6 Sol hands validation work to GitHub Copilot.

The goal is resource efficiency: Sonnet builds, Sol reasons/reviews, and Copilot performs the broader mechanical validation, regression, adversarial, browser, and evidence-gathering work.

## Validation responsibility split

### Sonnet 5

Sonnet should perform only the minimum implementation sanity checks needed to avoid handing off obviously broken code, such as the directly relevant typecheck/build/test command for the changed area when practical. Do not spend the implementation turn on exhaustive browser matrices, broad regression sweeps, adversarial testing, repeated build combinations, or above-and-beyond validation.

At the end of the implementation report, Sonnet must propose the validations Copilot should perform. Sol may edit, add, remove, or prioritize those checks after reviewing the diff.

### GPT-5.6 Sol

Sol should inspect architecture, authorization design, state/data contracts, migration safety, product truthfulness, and the actual PR diff. Sol should not duplicate long mechanical validation work that Copilot can perform.

Sol's review must conclude with a **ready-to-paste GitHub Copilot validation prompt**. That prompt is the authoritative validation assignment for the phase.

### GitHub Copilot

Copilot owns extended validation and evidence collection. Unless explicitly told otherwise, Copilot should not redesign product architecture or add unrelated features. It may add focused regression tests or validation harnesses needed to prove/falsify the implementation, but should not turn a validation task into a feature build.

## Required Copilot validation prompt

```text
GITHUB COPILOT VALIDATION PROMPT

You are the validation and regression engineer for FundMatch.

Repository: WGLewis0721/fundmatch
Phase/milestone: <phase>
Implementation branch/PR: <branch + PR number/URL>
Head commit to validate: <SHA>
Validation requested by: <Sonnet 5 or GPT-5.6 Sol>

CONTEXT
<Brief description of what was implemented and why.>

DO NOT REDESIGN OR EXPAND SCOPE
Validate the implementation as written. Do not add unrelated features, change approved architecture, redesign UI, or move into the next roadmap phase.

VALIDATIONS TO PERFORM
1. <specific validation>
2. <specific validation>
3. <specific validation>
...

PRIORITY
- P0 validations: <security/data-loss/core correctness>
- P1 validations: <core flow/regression/reliability>
- P2 validations: <non-blocking quality checks, only if requested>

EVIDENCE REQUIRED
- exact commands/actions performed;
- PASS/FAIL for each requested validation;
- relevant logs/output summaries;
- URLs/screenshots or database evidence when applicable;
- exact failing case and reproduction steps for every failure;
- any focused test files added only to prove the behavior;
- confirmation that no unrelated product scope was added.

IF A VALIDATION FAILS
Do not hide or work around the failure. Identify whether it is an implementation defect, environment/configuration blocker, flaky test, or invalid validation assumption. Make only a narrowly scoped validation/test fix when appropriate; otherwise report the product defect back to Sol/Sonnet.

FINAL RESPONSE
Return:
- overall VALIDATION PASS / VALIDATION FAIL / BLOCKED;
- result table or concise list for every requested check;
- P0/P1/P2 findings;
- files changed for validation only, if any;
- exact remaining blocker(s);
- a ready-to-paste GPT-5.6 Sol follow-up prompt summarizing the evidence and asking Sol for the final acceptance decision.
```

## Rules

- Copilot validation evidence must distinguish **not run**, **blocked**, **failed**, and **passed**.
- CI green by itself is not proof of live deployment/auth/RLS/browser behavior.
- Do not repeat expensive tests that are unrelated to the changed phase.
- Prefer focused validation over broad test theater.
- Security-sensitive phases should prioritize adversarial boundary checks; UI-heavy phases should prioritize browser/user-flow checks; data-pipeline phases should prioritize idempotency/failure/retry evidence.
