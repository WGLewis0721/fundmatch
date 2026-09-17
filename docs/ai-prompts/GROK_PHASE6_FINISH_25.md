# Grok handoff — finish the final 25% of Phase 6

Repository: `WGLewis0721/fundmatch`
Branch: `implementation/phase6-marketplace-events-75`

You are finishing a **net-new production marketplace capability**, not a visual-polish task.

Before editing, read `AGENTS.md`, `README.md`, `ROADMAP.md`, `docs/MATCHING_ARCHITECTURE.md`, `docs/PHASE6_MARKETPLACE_EVENTS.md`, migration `0010_phase6_marketplace_events.sql`, and `src/lib/marketplace/discovery.ts`.

## Already implemented — do not rebuild it

The branch contains the first ~75% of Phase 6:

- production `discovery_sessions`;
- append-only `marketplace_events`;
- organization-scoped RLS/read boundary;
- hard-eligibility RPC;
- idempotent impression RPC;
- profile-open RPC;
- atomic Pass/Save/Interested RPC that copies score/version/rank audit metadata;
- current-decision reset that preserves immutable history;
- typed browser service boundary;
- database CI coverage for eligibility, exclusions, impression idempotency, decision audit, resume behavior and tenant isolation.

The existing deterministic `MatchEngine` remains `rules-v1`. Do not replace it.

## Your final 25%

Wire the authenticated investor Discover experience to the new Phase 6 boundary end to end.

1. On an investor Discover visit, create or deliberately resume a discovery session using the new RPC boundary.
2. Retrieve candidate ids through `getEligibleDiscoveryCandidateIds`; do not fetch every public startup and pretend client filtering is production eligibility.
3. Fetch only those authorized startup rows/metrics needed by the existing `MatchEngine`, then rank them with `rules-v1`.
4. Persist impressions for candidates actually surfaced. Do not record an impression merely because a candidate was returned by SQL. Preserve score, score version and rank position.
5. When the user opens a full company profile from Discover, append `profile_open` for that discovery session.
6. Replace the old multi-write `useRecordDecision` path for production Discover with `recordDiscoveryDecision`, so current state and the immutable decision event are committed atomically.
7. Replace the old destructive reset path with `resetDiscoveryDecisions`. Event history must survive reset.
8. After Pass/Save/Interested, advance predictably without showing duplicate or already-decided candidates. Refresh/revisit must resume coherently.
9. Keep the existing UI and wireframe styling unless a small state/error treatment is required. This is Phase 6 behavior work, not a redesign.
10. Add/adjust automated tests and run typecheck, unit tests, DB tests and production build. If browser tooling is available, verify the deployed investor flow and capture evidence.

## Hard product/security boundaries

- `/wireframes` remains fictional and local-only.
- Do not start Phase 7. “Interested” may create the investor firm's existing private pipeline item, but it must NOT create an intro request, notify the founder, expose contact information or create messaging.
- Do not start Phase 9. No pgvector/semantic ranking in this task.
- Hard eligibility executes before `rules-v1` ranking.
- Do not silently turn sector/business-model preferences into hard exclusions.
- The funding ask is the total round, not an individual investor cheque. Do not use `check_max` as a hard exclusion. The v1 SQL only rejects a known round smaller than a known minimum cheque.
- Explicit exclusions remain hard constraints.
- Never weaken RLS or move service-role credentials to the browser.
- `marketplace_events` is append-only for normal users. Do not add browser UPDATE/DELETE access.
- Do not rewrite unrelated Phase 8 agentic RAG work.
- Do not claim Phase 6 complete until the deployed production flow is actually evidenced.

## Definition of done

A real authenticated investor can open Discover and receive only hard-eligible candidates, ranked by the existing deterministic engine. Every surfaced candidate has an auditable impression with ranking metadata. Pass/Save/Interested creates an immutable decision event and correct current state. Refreshing/resuming does not duplicate decided candidates. Reset restores current feed eligibility without erasing history. Another organization cannot read the firm's ledger.

Update `docs/PHASE6_MARKETPLACE_EVENTS.md` with observed evidence. Update `ROADMAP.md` from “scaffolded” to “complete” only if the full done condition is actually met. Commit to this same branch/PR. In your final report separate **Implemented**, **Verified**, and **Still outstanding**. Do not merge the PR yourself.
