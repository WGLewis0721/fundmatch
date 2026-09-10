# Start here

The active FundMatch milestone is **Roadmap Phase 5 — Authenticated deployment acceptance**.

## Current decision

**Lovable is retired from FundMatch.** Do not use or reintroduce Lovable for build tooling, deployment, database access, migration credentials, generated runtime hooks, or project management.

The supported production path is now:

`GitHub source → standalone Supabase → Cloudflare Workers/Nitro`

The public `/` + `/demo` experience remains on GitHub Pages and browser-only.

Historical Phase 5 documents may mention Lovable because it was previously used to locate the old backend. Treat those references as historical only.

## Current Phase 5 status

GPT-5.6 Sol previously rejected Phase 5 because the authenticated production environment was not independently deployable/validated. Sol later applied the Phase 5 `0002` and `0003` database changes to the old backend, but that backend is now retired with Lovable and must not be the production dependency going forward.

Phase 6 remains blocked until FundMatch has a **standalone Supabase project**, the current GitHub app is deployed to Cloudflare, GitHub Copilot completes the focused Phase 5 validation, and GPT-5.6 Sol explicitly accepts the evidence.

## Next action — GitHub Copilot

Run:

`docs/ai-prompts/COPILOT_PHASE5_REMOVE_LOVABLE_AND_FINISH.md`

Copilot owns this mechanical migration/validation task:

1. remove remaining Lovable runtime/build/package/lockfile references;
2. preserve the native TanStack Start + Nitro + Cloudflare build;
3. point FundMatch at a standalone Supabase project that is **not** the APEX project;
4. apply/reconcile migrations `0000` through `0003` on that standalone FundMatch project;
5. deploy current `/app` to Cloudflare;
6. execute the focused Phase 5 acceptance validations;
7. return a ready-to-paste GPT-5.6 Sol acceptance prompt with evidence.

If no standalone FundMatch Supabase project has been provisioned yet, Copilot should complete the repo cleanup it can safely do, then stop with exactly that environment blocker. It must never use APEX project `fnmxlmjrkgojowpzrcwa` as a substitute.

## Resource-efficient agent split

```text
Sonnet 5 = feature implementation
GPT-5.6 Sol = architecture/security/code review
GitHub Copilot = mechanical infrastructure cleanup + extended validation/evidence
GPT-5.6 Sol = final ACCEPT / REJECT
Opus/Astra = refinement/polish after acceptance
```

Do not begin Phase 6 before explicit Sol acceptance.
