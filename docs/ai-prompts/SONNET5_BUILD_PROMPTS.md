# Sonnet 5 — FundMatch implementation prompts

Use one prompt at a time. Do not start the next phase until GPT-5.6 Sol accepts the current phase.

## Prompt 1 — Authenticated production deployment

You are the primary implementation engineer for FundMatch.

Repository: `WGLewis0721/fundmatch`

Read `AGENTS.md`, `ROADMAP.md`, `docs/MATCHING_ARCHITECTURE.md`, `docs/IMPLEMENTATION_NEXT_STEPS.md`, `docs/BACKEND.md`, and `README.md` before changing code.

Goal: complete Roadmap Phase 5 — Authenticated deployment acceptance.

Tasks:
- Inspect the existing `/app` implementation and current Supabase configuration.
- Wire the intended FundMatch Supabase project and deployment environment without exposing secrets.
- Deploy or prepare the authenticated app for Cloudflare Workers/Nitro using the existing architecture.
- Verify signup, email confirmation behavior, login, logout, password recovery, organization creation, invitation flow, private document upload/download/delete and organization-scoped persistence.
- Test with two separate organizations and prove they cannot read or mutate each other's private rows or files.
- Fix only issues required for this acceptance boundary.
- Add/update automated tests where practical.
- Update `ROADMAP.md`, `docs/BACKEND.md`, and test evidence with what was actually verified.

Do not redesign the UI, add AI features, add billing, add integrations, or change the architecture. Do not create a replacement backend if the intended FundMatch backend is unavailable; document the blocker precisely.

Return: changed files, tests run, deployment/acceptance result, remaining blockers, and PR-ready summary.

## Prompt 2 — Production candidate retrieval

Read the FundMatch architecture docs first. Implement only the production discovery retrieval layer for Roadmap Phase 6.

Goal: authenticated investor users receive eligible startup candidates from Postgres instead of demo/localStorage data.

Requirements:
- Hard eligibility filters must remain authoritative: visibility, stage, sector, geography, check/raise compatibility and explicit exclusions as currently modeled.
- Query must respect RLS and organization permissions.
- Do not expose private founder documents/readiness/internal fields.
- Avoid resurfacing candidates whose current decision state makes them ineligible for the active feed.
- Make retrieval deterministic and testable.
- Keep the existing MatchEngine as the scoring baseline; do not add embeddings yet.
- Add indexes only when justified by the actual query.
- Add tests for eligibility, exclusions, duplicate suppression and organization boundaries.

Do not implement semantic matching, realtime, email, AI or billing.

Return a PR-ready implementation with migration/query changes, tests and documentation.

## Prompt 3 — Persistent Pass / Save / Interested

Implement durable production decisions for authenticated investors.

Goal: Pass, Save and Interested survive refresh/login/device changes and produce correct current state.

Requirements:
- Persist decisions server-side under the correct user/organization.
- Enforce uniqueness/idempotency so repeated clicks/retries do not create inconsistent state.
- Preserve a clean distinction between current decision state and append-only behavioral history.
- Wire the existing discovery-card UI to the production data layer while preserving demo behavior on `/demo`.
- Handle mutation failure honestly: the card must remain actionable if the server write fails.
- Add tests for duplicate submissions, retries, unauthorized mutation, refresh/resume and demo separation.

Do not build founder responses or introductions yet.

## Prompt 4 — Interest → founder response workflow

Implement Roadmap Phase 7 without turning FundMatch into open messaging.

Goal: investor `Interested` creates a permissioned interest request that the founder organization can Accept, Decline or Request more information.

Requirements:
- Create the minimum workflow tables/state transitions required.
- Do not automatically expose founder personal contact information.
- Restrict reads/writes with RLS so only the relevant investor and founder organizations can access the request.
- Record actor, timestamps and state transition history.
- Make transitions idempotent and reject invalid transitions.
- Add founder UI for pending interest and investor UI for status.
- Preserve demo-only behavior separately.
- Add tests for authorization, valid/invalid transitions, duplicate requests and cross-org isolation.

Do not add realtime/email yet unless a no-op interface is needed for the later phase.

## Prompt 5 — Append-only marketplace events

Implement the FundMatch discovery/outcome event history defined in the architecture docs.

Goal: preserve auditable behavioral history separately from current state.

Initial event types should cover: impression, profile_open, pass, save, interested, intro_requested, intro_accepted, intro_declined, meeting, diligence, funded and no_deal.

Requirements:
- Use append-only event records with actor, organization, subject/candidate, timestamp and relevant score/model/version context.
- Prevent ordinary clients from editing or deleting history they should not control.
- Keep current-state tables optimized for product reads; do not force the UI to reconstruct all state from events.
- Add event writes to the relevant existing actions.
- Add tests for event integrity, authorization and duplicate/idempotent command handling.
- Document which events are facts vs user-entered outcomes.

Do not train a recommendation model yet.

## Prompt 6 — Queue-backed AI document processing

Implement Roadmap Phase 8 using the existing Astra/profile-intelligence contracts.

Goal: a private uploaded deck/material can be processed asynchronously into founder-reviewable suggestions with provenance.

Requirements:
- Use Supabase Queues/`pgmq` for durable work.
- Use a privileged server-side worker/Edge Function; service-role credentials never reach the browser.
- Make jobs retryable and idempotent.
- Preserve document lifecycle states and safe failure messages.
- Produce suggestions; never silently overwrite founder-controlled profile fields.
- Preserve document/source provenance and confidence.
- Keep private documents private.
- Add tests for duplicate delivery, failed jobs, unauthorized access and accepted/rejected suggestion behavior.

Use the existing extraction/LLM interface where available; if provider credentials are unavailable, implement/test the durable pipeline boundary without pretending the provider is live.

## Prompt 7 — Semantic matching with pgvector

Implement Roadmap Phase 9 only after deterministic production discovery works.

Goal: augment candidate recall using semantic similarity while preserving hard mandate constraints.

Requirements:
- Add versioned company and investor-thesis embeddings using `pgvector`.
- Generate/update embeddings through the queue-backed worker path, not the browser.
- Apply SQL hard filters first; semantic similarity must not override explicit exclusions or mandatory stage/geography/check constraints.
- Combine deterministic MatchEngine score and semantic signal in a transparent, configurable server-side ranking contract.
- Persist enough version metadata to reproduce/explain a surfaced score.
- Add tests proving hard exclusions win over high semantic similarity.
- Do not expose proprietary weights in public UI/docs.

Do not add learned ranking yet.

## Prompt 8 — Realtime + transactional notifications

Implement Roadmap Phase 10.

Goal: users receive important marketplace/workflow changes without manual refresh, with email fallback where appropriate.

First notification events: new investor interest, founder response, document processing completed/failed, new profile suggestion and team pipeline update.

Requirements:
- Postgres remains source of truth.
- Use Supabase Realtime Broadcast for in-app delivery.
- Store durable notification state where needed.
- Use queue-backed transactional email for offline/important events.
- Add deduplication, retry behavior and sensible rate limits.
- Never leak private startup/investor data in channels a user is not authorized to receive.
- Add tests around authorization and duplicate notification delivery.

Do not build social-style chat.

## Prompt 9 — Pilot readiness hardening

Act as the implementation engineer preparing FundMatch for a controlled founder + angel/small-VC pilot.

Goal: close implementation defects across the accepted production flow without adding new roadmap scope.

Exercise end-to-end:
founder account → company/profile/materials/readiness → investor account/thesis → candidate retrieval → score/explanation → Pass/Save/Interested → founder response → pipeline/outcome → notifications.

Fix broken states, weak error handling, empty/loading states, data-integrity issues and accessibility regressions. Add missing regression tests. Do not add speculative features. Produce a pilot blocker list ranked P0/P1/P2.

## Prompt 10 — Implementation handoff

Prepare the completed implementation for review and downstream refinement.

Requirements:
- Run typecheck, lint, unit tests, relevant database/RLS tests and production build.
- Remove dead/debug code introduced during the phase.
- Confirm demo/private-app boundaries still hold.
- Confirm secrets are not in source or built public assets.
- Update roadmap/docs only with verified capabilities.
- Provide a concise architecture-impact summary and a list of files Opus/Astra may safely refine without changing behavior.
- Do not merge your own PR unless explicitly instructed.
