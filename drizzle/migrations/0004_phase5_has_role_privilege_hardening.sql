-- FundMatch Phase 5: align has_role() with the authenticated-only RPC boundary.
-- PostgreSQL grants EXECUTE on functions to PUBLIC by default unless revoked.

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
