# Sonnet 5 handoff — Roadmap Phase 5

You are the primary implementation engineer for FundMatch.

## Mission

Complete the **implementation** required for Roadmap Phase 5 — Authenticated deployment acceptance — and stop. Do not begin production discovery/ranking work.

Sonnet is not the exhaustive validation agent. GitHub Copilot will perform the broader auth/browser/RLS/storage/adversarial validation after GPT-5.6 Sol reviews the PR.

## Repository

`WGLewis0721/fundmatch`

Read first:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `README.md`
4. `docs/MATCHING_ARCHITECTURE.md`
5. `docs/IMPLEMENTATION_NEXT_STEPS.md`
6. `docs/BACKEND.md`
7. `docs/PHASE5_ACCEPTANCE_AUDIT.md`
8. `docs/ai-prompts/SONNET5_BUILD_PROMPTS.md`
9. `docs/ai-prompts/SONNET_TO_SOL_HANDOFF_TEMPLATE.md`
10. `docs/ai-prompts/COPILOT_VALIDATION_HANDOFF_TEMPLATE.md`

## Verified environment identity

FundMatch Supabase project ref: `ejzizfvjnpzieigviglc`

FundMatch Lovable project: `34443a2f-0671-4404-94db-fe807d4a7448`

Separate APEX Supabase project: `fnmxlmjrkgojowpzrcwa`

**Do not modify APEX.**

The FundMatch backend was previously observed on the older permissive schema/security state and missing the newer Phase 5 tables/bucket expected by the repository migrations.

## Required implementation

1. Inspect the live FundMatch schema before applying changes.
2. Reconcile it against the intended repo migrations; do not blindly replay the original schema/seed over an existing database.
3. Apply the missing intended Phase 5 changes from `0002_fundmatch_accounts_persistence.sql`.
4. Apply `0003_phase5_function_privileges.sql` immediately after `0002`.
5. Replace old permissive policies with the intended organization-scoped policy model.
6. Ensure privileged helpers/RPCs have explicit grants/revocations, safe `search_path`, and the intended caller/org checks.
7. Create/verify the private `documents` bucket and intended object policies.
8. Regenerate Supabase TypeScript types if the available tooling supports it.
9. Wire/deploy the current authenticated `/app` to the intended FundMatch backend using the documented architecture; do not commit secrets or publish a stale replacement build.
10. Configure the intended auth redirect URLs for the deployed origin when access permits.
11. Fix only implementation issues required for Phase 5.
12. Update `docs/BACKEND.md`, `ROADMAP.md`, and acceptance notes only with facts directly observed during implementation.
13. Open a PR to `main`; do not merge it yourself.

## Sonnet validation boundary

Run only minimum sanity checks needed to avoid handing off obviously broken work, such as a directly relevant typecheck/build/migration sanity check when practical.

Do **not** spend the Sonnet turn performing the full signup/recovery browser walkthrough, two-organization attack matrix, Storage attack matrix, broad DB/RLS regression suite, full browser matrix, repeated builds, or other above-and-beyond validation. Those are GitHub Copilot's job after Sol reviews the implementation.

## Security design requirements

While implementing, preserve these boundaries:

- no authorization based on user-editable `user_metadata`;
- `UPDATE` RLS policies use both `USING` and `WITH CHECK` where applicable;
- `TO authenticated` alone is never treated as authorization;
- `SECURITY DEFINER` functions are not broadly executable unless explicitly intended;
- service-role credentials never reach browser/public assets;
- private Storage remains private and organization-scoped.

## Do not build

No Phase 6+, pgvector, new discovery retrieval, realtime notifications, queued AI extraction, billing, integrations, chat, UI redesign, Redis, Kafka, OpenSearch/Elasticsearch, Kubernetes, or microservice split.

## Required final report

Return:

- branch and PR number/URL;
- exact FundMatch backend/project used;
- exact migration/schema/infrastructure changes actually applied;
- confirmation APEX was untouched;
- deployment URL/state for `/app`;
- minimum sanity checks Sonnet ran;
- files changed;
- remaining blockers/uncertainties;
- **proposed GitHub Copilot validations** for auth, RLS, Storage, two-org isolation, deployment, secret exclusion, and regression;
- explicit statement: `READY FOR GPT-5.6 SOL ARCHITECTURE REVIEW` or `NOT READY`, with reason.

Then include a complete ready-to-paste GPT-5.6 Sol follow-up prompt using `SONNET_TO_SOL_HANDOFF_TEMPLATE.md`. Sol should inspect the PR/design and conclude by writing the authoritative GitHub Copilot validation prompt. Sol should not perform the entire mechanical validation matrix itself.

Stop after Phase 5 implementation. Do not merge unless explicitly instructed.
