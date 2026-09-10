# Phase 5 implementation ticket

**Objective:** finish authenticated application acceptance for FundMatch and stop before Phase 6.

## Critical facts

- Standalone FundMatch Supabase ref: `dkanoobzseckccbwnpyi`.
- Supabase API URL: `https://dkanoobzseckccbwnpyi.supabase.co`.
- APEX project `fnmxlmjrkgojowpzrcwa` is unrelated and must not be modified.
- Lovable is retired from the active architecture.
- Live FundMatch migrations `0000` through `0005` are applied.
- Repo migrations `0004` and `0005` mirror the live Phase 5 hardening fixes.
- Production Cloudflare deployment is intentionally deferred by the maintainer for now.

## Current result

The standalone backend/RLS sub-gate is accepted: focused live checks confirmed organization isolation, private document/readiness boundaries, authenticated organization creation, invitation/role protections, persistence, helper privilege restrictions, and cleanup of test fixtures.

## Remaining work before full production Phase 5 acceptance

- Deploy current `/app` to the chosen production host.
- Configure the production Supabase Auth Site URL and `/app/login` + `/app/reset` redirects.
- Validate real browser signup/email confirmation/login/logout/recovery and deployment-level end-to-end behavior.

These items are intentionally deferred. Phase 6 remains blocked until GPT-5.6 Sol explicitly accepts the completed Phase 5 boundary or the roadmap is deliberately re-scoped.
