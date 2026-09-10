# FundMatch backend: accounts, persistence, private documents

FundMatch no longer uses Lovable. The supported production path is:

`GitHub source → standalone Supabase → Cloudflare Workers/Nitro`

The public demo at `/` and `/demo` remains browser-only on GitHub Pages. The authenticated `/app` uses Supabase Auth, Postgres/RLS and private Storage.

## Current standalone Supabase project

FundMatch now has its own standalone Supabase project:

- Project name: `FundMatch`
- Project ref: `dkanoobzseckccbwnpyi`
- API URL: `https://dkanoobzseckccbwnpyi.supabase.co`
- Region: `us-east-1`
- Organization: `Apex`
- Provisioned: `2026-09-10`

This is the only active FundMatch backend target. **Do not use the APEX application project `fnmxlmjrkgojowpzrcwa`.** The older Lovable-backed FundMatch project is retired and historical only.

## Two builds

| Build | Command | Backend | Deployment |
| --- | --- | --- | --- |
| Public demo | `bun run build:pages` | none | GitHub Pages |
| Authenticated app | `bun run build` | standalone Supabase | Cloudflare Workers/Nitro |

The Pages build must not receive Supabase credentials. `/app` may receive the Supabase project URL and publishable key in the browser; service-role and database credentials remain server-only.

## Environment variables

See `.env.example`.

| Variable | Used by | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | no |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | no, RLS-limited |
| `SUPABASE_URL` | server | no |
| `SUPABASE_PUBLISHABLE_KEY` | server | no |
| `SUPABASE_SERVICE_ROLE_KEY` | privileged backend workers only | **yes** |
| `DATABASE_URL` | Drizzle migrations | **yes** |
| `FUNDMATCH_CRON_SECRET` | optional scheduled workers | **yes** |
| `FUNDMATCH_CRON_SECRET_PREVIOUS` | optional secret rotation | **yes** |
| `FUNDMATCH_TEST_DATABASE_URL` | local/CI DB validation | local only |

## Standalone Supabase provisioning

The dedicated project already exists as `dkanoobzseckccbwnpyi`.

Remaining Phase 5 backend setup:

1. Apply repository migrations `0000` → `0001` → `0002` → `0003` in journal order.
2. Enable email/password authentication and keep email confirmation enabled for production.
3. After Cloudflare deployment, set the Auth Site URL to that production origin.
4. Add redirect URLs for `/app/login` and `/app/reset` on the production origin.
5. Verify the private `documents` bucket exists and remains non-public after migration `0002`.
6. Generate `src/integrations/supabase/types.ts` from this project.
7. Supply this project's URL and publishable key to the Cloudflare build/runtime environment.

### Migrations

```sh
DATABASE_URL=postgres://... bun run db:migrate
```

Migration sequence:

- `0000_fundmatch_core_schema.sql` — core tables.
- `0001_fundmatch_seed_demo_data.sql` — fictional seed data.
- `0002_fundmatch_accounts_persistence.sql` — organization-scoped RLS, membership/invitations, readiness, private documents, profile suggestions, Storage bucket/policies and authenticated RPCs.
- `0003_phase5_function_privileges.sql` — helper/RPC privilege hardening.

For local/CI PostgreSQL validation only, `bun run db:apply:local` may use `scripts/db/supabase-shim.sql`. Never apply that shim to a real Supabase project.

## Cloudflare deployment

The authenticated app must be deployed from the current GitHub source using native TanStack Start + Nitro configuration, with no Lovable package or runtime dependency.

Expected flow:

```sh
bun run build
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
# service-role secret only if a trusted backend worker actually needs it
npx wrangler deploy --config .output/server/wrangler.json
```

Build-time `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must point at `https://dkanoobzseckccbwnpyi.supabase.co`. Keep GitHub Pages on the browser-only demo build.

## Security model

- **Authentication:** Supabase Auth.
- **Authorization:** PostgreSQL RLS with organization-scoped helper functions.
- **Membership:** organization creation/invitations are RPC-controlled; users cannot self-grant membership.
- **Founder private data:** readiness items and documents remain restricted to the owning startup organization even when a startup profile is publicly discoverable.
- **Investor private data:** thesis, pipeline, notes and private activity remain firm-scoped.
- **Documents:** metadata lives in `public.documents`; bytes live in private Storage under `<org_id>/<document_id>/<file_name>`.
- **Service role:** server/worker only; never in browser or Pages bundles.
- **Demo separation:** `/` and `/demo` remain fictional/browser-only.

## Lovable retirement

Lovable is not an accepted production dependency for FundMatch. Remove/avoid:

- `@lovable.dev/*` packages;
- Lovable-specific Vite wrappers;
- Lovable error-reporting hooks;
- Lovable cron/environment variable names;
- Lovable database/deployment/project identifiers in active configuration;
- Lovable-hosted deployment paths.

Historical audit documents may retain references solely to explain prior Phase 5 work, but active code, configuration and runbooks must use standalone Supabase + Cloudflare.
