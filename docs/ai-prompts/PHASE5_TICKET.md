# Phase 5 implementation ticket — standalone production acceptance

**Objective:** complete authenticated deployment acceptance for FundMatch and stop before Phase 6.

**Immediate action prompt:** `docs/ai-prompts/COPILOT_PHASE5_REMOVE_LOVABLE_AND_FINISH.md`

**Acceptance criteria:** `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md`

## Current architecture decision

Lovable is retired. FundMatch production is:

`GitHub source → standalone Supabase → Cloudflare Workers/Nitro`

The public demo remains on GitHub Pages.

## Critical facts

- APEX Supabase project `fnmxlmjrkgojowpzrcwa` is not FundMatch. Do not modify it.
- The old Lovable-backed FundMatch environment is historical and must not remain a production dependency.
- Provision/use a dedicated standalone Supabase project for FundMatch.
- Apply/reconcile repository migrations `0000` through `0003` there.
- Remove remaining Lovable runtime/build/package/lockfile/configuration coupling.
- Deploy current `/app` from GitHub to Cloudflare.
- GitHub Copilot performs focused Phase 5 validation and returns evidence to GPT-5.6 Sol.
- GPT-5.6 Sol makes the final ACCEPT/REJECT decision.

## Completion output

Return the standalone Supabase project ref, Cloudflare `/app` URL, Lovable-removal summary, migration state, focused auth/RLS/Storage/two-org evidence, relevant build/test results, blockers, and a ready-to-paste GPT-5.6 Sol final acceptance prompt.
