#!/usr/bin/env sh
# Applies drizzle/migrations/*.sql in journal order to $DATABASE_URL.
# For a real Supabase project prefer `bun run db:migrate` (drizzle-kit migrate);
# this script exists for CI and local policy tests against plain Postgres,
# where scripts/db/supabase-shim.sql must be applied first.
set -eu
: "${DATABASE_URL:?Set DATABASE_URL}"
cd "$(dirname "$0")/../.."
if [ "${FUNDMATCH_DB_SHIM:-}" = "1" ]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f scripts/db/supabase-shim.sql
fi
# 0006/0007 are intentionally absent: they require the `vector` and `pgmq`
# extensions, which stock PostgreSQL does not ship. 0008/0009 are written to
# install without them so Phase 8 promotion/provenance/hardening stays covered.
for f in drizzle/migrations/0000_fundmatch_core_schema.sql \
         drizzle/migrations/0001_fundmatch_seed_demo_data.sql \
         drizzle/migrations/0002_fundmatch_accounts_persistence.sql \
         drizzle/migrations/0003_phase5_function_privileges.sql \
         drizzle/migrations/0004_phase5_has_role_privilege_hardening.sql \
         drizzle/migrations/0005_phase5_storage_delete_and_search_path_hardening.sql \
         drizzle/migrations/0008_phase8_document_processing.sql \
         drizzle/migrations/0009_phase8_ledger_and_search_path_hardening.sql; do
  echo "applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q --single-transaction -f "$f"
done
echo "migrations applied"
