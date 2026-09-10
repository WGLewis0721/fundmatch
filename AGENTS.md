# Agent instructions

Before changing FundMatch, read `ROADMAP.md`, `README.md`, and `docs/MATCHING_ARCHITECTURE.md`. For implementation sequencing, also read `docs/IMPLEMENTATION_NEXT_STEPS.md`. If multiple AI models are being used for build/review/refinement/polish, read `docs/ai-prompts/README.md` and use the role-specific prompts there.

Rules:

1. Work on one milestone at a time.
2. Inspect the current repo before making claims about what exists.
3. Keep demo behavior clearly labeled.
4. Do not present mocked integrations, AI extraction, introductions, semantic matching, or production ranking as live.
5. Preserve the separation between the public demo (`/`, `/demo`) and authenticated app (`/app`).
6. Keep service-role keys, migration URLs, backend secrets, proprietary ranking weights, prompts, and production feature engineering out of browser code and public docs.
7. Preserve provenance and human review for AI-generated company/investor claims.
8. Keep hard eligibility rules deterministic and outside LLM control.
9. Prefer the documented managed-service modular-monolith architecture; do not introduce Redis, Kafka, dedicated search clusters, Kubernetes, or microservice decomposition without measured production need.
10. Persist marketplace truth in Postgres; treat realtime as delivery and background queues as asynchronous execution.
11. Avoid unlicensed proprietary private-market data.
12. Update `ROADMAP.md` after meaningful product or infrastructure changes.
13. Use the resource-efficient validation split in `docs/ai-prompts/README.md`: Sonnet 5 implements and runs only minimum sanity checks; GPT-5.6 Sol reviews architecture/security/contracts; GitHub Copilot owns extended regression, adversarial, browser, environment and evidence-gathering validation. Do not duplicate large validation matrices across models.
14. Every Sonnet implementation/correction turn must propose GitHub Copilot validations and end with a ready-to-paste Sol handoff. Every post-implementation Sol review must end with the authoritative GitHub Copilot validation prompt. Sol makes final phase acceptance decisions after Copilot evidence.
15. **Lovable is retired from FundMatch.** Do not add or reintroduce Lovable build packages, runtime hooks, deployment paths, project identifiers, migration credentials, generated error reporting, cron secrets, or documentation dependencies. The supported production path is GitHub source + standalone Supabase + Cloudflare Workers/Nitro. Historical docs may mention Lovable only as historical context and must be clearly labeled as such.
