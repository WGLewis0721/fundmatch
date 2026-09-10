# Sonnet 5 → GPT-5.6 Sol handoff template

Every Sonnet 5 implementation turn must end with a **ready-to-paste follow-up prompt for GPT-5.6 Sol**. This is mandatory even when the phase is blocked or incomplete.

The workflow is intentionally resource-efficient: Sonnet implements, Sol reviews architecture/correctness, and GitHub Copilot performs the broader mechanical validation. Sonnet should not spend its implementation turn on exhaustive validation that can be delegated.

## Sonnet validation boundary

Sonnet may run only the minimum sanity checks needed to avoid handing off obviously broken work: for example a directly relevant typecheck/build command, focused changed-area test, or migration parse/apply check when practical. Do **not** perform broad regression suites, extensive browser walkthroughs, adversarial matrices, repeated cross-environment testing, or above-and-beyond validation unless the task cannot be implemented safely without a narrow check.

Sonnet must instead propose the phase-specific validation work that GitHub Copilot should perform. GPT-5.6 Sol reviews that proposal and writes the authoritative Copilot validation prompt.

## Required handoff prompt

Sonnet must include the following block in its final response, filled with real values from the completed work:

```text
GPT-5.6 SOL FOLLOW-UP PROMPT

You are the technical lead and acceptance reviewer for FundMatch.

Repository: WGLewis0721/fundmatch
Phase/milestone just worked: <roadmap phase and name>
Implementation branch: <branch>
Pull request: <PR number and URL, or explain why no PR exists>
Head commit: <SHA>

CONTEXT
Sonnet 5 just completed/attempted the implementation work for <phase>. The goal was:
<1-3 sentence goal>

WHAT CHANGED
- <important code/schema/infrastructure change>
- <important code/schema/infrastructure change>
- <important code/schema/infrastructure change>

LIVE ENVIRONMENT / EXTERNAL STATE
- Backend/project actually used: <exact project/ref/environment>
- Deployment URL(s): <URLs or NOT DEPLOYED>
- Migrations/infrastructure changes actually applied: <facts only>
- External systems intentionally NOT modified: <for example APEX>

MINIMUM SANITY CHECKS SONNET RAN
- <directly relevant check + PASS/FAIL/NOT RUN>
- <directly relevant check + PASS/FAIL/NOT RUN>
Do not imply these are full acceptance validation.

SECURITY / DATA BOUNDARY NOTES FROM IMPLEMENTATION
- <RLS/auth/storage/secrets/provenance design note>
- <important permission/state boundary>
- <anything Sol should inspect closely>

KNOWN BLOCKERS / UNCERTAINTIES
- <blocker or "None known">

FILES / AREAS SOL SHOULD REVIEW FIRST
1. <path or subsystem>
2. <path or subsystem>
3. <path or subsystem>

PROPOSED GITHUB COPILOT VALIDATIONS
1. <specific mechanical/security/browser/regression validation>
2. <specific validation>
3. <specific validation>
4. <additional phase-specific checks as needed>

SOL TASK
1. Read AGENTS.md, ROADMAP.md, README.md, docs/MATCHING_ARCHITECTURE.md, and the relevant phase docs.
2. Inspect the actual PR/diff and evaluate architecture, authorization design, state/data contracts, migration safety, product truthfulness, and scope adherence.
3. Do not duplicate broad mechanical validation that GitHub Copilot can perform.
4. Correct/prioritize Sonnet's proposed validations and conclude your review with a complete ready-to-paste GitHub Copilot prompt using docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md and the matching prompt in GITHUB_COPILOT_VALIDATION_PROMPTS.md.
5. After Copilot returns validation evidence, make the phase ACCEPT/REJECT decision. If rejected, write the corrective Sonnet prompt; if accepted, identify the exact next roadmap phase and its Sonnet prompt.

Do not merge unreviewed implementation merely because a minimal sanity check or CI is green. Do not expand scope beyond the current acceptance boundary.
```

## Rules for Sonnet

- Always include the filled GPT-5.6 Sol follow-up prompt.
- Always include **proposed GitHub Copilot validations** for the exact work performed.
- Do not burn time/tokens on exhaustive validations assigned to Copilot.
- Never claim a deployment, migration, auth flow, or integration succeeded unless actually observed during implementation.
- Include exact PR/branch/commit/backend/deployment identifiers when available.
- If blocked, make the blocker explicit and tell Sol/Copilot what can still be validated.
- The handoff must be self-contained enough that a fresh Sol session can continue without Sonnet's chat history.
