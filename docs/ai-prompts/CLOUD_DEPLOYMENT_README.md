# Cloud deployment

**Historical Cloudflare plan; superseded by [Vercel deployment](../VERCEL_DEPLOYMENT.md).**

Use `wrangler.jsonc` and `.github/workflows/deploy-cloudflare.yml` for FundMatch production Worker deployment. The workflow builds against the standalone Supabase project `dkanoobzseckccbwnpyi` and deploys Worker `fundmatch`.
