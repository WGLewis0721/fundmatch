# FundMatch Cloudflare deployment

FundMatch's authenticated `/app` deploys to Cloudflare Workers from GitHub.

## Production worker

- Worker name: `fundmatch`
- Backend: standalone Supabase project `dkanoobzseckccbwnpyi`
- Supabase URL: `https://dkanoobzseckccbwnpyi.supabase.co`
- Public `/` and `/demo`: remain on GitHub Pages and do not receive Supabase credentials.

## Deployment path

`.github/workflows/deploy-cloudflare.yml` runs on pushes to `main` and can also be triggered manually. It builds with the FundMatch Supabase URL and publishable key, then runs `wrangler deploy` using a Cloudflare API token supplied through GitHub Actions secrets.

Accepted token secret names:

- `CLOUDFLARE_API_TOKEN` (preferred)
- `CF_API_TOKEN` (legacy fallback)

Optional account-id secret names:

- `CLOUDFLARE_ACCOUNT_ID`
- `CF_ACCOUNT_ID`

The Supabase publishable key is intentionally non-secret and is constrained by RLS. Service-role and migration credentials are not part of this deployment workflow.

## After first successful deployment

Use the resulting `*.workers.dev` origin as the Supabase Auth Site URL and allow `/app/login` and `/app/reset` redirect URLs. Then run the Phase 5 browser/auth acceptance checks before final GPT-5.6 Sol acceptance.
