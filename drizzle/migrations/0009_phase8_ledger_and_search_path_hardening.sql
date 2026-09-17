-- ============================================================================
-- FundMatch Phase 8 — ledger grants and queue helper search-path hardening
-- ----------------------------------------------------------------------------
-- Production already relies on RLS for the agent ledger. Remove Supabase's
-- default browser write grants as a second layer, matching the private RAG
-- tables, while preserving authenticated read access through RLS.
--
-- This migration must also install in plain-Postgres CI, where 0006/0007 are
-- intentionally skipped and the ledger tables therefore do not exist.
-- ============================================================================

ALTER FUNCTION public.agentic_queue_available()
  SET search_path = public, pgmq;

DO $$
BEGIN
  IF to_regclass('public.agent_runs') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE
      ON TABLE public.agent_runs
      FROM anon, authenticated;
  END IF;

  IF to_regclass('public.agent_steps') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE
      ON TABLE public.agent_steps
      FROM anon, authenticated;
  END IF;
END
$$;
