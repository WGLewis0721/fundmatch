<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

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
