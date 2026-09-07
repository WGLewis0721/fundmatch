# FundMatch

**Great companies. Right investors.**

FundMatch is a founder/investor product demo with a refined off-white, charcoal, mint and periwinkle visual system. The homepage includes an original **24-second H.264 product film with music**, a poster, captions, playback controls and reduced-motion support.

## Two products in one repository

- **Public demo** (`/` and `/demo`): no signup, browser storage only, deployed
  to GitHub Pages. Unchanged by the accounts work.
- **Authenticated app** (`/app`): real accounts, organizations, server-side
  persistence and private document storage on Supabase. Deployed separately.
  See [docs/BACKEND.md](docs/BACKEND.md).

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

**The `/demo` workspace is a browser demo, not a production fundraising platform.** Its changes are stored on the current browser/device only, its records are fictional, and it never contacts a backend. Do not put confidential documents, financial data or credentials into the demo. Introductions, emails to investors, live AI and external integrations are still unimplemented in both the demo and the authenticated app.

## Run locally

Node 22.12+ and Bun 1.4.2:

```sh
bun install --frozen-lockfile
bun run dev
```

No environment variables or paid services are required for the homepage or
local demo. The authenticated app at `/app` needs the Supabase variables in
`.env.example`; without them it shows a "backend not configured" screen.

```sh
bun run build       # Existing TanStack Start / Cloudflare build (includes /app)
bun run typecheck
bun test            # demo tests; database policy tests when FUNDMATCH_TEST_DATABASE_URL is set
bun run build:pages # Same interface, static GitHub Pages build in dist/
```

The package manager and Bun lockfile from the original project are retained. `vite.config.ts` remains the original Lovable/TanStack build; `vite.pages.config.ts` is a separate optional static build, not a framework migration.

## Put the demo online with GitHub Pages

The workflow `.github/workflows/pages.yml` builds and checks the app, then deploys the static output.

1. In this repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Run **Actions → Build and publish FundMatch → Run workflow**, or push a commit to `main`.
3. Use the URL from the successful deployment. The expected repository URL is `https://wglewis0721.github.io/fundmatch/`; it is not live until Pages is enabled and deployment succeeds.

The build handles the `/fundmatch/` base path and emits a real `/demo/index.html` so direct links and refreshes work on Pages. No secret or backend credential is required, and the Pages bundle contains no Supabase client code: the authenticated app is deployed separately, as described in [docs/BACKEND.md](docs/BACKEND.md). See [GitHub’s Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Product film

- `public/media/fundmatch-film.mp4`: 24 seconds, 1280×720, H.264 + AAC; under 1 MB.
- `public/media/fundmatch-poster.jpg`: first-scene poster.
- `public/media/fundmatch-film.vtt`: accessible English captions.
- `scripts/render-film.py`: reproducible motion design and original synthesized soundtrack. Requires Python, Pillow, NumPy, FFmpeg and the Nimbus Sans fonts (font paths are configurable at the top).

The film is a product motion graphic, not a claim of connected AI/investor activity. Its illustrated metrics are fictional. The muted hero respects reduced-motion preferences; full playback with sound is user initiated.

## Matching and provenance

The existing MatchEngine scores sector, stage, geography, funding ask/check-range approximation, growth and business model, with penalties for exclusions. It is deterministic and explainable. Scores are heuristic fit scores, not validated probabilities or investment advice. A company's total raise is only an approximation of check alignment; lead/co-investment allocations need a richer model before production.

The demo uses explicit fictional source labels. Adding a material or evidence link stores only its URL/title; it does not fetch or analyze the document, verify authenticity, upload a file, or change its access permissions.

## Accounts, persistence and private documents

The authenticated application lives at `/app` and needs a Supabase project.

- Signup, login, logout and password recovery.
- Organization creation, membership roles (owner, admin, member) and
  email-bound invitations. A user cannot grant themselves access to an
  organization they were not invited to.
- Server-side persistence for company profiles, metrics, investment theses,
  discovery decisions, pipeline stages, team notes, material records and
  readiness checklists, scoped to the authorized organization.
- Private document uploads with validation, authorized downloads and
  deletion. The storage bucket is private; no public URLs are issued and the
  service role key never reaches the browser.

`drizzle/migrations/0002_fundmatch_accounts_persistence.sql` **drops the
permissive policies from the original migration** (several allowed any
authenticated user broad table access) and replaces them with
organization-scoped policies, then adds the new tables, RPCs and storage
rules.

```sh
cp .env.example .env.local   # add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
bun run db:migrate           # with LOVABLE_DB_MIGRATION_URL set
bun run dev                  # http://localhost:8080/app
```

- [docs/BACKEND.md](docs/BACKEND.md): environment variables, provisioning,
  migrations, deployment and the security model.
- [docs/ASTRA_INTERFACE.md](docs/ASTRA_INTERFACE.md): upload identifiers,
  processing status transitions and the authorized profile-update interface.
- [docs/TEST_EVIDENCE.md](docs/TEST_EVIDENCE.md): policy tests, the
  two-organization browser walkthrough and the direct API attempts.

Live AI, SSO, source licensing, CRM imports, secure data rooms and email
delivery of introductions remain unfinished.

## Earlier blank preview

The original `/` route only rendered Lovable's blank-app placeholder. The earlier repository copy also omitted `previewAuthStorage.ts` and contained a tool error instead of a valid `.gitignore`. This update replaces the placeholder, restores the missing integration file and repairs the ignore rules. No published Git history is rewritten. GitHub-to-Lovable sync is not assumed; this repository is the delivery source.
