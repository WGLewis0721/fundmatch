-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('founder','investor','admin');
CREATE TYPE public.org_type AS ENUM ('startup','investment_firm');
CREATE TYPE public.swipe_decision AS ENUM ('pass','save','interested');
CREATE TYPE public.pipeline_status AS ENUM ('new','reviewing','meeting','passed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  persona text,
  active_org_id uuid,
  avatar_emoji text DEFAULT '🙂',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.org_type NOT NULL,
  website text,
  description text,
  logo_emoji text DEFAULT '🏢',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs read" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgs write" ON public.organizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'founder',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read" ON public.organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members insert own" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members delete own" ON public.organization_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND role = _role);
$$;

-- ============ STARTUPS ============
CREATE TABLE public.startup_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  tagline text,
  summary text,
  story text,
  sector text NOT NULL,
  stage text NOT NULL,
  geography text NOT NULL,
  website text,
  funding_ask numeric,
  tags text[] NOT NULL DEFAULT '{}',
  business_model text,
  founded_year int,
  team_size int,
  brand_color text DEFAULT '#8EA7FF',
  logo_emoji text DEFAULT '🚀',
  visibility text NOT NULL DEFAULT 'public',
  is_demo boolean NOT NULL DEFAULT true,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_profiles TO authenticated;
GRANT ALL ON public.startup_profiles TO service_role;
ALTER TABLE public.startup_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "startups read" ON public.startup_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "startups write" ON public.startup_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.company_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  label text NOT NULL,
  value_numeric numeric,
  value_display text NOT NULL,
  period text,
  source_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, metric_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_metrics TO authenticated;
GRANT ALL ON public.company_metrics TO service_role;
ALTER TABLE public.company_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics read" ON public.company_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "metrics write" ON public.company_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.founder_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL,
  url text,
  size_label text,
  source_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_materials TO authenticated;
GRANT ALL ON public.founder_materials TO service_role;
ALTER TABLE public.founder_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials read" ON public.founder_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "materials write" ON public.founder_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ INVESTORS ============
CREATE TABLE public.investor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  firm_name text NOT NULL,
  description text,
  hq text,
  aum_label text,
  logo_emoji text DEFAULT '🏛️',
  is_demo boolean NOT NULL DEFAULT true,
  demo_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_profiles TO authenticated;
GRANT ALL ON public.investor_profiles TO service_role;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investors read" ON public.investor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "investors write" ON public.investor_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.investor_theses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  summary text,
  sectors text[] NOT NULL DEFAULT '{}',
  stages text[] NOT NULL DEFAULT '{}',
  geographies text[] NOT NULL DEFAULT '{}',
  business_models text[] NOT NULL DEFAULT '{}',
  exclusions text[] NOT NULL DEFAULT '{}',
  check_min numeric,
  check_max numeric,
  min_growth_pct numeric,
  inferred boolean NOT NULL DEFAULT false,
  inferred_from text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_theses TO authenticated;
GRANT ALL ON public.investor_theses TO service_role;
ALTER TABLE public.investor_theses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "theses read" ON public.investor_theses FOR SELECT TO authenticated USING (true);
CREATE POLICY "theses write" ON public.investor_theses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ SOURCES / PROVENANCE ============
CREATE TABLE public.data_sources (
  key text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  side text NOT NULL,
  description text,
  contributes text[] NOT NULL DEFAULT '{}',
  permissions text[] NOT NULL DEFAULT '{}',
  icon text DEFAULT '🔌'
);
GRANT SELECT ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources read" ON public.data_sources FOR SELECT TO authenticated USING (true);

CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_key text NOT NULL REFERENCES public.data_sources(key) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available',
  mode text NOT NULL DEFAULT 'demo',
  connected_at timestamptz,
  last_sync_at timestamptz,
  UNIQUE (org_id, source_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations read" ON public.integrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "integrations write" ON public.integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.source_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  source_key text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.9,
  value_preview text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_provenance TO authenticated;
GRANT ALL ON public.source_provenance TO service_role;
ALTER TABLE public.source_provenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provenance read" ON public.source_provenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "provenance write" ON public.source_provenance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ MATCHING / DECISIONS ============
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  score int NOT NULL,
  explanation text,
  strengths text[] NOT NULL DEFAULT '{}',
  risks text[] NOT NULL DEFAULT '{}',
  rationale jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by text NOT NULL DEFAULT 'rules-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, investor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches read" ON public.matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches write" ON public.matches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  investor_id uuid REFERENCES public.investor_profiles(id) ON DELETE SET NULL,
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  decision public.swipe_decision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, startup_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes TO authenticated;
GRANT ALL ON public.swipes TO service_role;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swipes read" ON public.swipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "swipes own write" ON public.swipes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.saved_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, startup_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_companies TO authenticated;
GRANT ALL ON public.saved_companies TO service_role;
ALTER TABLE public.saved_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved read" ON public.saved_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "saved own write" ON public.saved_companies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pipeline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  owner_id uuid,
  status public.pipeline_status NOT NULL DEFAULT 'new',
  last_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investor_id, startup_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_items TO authenticated;
GRANT ALL ON public.pipeline_items TO service_role;
ALTER TABLE public.pipeline_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline read" ON public.pipeline_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "pipeline write" ON public.pipeline_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.team_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES public.investor_profiles(id) ON DELETE SET NULL,
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Team member',
  body text NOT NULL,
  likes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_notes TO authenticated;
GRANT ALL ON public.team_notes TO service_role;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes read" ON public.team_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes write" ON public.team_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.intro_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES public.investor_profiles(id) ON DELETE SET NULL,
  requester_id uuid,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intro_requests TO authenticated;
GRANT ALL ON public.intro_requests TO service_role;
ALTER TABLE public.intro_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intros read" ON public.intro_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "intros write" ON public.intro_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES public.investor_profiles(id) ON DELETE SET NULL,
  actor_id uuid,
  kind text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity read" ON public.activity_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity write" ON public.activity_events FOR ALL TO authenticated USING (true) WITH CHECK (true);