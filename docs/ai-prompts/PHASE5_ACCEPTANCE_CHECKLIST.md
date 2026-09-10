# Phase 5 acceptance checklist

This file defines **Phase 5 acceptance criteria**. GPT-5.6 Sol owns the final ACCEPT/REJECT decision, but GitHub Copilot should perform the extended mechanical validation and gather evidence for these checks after Sol reviews the implementation PR.

Sonnet 5 should not spend its build turn executing this entire checklist. Sol should not duplicate the full matrix either. Use Phase 5 in `GITHUB_COPILOT_VALIDATION_PROMPTS.md` plus `COPILOT_VALIDATION_HANDOFF_TEMPLATE.md` to assign the relevant checks to Copilot.

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
- [ ] Relevant type/build checks pass.
- [ ] Requested focused regression tests pass.
- [ ] Requested DB/RLS validations pass.
- [ ] Requested browser/end-to-end validations pass or are explicitly blocked.
- [ ] `docs/TEST_EVIDENCE.md` is updated with actual evidence.
- [ ] `docs/BACKEND.md` is updated.
- [ ] `ROADMAP.md` reflects only verified capabilities.

## Evidence flow

1. Sonnet implements and proposes validation cases.
2. Sol reviews the diff and writes the authoritative Copilot validation prompt.
3. GitHub Copilot runs the requested checklist items and returns PASS/FAIL/BLOCKED evidence plus a Sol follow-up prompt.
4. Sol evaluates the evidence and returns the final decision.

## Sol acceptance result

- [ ] **ACCEPT Phase 5** — critical criteria supported by evidence; Phase 6 may begin.
- [ ] **REJECT Phase 5** — blocker(s) documented; Sol writes the exact corrective Sonnet prompt and Phase 6 remains blocked.
