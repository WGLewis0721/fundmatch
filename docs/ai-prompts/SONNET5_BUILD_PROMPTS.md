# Sonnet 5 — FundMatch implementation prompts

Use one prompt at a time. Do not start the next phase until GPT-5.6 Sol accepts the current phase.

## Mandatory completion protocol for every Sonnet prompt

Sonnet 5 is the **builder**, not the exhaustive validation agent.

For each phase:

1. implement the scoped feature/infrastructure work;
2. run only the minimum sanity checks needed to avoid handing off obviously broken work (for example a directly relevant typecheck/build/focused changed-area test when practical);
3. do **not** spend the turn on broad regression suites, extensive browser walkthroughs, adversarial matrices, repeated environment checks, or above-and-beyond validation;
4. propose the exact validations GitHub Copilot should perform;
5. finish with a complete GPT-5.6 Sol follow-up prompt using `docs/ai-prompts/SONNET_TO_SOL_HANDOFF_TEMPLATE.md`.

Sol will review the architecture/diff and turn the proposed checks into the authoritative Copilot validation prompt. GitHub Copilot owns extended validation and evidence gathering.

Never claim an unverified deployment/test/external change succeeded. Stop after handing the current phase to Sol.

## Prompt 1 — Authenticated production deployment

You are the primary implementation engineer for FundMatch.

Repository: `WGLewis0721/fundmatch`

Read `AGENTS.md`, `ROADMAP.md`, `docs/MATCHING_ARCHITECTURE.md`, `docs/IMPLEMENTATION_NEXT_STEPS.md`, `docs/BACKEND.md`, `README.md`, and `docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md` before changing code.

Goal: complete Roadmap Phase 5 — Authenticated deployment acceptance implementation.

Tasks:
- Inspect the existing `/app` implementation and current Supabase configuration.
- Wire the intended FundMatch Supabase project and deployment environment without exposing secrets.
- Reconcile/apply the intended Phase 5 migrations and security model.
- Prepare/deploy the authenticated app using the documented architecture.
- Fix only implementation issues required for this acceptance boundary.
- Add focused tests only when they are directly part of the implementation contract; leave extended execution/validation to GitHub Copilot.
- Update docs with what was actually changed or directly observed.

Do not redesign the UI, add AI features, billing, integrations, production discovery, or change architecture.

Return: changed files, implementation/deployment state, minimum sanity checks, blockers, PR-ready summary, proposed GitHub Copilot validations, and the completed GPT-5.6 Sol follow-up prompt.

## Prompt 2 — Production candidate retrieval

Implement only the production discovery retrieval layer for Roadmap Phase 6.

Goal: authenticated investor users receive eligible startup candidates from Postgres instead of demo/localStorage data.

Requirements:
- hard eligibility filters remain authoritative: visibility, stage, sector, geography, check/raise compatibility and explicit exclusions;
- query respects RLS and organization permissions;
- private founder documents/readiness/internal fields are not exposed;
- previously decided/suppressed candidates are handled according to the approved state contract;
- retrieval remains deterministic and testable;
- existing MatchEngine remains the scoring baseline; no embeddings yet;
- add indexes only when justified by the actual query.

Do not spend the implementation turn exhaustively exercising eligibility combinations. Define those as Copilot validations.

Return implementation details, minimum sanity checks, proposed Copilot validation cases, and the completed Sol follow-up prompt.

## Prompt 3 — Persistent Pass / Save / Interested

Implement durable production decisions for authenticated investors.

Goal: Pass, Save and Interested survive refresh/login/device changes and produce correct current state.

Requirements:
- persist decisions server-side under the correct user/organization;
- enforce uniqueness/idempotency in the implementation;
- keep current decision state distinct from append-only behavioral history;
- wire existing discovery UI to production data while preserving `/demo` behavior;
- failed server writes must not falsely advance/remove the card.

Do not run broad retry/race/regression matrices yourself. Specify those for Copilot.

Return implementation details, minimum sanity checks, proposed Copilot validations, and the completed Sol follow-up prompt.

## Prompt 4 — Interest → founder response workflow

Implement Roadmap Phase 7 without turning FundMatch into open messaging.

Goal: investor `Interested` creates a permissioned request that the founder organization can Accept, Decline or Request more information.

Requirements:
- create the minimum workflow tables/state transitions;
- do not automatically expose founder personal contact information;
- restrict access with RLS to relevant investor/founder organizations;
- record actor, timestamps and transition history;
- make transitions idempotent and reject invalid transitions;
- add founder pending-interest UI and investor status UI;
- preserve demo-only behavior separately.

Do not perform exhaustive state-machine or cross-org attack testing in this turn; assign it to Copilot.

Return implementation details, minimum sanity checks, proposed Copilot validations, and the completed Sol follow-up prompt.

## Prompt 5 — Append-only marketplace events

Implement the FundMatch discovery/outcome event history defined in the architecture docs.

Goal: preserve auditable behavioral history separately from current state.

Initial event types: impression, profile_open, pass, save, interested, intro_requested, intro_accepted, intro_declined, meeting, diligence, funded and no_deal.

Requirements:
- append-only event records include actor, organization, subject/candidate, timestamp and relevant score/model/version context;
- ordinary clients cannot edit/delete history they should not control;
- current-state tables remain optimized for reads;
- relevant actions emit events;
- document which events are system facts vs user-entered outcomes.

Delegate exhaustive event-integrity/idempotency/authorization validation to Copilot.

Return implementation details, minimum sanity checks, proposed Copilot validations, and the completed Sol follow-up prompt.

## Prompt 6 — Queue-backed AI document processing

Implement Roadmap Phase 8 using the existing Astra/profile-intelligence contracts.

Goal: a private uploaded deck/material can be processed asynchronously into founder-reviewable suggestions with provenance.

Requirements:
- use Supabase Queues/`pgmq` for durable work;
- privileged server-side worker/Edge Function; service-role credentials never reach browser;
- jobs are designed retryable/idempotent;
- preserve document lifecycle states and safe failure messages;
- produce suggestions, never silent profile overwrites;
- preserve provenance and confidence;
- keep private documents private.

If provider credentials are unavailable, implement the durable boundary honestly. Do not spend the build turn exhaustively simulating failure/retry/duplicate cases; assign them to Copilot.

Return implementation details, minimum sanity checks, proposed Copilot validations, and the completed Sol follow-up prompt.

## Prompt 7 — Semantic matching with pgvector

Implement Roadmap Phase 9 only after deterministic production discovery is accepted.

Goal: augment candidate recall using semantic similarity while preserving hard mandate constraints.

Requirements:
- add versioned company/investor-thesis embeddings using `pgvector`;
- generate/update embeddings through server/worker path, not browser;
- SQL hard filters remain authoritative before semantic ranking;
- deterministic MatchEngine score + semantic signal combine under a transparent server-side contract;
- persist enough version metadata to reproduce/explain surfaced scores;
- do not expose proprietary weights publicly.

Do not exhaustively adversarial-test the ranking in the build turn. Write the hard-exclusion/high-similarity cases Copilot must validate.

Return implementation details, minimum sanity checks, proposed Copilot validations, and the completed Sol follow-up prompt.

## Prompt 8 — Realtime + transactional notifications

Implement Roadmap Phase 10.

Goal: users receive important marketplace/workflow changes without manual refresh, with email fallback where appropriate.

Initial events: new investor interest, founder response, document processing completed/failed, new profile suggestion and team pipeline update.

Requirements:
- Postgres remains source of truth;
- use Supabase Realtime Broadcast for in-app delivery;
- store durable notification state where needed;
- use queue-backed transactional email for offline/important events;
- implement dedupe/retry/rate-limit boundaries;
- never leak private data into unauthorized channels.

Do not perform broad reconnect/email/retry/security matrices yourself; assign them to Copilot.

Return implementation details, minimum sanity checks, proposed Copilot validations, and the completed Sol follow-up prompt.

## Prompt 9 — Pilot readiness hardening

Act as the implementation engineer preparing FundMatch for a controlled founder + angel/small-VC pilot.

Goal: fix known implementation defects across the accepted production flow without adding new roadmap scope.

Use existing evidence and reported failures to fix broken states, weak error handling, data-integrity issues and accessibility regressions. Do not personally rerun the entire end-to-end pilot matrix. GitHub Copilot owns that validation pass.

Return changed implementation, minimum sanity checks, known risks, a prioritized Copilot pilot-validation prompt proposal, and the completed Sol follow-up prompt.

## Prompt 10 — Implementation handoff

Prepare the completed implementation for technical review.

Requirements:
- remove dead/debug code introduced during the phase;
- perform only the minimum changed-area sanity checks needed to ensure the handoff is coherent;
- confirm no knowingly committed secrets;
- update docs only with directly verified implementation facts;
- provide concise architecture impact and safe refinement areas for Opus/Astra;
- do not merge your own PR unless explicitly instructed;
- do **not** run an exhaustive pre-merge regression gate yourself;
- conclude by proposing the exact GitHub Copilot validations needed for this phase and by generating the complete GPT-5.6 Sol follow-up prompt from `SONNET_TO_SOL_HANDOFF_TEMPLATE.md`.
