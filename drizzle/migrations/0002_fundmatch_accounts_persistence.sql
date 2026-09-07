-- ============================================================================
-- FundMatch accounts & persistence
-- ----------------------------------------------------------------------------
-- Replaces the permissive "any authenticated user" policies from 0000 with
-- organization-scoped authorization, adds membership management that users
-- cannot self-grant, readiness items, private document records, profile
-- suggestions (Astra's write interface) and the private `documents` bucket.
--
-- Everything demo-flagged (is_demo = true) stays invisible to real accounts.
-- The browser demo never touches this database.
-- ============================================================================

-- ============ ENUMS ============
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.document_status AS ENUM ('pending', 'uploaded', 'processing', 'processed', 'failed');
CREATE TYPE public.readiness_status AS ENUM ('Missing', 'In progress', 'Complete', 'Needs update');
CREATE TYPE public.suggestion_status AS ENUM ('pending', 'accepted', 'rejected');

-- ============ DROP PERMISSIVE POLICIES FROM 0000 ============
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
DROP POLICY IF EXISTS "orgs read" ON public.organizations;
DROP POLICY IF EXISTS "orgs write" ON public.organizations;
DROP POLICY IF EXISTS "members read" ON public.organization_members;
DROP POLICY IF EXISTS "members insert own" ON public.organization_members;
DROP POLICY IF EXISTS "members delete own" ON public.organization_members;
DROP POLICY IF EXISTS "startups read" ON public.startup_profiles;
DROP POLICY IF EXISTS "startups write" ON public.startup_profiles;
DROP POLICY IF EXISTS "metrics read" ON public.company_metrics;
DROP POLICY IF EXISTS "metrics write" ON public.company_metrics;
DROP POLICY IF EXISTS "materials read" ON public.founder_materials;
DROP POLICY IF EXISTS "materials write" ON public.founder_materials;
DROP POLICY IF EXISTS "investors read" ON public.investor_profiles;
DROP POLICY IF EXISTS "investors write" ON public.investor_profiles;
DROP POLICY IF EXISTS "theses read" ON public.investor_theses;
DROP POLICY IF EXISTS "theses write" ON public.investor_theses;
DROP POLICY IF EXISTS "integrations read" ON public.integrations;
DROP POLICY IF EXISTS "integrations write" ON public.integrations;
DROP POLICY IF EXISTS "provenance read" ON public.source_provenance;
DROP POLICY IF EXISTS "provenance write" ON public.source_provenance;
DROP POLICY IF EXISTS "matches read" ON public.matches;
DROP POLICY IF EXISTS "matches write" ON public.matches;
DROP POLICY IF EXISTS "swipes read" ON public.swipes;
DROP POLICY IF EXISTS "swipes own write" ON public.swipes;
DROP POLICY IF EXISTS "saved read" ON public.saved_companies;
DROP POLICY IF EXISTS "saved own write" ON public.saved_companies;
DROP POLICY IF EXISTS "pipeline read" ON public.pipeline_items;
DROP POLICY IF EXISTS "pipeline write" ON public.pipeline_items;
DROP POLICY IF EXISTS "notes read" ON public.team_notes;
DROP POLICY IF EXISTS "notes write" ON public.team_notes;
DROP POLICY IF EXISTS "intros read" ON public.intro_requests;
DROP POLICY IF EXISTS "intros write" ON public.intro_requests;
DROP POLICY IF EXISTS "activity read" ON public.activity_events;
DROP POLICY IF EXISTS "activity write" ON public.activity_events;

-- The original has_role() leaked whether *any* user held a role. Scope it to the caller.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND role = _role
  );
$$;

-- ============ SCHEMA ADDITIONS ============
ALTER TABLE public.organization_members
  ADD COLUMN member_role public.member_role NOT NULL DEFAULT 'member';
ALTER TABLE public.organizations
  ADD COLUMN created_by uuid,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.team_notes
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.activity_events
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_items
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.founder_materials
  ADD COLUMN document_id uuid,
  ADD COLUMN created_by uuid;
ALTER TABLE public.startup_profiles
  ADD CONSTRAINT startup_profiles_visibility_check CHECK (visibility IN ('public', 'private'));

CREATE INDEX organization_members_user_idx ON public.organization_members (user_id);
CREATE INDEX startup_profiles_org_idx ON public.startup_profiles (org_id);
CREATE INDEX investor_profiles_org_idx ON public.investor_profiles (org_id);
CREATE INDEX team_notes_org_idx ON public.team_notes (org_id, startup_id);
CREATE INDEX pipeline_items_org_idx ON public.pipeline_items (org_id);
CREATE INDEX activity_events_org_idx ON public.activity_events (org_id, created_at DESC);

-- ============ INVITATIONS ============
CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  member_role public.member_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE DEFAULT md5(gen_random_uuid()::text || gen_random_uuid()::text),
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid,
  CONSTRAINT organization_invitations_email_check CHECK (email = lower(btrim(email)) AND position('@' in email) > 1)
);
CREATE INDEX organization_invitations_org_idx ON public.organization_invitations (org_id);
GRANT SELECT, INSERT, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- ============ READINESS ITEMS ============
CREATE TABLE public.readiness_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  template text NOT NULL CHECK (template IN ('vc', 'pe')),
  item_key text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  status public.readiness_status NOT NULL DEFAULT 'Missing',
  owner text NOT NULL DEFAULT '',
  due_date date,
  evidence_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  suggested_by text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, template, item_key),
  CONSTRAINT readiness_items_evidence_check CHECK (evidence_url = '' OR evidence_url ~* '^https?://')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_items TO authenticated;
GRANT ALL ON public.readiness_items TO service_role;
ALTER TABLE public.readiness_items ENABLE ROW LEVEL SECURITY;

-- ============ DOCUMENTS (private uploads) ============
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  startup_id uuid REFERENCES public.startup_profiles(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  bucket text NOT NULL DEFAULT 'documents',
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('deck', 'financials', 'legal', 'other')),
  status public.document_status NOT NULL DEFAULT 'pending',
  processing_error text,
  extraction jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_bucket_check CHECK (bucket = 'documents'),
  CONSTRAINT documents_size_check CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  CONSTRAINT documents_file_name_check CHECK (length(file_name) BETWEEN 1 AND 200 AND file_name !~ '[/\\]'),
  CONSTRAINT documents_mime_check CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain', 'image/png', 'image/jpeg'
  )),
  -- Path layout is <org_id>/<document_id>/<file_name>; storage policies rely on it.
  CONSTRAINT documents_path_check CHECK (storage_path = org_id::text || '/' || id::text || '/' || file_name)
);
CREATE INDEX documents_org_idx ON public.documents (org_id, created_at DESC);
CREATE INDEX documents_status_idx ON public.documents (status) WHERE status IN ('uploaded', 'processing');
ALTER TABLE public.founder_materials
  ADD CONSTRAINT founder_materials_document_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============ PROFILE SUGGESTIONS (Astra -> founder review) ============
CREATE TABLE public.profile_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  suggested_value text NOT NULL,
  current_value text,
  confidence numeric NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  rationale text,
  source_key text NOT NULL DEFAULT 'fundmatch_ai',
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
CREATE INDEX profile_suggestions_startup_idx ON public.profile_suggestions (startup_id, status);
GRANT SELECT ON public.profile_suggestions TO authenticated;
GRANT ALL ON public.profile_suggestions TO service_role;
ALTER TABLE public.profile_suggestions ENABLE ROW LEVEL SECURITY;

-- ============ AUTHORIZATION HELPERS ============
-- SECURITY DEFINER so policies can consult membership without recursive RLS.
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _org_id IS NOT NULL AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _org_id IS NOT NULL AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = _org_id AND m.user_id = auth.uid() AND m.member_role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _org_id IS NOT NULL AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = _org_id AND m.user_id = auth.uid() AND m.member_role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_org_with(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members a
    JOIN public.organization_members b ON a.org_id = b.org_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.startup_org(_startup_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.startup_profiles WHERE id = _startup_id AND is_demo = false;
$$;

CREATE OR REPLACE FUNCTION public.investor_org(_investor_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.investor_profiles WHERE id = _investor_id AND is_demo = false;
$$;

-- Founders (org members) and, for listed companies, any signed-in real user.
CREATE OR REPLACE FUNCTION public.can_view_startup(_startup_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.startup_profiles s
    WHERE s.id = _startup_id AND s.is_demo = false
      AND (s.visibility = 'public' OR public.is_org_member(s.org_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_startup(_startup_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_member(public.startup_org(_startup_id));
$$;

CREATE OR REPLACE FUNCTION public.can_edit_investor(_investor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_member(public.investor_org(_investor_id));
$$;

-- Storage object names are "<org_id>/<document_id>/<file_name>". Returns the org
-- when the first segment parses as a uuid; NULL otherwise (which denies).
CREATE OR REPLACE FUNCTION public.document_path_org(_name text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  first text := split_part(_name, '/', 1);
BEGIN
  IF first ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN first::uuid;
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER organizations_touch BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER startup_profiles_touch BEFORE UPDATE ON public.startup_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER investor_theses_touch BEFORE UPDATE ON public.investor_theses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER pipeline_items_touch BEFORE UPDATE ON public.pipeline_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER team_notes_touch BEFORE UPDATE ON public.team_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER readiness_items_touch BEFORE UPDATE ON public.readiness_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER documents_touch BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ MEMBERSHIP GUARDS ============
-- An organization always keeps at least one owner.
CREATE OR REPLACE FUNCTION public.guard_last_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Cascading deletes of a whole organization are allowed through.
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = OLD.org_id) THEN
    RETURN OLD;
  END IF;
  IF OLD.member_role = 'owner' AND (TG_OP = 'DELETE' OR NEW.member_role <> 'owner') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = OLD.org_id AND member_role = 'owner' AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'An organization must keep at least one owner' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.org_id <> OLD.org_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'Membership identity cannot change' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER organization_members_guard BEFORE UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.guard_last_owner();

-- ============ RPC: create organization ============
-- The only way a signed-in user obtains membership without an invitation:
-- creating a brand-new organization, of which they become the owner.
CREATE OR REPLACE FUNCTION public.create_organization(
  _name text,
  _type public.org_type,
  _website text DEFAULT NULL,
  _description text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  new_org uuid;
  clean_name text := btrim(coalesce(_name, ''));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to create an organization' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF length(clean_name) < 2 OR length(clean_name) > 120 THEN
    RAISE EXCEPTION 'Organization name must be 2-120 characters' USING ERRCODE = 'check_violation';
  END IF;
  IF (SELECT count(*) FROM public.organization_members WHERE user_id = uid) >= 20 THEN
    RAISE EXCEPTION 'Membership limit reached' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.organizations (name, type, website, description, is_demo, created_by)
  VALUES (clean_name, _type, nullif(btrim(_website), ''), nullif(btrim(_description), ''), false, uid)
  RETURNING id INTO new_org;

  INSERT INTO public.organization_members (org_id, user_id, role, member_role)
  VALUES (new_org, uid, CASE WHEN _type = 'startup' THEN 'founder'::public.app_role ELSE 'investor'::public.app_role END, 'owner');

  IF _type = 'startup' THEN
    INSERT INTO public.startup_profiles (org_id, name, sector, stage, geography, website, visibility, is_demo, tags)
    VALUES (new_org, clean_name, 'B2B SaaS', 'Seed', 'United States', nullif(btrim(_website), ''), 'private', false, '{}');
  ELSE
    INSERT INTO public.investor_profiles (org_id, firm_name, description, is_demo)
    VALUES (new_org, clean_name, nullif(btrim(_description), ''), false);
    INSERT INTO public.investor_theses (investor_id, sectors, stages, geographies, business_models)
    SELECT id, '{}', '{}', '{}', '{}' FROM public.investor_profiles WHERE org_id = new_org;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, active_org_id, persona)
  VALUES (uid, auth.email(), split_part(coalesce(auth.email(), 'member'), '@', 1), new_org,
          CASE WHEN _type = 'startup' THEN 'founder' ELSE 'investor' END)
  ON CONFLICT (id) DO UPDATE SET
    active_org_id = new_org,
    persona = CASE WHEN _type = 'startup' THEN 'founder' ELSE 'investor' END;

  INSERT INTO public.activity_events (org_id, actor_id, kind, description)
  VALUES (new_org, uid, 'org_created', 'Organization created');

  RETURN new_org;
END; $$;
REVOKE ALL ON FUNCTION public.create_organization(text, public.org_type, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text, public.org_type, text, text) TO authenticated, service_role;

-- ============ RPC: invitations ============
CREATE OR REPLACE FUNCTION public.invite_member(_org_id uuid, _email text, _member_role public.member_role DEFAULT 'member')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean_email text := lower(btrim(coalesce(_email, '')));
  invite_id uuid;
BEGIN
  IF NOT public.is_org_admin(_org_id) THEN
    RAISE EXCEPTION 'Only organization admins can invite members' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _member_role = 'owner' AND NOT public.is_org_owner(_org_id) THEN
    RAISE EXCEPTION 'Only owners can invite owners' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = 'check_violation';
  END IF;
  DELETE FROM public.organization_invitations WHERE org_id = _org_id AND email = clean_email AND accepted_at IS NULL;
  INSERT INTO public.organization_invitations (org_id, email, member_role, invited_by)
  VALUES (_org_id, clean_email, _member_role, auth.uid())
  RETURNING id INTO invite_id;
  RETURN invite_id;
END; $$;
REVOKE ALL ON FUNCTION public.invite_member(uuid, text, public.member_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, public.member_role) TO authenticated, service_role;

-- Accepting requires the invitation token AND a signed-in account whose email
-- matches the invitation. A user can never add themselves to an organization.
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.organization_invitations%ROWTYPE;
  org_kind public.org_type;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to accept an invitation' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO inv FROM public.organization_invitations WHERE token = _token FOR UPDATE;
  IF inv.id IS NULL OR inv.accepted_at IS NOT NULL OR inv.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation is not valid' USING ERRCODE = 'no_data_found';
  END IF;
  IF lower(coalesce(auth.email(), '')) <> inv.email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT type INTO org_kind FROM public.organizations WHERE id = inv.org_id;
  INSERT INTO public.organization_members (org_id, user_id, role, member_role)
  VALUES (inv.org_id, uid, CASE WHEN org_kind = 'startup' THEN 'founder'::public.app_role ELSE 'investor'::public.app_role END, inv.member_role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET member_role = EXCLUDED.member_role;
  UPDATE public.organization_invitations SET accepted_at = now(), accepted_by = uid WHERE id = inv.id;
  UPDATE public.profiles SET active_org_id = inv.org_id WHERE id = uid AND active_org_id IS NULL;
  RETURN inv.org_id;
END; $$;
REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated, service_role;

-- ============ RPC: documents ============
-- Confirms a storage object exists at the recorded path before a document is
-- considered uploaded. Only the uploader's organization can call it.
CREATE OR REPLACE FUNCTION public.mark_document_uploaded(_document_id uuid)
RETURNS public.document_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc public.documents%ROWTYPE;
  obj_size bigint;
BEGIN
  SELECT * INTO doc FROM public.documents WHERE id = _document_id FOR UPDATE;
  IF doc.id IS NULL OR NOT public.is_org_member(doc.org_id) THEN
    RAISE EXCEPTION 'Document not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF doc.status <> 'pending' THEN
    RETURN doc.status;
  END IF;
  SELECT coalesce((o.metadata->>'size')::bigint, doc.size_bytes) INTO obj_size
  FROM storage.objects o WHERE o.bucket_id = doc.bucket AND o.name = doc.storage_path;
  IF obj_size IS NULL THEN
    RAISE EXCEPTION 'Upload has not reached storage yet' USING ERRCODE = 'no_data_found';
  END IF;
  PERFORM set_config('fundmatch.worker', 'on', true);
  UPDATE public.documents SET status = 'uploaded', size_bytes = obj_size WHERE id = doc.id;
  PERFORM set_config('fundmatch.worker', 'off', true);
  INSERT INTO public.activity_events (org_id, startup_id, actor_id, kind, description)
  VALUES (doc.org_id, doc.startup_id, auth.uid(), 'document_uploaded', 'Uploaded ' || doc.file_name);
  RETURN 'uploaded';
END; $$;
REVOKE ALL ON FUNCTION public.mark_document_uploaded(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_document_uploaded(uuid) TO authenticated, service_role;

-- Processing status transitions are reserved for the backend worker (service role).
CREATE OR REPLACE FUNCTION public.set_document_processing(
  _document_id uuid,
  _status public.document_status,
  _error text DEFAULT NULL,
  _extraction jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _status NOT IN ('processing', 'processed', 'failed') THEN
    RAISE EXCEPTION 'Worker may only set processing, processed or failed' USING ERRCODE = 'check_violation';
  END IF;
  PERFORM set_config('fundmatch.worker', 'on', true);
  UPDATE public.documents SET
    status = _status,
    processing_error = CASE WHEN _status = 'failed' THEN _error ELSE NULL END,
    extraction = CASE WHEN _status = 'processed' THEN coalesce(_extraction, extraction) ELSE extraction END,
    processed_at = CASE WHEN _status = 'processed' THEN now() ELSE processed_at END
  WHERE id = _document_id AND status <> 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document % is not ready for processing', _document_id USING ERRCODE = 'no_data_found';
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.set_document_processing(uuid, public.document_status, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_document_processing(uuid, public.document_status, text, jsonb) TO service_role;

-- Users may rename/re-file their documents; status and extraction are worker-owned.
CREATE OR REPLACE FUNCTION public.guard_document_user_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('fundmatch.worker', true) IS DISTINCT FROM 'on' AND auth.role() = 'authenticated' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.extraction IS DISTINCT FROM OLD.extraction
       OR NEW.processing_error IS DISTINCT FROM OLD.processing_error
       OR NEW.processed_at IS DISTINCT FROM OLD.processed_at
       OR NEW.storage_path <> OLD.storage_path
       OR NEW.org_id <> OLD.org_id
       OR NEW.uploaded_by <> OLD.uploaded_by
       OR NEW.bucket <> OLD.bucket
       OR NEW.size_bytes <> OLD.size_bytes
       OR NEW.mime_type <> OLD.mime_type
       OR NEW.file_name <> OLD.file_name THEN
      RAISE EXCEPTION 'Only kind and startup_id can be changed after upload' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER documents_guard BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.guard_document_user_update();

-- ============ RPC: profile suggestions ============
CREATE OR REPLACE FUNCTION public.resolve_profile_suggestion(_suggestion_id uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.profile_suggestions%ROWTYPE;
  num numeric;
BEGIN
  SELECT * INTO s FROM public.profile_suggestions WHERE id = _suggestion_id FOR UPDATE;
  IF s.id IS NULL OR NOT public.can_edit_startup(s.startup_id) THEN
    RAISE EXCEPTION 'Suggestion not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF s.status <> 'pending' THEN
    RAISE EXCEPTION 'Suggestion already resolved' USING ERRCODE = 'check_violation';
  END IF;
  IF _accept THEN
    CASE s.field_key
      WHEN 'name' THEN UPDATE public.startup_profiles SET name = s.suggested_value WHERE id = s.startup_id;
      WHEN 'tagline' THEN UPDATE public.startup_profiles SET tagline = s.suggested_value WHERE id = s.startup_id;
      WHEN 'summary' THEN UPDATE public.startup_profiles SET summary = s.suggested_value WHERE id = s.startup_id;
      WHEN 'story' THEN UPDATE public.startup_profiles SET story = s.suggested_value WHERE id = s.startup_id;
      WHEN 'sector' THEN UPDATE public.startup_profiles SET sector = s.suggested_value WHERE id = s.startup_id;
      WHEN 'stage' THEN UPDATE public.startup_profiles SET stage = s.suggested_value WHERE id = s.startup_id;
      WHEN 'geography' THEN UPDATE public.startup_profiles SET geography = s.suggested_value WHERE id = s.startup_id;
      WHEN 'website' THEN UPDATE public.startup_profiles SET website = s.suggested_value WHERE id = s.startup_id;
      WHEN 'business_model' THEN UPDATE public.startup_profiles SET business_model = s.suggested_value WHERE id = s.startup_id;
      WHEN 'ai_summary' THEN UPDATE public.startup_profiles SET ai_summary = s.suggested_value WHERE id = s.startup_id;
      WHEN 'funding_ask' THEN UPDATE public.startup_profiles SET funding_ask = s.suggested_value::numeric WHERE id = s.startup_id;
      WHEN 'team_size' THEN UPDATE public.startup_profiles SET team_size = s.suggested_value::int WHERE id = s.startup_id;
      WHEN 'founded_year' THEN UPDATE public.startup_profiles SET founded_year = s.suggested_value::int WHERE id = s.startup_id;
      ELSE
        IF s.field_key LIKE 'metric:%' THEN
          BEGIN num := s.suggested_value::numeric; EXCEPTION WHEN others THEN num := NULL; END;
          INSERT INTO public.company_metrics (startup_id, metric_key, label, value_numeric, value_display, source_key)
          VALUES (s.startup_id, substr(s.field_key, 8), s.label, num, s.suggested_value, s.source_key)
          ON CONFLICT (startup_id, metric_key) DO UPDATE SET
            label = EXCLUDED.label, value_numeric = EXCLUDED.value_numeric,
            value_display = EXCLUDED.value_display, source_key = EXCLUDED.source_key, updated_at = now();
        ELSE
          RAISE EXCEPTION 'Unsupported field %', s.field_key USING ERRCODE = 'check_violation';
        END IF;
    END CASE;
    INSERT INTO public.source_provenance (startup_id, field_key, field_label, source_key, confidence, value_preview)
    VALUES (s.startup_id, s.field_key, s.label, s.source_key, s.confidence, left(s.suggested_value, 120))
    ON CONFLICT (startup_id, field_key) DO UPDATE SET
      source_key = EXCLUDED.source_key, confidence = EXCLUDED.confidence,
      value_preview = EXCLUDED.value_preview, last_updated = now();
  END IF;
  UPDATE public.profile_suggestions
  SET status = CASE WHEN _accept THEN 'accepted'::public.suggestion_status ELSE 'rejected'::public.suggestion_status END,
      resolved_at = now(), resolved_by = auth.uid()
  WHERE id = s.id;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_profile_suggestion(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_profile_suggestion(uuid, boolean) TO authenticated, service_role;

-- ============ RPC: readiness checklist seeding ============
-- Creates the checklist for a template once; safe to call repeatedly.
CREATE OR REPLACE FUNCTION public.ensure_readiness_items(_startup_id uuid, _template text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org uuid := public.startup_org(_startup_id);
  inserted int;
BEGIN
  IF org IS NULL OR NOT public.is_org_member(org) THEN
    RAISE EXCEPTION 'Company not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF _template NOT IN ('vc', 'pe') THEN
    RAISE EXCEPTION 'Unknown template' USING ERRCODE = 'check_violation';
  END IF;
  WITH items(category, title, ord) AS (
    SELECT * FROM (VALUES
      ('Company', CASE WHEN _template = 'pe' THEN 'Ownership & transaction structure' ELSE 'Incorporation documents' END, 1),
      ('Company', CASE WHEN _template = 'pe' THEN 'Material contracts' ELSE 'Current ownership & cap table' END, 2),
      ('Company', CASE WHEN _template = 'pe' THEN 'Entity records' ELSE 'Key company agreements' END, 3),
      ('Team', 'Founder bios & responsibilities', 1),
      ('Team', 'IP assignments', 2),
      ('Financials', CASE WHEN _template = 'pe' THEN 'Historical financial statements' ELSE 'Revenue, burn & runway' END, 1),
      ('Financials', CASE WHEN _template = 'pe' THEN 'Earnings quality & adjustments' ELSE 'Financial forecast' END, 2),
      ('Financials', CASE WHEN _template = 'pe' THEN 'Working capital schedule' ELSE NULL END, 3),
      ('Traction', 'Customer & retention metrics', 1),
      ('Traction', 'Growth evidence', 2),
      ('Fundraise', CASE WHEN _template = 'pe' THEN 'Transaction objectives' ELSE 'Current pitch deck' END, 1),
      ('Fundraise', CASE WHEN _template = 'pe' THEN 'Management transition plan' ELSE 'Funding ask & use of funds' END, 2),
      ('Data room', 'Document index & access review', 1)
    ) AS v(category, title, ord) WHERE title IS NOT NULL
  ), ins AS (
    INSERT INTO public.readiness_items (org_id, startup_id, template, item_key, category, title)
    SELECT org, _startup_id, _template, category || '-' || (ord - 1), category, title FROM items
    ON CONFLICT (startup_id, template, item_key) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;
  RETURN inserted;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_readiness_items(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_readiness_items(uuid, text) TO authenticated, service_role;

-- ============ POLICIES ============
-- profiles: yourself, plus people you share an organization with.
CREATE POLICY "profiles select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_org_with(id));
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND (active_org_id IS NULL OR public.is_org_member(active_org_id)));
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND (active_org_id IS NULL OR public.is_org_member(active_org_id)));

-- organizations: members read; admins edit; owners delete; creation only via RPC.
CREATE POLICY "organizations select" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "organizations update" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(id) AND is_demo = false)
  WITH CHECK (public.is_org_admin(id) AND is_demo = false);
CREATE POLICY "organizations delete" ON public.organizations FOR DELETE TO authenticated
  USING (public.is_org_owner(id) AND is_demo = false);

-- organization_members: no self-service insert; admins manage, members may leave.
CREATE POLICY "members select" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "members update" ON public.organization_members FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id) AND (member_role <> 'owner' OR public.is_org_owner(org_id)));
CREATE POLICY "members delete" ON public.organization_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(org_id));

CREATE POLICY "invitations select" ON public.organization_invitations FOR SELECT TO authenticated
  USING (public.is_org_admin(org_id));
CREATE POLICY "invitations delete" ON public.organization_invitations FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

-- startups: owners edit; listed (public) companies are discoverable by signed-in users.
CREATE POLICY "startups select" ON public.startup_profiles FOR SELECT TO authenticated
  USING (is_demo = false AND (visibility = 'public' OR public.is_org_member(org_id)));
CREATE POLICY "startups insert" ON public.startup_profiles FOR INSERT TO authenticated
  WITH CHECK (is_demo = false AND public.is_org_member(org_id));
CREATE POLICY "startups update" ON public.startup_profiles FOR UPDATE TO authenticated
  USING (is_demo = false AND public.is_org_member(org_id))
  WITH CHECK (is_demo = false AND public.is_org_member(org_id));
CREATE POLICY "startups delete" ON public.startup_profiles FOR DELETE TO authenticated
  USING (is_demo = false AND public.is_org_admin(org_id));

CREATE POLICY "metrics select" ON public.company_metrics FOR SELECT TO authenticated
  USING (public.can_view_startup(startup_id));
CREATE POLICY "metrics write" ON public.company_metrics FOR ALL TO authenticated
  USING (public.can_edit_startup(startup_id)) WITH CHECK (public.can_edit_startup(startup_id));

CREATE POLICY "materials select" ON public.founder_materials FOR SELECT TO authenticated
  USING (public.can_view_startup(startup_id));
CREATE POLICY "materials write" ON public.founder_materials FOR ALL TO authenticated
  USING (public.can_edit_startup(startup_id))
  WITH CHECK (public.can_edit_startup(startup_id)
    AND (url IS NULL OR url ~* '^https?://')
    AND (document_id IS NULL OR EXISTS (
      SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.org_id = public.startup_org(startup_id))));

CREATE POLICY "provenance select" ON public.source_provenance FOR SELECT TO authenticated
  USING (public.can_view_startup(startup_id));
CREATE POLICY "provenance write" ON public.source_provenance FOR ALL TO authenticated
  USING (public.can_edit_startup(startup_id)) WITH CHECK (public.can_edit_startup(startup_id));

-- investors: firm members only.
CREATE POLICY "investors select" ON public.investor_profiles FOR SELECT TO authenticated
  USING (is_demo = false AND public.is_org_member(org_id));
CREATE POLICY "investors insert" ON public.investor_profiles FOR INSERT TO authenticated
  WITH CHECK (is_demo = false AND public.is_org_member(org_id));
CREATE POLICY "investors update" ON public.investor_profiles FOR UPDATE TO authenticated
  USING (is_demo = false AND public.is_org_member(org_id))
  WITH CHECK (is_demo = false AND public.is_org_member(org_id));
CREATE POLICY "investors delete" ON public.investor_profiles FOR DELETE TO authenticated
  USING (is_demo = false AND public.is_org_admin(org_id));

CREATE POLICY "theses select" ON public.investor_theses FOR SELECT TO authenticated
  USING (public.can_edit_investor(investor_id));
CREATE POLICY "theses write" ON public.investor_theses FOR ALL TO authenticated
  USING (public.can_edit_investor(investor_id)) WITH CHECK (public.can_edit_investor(investor_id));

CREATE POLICY "integrations select" ON public.integrations FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "integrations write" ON public.integrations FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

-- matches: readable by either side; written by the matching backend only.
CREATE POLICY "matches select" ON public.matches FOR SELECT TO authenticated
  USING (public.can_edit_startup(startup_id) OR public.can_edit_investor(investor_id));

-- decisions: strictly per user, and only about companies the user may view.
CREATE POLICY "swipes select" ON public.swipes FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "swipes write" ON public.swipes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.can_view_startup(startup_id)
    AND (investor_id IS NULL OR public.can_edit_investor(investor_id)));
CREATE POLICY "saved select" ON public.saved_companies FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "saved write" ON public.saved_companies FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.can_view_startup(startup_id));

-- pipeline: the investor firm's members.
CREATE POLICY "pipeline select" ON public.pipeline_items FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "pipeline insert" ON public.pipeline_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.investor_org(investor_id) = org_id
    AND public.can_view_startup(startup_id));
CREATE POLICY "pipeline update" ON public.pipeline_items FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.investor_org(investor_id) = org_id);
CREATE POLICY "pipeline delete" ON public.pipeline_items FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- notes: private to the authoring organization.
CREATE POLICY "notes select" ON public.team_notes FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "notes insert" ON public.team_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND author_id = auth.uid() AND public.can_view_startup(startup_id)
    AND (investor_id IS NULL OR public.investor_org(investor_id) = org_id));
CREATE POLICY "notes update" ON public.team_notes FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND author_id = auth.uid())
  WITH CHECK (public.is_org_member(org_id) AND author_id = auth.uid());
CREATE POLICY "notes delete" ON public.team_notes FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND (author_id = auth.uid() OR public.is_org_admin(org_id)));

-- intro requests: sent by a firm member, visible to both organizations.
CREATE POLICY "intros select" ON public.intro_requests FOR SELECT TO authenticated
  USING (public.can_edit_startup(startup_id) OR public.can_edit_investor(investor_id));
CREATE POLICY "intros insert" ON public.intro_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND public.can_edit_investor(investor_id) AND public.can_view_startup(startup_id));
CREATE POLICY "intros update" ON public.intro_requests FOR UPDATE TO authenticated
  USING (public.can_edit_startup(startup_id))
  WITH CHECK (public.can_edit_startup(startup_id));

CREATE POLICY "activity select" ON public.activity_events FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "activity insert" ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND actor_id = auth.uid());

CREATE POLICY "readiness select" ON public.readiness_items FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "readiness insert" ON public.readiness_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.startup_org(startup_id) = org_id);
CREATE POLICY "readiness update" ON public.readiness_items FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.startup_org(startup_id) = org_id);
CREATE POLICY "readiness delete" ON public.readiness_items FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "documents select" ON public.documents FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "documents insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND uploaded_by = auth.uid() AND status = 'pending'
    AND extraction IS NULL AND processing_error IS NULL
    AND (startup_id IS NULL OR public.startup_org(startup_id) = org_id));
CREATE POLICY "documents update" ON public.documents FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id) AND (startup_id IS NULL OR public.startup_org(startup_id) = org_id));
CREATE POLICY "documents delete" ON public.documents FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND (uploaded_by = auth.uid() OR public.is_org_admin(org_id)));

CREATE POLICY "suggestions select" ON public.profile_suggestions FOR SELECT TO authenticated
  USING (public.can_edit_startup(startup_id));

-- ============ PRIVATE STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 26214400, ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain', 'image/png', 'image/jpeg'
])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Objects are only reachable through a matching public.documents record owned
-- by the caller's organization. No anon access, no public URLs.
CREATE POLICY "documents bucket select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_org_member(public.document_path_org(name))
    AND EXISTS (SELECT 1 FROM public.documents d WHERE d.storage_path = name AND d.bucket = bucket_id));
CREATE POLICY "documents bucket insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_org_member(public.document_path_org(name))
    AND EXISTS (SELECT 1 FROM public.documents d
      WHERE d.storage_path = name AND d.bucket = bucket_id AND d.uploaded_by = auth.uid() AND d.status = 'pending'));
CREATE POLICY "documents bucket delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_org_member(public.document_path_org(name)));

-- Removing the record removes the file, so a deleted document can't linger in storage.
CREATE OR REPLACE FUNCTION public.delete_document_object()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM storage.objects WHERE bucket_id = OLD.bucket AND name = OLD.storage_path;
  RETURN OLD;
END; $$;
CREATE TRIGGER documents_delete_object AFTER DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.delete_document_object();
