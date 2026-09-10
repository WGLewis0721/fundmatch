# Cloudflare deployment ready

FundMatch is configured for Cloudflare Worker deployment using `wrangler.jsonc` and `.github/workflows/deploy-cloudflare.yml`.

The first successful deploy should produce the production workers.dev URL for Worker `fundmatch`. After that, configure the Supabase Auth Site URL and redirect allow-list for `/app/login` and `/app/reset`, then complete the remaining browser-level Phase 5 acceptance checks.
