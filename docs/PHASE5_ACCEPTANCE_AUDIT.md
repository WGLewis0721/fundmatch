# Phase 5 authenticated deployment acceptance audit

**Audit date:** 2026-09-10

This document records the live backend state observed before Roadmap Phase 5 implementation begins. It is an acceptance baseline, not a claim that the private app is production-ready.

## Executive result

**Phase 5 is not accepted. Do not put real founder, investor, financial, diligence, or fundraising data into the authenticated FundMatch app yet.**

The intended FundMatch backend was located through the original Lovable project, but its live database is still on the earlier permissive schema. The repository contains the newer organization-scoped security migration and private-document model, but those changes are not currently present in the live FundMatch database.

## Backend identity

The repository pins the intended Supabase project reference in `supabase/config.toml`:

```text
ejzizfvjnpzieigviglc
```

The original Lovable project is:

```text
Project: Fund Finder / FundMatch
Lovable project id: 34443a2f-0671-4404-94db-fe807d4a7448
Database: enabled (Supabase)
```

The Supabase account currently connected directly to ChatGPT exposes a different project whose schema is APEX-specific (`workspaces`, `subscriptions`, `stripe_connections`, `apex_billing_accounts`, etc.). **That project is not FundMatch and must not be modified for FundMatch work.**

## Live FundMatch database observed

The Lovable-backed FundMatch database currently contains the original application tables, including:

- `profiles`
- `organizations`
- `organization_members`
- `startup_profiles`
- `investor_profiles`
- `investor_theses`
- `company_metrics`
- `founder_materials`
- `matches`
- `swipes`
- `saved_companies`
- `pipeline_items`
- `team_notes`
- `intro_requests`
- `activity_events`

The following Phase 5 tables from `drizzle/migrations/0002_fundmatch_accounts_persistence.sql` were **not** present during this audit:

- `organization_invitations`
- `readiness_items`
- `documents`
- `profile_suggestions`

The private `documents` storage bucket and the newer document-processing/profile-suggestion workflow therefore cannot be considered live.

## Security finding

The live database still exposes the earlier policy set, including policies named:

```text
profiles readable by authenticated
orgs read
orgs write
members read
members insert own
members delete own
startups read
startups write
metrics read
metrics write
materials read
materials write
investors read
investors write
theses read
theses write
matches read
matches write
swipes read
swipes own write
saved read
saved own write
pipeline read
pipeline write
notes read
notes write
intros read
intros write
activity read
activity write
```

These are the permissive policies that migration `0002_fundmatch_accounts_persistence.sql` is designed to replace with organization-scoped authorization.

**Acceptance consequence:** the current live database must not be approved for private production use until the repository migration is applied, verified, and cross-organization isolation is proven using real authenticated sessions or an equivalent JWT/RLS acceptance harness.

## Repository-side implementation already available

The repository already contains:

- Supabase Auth integration for signup, email confirmation, login, logout and password recovery;
- organization creation and membership/invitation RPC contracts;
- organization-scoped RLS migration logic;
- private document metadata/storage model;
- founder readiness persistence;
- AI/profile suggestion persistence contracts;
- local database policy tests;
- `/app` backend-not-configured handling;
- deployment instructions for the authenticated TanStack Start app.

This means Phase 5 should be treated primarily as **migration + environment + deployment + live acceptance work**, not a fresh backend redesign.

## Sonnet 5 implementation target

Use `docs/ai-prompts/SONNET5_BUILD_PROMPTS.md` → **Prompt 1 — Authenticated production deployment**.

The implementation engineer must:

1. Work against the intended FundMatch/Lovable Supabase database above; never the APEX project.
2. Reconcile the live schema with repository migrations before applying changes.
3. Apply the missing FundMatch migration(s) safely and preserve any intended demo data.
4. Verify all exposed application tables have the expected organization-scoped RLS policies.
5. Verify `SECURITY DEFINER` functions have explicit execute grants/revocations and cannot be abused by `anon`/unrelated users.
6. Create/verify the private `documents` bucket and its storage policies.
7. Configure the authenticated app environment without committing credentials.
8. Verify signup, confirmation, login, logout and password recovery.
9. Verify startup and investment-firm organization creation and invitations.
10. Verify founder profile, investor thesis, readiness and document persistence.
11. Verify private document upload/download/delete.
12. Use two separate organizations to prove private database rows and storage objects are isolated.
13. Confirm the public `/` and `/demo` builds remain browser-only and contain no production secrets.
14. Record exact deployment URL, tests and acceptance evidence in repository docs.

## Phase 5 acceptance gates

Phase 5 may be marked complete only when all of the following are true:

- intended FundMatch backend identity is confirmed;
- repository migrations and live migration state agree;
- old permissive policies are gone;
- organization-scoped RLS is active;
- private storage policies are active;
- two real test organizations cannot read or mutate one another's private rows;
- two real test organizations cannot download/delete one another's private files;
- signup/login/recovery/invitation flows work on the deployed `/app`;
- organization-scoped founder/investor data persists across refresh/session changes;
- no service-role or migration credential appears in browser/public assets;
- demo and production surfaces remain separate;
- results are captured in `docs/TEST_EVIDENCE.md` and `ROADMAP.md`.

Until those gates pass, Phase 5 status remains **acceptance pending**.
