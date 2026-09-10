# Founder Readiness MVP — implementation and acceptance

Updated: 2026-09-10. Scope: ROADMAP Phase 3, including its baseline standardized packet. This is not a claim that the entire marketplace is production-ready.

## What founders can do

1. Use Company profile to work through Company basics, Your story, and Traction & raise. Save an incomplete draft without listing the company. Name, sector, stage and geography are required; narrative, metrics and materials can be completed later.
2. Return to Overview to see which profile essentials are missing. Each check opens the relevant profile, materials or checklist view.
3. Keep the VC/angel or PE readiness checklist updated. Profile presence and checklist completion are separate: providing a deck does not automatically verify diligence.
4. Add material links; the authenticated app also retains its private upload/download/delete workflow.
5. Open Investor packet. Choose which external material links belong in the output. Preview the current saved profile, metrics, company narrative, checklist, gaps and standard discussion prompts.
6. Download a standalone HTML packet, or use Print / save PDF. Neither action publishes the company, sends messages or changes source-document sharing permissions.

The demo stores fictional edits in its existing validated browser state. Existing version-1 state remains compatible; the added narrative is optional. Unknown metrics now round-trip as null, and the deterministic matching engine still produces finite scores when growth or the funding ask is absent. The private workspace uses the existing Supabase tables and RLS; there is no schema migration or new infrastructure.

## Data and privacy boundaries

- Numbers left blank are unknown, not zero. Zero revenue is valid; negative growth is valid. Team size must be a nonnegative integer.
- Narrative uses the existing `startup_profiles.story` field. No artificial market/team claims are generated to fill blank sections.
- A packet is an explicit projection of profile fields, chosen external material links and checklist titles/statuses. It does not serialize workspace objects.
- Private upload names, storage paths, access tokens, readiness notes, evidence URLs, assignees, team notes and pending AI suggestions are excluded.
- All links are checked for http/https. External links require selection on each packet screen; selection resets across company/template changes.
- Company fields are labeled company-reported or company-confirmed, not independently verified. Demo output remains labeled fictional even after download.
- React escapes untrusted text in the output. Exported HTML has a restrictive content security policy and contains no scripts or remote assets. No server, provider, PDF package or paid service is needed for export.
- The HTML export is downloadable; PDF output uses the browser print dialog. No server PDF generator, versioned packet history, secure share URL or email delivery is implemented.
- Profile/metric persistence still consists of separate existing API writes. Partial metric failures now report that the profile saved but metrics need a retry; invalidation refreshes server state. This does not claim an atomic multi-table save.
- The profile update requests the affected record, so an RLS-filtered zero-row update cannot silently report success.

## Existing intelligence code

The repository already has literal PDF/text extraction, source quotes, correction/accept/reject, and deterministic sourced matching in `src/lib/intelligence` and `src/components/intelligence`. The demo's Build from deck screen keeps these results in component memory. It does not write them into the fictional company profile or into the packet.

The authenticated profile retains the existing `profile_suggestions` query and `resolve_profile_suggestion` RPC controls. Suggestion source and review state are displayed. The new editor reflects changed saved fields where there is no local unsaved edit. The live worker and repository/endpoint wiring are still absent; a private upload must not claim automatic analysis is active.

## Verification

- `bun run typecheck`: passed.
- `bun run build`: passed (TanStack Start / Nitro app).
- `bun run build:pages`: passed (public static demo).
- Demo, founder readiness, intelligence and intelligence-rendering suites: 40 tests passed, including 10 new founder-readiness/export tests.
- New tests cover draft migration, unknown-versus-zero numbers, negative growth, numeric/URL validation, finite matching with missing values, self-reported readiness, server rendering, explicit link inclusion, hostile text escaping, private-data exclusion, missing-value labels and safe filenames.
- Browser interaction/visual QA and real FundMatch backend acceptance were not run in this session. Earlier backend evidence remains separately recorded in `docs/TEST_EVIDENCE.md`; it is not evidence that this new version is deployed.

## Remaining production blocker

`supabase/config.toml` identifies FundMatch's existing project. The currently connected Supabase account listed a different project, and the FundMatch project detail request returned a permission error. No attempt was made to use the unrelated project's database. Lovable's FundMatch project was found and reported as unpublished; that status does not establish production readiness.

Before real-user release, provide authorized access to the intended FundMatch backend, configure the existing authenticated deployment, and complete ROADMAP Phase 5. Verify:

1. A founder can sign up, create an organization, save a partial profile, reload and see the same values.
2. Null metrics remain absent; entering zero stores zero; clearing an existing metric removes it. A failed metric write reports a retry instead of complete success.
3. VC and PE checklist edits persist separately, including status, owner and evidence.
4. Valid documents upload privately and can be downloaded/deleted only by authorized organization members.
5. The packet includes only selected external links and current saved company fields. The browser PDF has readable page breaks and no navigation/controls.
6. Two unrelated organizations cannot read or mutate private profiles, documents, readiness items or pending suggestions. Listing exposes only the intended investor-visible data; uploads remain private.
7. Existing persisted suggestions apply/dismiss correctly and never enter the packet before confirmation. Live processing itself is a later milestone.

## Main implementation files

- `src/lib/founder-readiness.ts`: validation, adapters, readiness, packet selection.
- `src/components/fundmatch/founder-builder.tsx`: guided editor.
- `src/components/fundmatch/founder-journey.tsx`: actionable overview.
- `src/components/fundmatch/investor-packet.tsx`: shared preview and standalone export.
- `src/components/fundmatch/founder-readiness.css`: responsive and print layouts.
- `src/routes/demo.tsx` and `src/routes/app/index.tsx`: workspace integration.
- `src/lib/app-queries.ts`: nullable metric persistence and truthful write results.
- `tests/founder-readiness.test.tsx`: regression coverage.
