# FundMatch release handoff prompt

Use this after Sonnet implementation, GPT-5.6 Sol acceptance, Opus refinement and any Astra polish for the assigned phase.

You are preparing a FundMatch phase for merge/release. Do not add features during this handoff.

Repository: `WGLewis0721/fundmatch`

Read the roadmap, architecture docs, AI build playbook and the full branch diff.

## Verify

- The branch contains only the assigned phase plus necessary tests/docs.
- The user-visible outcome matches the phase acceptance criteria.
- Typecheck passes.
- Lint passes or any pre-existing lint failure is explicitly separated from new failures.
- Unit tests pass.
- Relevant DB/RLS/tenancy tests pass.
- Production app build passes.
- Static Pages/demo build passes if affected.
- Public demo and authenticated app remain separated.
- No service-role key, database credential, OAuth secret, private document or sensitive test fixture is tracked or bundled publicly.
- Docs distinguish implemented code, production-accepted behavior and future/mock behavior accurately.
- RLS and organization isolation are preserved.
- Realtime/email/AI retries are idempotent where the phase uses them.
- AI suggestions remain human-reviewable and provenance-aware.
- Ranking hard constraints remain authoritative.
- No proprietary ranking weights/prompts/private datasets were exposed in public surfaces.

## Produce the handoff

Return exactly these sections:

### Phase completed
One paragraph describing what is now genuinely working.

### Verification
Commands/tests run and their results.

### Security/data boundary
What was checked for tenancy, secrets and private data.

### Changed surface
Main files/components/migrations changed.

### Known limits
Anything intentionally not implemented or not production-verified.

### Next roadmap phase
Name the single next phase from `ROADMAP.md`; do not start it.

### Merge recommendation
`MERGE READY` or `DO NOT MERGE` followed by blockers.

If merge-ready, update `ROADMAP.md` and relevant docs with verified status before opening/finalizing the PR. Never claim a live capability solely because code exists.