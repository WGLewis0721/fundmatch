# Start here

The active FundMatch milestone is **Roadmap Phase 5 — Authenticated deployment acceptance**.

## Current decision

**Lovable is retired from FundMatch.** Do not use or reintroduce Lovable for build tooling, deployment, database access, migration credentials, generated runtime hooks, or project management.

The supported production path is now:

`GitHub source → standalone Supabase → Cloudflare Workers/Nitro`

The public `/` + `/demo` experience remains on GitHub Pages and browser-only.

Historical Phase 5 documents may mention Lovable because it was previously used to locate the old backend. Treat those references as historical only.

## Standalone FundMatch backend is provisioned

Use only:

- Supabase project: `FundMatch`
- Project ref: `dkanoobzseckccbwnpyi`
- API URL: `https://dkanoobzseckccbwnpyi.supabase.co`
- Region: `us-east-1`
- Organization: `Apex`

Never use or modify the separate APEX application project `fnmxlmjrkgojowpzrcwa` for FundMatch.

## Current Phase 5 status

GPT-5.6 Sol previously rejected Phase 5 because the authenticated production environment was not independently deployable/validated. A fresh standalone FundMatch Supabase project now exists, so the remaining work is implementation and validation rather than provisioning.

Phase 6 remains blocked until:

1. remaining Lovable package/build coupling is removed;
2. migrations `0000` through `0003` are applied to `dkanoobzseckccbwnpyi`;
3. Supabase types are regenerated;
4. current GitHub `/app` is deployed to Cloudflare;
5. Supabase Auth redirects are configured for the Cloudflare origin;
6. GitHub Copilot completes focused Phase 5 validation;
7. GPT-5.6 Sol explicitly accepts the evidence.

## Next action — GitHub Copilot

Run:

`docs/ai-prompts/COPILOT_PHASE5_REMOVE_LOVABLE_AND_FINISH.md`

Copilot owns the mechanical cleanup, migration, deployment and focused Phase 5 validation. It must use `dkanoobzseckccbwnpyi` and must not create or substitute another backend.

## Resource-efficient agent split

```text
Sonnet 5 = feature implementation
GPT-5.6 Sol = architecture/security/code review
GitHub Copilot = mechanical infrastructure cleanup + extended validation/evidence
GPT-5.6 Sol = final ACCEPT / REJECT
Opus/Astra = refinement/polish after acceptance
```

Do not begin Phase 6 before explicit Sol acceptance.
