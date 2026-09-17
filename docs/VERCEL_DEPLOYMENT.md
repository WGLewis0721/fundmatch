# FundMatch Vercel deployment

FundMatch's authenticated web application is hosted on Vercel using TanStack Start + Nitro. Supabase remains the backend for authentication, Postgres, Row-Level Security and private Storage.

## Production architecture

- Web/server host: Vercel
- Framework: React 19 + TanStack Start/Router + Vite + Nitro
- Backend: Supabase project `dkanoobzseckccbwnpyi`
- Supabase URL: `https://dkanoobzseckccbwnpyi.supabase.co`
- Public demo may continue to be published through GitHub Pages during the transition; Vercel can also serve `/` and `/demo` from the same application build.

## Required Vercel environment variables

Set these for Production and Preview:

- `VITE_SUPABASE_URL=https://dkanoobzseckccbwnpyi.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_1UFQzS1rNIyeM80T7p6f-A_kTJIc6AW`
- `SUPABASE_URL=https://dkanoobzseckccbwnpyi.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=sb_publishable_1UFQzS1rNIyeM80T7p6f-A_kTJIc6AW`

The Supabase publishable key is intentionally browser-safe and constrained by RLS. Never place `SUPABASE_SERVICE_ROLE_KEY`, database passwords, migration credentials, or other privileged secrets in browser-exposed `VITE_*` variables.

## Deployment behavior

`vite.config.ts` uses the Vercel-supported TanStack Start + Nitro integration. Vercel should build the project from the repository root with the normal `bun run build` command.

After the Vercel project is connected to `WGLewis0721/fundmatch`, pushes to `main` should create production deployments and pull requests/branches should create previews according to the Vercel Git integration settings.

## Supabase Auth configuration after first successful deploy

Use the final Vercel production origin as the Supabase Auth Site URL and allow redirect URLs for at least:

- `/app/login`
- `/app/reset`

Keep any active preview URLs separate from production auth unless they are intentionally approved for testing.

## Phase 5 acceptance

A successful Vercel build is not the Phase 5 acceptance by itself. After deployment, verify signup/login, organization creation, invitations, document upload/download/delete, and cross-organization RLS/storage isolation before marking Phase 5 complete.
