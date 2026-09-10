# Phase 5 implementation ticket

**Objective:** finish authenticated application acceptance for FundMatch and stop before Phase 6.

## Critical facts

- Standalone FundMatch Supabase ref: `dkanoobzseckccbwnpyi`.
- Supabase API URL: `https://dkanoobzseckccbwnpyi.supabase.co`.
- APEX project `fnmxlmjrkgojowpzrcwa` is unrelated and must not be modified.
- Lovable is retired from the active architecture.
- Live FundMatch migrations `0000` through `0004` are applied.
- Repo migration `0004_phase5_has_role_privilege_hardening.sql` mirrors the live privilege fix.
- Production Cloudflare deployment is intentionally deferred by the maintainer for now.

## Current task

Gather focused evidence for the standalone backend boundary: schema/RLS state, helper privileges, two-organization row isolation, private-document authorization, auth/org workflow behavior, and founder/investor persistence. Use GitHub Copilot for the extended mechanical validation.

## Acceptance gate

Use `docs/ai-prompts/PHASE5_ACCEPTANCE_CHECKLIST.md`. GPT-5.6 Sol owns the final decision. Full production acceptance remains pending while `/app` deployment and deployment-dependent Auth redirects/browser testing are deferred.
