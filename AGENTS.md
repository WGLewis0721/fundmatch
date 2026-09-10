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

Before changing FundMatch, read `ROADMAP.md` and the current `README.md`.

Rules:

1. Work on one milestone at a time.
2. Inspect the current repo before making claims about what exists.
3. Keep demo behavior clearly labeled.
4. Do not present mocked integrations, AI extraction, introductions, or production ranking as live.
5. Preserve the separation between the public demo (`/`, `/demo`) and authenticated app (`/app`).
6. Keep service-role keys, migration URLs, and backend secrets out of browser code and public docs.
7. Preserve provenance and human review for AI-generated company/investor claims.
8. Update `ROADMAP.md` after meaningful product or infrastructure changes.
