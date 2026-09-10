# Cloudflare deployment trigger

A push to `main` triggers `.github/workflows/deploy-cloudflare.yml`.

The workflow requires a repository-accessible Cloudflare API token under `CLOUDFLARE_API_TOKEN` (preferred) or `CF_API_TOKEN`. It will use `CLOUDFLARE_ACCOUNT_ID` or `CF_ACCOUNT_ID` when present; otherwise Wrangler will attempt account discovery from the token.

Do not expose the API token in source control.
