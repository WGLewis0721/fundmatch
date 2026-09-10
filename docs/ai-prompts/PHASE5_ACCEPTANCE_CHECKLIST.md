# Phase 5 acceptance checklist

GPT-5.6 Sol owns the final ACCEPT/REJECT decision. GitHub Copilot owns extended mechanical validation and evidence gathering. Production hosting is intentionally deferred by the maintainer, so deployment-dependent items remain explicitly pending rather than being treated as complete.

## Backend identity

- [x] FundMatch uses standalone Supabase project `dkanoobzseckccbwnpyi`.
- [x] APEX project `fnmxlmjrkgojowpzrcwa` was not modified.
- [x] Lovable is retired from the active backend/runtime architecture.

## Migration and schema

- [x] Live migrations `0000` through `0005` are applied to FundMatch.
- [x] `organization_invitations`, `readiness_items`, `documents`, and `profile_suggestions` exist.
- [x] Private `documents` Storage bucket exists and is not public.
- [x] Repository contains live hardening migrations `0004` and `0005`.

## Authorization — live backend evidence

- [x] Old permissive policy names targeted by Phase 5 are absent.
- [x] Organization-scoped RLS allows each test organization to read its own private rows and hides the other organization’s private startup/investor rows.
- [x] Cross-org startup mutation affects zero rows.
- [x] Cross-org document-row deletion affects zero rows.
- [x] Private readiness/document/Storage metadata are hidden from the unrelated test organization.
- [x] Protected helper functions are not executable by `anon`; `startup_org()` does not disclose another organization’s ID.
- [x] `has_role()` anonymous execution is revoked by `0004`.
- [x] Hosted-Supabase-incompatible direct `storage.objects` deletion trigger is removed by `0005`.
- [x] Phase 5 helper mutable-search-path findings fixed by `0005`.
- [x] Service-role and migration secrets remain outside public/browser assets by design.

## Organization workflow — database/RPC evidence

- [x] Startup organization creation works under authenticated claims.
- [x] Investment-firm organization creation works under authenticated claims.
- [x] Invitation email binding rejects the wrong identity.
- [x] Correct invited identity can join.
- [x] Non-admin member cannot invite members.
- [x] Last-owner deletion is blocked.

## Persistence — database evidence

- [x] Founder startup profile updates persist across separate authenticated calls.
- [x] Investor-thesis updates persist across separate authenticated calls.
- [x] Readiness items can be initialized for the owning startup and remain invisible cross-org.
- [x] Authorized document record + Storage metadata creation works under the required org/document path.

## Auth — deployment/browser dependent

- [ ] **DEFERRED:** real signup + email confirmation flow through the deployed app.
- [ ] **DEFERRED:** real login/logout through the deployed app.
- [ ] **DEFERRED:** password recovery through the deployed app.
- [ ] **DEFERRED:** production Supabase Site URL and `/app/login` + `/app/reset` redirect allow-list.

## Deployment and regression

- [x] Native TanStack Start + Cloudflare build configuration is on `main` from PR #17.
- [x] GitHub CI passed after the Lovable build/runtime removal.
- [x] `/` and `/demo` remain separate browser-only Pages build targets.
- [ ] **DEFERRED:** production `/app` deployment.
- [ ] **DEFERRED:** browser/end-to-end acceptance against the production deployment.

## Sol acceptance result

**Backend/RLS sub-gate:** accepted based on focused live evidence above.

Full production **Phase 5 ACCEPT** remains pending because the maintainer explicitly deferred production `/app` deployment and its browser/Auth-dependent checks. Phase 6 remains blocked unless the roadmap is deliberately re-scoped.
