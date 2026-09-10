# Current FundMatch AI task

## Active milestone

**Roadmap Phase 5 — Authenticated deployment acceptance**

## Current state

- Active FundMatch backend: standalone Supabase project `dkanoobzseckccbwnpyi`.
- APEX project `fnmxlmjrkgojowpzrcwa` is unrelated and must not be modified.
- Live migrations `0000` through `0005` are applied.
- The focused database/RLS sub-gate is accepted.
- Lovable is retired from the active architecture.
- Native TanStack Start + Cloudflare tooling is on `main` from PR #17 with green GitHub Actions.

## Intentionally deferred

The maintainer has deferred production `/app` deployment for now. Therefore the following remain pending rather than failed:

- production hosting;
- production Supabase Auth Site URL and redirect allow-list;
- browser signup/email confirmation/login/logout/recovery;
- deployment-level end-to-end acceptance.

## Stop condition

Do not begin Roadmap Phase 6 until GPT-5.6 Sol explicitly accepts the full Phase 5 boundary or the roadmap is deliberately re-scoped.
