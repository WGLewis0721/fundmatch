# FundMatch backend: accounts, persistence, private documents

FundMatch now uses a standalone backend. Lovable is retired from the active architecture.

## Active infrastructure

- Source: GitHub `WGLewis0721/fundmatch`
- FundMatch Supabase project: `dkanoobzseckccbwnpyi`
- Supabase API URL: `https://dkanoobzseckccbwnpyi.supabase.co`
- Region: `us-east-1`
- Separate APEX project `fnmxlmjrkgojowpzrcwa` must never be used for FundMatch.
- Public `/` + `/demo`: GitHub Pages, browser-only, fictional data.
- Authenticated `/app`: TanStack Start app backed by Supabase. Production hosting is intentionally deferred; Cloudflare remains the preferred target when deployment resumes.

## Environment variables

| Variable | Used by | Secret? | Purpose |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | no | FundMatch Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | no (RLS-limited) | Supabase publishable key |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server functions | no | Server-side equivalents |
| `SUPABASE_SERVICE_ROLE_KEY` | backend workers only | **yes** | Bypasses RLS; never expose to browser/Pages |
| `FUNDMATCH_DB_MIGRATION_URL` | migrations | **yes** | Direct Postgres migration connection |
| `FUNDMATCH_TEST_DATABASE_URL` | tests | local only | Policy-test database |
| `FUNDMATCH_CRON_SECRET` | scheduled server actions | **yes** | Current cron bearer secret |
| `FUNDMATCH_CRON_SECRET_PREVIOUS` | scheduled server actions | **yes** | Optional rotation fallback |

## Migration state

The standalone production database has the Phase 5 chain applied in order:

- `0000_fundmatch_core_schema.sql`
- `0001_fundmatch_seed_demo_data.sql`
- `0002_fundmatch_accounts_persistence.sql`
- `0003_phase5_function_privileges.sql`
- `0004_phase5_has_role_privilege_hardening.sql`
- `0005_phase5_storage_delete_and_search_path_hardening.sql`

`0002` removes the original broad authenticated-user policies and installs organization-scoped RLS, invitations, readiness items, private documents, profile suggestions, RPCs, and the private `documents` Storage bucket. `0003` hardens helper-function privileges. `0004` removes anonymous/PUBLIC execution of `has_role()`. `0005` removes the incompatible direct-SQL Storage deletion trigger and fixes remaining mutable helper search paths.

For local CI against plain PostgreSQL, use the documented Supabase shim only in the local test environment. Never run the shim against the real Supabase project.

## Auth

Supabase Auth provides email/password signup, login and recovery. Final production Site URL and redirect allow-list values depend on the eventual `/app` deployment origin and are therefore deferred together with production hosting. Before a public `/app` launch, configure the Site URL plus `/app/login` and `/app/reset` redirects for the chosen origin.

## Security model

- Every application table has RLS enabled.
- Organization membership is the primary authorization boundary.
- Startup records may be listed for signed-in discovery, but readiness, notes and documents remain private according to their policies.
- Investor workspace records remain organization-scoped.
- `swipes` and `saved_companies` are user-scoped.
- Document bytes live in the private `documents` Storage bucket at `<org_id>/<document_id>/<file_name>` and require a matching database record plus organization authorization.
- Document deletion is Storage API first, then `public.documents` row deletion. Do not directly mutate `storage.objects` from application SQL.
- Service-role credentials, migration URLs and cron secrets are server-only.
- The public Pages bundle must contain no Supabase credentials/client wiring.

## Verified backend acceptance evidence — 2026-09-10

A focused live-backend pass against `dkanoobzseckccbwnpyi` confirmed:

- old permissive policy names targeted by Phase 5 are absent;
- the `documents` bucket is private;
- anonymous execution of `has_role()` and the protected helper set is denied;
- two simulated authenticated organizations can see their own org/profile side and cannot see the other organization’s private startup/investor rows;
- cross-org startup mutation and document-row deletion affect zero rows;
- an unrelated investor organization cannot read another startup organization’s readiness items or document/object metadata;
- invitation email binding rejects the wrong identity, valid invited membership succeeds, non-admin invitation attempts fail, and last-owner deletion is blocked;
- founder startup and investor-thesis updates persist across separate authenticated database calls;
- authorized document rows and Storage metadata can be created under the required org/document path, while the other organization cannot read them;
- temporary acceptance fixtures were removed after the checks.

The Supabase security advisor now reports only authenticated `SECURITY DEFINER` warnings for functions intentionally exposed to authenticated callers or used as caller-scoped helpers; the prior anonymous-execution and mutable-search-path findings addressed by `0004`/`0005` are gone.

## Current Phase 5 status

The standalone backend boundary is accepted at the database/RLS level. Production `/app` deployment, real browser Auth flows, and production Auth redirect configuration are intentionally deferred by the maintainer; they remain the final external items before full Phase 5 production acceptance.
