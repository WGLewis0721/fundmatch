# Grok handoff — finish the final 25% of FundMatch workspace UI

You are the finishing engineer, not the architect. The repository is **WGLewis0721/fundmatch**. Start from the branch/PR that contains `src/app-workspace-scaffold.css`. Read `AGENTS.md`, `README.md`, `ROADMAP.md`, `docs/UX_WIREFRAMES.md`, and this file before editing.

## What is already intentionally scaffolded (about 75%)

The authenticated `/app` already has real Supabase-backed founder/investor behavior: organization switching, thesis persistence, discovery, deterministic matching, Pass/Save/Interested persistence, pipeline, founder profile, readiness, private materials, suggestions, packet and team flows. Do **not** replace these with mock state.

The approved interaction reference is the isolated `/wireframes` route. A production-only CSS layer now carries its major information hierarchy into `/app`: paper/surface tokens, sage/periwinkle persona treatment, sticky top bar, workspace rail, editorial headings, card hierarchy, discovery layout, responsive filters, mobile bottom navigation behavior, touch-safe controls, toast placement and reduced-motion handling.

That is the scaffold. Your job is the final 25%: inspect, refine and prove it.

## Your assignment

Use the deployed `/wireframes` route as the visual/interaction reference and the authenticated `/app` as the system of record. Finish the UI without changing the product architecture or weakening security.

1. **Visual parity and polish.** Compare investor Discover/Pipeline/Thesis and founder Overview/Profile/Readiness/Materials/Packet/Team against the wireframes at desktop, tablet and mobile widths. Fix spacing, type rhythm, card density, alignment, overflow, long labels, empty/loading/error states, focus states and touch targets. Preserve the off-white + sage + periwinkle direction and Instrument Serif/Manrope brand language. Avoid a generic SaaS dashboard look.

2. **Mobile interaction finish.** Make the bottom navigation feel native and stable with safe-area insets. Ensure the most important persona views are reachable without horizontal confusion. Keep visible Pass/Save/Interested controls; gestures may augment them but never hide the explicit controls. “Interested” must retain the existing confirmation/permission semantics; do not expose founder contact information.

3. **Real-state edge cases.** Exercise the production components with zero/one/many companies, long company/org names, no thesis, exhausted discovery feed, saved/interested states, pending mutations, failed queries, multiple memberships, suggestions with long source excerpts, unsupported documents, and readiness items in mixed states. Improve presentation only; do not fake successful backend actions.

4. **Accessibility and quality.** Keyboard-test navigation and dialogs. Keep semantic HTML, labels, focus visibility, contrast, reduced motion and 44px-ish mobile touch targets. Do not remove provenance/disclaimer text merely to make a screen prettier.

5. **Validation.** Run typecheck, unit tests and production build. If browser tooling is available, capture a small desktop/mobile evidence set for both personas. Fix only regressions introduced by this UI pass. Do not rewrite the matching engine, Supabase policies, agentic RAG pipeline, migrations or queue worker.

## Hard boundaries

- Keep `/wireframes` fictional and isolated; it must never call Supabase, production AI, email or privileged APIs.
- Keep `/app` on its existing real hooks in `src/lib/app-queries.ts`.
- Do not move service-role credentials into browser code.
- Do not change RLS, canonical fact promotion, match eligibility, scoring semantics or agent authority.
- AI suggestions remain proposals until a founder accepts/corrects/rejects them.
- Do not start Phase 9 semantic matching, Phase 10 realtime, billing, SSO, or unrelated roadmap work.
- Do not introduce a new UI framework or duplicate the app into a second implementation.
- Prefer small component/CSS extractions over a rewrite of `src/routes/app/index.tsx`.
- Do not claim an action works unless you observed it.

## Definition of done

The final result should feel like the `/wireframes` design graduated into the real authenticated product rather than a separate prototype: same hierarchy and personality, but backed by the existing production data/actions. Desktop and mobile must both be coherent. Existing behavior and security tests must remain green.

When finished, update `docs/UX_WIREFRAMES.md` with exactly what you changed and any known visual debt. Update `ROADMAP.md` only if a previously incomplete UI acceptance item is genuinely evidenced. Open a focused PR. In the PR body separate **implemented**, **verified**, and **still outstanding**. Do not merge the PR yourself.
