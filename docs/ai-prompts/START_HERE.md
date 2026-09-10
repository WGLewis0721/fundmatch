# Start here

The active FundMatch milestone is **Roadmap Phase 5 — Authenticated deployment acceptance**.

## Current state

FundMatch uses standalone Supabase project `dkanoobzseckccbwnpyi`. The separate APEX project `fnmxlmjrkgojowpzrcwa` must not be modified.

Backend provisioning is complete and live migrations `0000` through `0005` are applied. Lovable is retired from the active architecture. The focused live database/RLS sub-gate is accepted. Production `/app` hosting on Cloudflare is intentionally deferred by the maintainer for now.

Phase 6 remains blocked until the remaining deployment/browser portion of Phase 5 is completed and GPT-5.6 Sol explicitly accepts the full phase, unless the roadmap is deliberately re-scoped.

## Resource-efficient agent split

```text
Sonnet 5 = implement
GPT-5.6 Sol = architecture/security/code review
GitHub Copilot = extended mechanical validation + evidence
GPT-5.6 Sol = final ACCEPT / REJECT
Opus/Astra = refinement/polish after acceptance
```

## Phase 5 evidence already completed

- standalone FundMatch project identity confirmed;
- migration chain `0000`–`0005` applied;
- old permissive policy names absent;
- private `documents` bucket confirmed;
- protected helper functions denied to anonymous callers;
- two-organization private-row isolation confirmed;
- cross-org mutation/document-row deletion denied;
- private readiness/document/Storage metadata hidden cross-org;
- organization creation, invitation email binding, member-role restrictions, and last-owner protection checked;
- founder startup and investor-thesis persistence checked;
- Supabase Storage direct-SQL delete incompatibility fixed by `0005`;
- temporary validation fixtures removed.

See `docs/BACKEND.md`, `PHASE5_EXECUTION_STATUS.md`, and `PHASE5_ACCEPTANCE_CHECKLIST.md`.

## Intentionally deferred

- production `/app` deployment;
- production Supabase Auth Site URL + `/app/login` and `/app/reset` redirects;
- real browser signup/email confirmation/login/logout/recovery;
- deployment-level end-to-end acceptance.

Do not claim those deferred items are complete.
