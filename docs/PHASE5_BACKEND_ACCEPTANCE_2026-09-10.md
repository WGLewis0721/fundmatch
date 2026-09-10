# Phase 5 standalone backend acceptance — 2026-09-10

## Result

**Backend/RLS sub-gate: ACCEPTED.**

This is not full production Phase 5 acceptance. The maintainer intentionally deferred production `/app` hosting, production Supabase Auth redirects, and real browser auth/end-to-end validation.

## Backend identity

- FundMatch Supabase project: `dkanoobzseckccbwnpyi`
- Region: `us-east-1`
- Separate APEX project `fnmxlmjrkgojowpzrcwa`: untouched

## Live migration state

Applied successfully:

1. `0000_fundmatch_core_schema`
2. `0001_fundmatch_seed_demo_data`
3. `0002_fundmatch_accounts_persistence`
4. `0003_phase5_function_privileges`
5. `0004_phase5_has_role_privilege_hardening`
6. `0005_phase5_storage_delete_and_search_path_hardening`

`0005` was added after live validation exposed that Supabase Storage blocks direct SQL deletion from `storage.objects`. FundMatch already removes bytes through the Storage API before deleting the document row, so the incompatible database cleanup trigger was removed.

## Focused live evidence

- Old permissive policy names targeted by Phase 5: absent.
- `documents` bucket: private.
- Anonymous execution of protected helper functions: denied.
- Simulated authenticated startup and investment-firm organizations could see their own private rows but not the other organization’s private startup/investor rows.
- Cross-org startup updates and document-row deletes affected zero rows.
- Private readiness rows, document rows and Storage metadata were hidden from the unrelated organization.
- `startup_org()` returned no organization ID to the unrelated organization.
- Invitation with the wrong email identity was rejected; the correct invited identity joined successfully.
- A non-admin member could not invite another member.
- Last-owner deletion was rejected.
- Founder startup-profile and investor-thesis changes persisted across separate authenticated calls.
- Authorized document record and Storage metadata creation succeeded under the required `<org>/<document>/<file>` path.
- Temporary acceptance fixtures were removed after validation.

## Advisor state

The prior anonymous `has_role()` warning and mutable Phase 5 helper `search_path` warnings are resolved. Remaining Supabase advisor warnings concern authenticated access to `SECURITY DEFINER` functions that are intentionally exposed to authenticated callers or used as caller-scoped helpers; these require continued design review but are not evidence of anonymous privilege exposure.

## Deferred before full Phase 5 production acceptance

- Deploy current `/app` to the chosen production host.
- Configure production Supabase Auth Site URL and `/app/login` + `/app/reset` redirect allow-list.
- Exercise real signup/email confirmation/login/logout/recovery in the deployed application.
- Run deployment-level browser/end-to-end acceptance.

Phase 6 remains blocked until GPT-5.6 Sol explicitly accepts full Phase 5 or the roadmap is deliberately re-scoped.
