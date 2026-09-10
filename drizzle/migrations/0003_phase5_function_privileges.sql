-- ============================================================================
-- FundMatch Phase 5 helper-function hardening
-- ----------------------------------------------------------------------------
-- 0002 introduces SECURITY DEFINER helpers used by RLS policies. PostgreSQL
-- grants EXECUTE on new functions to PUBLIC by default, so make the intended
-- execution boundary explicit and prevent helper RPCs from becoming a data
-- disclosure surface through PostgREST.
-- ============================================================================

-- Membership-scoped helpers are usable by authenticated sessions and the
-- service role, but never by anon/PUBLIC.
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_org_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.shares_org_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_view_startup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_startup(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_edit_startup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_startup(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_edit_investor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_investor(uuid) TO authenticated, service_role;

-- startup_org/investor_org are policy helpers, not public lookup APIs. Scope
-- their result to organizations the signed-in user belongs to. Privileged
-- workers that use the service role can query the underlying tables directly.
CREATE OR REPLACE FUNCTION public.startup_org(_startup_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.org_id
  FROM public.startup_profiles s
  WHERE s.id = _startup_id
    AND s.is_demo = false
    AND public.is_org_member(s.org_id);
$$;
REVOKE ALL ON FUNCTION public.startup_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.startup_org(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.investor_org(_investor_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.org_id
  FROM public.investor_profiles i
  WHERE i.id = _investor_id
    AND i.is_demo = false
    AND public.is_org_member(i.org_id);
$$;
REVOKE ALL ON FUNCTION public.investor_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.investor_org(uuid) TO authenticated, service_role;

-- The path parser is used by authenticated Storage policies. It does not need
-- anonymous/public RPC exposure.
REVOKE ALL ON FUNCTION public.document_path_org(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.document_path_org(text) TO authenticated, service_role;

-- Trigger functions should not be exposed as callable RPCs. Existing triggers
-- continue to execute with the function owner's privileges.
REVOKE ALL ON FUNCTION public.guard_last_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_document_user_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_document_object() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- The auth trigger is invoked by Supabase Auth, not by application clients.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
