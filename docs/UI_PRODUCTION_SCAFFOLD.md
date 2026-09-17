# Production UI scaffold handoff

The authenticated workspace now has a structural styling layer in `src/app-workspace-scaffold.css` that carries the approved `/wireframes` hierarchy into the real `/app` while preserving its existing Supabase-backed hooks and actions.

This is deliberately a **75% scaffold**, not a claim of final visual acceptance. It establishes desktop workspace rail/top bar/content hierarchy, persona color treatment, discovery/card/filter structure, responsive breakpoints, mobile bottom-navigation behavior, touch-safe sizing, toast positioning and reduced-motion handling.

The remaining 25% is an evidence-driven polish pass: browser comparison against `/wireframes`, long/empty/error state cleanup, mobile navigation refinement, accessibility/keyboard checks, and final responsive visual QA. See `docs/ai-prompts/GROK_UI_FINISH_25.md`.

The `/wireframes` route remains fictional/local-only. The `/app` route remains the production data/action surface. Do not cross those boundaries.
