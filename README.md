# FundMatch

**Great companies. Right investors.**

FundMatch is a founder/investor product demo with a refined off-white, charcoal, mint and periwinkle visual system. The homepage includes an original **24-second H.264 product film with music**, a poster, captions, playback controls and reduced-motion support.

## What works today

- Home page and full-screen film player.
- No-signup founder and investor demo workspaces.
- Company discovery: search, sector/stage filters, Pass, Save, Interested.
- Working rules-based MatchEngine, editable investment thesis and ranked insights.
- Company profiles, source transparency, supporting material links and review notes.
- Pipeline stages: New, Reviewing, Meeting, Passed; saved shortlist.
- Founder profile editing for Dippi and Soapbox Caddie.
- Fundraising Readiness: separate VC and PE preparation templates, categories, filters, owner, due date, status, evidence link and notes.
- Local persistence with schema validation, graceful storage failure and confirmed reset.
- Responsive layouts, keyboard focus, accessible dialogs and empty states.

**This is a working browser demo, not a production fundraising platform.** Changes are stored on the current browser/device only. The original Supabase/Drizzle schema, query layer and AI abstraction remain in the repository but are not connected to the demo. No accounts, emails, introductions, investments, document review or external integrations are executed. Do not put confidential documents, financial data or credentials into the demo.

## Run locally

Node 22.12+ and Bun 1.4.2:

```sh
bun install --frozen-lockfile
bun run dev
```

No environment variables or paid services are required for the homepage or local demo.

```sh
bun run build       # Existing TanStack Start / Cloudflare build
bun run typecheck
bun test
bun run build:pages # Same interface, static GitHub Pages build in dist/
```

The package manager and Bun lockfile from the original project are retained. `vite.config.ts` remains the original Lovable/TanStack build; `vite.pages.config.ts` is a separate optional static build, not a framework migration.

## Put the demo online with GitHub Pages

The workflow `.github/workflows/pages.yml` builds and checks the app, then deploys the static output.

1. In this repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Run **Actions → Build and publish FundMatch → Run workflow**, or push a commit to `main`.
3. Use the URL from the successful deployment. The expected repository URL is `https://wglewis0721.github.io/fundmatch/`; it is not live until Pages is enabled and deployment succeeds.

The build handles the `/fundmatch/` base path and emits a real `/demo/index.html` so direct links and refreshes work on Pages. No secret or backend credential is required. See [GitHub’s Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Product film

- `public/media/fundmatch-film.mp4`: 24 seconds, 1280×720, H.264 + AAC; under 1 MB.
- `public/media/fundmatch-poster.jpg`: first-scene poster.
- `public/media/fundmatch-film.vtt`: accessible English captions.
- `scripts/render-film.py`: reproducible motion design and original synthesized soundtrack. Requires Python, Pillow, NumPy, FFmpeg and the Nimbus Sans fonts (font paths are configurable at the top).

The film is a product motion graphic, not a claim of connected AI/investor activity. Its illustrated metrics are fictional. The muted hero respects reduced-motion preferences; full playback with sound is user initiated.

## Matching and provenance

The existing MatchEngine scores sector, stage, geography, funding ask/check-range approximation, growth and business model, with penalties for exclusions. It is deterministic and explainable. Scores are heuristic fit scores, not validated probabilities or investment advice. A company's total raise is only an approximation of check alignment; lead/co-investment allocations need a richer model before production.

The demo uses explicit fictional source labels. Adding a material or evidence link stores only its URL/title; it does not fetch or analyze the document, verify authenticity, upload a file, or change its access permissions.

## Before production

Implement authenticated organization membership and firm isolation, then connect server-side persisted workflows and private document handling. **Audit and replace permissive policies in the original migrations before real data:** several initial policies allow authenticated users broad table access. The browser demo does not use these policies or grant anonymous access. Live AI, SSO, source licensing, CRM imports, secure data rooms and production authorization remain unfinished.

## Earlier blank preview

The original `/` route only rendered Lovable's blank-app placeholder. The earlier repository copy also omitted `previewAuthStorage.ts` and contained a tool error instead of a valid `.gitignore`. This update replaces the placeholder, restores the missing integration file and repairs the ignore rules. No published Git history is rewritten. GitHub-to-Lovable sync is not assumed; this repository is the delivery source.
