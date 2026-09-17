-- ============================================================================
-- FundMatch agentic RAG foundation
-- ----------------------------------------------------------------------------
-- Adds first-party vector retrieval, durable AI queues, and business-level
-- agent run/step audit records. Models remain server-side augmentation only.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- ============ AGENT RUN AUDIT ============
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  triggered_by uuid,
  trigger text NOT NULL CHECK (trigger IN (
    'document_uploaded',
    'thesis_updated',
    'match_explanation_requested',
    'diligence_requested',
    'manual'
  )),
  subject_type text NOT NULL CHECK (subject_type IN ('document', 'company', 'investor', 'match', 'other')),
  subject_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'needs_review', 'completed', 'failed', 'cancelled'
  )),
  workflow_version text NOT NULL,
  model_provider text,
  model_name text,
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_runs_org_created_idx ON public.agent_runs (org_id, created_at DESC);
CREATE INDEX agent_runs_status_idx ON public.agent_runs (status, created_at) WHERE status IN ('queued', 'running', 'needs_review');

GRANT SELECT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent runs org read" ON public.agent_runs
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));

CREATE TABLE public.agent_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_step_id uuid REFERENCES public.agent_steps(id) ON DELETE SET NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  agent_type text NOT NULL CHECK (agent_type IN (
    'document', 'thesis', 'match', 'readiness', 'diligence', 'evidence'
  )),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'validating', 'needs_review', 'completed', 'failed'
  )),
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 3),
  input_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text CHECK (validation_status IN ('valid', 'needs_review', 'retryable', 'rejected')),
  model_provider text,
  model_name text,
  prompt_version text,
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, sequence, attempt)
);

CREATE INDEX agent_steps_run_idx ON public.agent_steps (run_id, sequence, attempt);
CREATE INDEX agent_steps_org_idx ON public.agent_steps (org_id, created_at DESC);

GRANT SELECT ON public.agent_steps TO authenticated;
GRANT ALL ON public.agent_steps TO service_role;
ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent steps org read" ON public.agent_steps
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));

-- ============ AUTHORIZED RAG SOURCE CHUNKS ============
CREATE TABLE public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  startup_id uuid REFERENCES public.startup_profiles(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN (
    'document', 'company_profile', 'investor_thesis', 'approved_claim', 'match_record', 'other'
  )),
  source_locator text NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, source_type, source_locator, content_sha256)
);

CREATE INDEX document_chunks_org_idx ON public.document_chunks (org_id, source_type, created_at DESC);
CREATE INDEX document_chunks_document_idx ON public.document_chunks (document_id) WHERE document_id IS NOT NULL;
CREATE INDEX document_chunks_startup_idx ON public.document_chunks (startup_id) WHERE startup_id IS NOT NULL;
CREATE INDEX document_chunks_investor_idx ON public.document_chunks (investor_id) WHERE investor_id IS NOT NULL;

-- Chunks contain private source text. Retrieval is server-side only.
REVOKE ALL ON public.document_chunks FROM anon, authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chunk_embeddings (
  chunk_id uuid PRIMARY KEY REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL DEFAULT 1536 CHECK (embedding_dimensions = 1536),
  embedding extensions.vector(1536) NOT NULL,
  embedded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chunk_embeddings_org_idx ON public.chunk_embeddings (org_id);
CREATE INDEX chunk_embeddings_hnsw_idx ON public.chunk_embeddings
  USING hnsw (embedding vector_cosine_ops);

REVOKE ALL ON public.chunk_embeddings FROM anon, authenticated;
GRANT ALL ON public.chunk_embeddings TO service_role;
ALTER TABLE public.chunk_embeddings ENABLE ROW LEVEL SECURITY;

-- Server-only semantic retrieval. Metadata filters happen inside the function
-- before LIMIT so selective scopes do not silently shrink the result set after
-- nearest-neighbor ranking.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  _org_id uuid,
  _query_embedding extensions.vector(1536),
  _match_threshold double precision DEFAULT 0.70,
  _match_count integer DEFAULT 12,
  _startup_id uuid DEFAULT NULL,
  _investor_id uuid DEFAULT NULL,
  _document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  source_type text,
  source_locator text,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    c.id,
    c.source_type,
    c.source_locator,
    c.content,
    c.metadata,
    1 - (e.embedding <=> _query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.chunk_embeddings e ON e.chunk_id = c.id AND e.org_id = c.org_id
  WHERE c.org_id = _org_id
    AND (_startup_id IS NULL OR c.startup_id = _startup_id)
    AND (_investor_id IS NULL OR c.investor_id = _investor_id)
    AND (_document_id IS NULL OR c.document_id = _document_id)
    AND (1 - (e.embedding <=> _query_embedding)) >= _match_threshold
  ORDER BY e.embedding <=> _query_embedding
  LIMIT LEAST(GREATEST(_match_count, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.match_document_chunks(
  uuid, extensions.vector, double precision, integer, uuid, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(
  uuid, extensions.vector, double precision, integer, uuid, uuid, uuid
) TO service_role;

-- ============ DURABLE QUEUES ============
SELECT pgmq.create('agent_runs');
SELECT pgmq.create('embeddings');

-- Queue access is intentionally not exposed through pgmq_public/PostgREST.
-- Consumers use privileged server/database connections only.
