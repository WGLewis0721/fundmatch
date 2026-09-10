# Phase 5 execution status

**Status:** standalone backend/RLS sub-gate accepted; production `/app` deployment intentionally deferred.

## Completed on 2026-09-10

- Dedicated FundMatch Supabase project: `dkanoobzseckccbwnpyi` (`us-east-1`).
- APEX project `fnmxlmjrkgojowpzrcwa` remained untouched.
- Live migrations applied in order: `0000`, `0001`, `0002`, `0003`, `0004`, `0005`.
- Phase 5 tables and private-document model are installed with RLS enabled.
- `0004` removes anonymous execution of `has_role()`.
- `0005` removes the hosted-Supabase-incompatible direct Storage metadata delete trigger and fixes remaining Phase 5 mutable helper search paths.
- PR #17 removed the Lovable Vite/runtime dependency and restored green GitHub Actions with native TanStack Start + Cloudflare tooling.
- Repository configuration is reconciled to the standalone FundMatch project and FundMatch-specific cron secret names on the current Phase 5 reconciliation branch.

## Focused live backend acceptance evidence

- Old permissive policy names targeted by Phase 5: absent.
- `documents` bucket: private.
- Anonymous execution of protected helper functions: denied.
- Two simulated authenticated organizations: each can see its own private organization/profile side and cannot see the other organization’s private startup/investor rows.
- Cross-org startup update and document-row delete: zero affected rows.
- Private readiness, document rows and Storage metadata: hidden cross-org.
- Invitation email mismatch: denied; correct invite acceptance: succeeded.
- Non-admin invite attempt: denied.
- Last-owner removal: denied.
- Founder startup and investor-thesis updates: persisted across separate authenticated calls.
- Authorized document record/Storage metadata creation under the required path: succeeded.
- Temporary test fixtures: removed after validation.

## Deferred by maintainer

- Production `/app` deployment.
- Production Supabase Auth Site URL and redirect allow-list.
- Real browser signup/login/logout/recovery and deployment-level end-to-end acceptance.

These deferred items prevent a full production Phase 5 ACCEPT unless the roadmap is deliberately re-scoped. Phase 6 remains blocked pending explicit GPT-5.6 Sol acceptance.
