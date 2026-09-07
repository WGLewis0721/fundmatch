# FundMatch backend: accounts, persistence, private documents

This document covers the authenticated application (`/app`), its Supabase
backend, deployment, and the security model. The public demo at `/demo` and
the GitHub Pages site are unaffected: they still run entirely in the browser
with no backend, no accounts and no credentials.

## Two builds, two audiences

| Build             | Command               | Contains                                     | Backend                                  | Where it runs                                      |
| ----------------- | --------------------- | -------------------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| Public demo       | `bun run build:pages` | `/` and `/demo` only (`src/pages-entry.tsx`) | none                                     | GitHub Pages via `.github/workflows/pages.yml`     |
| Authenticated app | `bun run build`       | everything, including `/app/*`               | Supabase (Auth, Postgres + RLS, Storage) | Cloudflare Workers (Nitro preset) or any Node host |

The static Pages entry never imports `/app` routes or the Supabase client,
so no backend URL or key ever reaches the Pages bundle. The `/app` routes are
client-rendered (`ssr: false`) and, when the `VITE_SUPABASE_*` variables are
absent, show a "backend not configured" screen instead of failing.

## Environment variables

See `.env.example`. Copy it to `.env.local` for local work; `.env*` files are
git-ignored except the example.

| Variable                                   | Used by               | Secret?          | Purpose                                                                                                    |
| ------------------------------------------ | --------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                        | browser               | no               | Supabase project URL                                                                                       |
| `VITE_SUPABASE_PUBLISHABLE_KEY`            | browser               | no (RLS-limited) | Publishable/anon key                                                                                       |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server functions      | no               | Same values for SSR/server functions                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`                | backend workers only  | **yes**          | Bypasses RLS. Never in a client bundle, never in the Pages build. Only Astra's processing worker needs it. |
| `LOVABLE_DB_MIGRATION_URL`                 | `drizzle-kit migrate` | **yes**          | Direct Postgres URL for migrations                                                                         |
| `FUNDMATCH_TEST_DATABASE_URL`              | `bun test`            | local only       | Plain Postgres for the policy tests                                                                        |

## Provisioning a Supabase project

1. Create a Supabase project (or use the existing Lovable Cloud project
   `ejzizfvjnpzieigviglc` from `supabase/config.toml`).
2. Auth → Providers → Email: enable email + password. Keep **Confirm email**
   on for production (the signup screen handles the "check your inbox" case).
3. Auth → URL configuration: set the Site URL to the deployed app origin and
   add `https://<app-origin>/app/login` and `https://<app-origin>/app/reset`
   to the redirect allow list. Recovery emails open `/app/reset`.
4. Apply migrations (below). Migration 0002 creates the private `documents`
   bucket with a 25 MB limit and an allow-list of MIME types, and installs the
   storage policies. Do **not** mark the bucket public.
5. Put the project URL and publishable key into the deploy environment.

### Migrations

```sh
LOVABLE_DB_MIGRATION_URL=postgres://... bun run db:migrate
```

`drizzle-kit migrate` applies `drizzle/migrations/*.sql` in journal order and
records them in `drizzle.__drizzle_migrations`. The migrations are:

- `0000_fundmatch_core_schema.sql`: original tables. Its policies granted any
  authenticated user read/write on almost every table.
- `0001_fundmatch_seed_demo_data.sql`: fictional demo rows (`is_demo = true`).
- `0002_fundmatch_accounts_persistence.sql`: **drops every permissive policy**
  and replaces them with organization-scoped policies, adds membership roles,
  invitations, readiness items, documents, profile suggestions, the storage
  bucket and policies, and the RPCs the app uses.

For a plain PostgreSQL database (CI, local tests) run
`bun run db:apply:local` with `DATABASE_URL` set. It first applies
`scripts/db/supabase-shim.sql`, a stand-in for the `auth`/`storage` schemas
and roles that Supabase provides. Never run the shim on a real project.

After changing the schema, regenerate `src/integrations/supabase/types.ts`
with the Supabase CLI (`supabase gen types typescript --linked`). The file
currently carries hand-written additions for migration 0002.

## Deploying the authenticated app

`bun run build` produces `.output/` through Nitro with the Cloudflare preset
already configured by `@lovable.dev/vite-tanstack-config`.

Cloudflare Workers:

```sh
bun run build
# set VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY at build time (.env.production or CI env)
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler deploy --config .output/server/wrangler.json
```

Any Node host works as well: run the Nitro server entry from `.output/server`
with the same environment variables. Lovable Cloud deploys use the same build
and read the variables from the connected Supabase project.

Keep GitHub Pages pointed at the demo build only. The Pages workflow does not
receive backend variables, by design.

## Security model

- **Authentication**: Supabase Auth, email + password, recovery by email.
  `auth.users` inserts trigger `handle_new_user()` which creates the
  `profiles` row.
- **Authorization**: PostgreSQL row-level security on every table, using
  `SECURITY DEFINER` helpers (`is_org_member`, `is_org_admin`,
  `can_view_startup`, `can_edit_startup`, ...). The browser talks to
  PostgREST/Storage directly with the user's JWT; the service role is never
  used in the app.
- **Organizations and membership**: created only through
  `create_organization()`, which makes the caller the owner. Direct inserts
  into `organizations` and `organization_members` are rejected. Joining
  another organization requires `invite_member()` by an admin and
  `accept_invitation(token)` by a signed-in user whose email matches the
  invitation. The last owner cannot be removed or demoted.
- **Founder data** (`startup_profiles`, `company_metrics`,
  `founder_materials`, `source_provenance`, `readiness_items`,
  `documents`): editable by members of the owning organization. Listed
  companies (`visibility = 'public'`) are readable by other signed-in users,
  except `documents` and `readiness_items`, which are never shared.
- **Investor data** (`investor_profiles`, `investor_theses`,
  `pipeline_items`, `team_notes`, `activity_events`): members of the firm
  only. `swipes`/`saved_companies` are per user.
- **Documents**: records live in `public.documents`; bytes live in the
  private `documents` bucket at `<org_id>/<document_id>/<file_name>`. Storage
  policies require a matching record owned by the caller's organization for
  every read, write and delete, so a path alone grants nothing. Downloads go
  through `storage.download()` with the user's JWT; no public URLs exist.
- **Demo separation**: every policy excludes `is_demo = true` rows, so seeded
  demo companies never appear in real accounts. The browser demo keeps using
  localStorage and never contacts the backend.

## Local development against the backend

```sh
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / KEY
bun run dev                  # http://localhost:8080/app
```

Without a Supabase project you can still exercise the full flow locally:
`scripts/db/local-supabase-standin.mjs` emulates the Auth and Storage HTTP
APIs on top of PostgREST + Postgres (used for the evidence in
`docs/TEST_EVIDENCE.md`). It is a test tool, not a deployable service.
