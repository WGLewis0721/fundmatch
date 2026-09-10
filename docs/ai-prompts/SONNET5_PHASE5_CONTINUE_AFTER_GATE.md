# Sonnet 5 — continue FundMatch Phase 5 after Sol acceptance rejection

Use this prompt as the next implementation turn.

---

You are the primary implementation engineer for **FundMatch**. Continue from the current repository state; do not restart the project or redesign the architecture.

Repository: `WGLewis0721/fundmatch`
Branch from latest `main` before making changes.

## Read first

1. `AGENTS.md`
2. `docs/ai-prompts/START_HERE.md`
3. `docs/ai-prompts/PHASE5_ACCEPTANCE_RESULT_2026-09-10.md`
4. `docs/ai-prompts/PHASE5_SONNET_HANDOFF.md`
5. Prompt 1 in `docs/ai-prompts/SONNET5_BUILD_PROMPTS.md`
6. `docs/ai-prompts/SONNET_TO_SOL_HANDOFF_TEMPLATE.md`
7. `docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md`
8. `docs/ai-prompts/GITHUB_COPILOT_VALIDATION_PROMPTS.md`
9. `ROADMAP.md`
10. `docs/MATCHING_ARCHITECTURE.md`
11. `docs/IMPLEMENTATION_NEXT_STEPS.md`
12. `docs/BACKEND.md`
13. `drizzle/migrations/0002_fundmatch_accounts_persistence.sql`
14. `drizzle/migrations/0003_phase5_function_privileges.sql`

## Mission

Fix only the implementation blockers that caused GPT-5.6 Sol to reject Roadmap Phase 5. Stop when the Phase 5 implementation PR is ready for Sol architecture review. Do **not** begin Phase 6.

Extended validation is deliberately delegated to GitHub Copilot after Sol reviews the diff.

## Verified environment identity

FundMatch Lovable project: `34443a2f-0671-4404-94db-fe807d4a7448`

FundMatch Supabase project ref: `ejzizfvjnpzieigviglc`

Separate APEX Supabase project ref: `fnmxlmjrkgojowpzrcwa`

**Do not modify APEX.**

## Starting blockers

The prior Sol gate found the live FundMatch backend still on the older security/schema state, including missing Phase 5 tables/private Storage and permissive authenticated policies. The Lovable app was also unpublished/stale relative to current GitHub `main`.

## Required implementation — execute in order

1. Create a fresh implementation branch from latest `main`.
2. Inspect the live FundMatch schema/migration state before changing it.
3. Reconcile the existing schema with `0002_fundmatch_accounts_persistence.sql`; do not blindly replay `0000`/`0001`.
4. Apply the missing intended Phase 5 schema/security changes to **FundMatch only**.
5. Apply `0003_phase5_function_privileges.sql` immediately afterward.
6. Ensure old permissive policies are replaced by the intended organization-scoped model.
7. Ensure privileged helpers/RPCs have explicit execute grants/revocations and correct caller/org checks.
8. Create/verify the private `documents` Storage bucket and object policies.
9. Regenerate Supabase types if tooling permits.
10. Wire the current authenticated `/app` to the intended backend without committing secrets.
11. Deploy/prepare the **current** app using the documented architecture; do not publish the stale Lovable snapshot and call it complete.
12. Configure the intended auth redirect URLs if the available deployment/backend access permits it.
13. Fix only Phase 5 implementation defects discovered while doing the work.
14. Update documentation with implementation facts actually observed.
15. Open a PR to `main`. Do not merge it yourself.

## Do not perform the extended acceptance matrix

Sonnet may run only minimum sanity checks needed to ensure the implementation handoff is coherent, such as a directly relevant typecheck/build/migration check.

Do **not** spend this turn on:

- full signup/email-confirmation/recovery walkthroughs;
- two-user/two-organization adversarial matrices;
- full RLS regression suites;
- Storage cross-org attack matrices;
- broad browser/device testing;
- repeated build combinations;
- above-and-beyond validation unrelated to implementation.

Those checks belong to GitHub Copilot. Your job is to **write the validation cases Copilot must execute**, not consume Sonnet resources executing all of them.

## Hard boundaries

No Phase 6+, pgvector, new candidate retrieval, realtime, queued AI, billing, integrations, chat, Redis, Kafka, search cluster, Kubernetes, microservices, or UI redesign.

Do not create a replacement database because another connector is easier. Do not touch APEX. Do not weaken RLS. Do not expose service-role credentials. Do not mark unvalidated behavior accepted.

## Required final report

Return:

- branch + PR number/URL;
- head SHA;
- exact FundMatch backend/project used;
- migrations/schema/infrastructure actually changed;
- confirmation APEX was untouched;
- deployed `/app` URL/state if available;
- minimum sanity checks run and results;
- files changed;
- blockers/uncertainties;
- a **PROPOSED GITHUB COPILOT VALIDATION** section listing the exact Phase 5 checks Copilot should execute from `GITHUB_COPILOT_VALIDATION_PROMPTS.md`;
- `READY FOR GPT-5.6 SOL ARCHITECTURE REVIEW` or `NOT READY`.

## Mandatory model handoffs

After the report, output a complete ready-to-paste GPT-5.6 Sol prompt using `SONNET_TO_SOL_HANDOFF_TEMPLATE.md`.

Your Sol prompt must include your proposed Copilot validations and instruct Sol to:

1. inspect the implementation/diff rather than rerunning the full test matrix;
2. identify architecture/security/design blockers;
3. refine/prioritize your proposed validations;
4. conclude by writing the authoritative **GITHUB COPILOT VALIDATION PROMPT** using `COPILOT_VALIDATION_HANDOFF_TEMPLATE.md` + Phase 5 in `GITHUB_COPILOT_VALIDATION_PROMPTS.md`;
5. wait for Copilot evidence before making final Phase 5 ACCEPT/REJECT.

Do not continue beyond Phase 5.

---
