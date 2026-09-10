# Phase 5 acceptance checklist

GPT-5.6 Sol owns the final ACCEPT/REJECT decision. GitHub Copilot owns the extended mechanical validation and evidence gathering. Production hosting is intentionally deferred by the maintainer, so deployment-dependent items remain explicitly pending rather than being treated as complete.

## Backend identity

- [x] FundMatch uses standalone Supabase project `dkanoobzseckccbwnpyi`.
- [x] APEX project `fnmxlmjrkgojowpzrcwa` was not modified.
- [x] Lovable is retired from the active backend/runtime architecture.

## Migration and schema

- [x] Live migrations `0000` through `0004` are applied to FundMatch.
- [x] `organization_invitations`, `readiness_items`, `documents`, and `profile_suggestions` exist.
- [x] Private `documents` Storage bucket exists from migration `0002`.
- [x] Repository contains the live `0004` has-role privilege hardening change.

## Authorization

- [ ] Copilot evidence confirms old permissive policies are absent.
- [ ] Copilot evidence confirms organization-scoped RLS behavior.
- [ ] Copilot evidence confirms privileged helper execution boundaries.
- [ ] Copilot evidence confirms two-organization isolation for private rows.
- [ ] Copilot evidence confirms private document row/Storage authorization boundaries.
- [x] Service-role and migration secrets remain outside public/browser assets by design.

## Auth and organization workflow

- [ ] Signup/login/logout/recovery behavior validated against the standalone project.
- [ ] Startup and investment-firm organization creation validated.
- [ ] Invitation/role/last-owner boundaries validated.

Production email redirect URLs cannot receive their final production values until an `/app` hosting origin is selected.

## Persistence

- [ ] Founder profile/readiness/material persistence validated.
- [ ] Investor profile/thesis persistence validated.

## Deployment and regression

- [x] Native TanStack Start + Cloudflare build configuration is on `main`.
- [x] GitHub CI passed after Lovable build/runtime removal.
- [x] `/` and `/demo` remain separate browser-only Pages build targets.
- [ ] **DEFERRED:** production `/app` deployment.
- [ ] **DEFERRED:** production Supabase Auth Site URL + `/app/login` and `/app/reset` redirects.
- [ ] **DEFERRED:** browser/end-to-end acceptance against the production deployment.

## Sol acceptance result

Full production **Phase 5 ACCEPT** requires the deferred deployment-dependent items unless the roadmap is deliberately re-scoped. Until then Sol may record the standalone backend/repo boundary as accepted while keeping Phase 5 production acceptance pending.
