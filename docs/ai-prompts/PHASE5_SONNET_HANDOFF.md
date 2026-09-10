# Sonnet 5 handoff — Roadmap Phase 5

This prompt is **superseded for backend work**.

The standalone FundMatch backend is now `dkanoobzseckccbwnpyi`, live migrations `0000`–`0005` are applied, and the focused database/RLS sub-gate is accepted. APEX `fnmxlmjrkgojowpzrcwa` remains unrelated and must not be modified.

Read `docs/ai-prompts/START_HERE.md`, `docs/BACKEND.md`, and `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md` for the current Phase 5 state.

Do not redo backend provisioning or migration work. The remaining Phase 5 implementation is deployment-dependent and intentionally deferred by the maintainer: production `/app` hosting, production Supabase Auth redirects, and real browser auth/end-to-end acceptance.

If Phase 5 deployment work resumes, Sonnet should implement only that remaining boundary, run minimum sanity checks, propose the focused GitHub Copilot validations, and end with a ready-to-paste GPT-5.6 Sol handoff using `SONNET_TO_SOL_HANDOFF_TEMPLATE.md`.

Do not begin Phase 6 until GPT-5.6 Sol explicitly accepts Phase 5 or the roadmap is deliberately re-scoped.
