# FundMatch AI Build Playbook

This folder is the operational prompt set for finishing FundMatch without having multiple AI agents duplicate the same work.

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

- **Sonnet 5 — primary builder.** Implements one scoped phase at a time: code, migrations, wiring and focused implementation notes. Runs only minimum sanity checks needed for a coherent handoff. Every Sonnet turn ends with proposed GitHub Copilot validations plus a self-contained GPT-5.6 Sol follow-up prompt using `SONNET_TO_SOL_HANDOFF_TEMPLATE.md`.
- **GPT-5.6 Sol — technical lead/reviewer.** Defines acceptance boundaries and reviews the actual implementation for architecture, authorization, data contracts, migration safety, state transitions and product truthfulness. Sol does not spend its turn on broad mechanical validation. Every post-implementation Sol review ends with the authoritative GitHub Copilot validation prompt.
- **GitHub Copilot — validation/regression engineer.** Owns heavier mechanical verification: broad regression, adversarial/security cases, two-user/two-org matrices, browser/end-to-end checks, retries/idempotency cases, deployment evidence and focused validation harnesses. It reports evidence back to Sol for the final acceptance decision.
- **Opus — refinement engineer.** Runs after functional acceptance to simplify/refactor/improve resilience without changing approved architecture or scope.
- **Astra — product experience/polish.** Runs after functionality is accepted to improve interaction quality, visual presentation, motion, storytelling and assets without inventing backend capabilities.

## Required order

```text
GPT-5.6 Sol scope
→ Sonnet 5 implementation + minimum sanity checks
→ Sonnet proposes Copilot validations + writes ready-to-paste Sol context prompt
→ GPT-5.6 Sol architecture/security review
→ Sol writes authoritative GitHub Copilot validation prompt
→ GitHub Copilot performs focused extended validation and returns evidence to Sol
→ GPT-5.6 Sol ACCEPT / REJECT
→ Sonnet corrections if rejected
→ repeat focused Sol → Copilot gate as needed
→ Opus refinement
→ focused Copilot regression as needed
→ Astra experience polish when useful
→ merge
```

## Validation economy rule

Validate the changed phase and affected boundaries, not the entire historical product on every turn. Sonnet should run minimum implementation sanity checks. Sol should primarily reason from code/diff and narrow spot-checks. Copilot owns the broader requested validation matrix.

## Branch rule

Use one branch/PR per phase. Do not combine unrelated roadmap phases. Do not rewrite published history without a specific repository reason.

Suggested branch names:

- `implementation/phase5-auth-deployment`
- `implementation/phase6-marketplace-events`
- `implementation/phase7-interest-workflow`
- `implementation/phase8-ai-processing`
- `implementation/phase9-semantic-matching`
- `implementation/phase10-notifications`
- `implementation/phase11-integrations`
- `pilot/phase12-readiness`

## Active backend boundary

FundMatch uses standalone Supabase project `dkanoobzseckccbwnpyi`. The APEX project `fnmxlmjrkgojowpzrcwa` is unrelated and must not be used for FundMatch.

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
- `SONNET_TO_SOL_HANDOFF_TEMPLATE.md` — mandatory Sonnet → Sol context handoff with proposed Copilot validations.
- `GPT56_SOL_REVIEW_PROMPTS.md` — architecture/review prompts that conclude with a Copilot validation assignment.
- `COPILOT_VALIDATION_HANDOFF_TEMPLATE.md` — standard Sol/Sonnet → GitHub Copilot validation prompt format.
- `GITHUB_COPILOT_VALIDATION_PROMPTS.md` — phase-specific validation sets for Copilot.
- `OPUS_REFINEMENT_PROMPT.md` — post-acceptance code refinement.
- `ASTRA_POLISH_PROMPT.md` — post-acceptance UX/visual polish.
- `RELEASE_HANDOFF_PROMPT.md` — final pre-merge/release handoff.
