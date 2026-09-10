# Test evidence

Two kinds of verification back this branch: automated policy tests that run
in CI, and a scripted browser walkthrough of two unrelated organizations that
also attacks the HTTP API directly.

## 1. Automated tests

```
$ bun test
 18 pass
 0 fail
 90 expect() calls
Ran 18 tests across 2 files.
```

- `tests/demo.test.ts` (4 tests): the existing browser-demo behaviour, unchanged.
- `tests/db/policies.test.ts` (14 tests): row-level security and storage
  policies, run against PostgreSQL 16 with `scripts/db/supabase-shim.sql` and
  all three migrations applied. Each statement executes through the
  `authenticated` role with a `request.jwt.claims` setting, exactly as
  PostgREST does. The suite skips itself when `FUNDMATCH_TEST_DATABASE_URL`
  is unset, so `bun test` stays green without a database.

Reproduce:

```sh
createdb fundmatch_test
DATABASE_URL=postgres://.../fundmatch_test bun run db:apply:local
FUNDMATCH_TEST_DATABASE_URL=postgres://.../fundmatch_test bun test
```

What the policy suite asserts, per test:

| Test                     | Asserts                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| signup trigger           | a new user's `profiles` row is visible to them and to nobody else                                                                                                                                                                      |
| anonymous callers        | `anon` cannot select organizations or call `create_organization`                                                                                                                                                                       |
| organization creation    | the creator becomes `owner`; the startup/investor profile rows are created                                                                                                                                                             |
| direct membership writes | inserting into `organizations` or `organization_members` is rejected, including self-granting into another organization and adding a stranger to your own                                                                              |
| invitations              | non-admins cannot invite; a token cannot be redeemed by a different email; a token cannot be reused; a member cannot promote themselves; the last owner cannot be removed                                                              |
| startup profiles         | private companies are invisible to other organizations; listed companies are readable but not writable; a company cannot be moved to another organization; demo rows are invisible                                                     |
| metrics and materials    | writes follow the company's organization; `javascript:` material URLs are rejected                                                                                                                                                     |
| investor data            | thesis and firm profile are invisible outside the firm; a user cannot forge another user's swipe; pipeline items must match the firm's own investor profile                                                                            |
| notes                    | notes are invisible outside the authoring organization; the author cannot be forged                                                                                                                                                    |
| readiness                | checklist creation requires membership and is idempotent; other organizations can neither read nor update items; non-http evidence links are rejected                                                                                  |
| documents and storage    | path layout, MIME type and size are enforced; another organization cannot create, read, download, or delete records or objects; users cannot forge processing status; the worker interface can; deleting the record removes the object |
| profile suggestions      | only the owning organization sees and resolves them; accepting writes the metric and provenance                                                                                                                                        |
| activity and intros      | cross-organization inserts rejected; an intro is visible to both sides                                                                                                                                                                 |
| profiles                 | `active_org_id` cannot point at an organization the user does not belong to                                                                                                                                                            |
| policy audit             | no policy on an application table grants `authenticated` unconditional access (`qual`/`with_check` = `true`)                                                                                                                           |

## 2. Browser walkthrough with two unrelated organizations

`scripts/db/browser-walkthrough.mjs` drives Chromium against the dev server.
Because this environment has no Supabase project,
`scripts/db/local-supabase-standin.mjs` serves the Supabase HTTP surface
locally: `/auth/v1` (HS256 JWTs over `auth.users`), `/rest/v1` (proxied to
PostgREST against the migrated database) and `/storage/v1` (metadata
statements run as the caller, so the storage policies decide). Authorization
therefore comes from the real policies in migration 0002, not from the
harness.

Two accounts, created fresh by the script:

- Ada Founder → organization **Acme Robotics** (`startup`)
- Ben Investor → organization **Blue Harbor Capital** (`investment_firm`)

### Signup → profile → pipeline

```
Signed-out visit to /app redirects to /app/login
Founder signup -> organization created -> founder overview rendered
Company profile saved (startup_profiles + company_metrics)
Readiness item persisted (readiness_items)
Private document uploaded (documents + storage.objects) and material link saved
Authorized download returned file: acme-deck.pdf
Company listed (visibility = public)
Invitation created for a specific email
Sign out returns to login
Thesis saved (investor_theses)
Listed company discoverable with thesis fit score
Company detail: material link visible, private document NOT listed, team note saved
Pipeline persisted after reload; stage = meeting
```

Screenshots in `docs/test-evidence/`:

| File                         | Shows                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `01-login-redirect.png`      | `/app` while signed out redirects to the login screen                           |
| `02-onboarding.png`          | organization type choice after signup                                           |
| `03-founder-overview.png`    | founder workspace with real, empty-state numbers                                |
| `06-founder-materials.png`   | uploaded private document with status, download and delete; material link saved |
| `08-founder-team-invite.png` | invitation created for `cto@example.com`                                        |
| `10-investor-discover.png`   | the other organization's listed company, scored 99/100 against the saved thesis |
| `11-investor-company.png`    | company detail: material link visible, private document absent, team note saved |
| `12-investor-pipeline.png`   | pipeline stage `meeting` after a full page reload                               |

`docs/test-evidence/browser-walkthrough.log` is the raw run log.

### Direct API attempts across organizations

Run with each user's real access token against the HTTP API, bypassing the UI.
`200 []` is PostgREST returning an empty result: the rows were filtered by RLS,
so the read returned nothing and the write matched nothing.

| Attempt                                                        | Result                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| investor reads founder's `documents`                           | `200 []`                                                                          |
| investor downloads founder's document from storage             | `400 not_found`                                                                   |
| investor deletes founder's document from storage               | `200 []` (nothing deleted)                                                        |
| investor edits founder's company profile                       | `200 []` (no rows updated)                                                        |
| investor reads founder's readiness items                       | `200 []`                                                                          |
| investor adds themselves to founder's organization             | `403 new row violates row-level security policy for table "organization_members"` |
| investor reads founder's organization                          | `200 []`                                                                          |
| founder reads investor's pipeline                              | `200 []`                                                                          |
| founder moves investor's pipeline item                         | `200 []` (no rows updated)                                                        |
| founder reads investor's notes                                 | `200 []`                                                                          |
| founder reads investor's thesis                                | `200 []`                                                                          |
| founder inserts a document record into investor's organization | `403 new row violates row-level security policy for table "documents"`            |
| anonymous reads `startup_profiles`                             | `401 permission denied for table startup_profiles`                                |
| founder reads own documents (sanity)                           | `200 [{"file_name":"acme-deck.pdf"}]`                                             |
| investor reads own pipeline (sanity)                           | `200 [{"status":"meeting"}]`                                                      |

Database state after the attempts confirms nothing was mutated: the document
row is still `uploaded` with its storage object present, and the tagline is
still `Robots that restock warehouse shelves overnight`, not the attacker's
value.

## 3. Build and type checks

```
bun run typecheck   # clean
bun run build       # TanStack Start / Nitro build, includes /app
bun run build:pages # static demo build; grep for "supabase" in dist/assets/*.js -> 0 matches
bun run lint        # new files clean; pre-existing warnings unchanged
```

The static Pages bundle contains no Supabase client code and no backend
variables, so the public demo keeps deploying exactly as before.

## Gaps this evidence does not cover

- No real Supabase project was reachable from this environment, so email
  delivery (confirmation and recovery messages), the hosted Auth rate limits,
  and Supabase's own storage service were not exercised end to end. The
  recovery screens were built against the documented `resetPasswordForEmail`
  / `PASSWORD_RECOVERY` flow but need one manual pass on a real project.
- Astra's worker path (`set_document_processing`, `profile_suggestions`) is
  covered by the policy tests using the service role, not by a running worker.

## Reconfirmation — 2026-09-10 (Sonnet 5, blocked continuation session)

A Sonnet 5 session attempting the Phase 5 continuation work
(`docs/ai-prompts/SONNET5_PHASE5_CONTINUE_AFTER_GATE.md`) had no credentialed
path to the live FundMatch Supabase project or to any deployment platform
(see `docs/ai-prompts/SONNET5_PHASE5_BLOCKED_2026-09-10.md` for the full
access-blocker record). It re-ran the non-live verification path above
against the current `main` tree to confirm code health did not regress:

```text
$ FUNDMATCH_DB_SHIM=1 sh scripts/db/apply-migrations.sh   # 0000 -> 0003, local PostgreSQL 16
migrations applied

$ FUNDMATCH_TEST_DATABASE_URL=postgres://... bun test
60 pass
0 fail
241 expect() calls
Ran 60 tests across 7 files.

$ bun run typecheck   # clean
$ bun run build       # authenticated /app (Nitro, cloudflare-module) - succeeds
$ bun run build:pages # public demo - succeeds
```

A case-insensitive `grep -i supabase dist/assets/*.js` after `build:pages`
finds only the literal environment-variable names `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`, both resolving to `void 0` because the Pages
build never defines them, plus the existing "backend configured" boolean
gate — no project URL, key value, `createClient` call or `@supabase/*`
runtime code. The bare case-sensitive `grep supabase` this document
previously cited also still returns zero matches; the case-insensitive check
is the more precise one and it still finds no secret material.

This reconfirms the build/typecheck/unit-test result on the current `main`,
but does not add any live-backend, deployment, auth-flow, or two-organization
evidence — those remain exactly as blocked as before this session.
