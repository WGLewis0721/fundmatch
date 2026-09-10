# GPT-5.6 Sol — FundMatch technical lead / review prompts

Use these prompts before and after Sonnet 5 implements each phase.

GPT-5.6 Sol is the **technical lead and architecture reviewer**, not the primary mechanical validation agent. GitHub Copilot owns extended regression, adversarial, browser, environment, and evidence-gathering validation.

For every post-implementation Sol review:

1. inspect the real diff, architecture, authorization/data model, migrations, state transitions, and product truthfulness;
2. run only a narrow spot-check when needed to resolve an important ambiguity;
3. do not duplicate broad validation that Copilot can perform;
4. conclude by writing a complete ready-to-paste GitHub Copilot validation prompt using `docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md` and the relevant phase prompt in `GITHUB_COPILOT_VALIDATION_PROMPTS.md`;
5. make the final ACCEPT/REJECT decision after Copilot returns the requested validation evidence.

## Prompt A — Pre-build scope and acceptance

Act as FundMatch's technical lead.

Repository: `WGLewis0721/fundmatch`

Read `AGENTS.md`, `ROADMAP.md`, `docs/MATCHING_ARCHITECTURE.md`, `docs/IMPLEMENTATION_NEXT_STEPS.md`, `README.md`, and relevant phase docs.

Convert the selected roadmap phase into a concise implementation contract for Sonnet 5.

Produce:
- exact user-visible outcome;
- required schema/data changes;
- authorization/RLS boundary;
- server vs browser responsibility;
- idempotency/retry requirements;
- minimum sanity checks Sonnet should run;
- validation categories GitHub Copilot should later own;
- explicit non-goals;
- likely failure modes;
- files/components likely affected.

Do not write speculative features or change the approved modular-monolith architecture unless the existing design is demonstrably unsafe or impossible.

## Prompt B — PR architecture review + Copilot validation assignment

Review the Sonnet 5 PR against the roadmap and architecture docs.

Inspect the actual diff, migrations and affected call paths. Do not review from the PR description alone.

Evaluate:
1. Does the implementation satisfy the phase's real user outcome?
2. Does it preserve public-demo/private-app separation?
3. Are RLS/organization boundaries enforced at the database/server boundary rather than only UI?
4. Are secrets/service-role credentials server-only?
5. Are state transitions, retries and duplicate requests designed idempotently?
6. Are current state and append-only history modeled cleanly where relevant?
7. Does AI remain suggestion/provenance based rather than silently authoritative?
8. Are mocked/incomplete capabilities labeled honestly?
9. Did the implementation introduce premature infrastructure or scope?
10. What specific claims require mechanical/adversarial/browser validation by Copilot?

Do not spend the review turn running broad test suites or browser matrices.

Return:
- `ARCHITECTURE REVIEW PASS` or `CHANGES REQUIRED`, with P0/P1/P2 code/design findings;
- concise reasoning;
- a complete **GITHUB COPILOT VALIDATION PROMPT** tailored to the PR.

An architecture-review pass is not yet final phase acceptance. Final acceptance follows Copilot evidence.

## Prompt C — Security/tenancy review + Copilot attack plan

Perform a code/design review focused on:
- cross-organization authorization boundaries;
- storage access model;
- invitation/member-role escalation paths;
- service-role exposure;
- IDOR/BOLA risk;
- unauthorized workflow transitions;
- realtime/notification authorization where applicable;
- document/AI worker privileges;
- user-controlled URLs/files/content;
- event-history tampering.

Do not personally run an exhaustive two-user/two-org attack matrix. Inspect the implementation and then write the exact Copilot validations needed to prove or falsify the security claims.

Return P0/P1/P2 design findings plus a ready-to-paste Copilot security validation prompt.

## Prompt D — Matching/recommendation review + validation assignment

Review the production discovery/ranking implementation and verify the design preserves:

`hard eligibility → candidate retrieval → deterministic score → optional semantic augmentation → business/diversity rules → explanation → decision`

Inspect whether:
- hard constraints cannot be overridden by embeddings/AI;
- suppressed/decided candidates are handled predictably;
- ranking inputs/version context are reproducible;
- explanations derive from actual scoring signals;
- proprietary weights/configuration remain private;
- the implementation exposes any obvious edge-case flaw.

Do not spend the turn running a large adversarial ranking matrix. Conclude with the exact Copilot fixtures/cases needed, especially high-similarity candidates that violate hard constraints.

## Prompt E — Workflow review + validation assignment

Review the investor-interest/founder-response implementation.

Inspect whether:
- `Interested` is a permissioned request, not automatic contact disclosure;
- only relevant organizations should be able to access it;
- transition rules are explicit/auditable/idempotent;
- duplicate interest behavior is well-defined;
- founder response routes to the correct investor organization;
- notification delivery stays separate from source-of-truth state;
- no false introduction/match claim occurs before acceptance.

Conclude with the exact Copilot state-machine, retry and cross-org validation prompt.

## Prompt F — AI/document pipeline review + validation assignment

Review queue-backed AI/document processing architecture.

Inspect whether:
- private files stay private by design;
- queue jobs are designed durable/retryable/idempotent;
- service-role credentials are worker-only;
- failure states are safe/honest;
- suggestions preserve confidence/rationale/provenance;
- acceptance/rejection is authorized/auditable;
- canonical founder claims are not silently overwritten;
- duplicate delivery cannot obviously corrupt state.

Do not exhaustively simulate every queue failure. Conclude with the precise Copilot duplicate/retry/failure/security validation prompt.

## Prompt G — Acceptance decision after Copilot evidence

Use this only after GitHub Copilot returns the requested validation report.

Task:
- inspect Copilot's evidence and any validation-only changes;
- ensure requested P0/P1 checks were actually performed;
- distinguish implementation failures from environment blockers or invalid test assumptions;
- perform only narrow spot-checks if the evidence is contradictory or incomplete;
- verify docs do not overclaim what Copilot could not validate.

Return exactly one:
- `ACCEPT PHASE <N>` with concise evidence and the next roadmap phase; or
- `REJECT PHASE <N>` with P0/P1/P2 blockers and the exact corrective Sonnet prompt.

If accepted, provide/point to the next scoped Sonnet prompt. If rejected, do not allow the next phase to begin.

If Opus/Astra subsequently refine an accepted phase, write a focused Copilot post-refinement regression prompt instead of personally rerunning the entire historical test suite.

## Prompt H — Pilot readiness review + Copilot validation assignment

Review FundMatch as if a small cohort of founders and angel/small-VC users will use it next.

Use implementation evidence and known issues to identify only risks that materially affect trust, completion, security or learning from the pilot.

Rank code/design findings:
- P0: unsafe/data-loss/data-leak/broken core flow;
- P1: significantly damages completion/trust/measurement;
- P2: polish/improvement that can wait.

Do not personally run the complete production loop. Conclude with a focused GitHub Copilot pilot-validation prompt that exercises the loop and gathers evidence. Avoid exhaustive compatibility matrices unless a known defect justifies them.
