# Phase 5 acceptance checklist

Use this checklist for GPT-5.6 Sol review after Sonnet 5 completes implementation.

## Backend identity

- [ ] Work was performed against FundMatch project `ejzizfvjnpzieigviglc` / Lovable project `34443a2f-0671-4404-94db-fe807d4a7448`.
- [ ] APEX project `fnmxlmjrkgojowpzrcwa` was not modified.

## Migration and schema

- [ ] Live schema reconciled against repo migrations.
- [ ] Missing Phase 5 schema installed.
- [ ] `organization_invitations` exists.
- [ ] `readiness_items` exists.
- [ ] `documents` exists.
- [ ] `profile_suggestions` exists.
- [ ] Private `documents` storage bucket exists.

## Authorization

- [ ] Old permissive FundMatch RLS policies are removed.
- [ ] Organization-scoped RLS policies are installed.
- [ ] `SECURITY DEFINER` functions have explicit execute grants/revocations.
- [ ] Privileged helpers enforce caller and organization authorization.
- [ ] No service-role secret is present in browser/public assets.

## Auth

- [ ] Signup works.
- [ ] Email-confirmation behavior works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Password recovery works.

## Organization workflow

- [ ] Startup organization creation works.
- [ ] Investment-firm organization creation works.
- [ ] Invitations work.
- [ ] Role boundaries work.
- [ ] Last-owner protections work.

## Persistence

- [ ] Founder profile persists.
- [ ] Founder readiness persists.
- [ ] Founder materials persist.
- [ ] Investor profile persists.
- [ ] Investor thesis persists.

## Private documents

- [ ] Upload works.
- [ ] Download works for authorized organization.
- [ ] Delete works for authorized organization.
- [ ] Cross-org download is denied.
- [ ] Cross-org delete is denied.

## Two-organization isolation

- [ ] Org A cannot read Org B private startup rows.
- [ ] Org A cannot mutate Org B private startup rows.
- [ ] Org B cannot read Org A private investor rows.
- [ ] Org B cannot mutate Org A private investor rows.
- [ ] Private notes/readiness/documents remain isolated.

## Deployment and regression

- [ ] `/app` is deployed against the intended backend.
- [ ] `/` and `/demo` remain fictional/browser-only.
- [ ] Typecheck passes.
- [ ] Unit tests pass.
- [ ] DB/RLS tests pass.
- [ ] Production app build passes.
- [ ] Pages/demo build passes.
- [ ] `docs/TEST_EVIDENCE.md` is updated.
- [ ] `docs/BACKEND.md` is updated.
- [ ] `ROADMAP.md` reflects only verified capabilities.

## Sol acceptance result

- [ ] **ACCEPT Phase 5** — all critical gates passed; Phase 6 may begin.
- [ ] **REJECT Phase 5** — blocker(s) documented; Phase 6 must not begin.
