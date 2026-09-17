# Phase 6 — production discovery + marketplace event scaffold

Status: **UI cutover implemented on this branch; not production-accepted.** Deployed browser evidence is still outstanding, so Phase 6 is not marked complete in the roadmap.

This slice is intentionally net-new roadmap work. It does not restyle an existing screen.

## What this branch adds

Migration `0010_phase6_marketplace_events.sql` adds:

- `discovery_sessions`: a user/investor-bound discovery session with thesis timestamp, eligibility version, score version, filters, resume timestamps and close state.
- `marketplace_events`: an append-only, organization-scoped event ledger separate from current state.
- bounded RPCs for session creation, hard-eligible candidate retrieval, impression recording, profile-open recording, atomic decision recording and current-decision reset.
- immutable score/version/rank metadata copied from the impression into the decision event.
- RLS/read boundaries that keep one investor firm's discovery ledger invisible to other organizations.
- browser users receive SELECT on the ledger, not arbitrary INSERT/UPDATE/DELETE.

The TypeScript boundary lives in `src/lib/marketplace/discovery.ts`.
The authenticated Discover feed lives in `src/lib/marketplace/discovery-feed.ts` and `useProductionDiscoveryFeed`.

## Eligibility v1

The production SQL layer owns only documented hard constraints:

1. real, non-demo company;
2. listed/public company;
3. not the investor's own organization;
4. exact target stage when stages are configured;
5. exact target geography when geographies are configured;
6. conservative minimum-cheque feasibility: if both values are known, the total round cannot be smaller than the investor's minimum cheque;
7. explicit thesis exclusions matched against structured sector/business-model/tags text;
8. no current decision by this user for the company.

Sector and business-model preferences remain `rules-v1` ranking inputs rather than being silently promoted to hard exclusions. `check_max` is not used as a hard exclusion because the company funding ask is a total round, not an individual investor cheque.

Semantic similarity is not part of this phase.

## Event semantics

Phase 6 actively uses:

- `impression`
- `profile_open`
- `pass`
- `save`
- `interested`
- `decision_reset`

The schema reserves later roadmap event names (intro, meeting, diligence, funded/no-deal, readiness changed), but this branch does not implement those workflows.

An `interested` decision may create the existing private investor pipeline item. It does **not** create an introduction request, notify a founder, or expose contact information. Those behaviors remain Phase 7.

Reset deletes current swipe/saved state for feed replay but never deletes the append-only event ledger.

## Authenticated Discover cutover (Grok 25%)

The investor Discover view now:

1. resumes an open `discovery_sessions` row when the thesis snapshot still matches, otherwise starts a new session;
2. loads candidate ids only through `get_eligible_discovery_candidates`;
3. fetches those authorized startup rows and ranks them with existing `rules-v1`;
4. records an impression for the card actually shown (not every SQL-eligible id);
5. records `profile_open` when a company profile is opened from a live discovery session;
6. writes Pass / Save / Interested through `record_discovery_decision`;
7. resets current decisions through `reset_discovery_decisions`.

Client sector/stage/search filters hide already-eligible ranked cards. They do not replace SQL eligibility.

## Still outstanding

- deployed authenticated browser acceptance / resume evidence against production data;
- hosted migration `0010` applied to the standalone Supabase project if not already applied;
- Phase 6 roadmap status remains incomplete until that evidence exists.

See `docs/ai-prompts/GROK_PHASE6_FINISH_25.md`.
