# Phase 5 Cloudflare deployment acceptance

The standalone Supabase backend sub-gate is already accepted. This file covers only the remaining production hosting/auth/browser acceptance work.

## Required sequence

1. Deploy current `main` to Cloudflare Worker `fundmatch` using `.github/workflows/deploy-cloudflare.yml`.
2. Record the production `*.workers.dev` URL.
3. Configure Supabase Auth Site URL to that origin and allow `/app/login` and `/app/reset` redirects.
4. Run focused browser checks for signup, email confirmation behavior, login, logout, password recovery, organization creation, persistence, and private document upload/download/delete.
5. Confirm `/` and `/demo` remain browser-only GitHub Pages surfaces.
6. Return evidence to GPT-5.6 Sol for final Phase 5 ACCEPT/REJECT.

Do not begin Phase 6 before explicit GPT-5.6 Sol acceptance.
