# Cloud deployment status

**Status:** deployment configuration added; production deploy pending GitHub Actions execution.

- Worker: `fundmatch`
- Backend: `dkanoobzseckccbwnpyi`
- Deployment workflow: `.github/workflows/deploy-cloudflare.yml`
- Wrangler config: `wrangler.jsonc`
- Production URL: pending first successful deploy

After the first successful deployment, configure Supabase Auth redirects for the returned workers.dev origin and run the final Phase 5 browser/auth acceptance checks.
