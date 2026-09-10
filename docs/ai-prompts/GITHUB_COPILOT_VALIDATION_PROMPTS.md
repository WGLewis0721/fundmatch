# GitHub Copilot — FundMatch validation prompts

Use these prompts after Sonnet 5 implementation and GPT-5.6 Sol architecture review. Copilot is the primary extended-validation agent so Sonnet and Sol do not waste context/tokens repeating mechanical test work.

Always read `AGENTS.md`, `ROADMAP.md`, `docs/MATCHING_ARCHITECTURE.md`, the relevant phase docs, and `docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md` first.

## Prompt 1 — Phase 5 authenticated deployment validation

Validate only Roadmap Phase 5.

Focus on:
- intended FundMatch backend/project identity;
- migration `0002` + `0003` state;
- old permissive policy removal;
- organization-scoped RLS;
- private `documents` bucket and Storage policies;
- signup, confirmation behavior, login, logout, password recovery;
- startup/investment-firm creation, invitations, member roles, last-owner protection;
- founder/investor persistence;
- document upload/download/delete;
- two-organization cross-tenant read/write/storage attacks;
- public `/` + `/demo` separation and secret exclusion;
- deployed `/app` using the intended current code.

Do not touch the separate APEX Supabase project. Do not add product features.

Return a ready-to-paste Sol acceptance prompt with exact evidence.

## Prompt 2 — Production candidate retrieval validation

Validate the production discovery retrieval implementation only.

Exercise:
- eligible vs ineligible companies;
- visibility constraints;
- sector/stage/geography/check-size/raise compatibility;
- explicit exclusions;
- decided/suppressed candidate handling;
- pagination/resume behavior if implemented;
- organization/RLS boundaries;
- no leakage of private documents/readiness/internal founder fields;
- deterministic result ordering for identical inputs;
- demo/localStorage isolation from authenticated production flow.

Use focused fixtures/adversarial combinations rather than broad unrelated test suites.

Return exact failures and a ready-to-paste Sol acceptance prompt.

## Prompt 3 — Pass / Save / Interested persistence validation

Validate durable authenticated decisions.

Check:
- Pass, Save, Interested persist after refresh/new session;
- repeated clicks/retries are idempotent;
- unauthorized users/orgs cannot write another investor's decision;
- failed server mutation does not falsely advance/remove the card;
- current decision state remains distinct from event/history records;
- demo behavior remains browser-only;
- race/retry scenarios do not create contradictory states.

Do not build founder response/introduction behavior in this validation.

Return a ready-to-paste Sol acceptance prompt.

## Prompt 4 — Interest / founder response workflow validation

Validate the investor-interest workflow.

Check:
- Interested creates one permissioned request;
- only the relevant investor and founder organizations can access it;
- founder Accept / Decline / Request-more-info transitions obey the state machine;
- invalid/repeated transitions are rejected or idempotently replayed;
- contact details are not exposed automatically;
- investor sees the correct status;
- founder sees only requests for their organization;
- audit actor/timestamps/history are correct;
- cross-org tampering attempts fail.

Do not add chat/realtime/email unless already part of the reviewed implementation.

Return a ready-to-paste Sol acceptance prompt.

## Prompt 5 — Marketplace event-history validation

Validate append-only marketplace event behavior.

Check:
- expected event types are emitted from their actual actions;
- actor/org/candidate/startup/investor references are correct;
- score/model/version context is retained where expected;
- ordinary clients cannot alter/delete protected history;
- command retries do not create unintended duplicate events;
- current product state does not require rebuilding itself from the event log;
- user-entered outcome events are distinguishable from system facts;
- cross-org event visibility is properly constrained.

Return a ready-to-paste Sol acceptance prompt.

## Prompt 6 — Queue-backed AI document pipeline validation

Validate the asynchronous document-processing pipeline.

Check:
- uploaded files remain private;
- queue delivery is durable;
- duplicate delivery is idempotent;
- retry/failure states behave safely;
- service-role access is server/worker only;
- processing states transition correctly;
- extracted suggestions preserve source/provenance/confidence;
- suggestions do not overwrite canonical profile fields automatically;
- accept/reject operations are authorized;
- malformed/untrusted documents fail safely;
- provider-unavailable behavior is honest if live AI credentials are absent.

Return a ready-to-paste Sol acceptance prompt.

## Prompt 7 — Semantic matching / pgvector validation

Validate semantic augmentation only after deterministic matching is already accepted.

Check:
- embeddings are versioned and generated server-side;
- hard eligibility/exclusion constraints execute before semantic ranking;
- very high similarity cannot override stage/geography/check-size/exclusion rules;
- deterministic score + semantic signal combine reproducibly;
- persisted version/config metadata is sufficient to explain/reproduce results;
- stale embeddings are handled predictably;
- proprietary weights/configuration are not exposed publicly;
- semantic matching adds useful recall without bypassing mandate logic.

Use adversarial fixtures specifically designed to tempt semantic similarity to violate hard constraints.

Return a ready-to-paste Sol acceptance prompt.

## Prompt 8 — Realtime + transactional notification validation

Validate notification delivery without turning FundMatch into chat.

Check:
- Postgres remains the source of truth;
- authorized users receive relevant realtime updates;
- unauthorized users cannot subscribe/read another org's private events;
- durable unread/read state behaves correctly if implemented;
- queued email retries/deduplication work;
- no duplicate storm occurs on retries/reconnects;
- no sensitive founder/investor data leaks into wrong channels/emails;
- offline fallback behavior is correct;
- notification failure does not corrupt source-of-truth workflow state.

Return a ready-to-paste Sol acceptance prompt.

## Prompt 9 — Pilot regression validation

Run the focused pilot regression only after the individual phases above are accepted.

Exercise the complete production loop:

`founder account → company/profile/materials/readiness → investor account/thesis → discovery → score/explanation → Pass/Save/Interested → founder response → pipeline/outcome → notifications`

Prioritize:
- P0 security/data-leak/data-loss/broken-core-flow checks;
- P1 completion/reliability/trust regressions;
- P2 only when explicitly requested.

Do not treat this as permission to redesign or add features. Avoid exhaustive compatibility matrices unless a known issue requires one.

Return overall validation status, evidence, and a ready-to-paste Sol final acceptance prompt.

## Prompt 10 — Post-Opus/Astra regression validation

Use after refinement/polish agents touch an already accepted phase.

Validate only that the refinement/polish did not change approved behavior or data/security boundaries.

Check:
- affected routes/interactions still complete their intended task;
- no authorization or API boundary changed accidentally;
- no secret/private data moved into public/client surfaces;
- no accessibility regression in touched interactions;
- build/type integrity for touched areas;
- visual/interaction changes did not break loading/error/empty states;
- demo/private-app boundary remains intact.

Do not rerun unrelated historical phase tests unless the diff crosses those boundaries.

Return a ready-to-paste Sol merge decision prompt.
