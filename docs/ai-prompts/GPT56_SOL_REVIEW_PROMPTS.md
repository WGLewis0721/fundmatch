# GPT-5.6 Sol — FundMatch technical lead / review prompts

Use these prompts before and after Sonnet 5 implements each phase.

## Prompt A — Pre-build scope and acceptance

Act as FundMatch's technical lead.

Repository: `WGLewis0721/fundmatch`

Read `AGENTS.md`, `ROADMAP.md`, `docs/MATCHING_ARCHITECTURE.md`, `docs/IMPLEMENTATION_NEXT_STEPS.md`, `README.md`, and the docs relevant to the assigned phase.

Task: convert the selected roadmap phase into a concise implementation contract for Sonnet 5.

Produce:
- exact user-visible outcome
- required schema/data changes
- authorization/RLS boundary
- server vs browser responsibility
- idempotency/retry requirements
- tests required for acceptance
- explicit non-goals
- likely failure modes
- files/components likely affected

Do not write speculative features or change the approved modular-monolith architecture unless the existing design is demonstrably unsafe or impossible.

## Prompt B — PR architecture review

Review the Sonnet 5 PR against the roadmap and architecture docs.

Inspect the actual diff, migrations, tests and affected call paths. Do not review from the PR description alone.

Check:
1. Does the implementation satisfy the phase's real user outcome?
2. Does it preserve public-demo/private-app separation?
3. Are RLS and organization boundaries enforced at the database/server boundary rather than only in UI code?
4. Are secrets/service-role credentials server-only?
5. Are state transitions, retries and duplicate requests idempotent?
6. Are current state and append-only history modeled cleanly where relevant?
7. Does AI remain suggestion/provenance based rather than silently authoritative?
8. Are mocked/incomplete capabilities labeled honestly?
9. Did the implementation introduce premature Redis/Kafka/search/Kubernetes/microservices?
10. Are tests meaningful enough to catch cross-organization data leakage and workflow corruption?

Return only one of:
- `ACCEPT` with concise evidence, or
- `CHANGES REQUIRED` with a numbered correction list ordered P0/P1/P2.

Do not polish styling in this review.

## Prompt C — Security and tenancy acceptance

Perform a FundMatch security/tenancy review of the current phase.

Focus on:
- cross-organization reads/writes
- storage object access
- invitation/member-role escalation
- service-role exposure
- insecure direct object references
- unauthorized workflow transitions
- realtime channel authorization
- notification/email information leakage
- document/AI worker privilege boundaries
- user-controlled URLs/files/content
- event-history tampering

Where possible, verify behavior using two separate test organizations/users instead of relying only on code inspection.

Return: exploitable findings first, then defense-in-depth issues, then passed controls.

## Prompt D — Matching/recommendation acceptance

Review FundMatch's production discovery/ranking implementation.

Verify this order is preserved:

`hard eligibility → candidate retrieval → deterministic score → optional semantic augmentation → business/diversity rules → explanation → decision`

Check that:
- explicit exclusions/hard mandate constraints cannot be overridden by embeddings/AI
- suppressed/decided candidates are handled predictably
- ranking inputs and model/version context are reproducible
- explanations are consistent with actual scoring signals
- proprietary weights/configuration are not exposed unnecessarily
- tests include edge cases and adversarial combinations

Do not require a learned ranking model before real outcome data exists.

## Prompt E — Workflow acceptance

Review the investor-interest/founder-response workflow.

Verify:
- `Interested` is a permissioned request, not automatic contact disclosure
- only relevant organizations can read/write it
- Accept/Decline/Request-more-info transitions are valid and auditable
- duplicate interest/retry behavior is safe
- founder response reaches the correct investor organization
- notification delivery is separate from source-of-truth state
- no fake 'match' or introduction is claimed before founder acceptance

Return acceptance decision and exact fixes.

## Prompt F — AI/document pipeline acceptance

Review queue-backed AI/document processing.

Verify:
- private files stay private
- queue jobs are durable, retryable and idempotent
- service-role credentials are worker-only
- parsing/LLM failures produce safe user-visible states
- suggestions preserve confidence, rationale and provenance
- accepting/rejecting suggestions is authorized and auditable
- AI never silently overwrites canonical founder claims
- duplicate queue delivery cannot duplicate/garble suggestions or processing state

## Prompt G — Pre-merge regression gate

Run the final technical gate after Sonnet corrections and Opus refinement.

Required checks:
- typecheck
- lint
- unit tests
- relevant DB/RLS tests
- production app build
- static Pages/demo build if touched
- no secrets in tracked source/public bundle
- no demo regression
- no cross-org regression
- docs accurately describe what is actually live

Compare the branch against `main` and ensure refinement did not alter approved behavior or architecture.

Return `MERGE READY` or a short blocker list.

## Prompt H — Pilot readiness review

Review FundMatch as if a small cohort of founders and angel/small-VC users will use it next.

Walk the complete production loop and identify only issues that materially affect trust, task completion, security or learning from the pilot.

Rank findings:
- P0: unsafe/data-loss/data-leak/broken core flow
- P1: significantly damages completion/trust/measurement
- P2: polish or improvement that can wait

Do not turn pilot preparation into a redesign or feature expansion.
