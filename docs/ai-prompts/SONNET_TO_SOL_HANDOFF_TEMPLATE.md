# Sonnet 5 → GPT-5.6 Sol handoff template

Every Sonnet 5 implementation turn must end with a **ready-to-paste follow-up prompt for GPT-5.6 Sol**. This is mandatory even when the phase is blocked or incomplete.

The purpose is to preserve exact context between models so Sol can review the implementation, run the acceptance gate, identify defects, decide whether the phase can be accepted, and determine the next safe step without reconstructing the session from scratch.

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

VERIFICATION COMPLETED
- Typecheck: <PASS/FAIL/NOT RUN + command>
- Unit tests: <PASS/FAIL/NOT RUN + count/command>
- DB/RLS/security tests: <PASS/FAIL/NOT RUN + evidence>
- Production build: <PASS/FAIL/NOT RUN>
- Demo/Pages build: <PASS/FAIL/NOT RUN>
- Browser/end-to-end acceptance: <PASS/FAIL/PARTIAL/NOT RUN + evidence>
- Other phase-specific verification: <results>

SECURITY / DATA BOUNDARY NOTES
- <RLS/auth/storage/secrets/provenance finding>
- <cross-org or permission evidence where applicable>
- <anything Sol should attack or verify independently>

KNOWN BLOCKERS / UNCERTAINTIES
- <blocker or "None known">

FILES / AREAS SOL SHOULD REVIEW FIRST
1. <path or subsystem>
2. <path or subsystem>
3. <path or subsystem>

SOL TASK
1. Read AGENTS.md, ROADMAP.md, README.md, docs/MATCHING_ARCHITECTURE.md, and the relevant phase acceptance/review docs.
2. Inspect the PR/diff and independently verify the implementation claims above.
3. Run the appropriate GPT-5.6 Sol review/acceptance prompt from docs/ai-prompts/GPT56_SOL_REVIEW_PROMPTS.md.
4. Check architecture, security, authorization, data isolation, regression risk, deployment truth, and whether documentation overclaims anything.
5. Return an explicit ACCEPT or REJECT for this phase, with P0/P1/P2 findings.
6. If ACCEPTED, state the exact next roadmap phase and write the next scoped Sonnet 5 implementation prompt or point to the existing repo prompt that should be used.
7. If REJECTED, write the exact corrective Sonnet 5 prompt needed to clear the gate. Do not allow work to advance to the next roadmap phase.

Do not merge unreviewed implementation merely because CI is green. Do not expand scope beyond the current acceptance boundary.
```

## Rules for Sonnet

- Never return only a prose summary; include the filled GPT-5.6 Sol follow-up prompt.
- Never claim a test, deployment, migration, auth flow, or external integration succeeded unless it was actually verified.
- Include exact PR/branch/commit/backend/deployment identifiers when available.
- If blocked, the handoff prompt must make the blocker the first task for Sol to evaluate.
- If no code changed, still produce the handoff prompt and explain why.
- The prompt must be self-contained enough that a fresh GPT-5.6 Sol conversation can continue without access to Sonnet's chat history.
