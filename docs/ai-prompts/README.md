# FundMatch AI Build Playbook

This folder is the operational prompt set for finishing FundMatch without having multiple AI agents redesigning the same system at the same time.

## Read first

Every agent must read, in order:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `docs/MATCHING_ARCHITECTURE.md`
4. `docs/IMPLEMENTATION_NEXT_STEPS.md`
5. `README.md`
6. Relevant implementation/security docs for the assigned phase

The roadmap and architecture documents outrank these prompts if they conflict.

## Roles

- **Sonnet 5 — primary builder.** Implements one scoped phase at a time: code, migrations, wiring, tests and implementation notes.
- **GPT-5.6 Sol — technical lead/reviewer.** Defines acceptance boundaries, reviews Sonnet's PR, checks architecture/security/data isolation, tests edge cases, and either approves or returns a precise correction list.
- **Opus — refinement engineer.** Runs only after the phase is functionally accepted. Refactors, simplifies, improves resilience and code quality without changing the approved architecture or product scope.
- **Astra — product experience/polish.** Runs after functionality is accepted. Improves interaction quality, visual presentation, motion, storytelling and supporting assets without inventing backend capabilities.

## Required order

For each phase:

```text
GPT-5.6 Sol scope/acceptance
→ Sonnet 5 implementation
→ GPT-5.6 Sol review/security/acceptance
→ Sonnet 5 corrections if needed
→ Opus refinement
→ GPT-5.6 Sol regression check
→ Astra experience polish when the phase has visible UX
→ merge
```

Do not let Opus or Astra redesign architecture before the implementation passes acceptance.

## Branch rule

Use one branch/PR per phase. Do not combine unrelated roadmap phases. Do not rewrite already-published Git history because the repository is connected to Lovable.

Suggested branch names:

- `implementation/phase5-auth-deployment`
- `implementation/phase6-marketplace-events`
- `implementation/phase7-interest-workflow`
- `implementation/phase8-ai-processing`
- `implementation/phase9-semantic-matching`
- `implementation/phase10-notifications`
- `implementation/phase11-integrations`
- `pilot/phase12-readiness`

## Hard constraints

- Preserve public demo vs private authenticated app separation.
- Keep secrets and service-role credentials server-side only.
- Preserve RLS and organization isolation.
- Do not silently overwrite founder/investor claims with AI output.
- Preserve provenance.
- Do not add Redis, Kafka, Elasticsearch/OpenSearch, Kubernetes or a microservice fleet unless measured scale justifies it and the roadmap is deliberately changed.
- Do not present mocked integrations, AI extraction, billing or introductions as live.
- Do not expose proprietary ranking weights, prompts, private datasets or future learned-model details in public surfaces.

## Prompt files

- `SONNET5_BUILD_PROMPTS.md` — implementation prompts for the builder.
- `GPT56_SOL_REVIEW_PROMPTS.md` — scope, review and acceptance prompts.
- `OPUS_REFINEMENT_PROMPT.md` — post-acceptance code refinement.
- `ASTRA_POLISH_PROMPT.md` — post-acceptance UX/visual polish.
- `RELEASE_HANDOFF_PROMPT.md` — final pre-merge/release handoff.
