# Start here

The active FundMatch milestone is **Roadmap Phase 5 — Authenticated deployment acceptance**.

## Current state

FundMatch now uses the standalone Supabase project `dkanoobzseckccbwnpyi`. The separate APEX project `fnmxlmjrkgojowpzrcwa` must not be modified.

Backend provisioning is complete and live migrations `0000` through `0004` are applied. Lovable is retired from the active architecture. Production `/app` hosting on Cloudflare is intentionally deferred by the maintainer for now.

Phase 6 remains blocked until the remaining Phase 5 acceptance evidence is complete and GPT-5.6 Sol explicitly accepts Phase 5.

## Resource-efficient agent split

```text
Sonnet 5 = implement
GPT-5.6 Sol = architecture/security/code review
GitHub Copilot = extended mechanical validation + evidence
GPT-5.6 Sol = final ACCEPT / REJECT
Opus/Astra = refinement/polish after acceptance
```

Sonnet and Sol should not spend their context windows duplicating exhaustive validation that Copilot can perform.

## Immediate Phase 5 work

1. Keep source-of-truth aligned with standalone Supabase project `dkanoobzseckccbwnpyi`.
2. Validate the non-deployment Phase 5 boundary: migration/RLS/function privileges, organization isolation, private document authorization, and repo/build separation.
3. Treat production `/app` deployment plus production Auth redirect configuration as deferred—not complete.
4. Do not begin Phase 6 before explicit Sol acceptance.

Use `PHASE5_ACCEPTANCE_CHECKLIST.md` for the acceptance boundary and `GITHUB_COPILOT_VALIDATION_PROMPTS.md` for extended mechanical checks.
