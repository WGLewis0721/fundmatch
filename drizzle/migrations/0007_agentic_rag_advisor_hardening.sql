-- ============================================================================
-- FundMatch agentic RAG advisor hardening
-- ----------------------------------------------------------------------------
-- Keeps private RAG source text/vectors explicitly deny-by-default for browser
-- roles and adds the covering index recommended for delegated agent-step lookups.
-- ============================================================================

-- These tables are intentionally service-role/server only. Explicit false
-- policies make the boundary obvious to both humans and the Supabase linter;
-- browser grants remain revoked from migration 0006.
CREATE POLICY "document chunks server only" ON public.document_chunks
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "chunk embeddings server only" ON public.chunk_embeddings
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Cover the self-referential FK used to connect delegated steps to a parent.
CREATE INDEX agent_steps_parent_step_idx
  ON public.agent_steps (parent_step_id)
  WHERE parent_step_id IS NOT NULL;
