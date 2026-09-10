-- FundMatch Phase 5: align document deletion with Supabase Storage and harden
-- remaining helper search paths.
--
-- Supabase owns storage.objects metadata and rejects direct SQL deletion.
-- The application already removes document bytes through the Storage API
-- before deleting the public.documents row, so the old DB cleanup trigger is
-- incompatible with the hosted Storage service and must be removed.

DROP TRIGGER IF EXISTS documents_delete_object ON public.documents;
DROP FUNCTION IF EXISTS public.delete_document_object();

ALTER FUNCTION public.document_path_org(text) SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.guard_document_user_update() SET search_path = public;
