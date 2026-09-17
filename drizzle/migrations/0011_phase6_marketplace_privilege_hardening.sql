-- Phase 6 advisor hardening.
--
-- Supabase project default privileges can grant table DML to API roles even
-- when a migration only states GRANT SELECT. RLS still denied writes because
-- no write policies existed, but the Phase 6 contract is stricter: normal
-- clients receive no direct DML privilege on session/audit tables. All writes
-- go through the bounded SECURITY DEFINER RPCs from 0010.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.discovery_sessions
  FROM PUBLIC, anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.marketplace_events
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.discovery_sessions TO authenticated;
GRANT SELECT ON TABLE public.marketplace_events TO authenticated;
GRANT ALL ON TABLE public.discovery_sessions TO service_role;
GRANT ALL ON TABLE public.marketplace_events TO service_role;

-- Cover Phase 6 foreign keys not already led by an existing index.
CREATE INDEX IF NOT EXISTS discovery_sessions_investor_idx
  ON public.discovery_sessions (investor_id);
CREATE INDEX IF NOT EXISTS discovery_sessions_org_idx
  ON public.discovery_sessions (org_id);
CREATE INDEX IF NOT EXISTS marketplace_events_investor_idx
  ON public.marketplace_events (investor_id)
  WHERE investor_id IS NOT NULL;

-- Avoid per-row auth.uid() re-evaluation on the new session policy.
DROP POLICY IF EXISTS "discovery sessions select" ON public.discovery_sessions;
CREATE POLICY "discovery sessions select" ON public.discovery_sessions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) AND public.is_org_member(org_id));
