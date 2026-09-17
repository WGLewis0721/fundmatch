-- ============================================================================
-- FundMatch Phase 8 — queued document processing and reviewable suggestions
-- ----------------------------------------------------------------------------
-- Wires the agentic RAG foundation (0006/0007) into the document lifecycle:
--
--   uploaded document -> durable run ledger -> pgmq -> server worker
--   -> page-aware chunks -> embeddings -> document agent -> validation
--   -> reviewable founder suggestions -> human accept/correct/reject
--
-- Models never write canonical company facts. `profile_suggestions` remains the
-- only promotion boundary, and `resolve_profile_suggestion` remains the only way
-- a proposal becomes a company/readiness fact.
--
-- Plain-PostgreSQL note: `scripts/db/apply-migrations.sh` cannot apply 0006/0007
-- because stock PostgreSQL has neither `pgvector` nor `pgmq`. Everything here is
-- therefore written so it still installs without them: the functions that touch
-- `agent_runs`/`pgmq` are plpgsql, whose bodies PostgreSQL resolves at call time
-- rather than at creation time, and the queue helpers degrade explicitly instead
-- of failing at migration time.
-- ============================================================================

-- ============ SUGGESTION PROVENANCE ============
-- A suggestion must be able to answer "where did this come from?" before a
-- founder is asked to accept it.
ALTER TABLE public.profile_suggestions
  ADD COLUMN source_locator text,
  ADD COLUMN source_excerpt text,
  ADD COLUMN run_id uuid,
  ADD CONSTRAINT profile_suggestions_locator_check
    CHECK (source_locator IS NULL OR length(source_locator) BETWEEN 1 AND 500),
  ADD CONSTRAINT profile_suggestions_excerpt_check
    CHECK (source_excerpt IS NULL OR length(source_excerpt) BETWEEN 1 AND 3000);

COMMENT ON COLUMN public.profile_suggestions.source_locator IS
  'Stable locator inside the source document, for example "page 4".';
COMMENT ON COLUMN public.profile_suggestions.source_excerpt IS
  'Verbatim supporting text from the source document. Untrusted content: display only.';
COMMENT ON COLUMN public.profile_suggestions.run_id IS
  'agent_runs.id that produced this proposal. No foreign key: the agentic tables live in 0006, which plain-PostgreSQL CI cannot install.';

-- Reprocessing the same document must not pile up duplicate pending proposals.
-- The proposed value is part of the key on purpose: re-running over identical
-- source content is a no-op, while two genuinely conflicting values for one
-- field stay visible as competing proposals for the founder to resolve.
-- Resolved rows stay as history.
CREATE UNIQUE INDEX profile_suggestions_pending_unique_idx
  ON public.profile_suggestions (
    startup_id,
    field_key,
    coalesce(document_id, '00000000-0000-0000-0000-000000000000'::uuid),
    md5(suggested_value)
  )
  WHERE status = 'pending';

-- ============ QUEUE ACCESS ============
-- pgmq stays unexposed to PostgREST (see 0006). These wrappers give the
-- server-side worker a narrow, named-queue-only surface under the service role.
CREATE OR REPLACE FUNCTION public.agentic_queue_available()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT to_regprocedure('pgmq.send(text, jsonb)') IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.agentic_queue_send(_queue text, _message jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE
  msg_id bigint;
BEGIN
  IF _queue NOT IN ('agent_runs', 'embeddings') THEN
    RAISE EXCEPTION 'Unknown FundMatch queue %', _queue USING ERRCODE = 'check_violation';
  END IF;
  -- The run ledger is the durable source of truth; the queue is delivery. A
  -- database without pgmq (plain-PostgreSQL CI) still records the work.
  IF NOT public.agentic_queue_available() THEN
    RETURN NULL;
  END IF;
  SELECT pgmq.send(_queue, _message) INTO msg_id;
  RETURN msg_id;
END; $$;

CREATE OR REPLACE FUNCTION public.agentic_queue_read(
  _queue text,
  _visibility_seconds integer DEFAULT 120,
  _quantity integer DEFAULT 5
)
RETURNS TABLE (msg_id bigint, read_ct integer, enqueued_at timestamptz, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
BEGIN
  IF _queue NOT IN ('agent_runs', 'embeddings') THEN
    RAISE EXCEPTION 'Unknown FundMatch queue %', _queue USING ERRCODE = 'check_violation';
  END IF;
  IF NOT public.agentic_queue_available() THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT m.msg_id, m.read_ct, m.enqueued_at, m.message
    FROM pgmq.read(
      _queue,
      greatest(least(_visibility_seconds, 900), 10),
      greatest(least(_quantity, 20), 1)
    ) AS m;
END; $$;

CREATE OR REPLACE FUNCTION public.agentic_queue_release(_queue text, _msg_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
BEGIN
  IF _queue NOT IN ('agent_runs', 'embeddings') THEN
    RAISE EXCEPTION 'Unknown FundMatch queue %', _queue USING ERRCODE = 'check_violation';
  END IF;
  IF NOT public.agentic_queue_available() THEN
    RETURN false;
  END IF;
  PERFORM pgmq.set_vt(_queue, _msg_id, 0);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.agentic_queue_archive(_queue text, _msg_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE
  archived boolean;
BEGIN
  IF _queue NOT IN ('agent_runs', 'embeddings') THEN
    RAISE EXCEPTION 'Unknown FundMatch queue %', _queue USING ERRCODE = 'check_violation';
  END IF;
  IF NOT public.agentic_queue_available() THEN
    RETURN false;
  END IF;
  SELECT pgmq.archive(_queue, _msg_id) INTO archived;
  RETURN coalesce(archived, false);
END; $$;

REVOKE ALL ON FUNCTION public.agentic_queue_available() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agentic_queue_send(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agentic_queue_read(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agentic_queue_release(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agentic_queue_archive(text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agentic_queue_available() TO service_role;
GRANT EXECUTE ON FUNCTION public.agentic_queue_send(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.agentic_queue_read(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.agentic_queue_release(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.agentic_queue_archive(text, bigint) TO service_role;

-- ============ DURABLE RUN CREATION ============
-- Idempotent: repeated upload callbacks, queue redelivery and the operational
-- sweeper all converge on one active run per document.
CREATE OR REPLACE FUNCTION public.start_document_run(
  _document_id uuid,
  _triggered_by uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc public.documents%ROWTYPE;
  existing uuid;
  new_run uuid;
BEGIN
  SELECT * INTO doc FROM public.documents WHERE id = _document_id;
  IF doc.id IS NULL THEN
    RAISE EXCEPTION 'Document not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF doc.status = 'pending' THEN
    RAISE EXCEPTION 'Document upload has not completed' USING ERRCODE = 'check_violation';
  END IF;

  -- Serialize concurrent callbacks for this document without a table lock.
  PERFORM pg_advisory_xact_lock(hashtextextended(_document_id::text, 0));

  SELECT id INTO existing
  FROM public.agent_runs
  WHERE subject_type = 'document'
    AND subject_id = _document_id::text
    AND trigger = 'document_uploaded'
    AND status <> 'failed'
  ORDER BY created_at DESC
  LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.agent_runs (
    org_id, triggered_by, trigger, subject_type, subject_id,
    status, workflow_version, metadata
  )
  VALUES (
    doc.org_id, coalesce(_triggered_by, auth.uid()), 'document_uploaded', 'document', _document_id::text,
    'queued', 'agentic-v1',
    jsonb_build_object(
      'documentId', _document_id,
      'startupId', doc.startup_id,
      'fileName', doc.file_name,
      'mimeType', doc.mime_type
    )
  )
  RETURNING id INTO new_run;

  PERFORM public.agentic_queue_send(
    'agent_runs',
    jsonb_build_object(
      'runId', new_run,
      'trigger', 'document_uploaded',
      'organizationId', doc.org_id,
      'subjectType', 'document',
      'subjectId', _document_id,
      'workflowVersion', 'agentic-v1'
    )
  );

  RETURN new_run;
END; $$;

REVOKE ALL ON FUNCTION public.start_document_run(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_document_run(uuid, uuid) TO service_role;

-- ============ SUGGESTION PERSISTENCE ============
-- The worker proposes through this function only. It re-derives organization and
-- company from canonical document state instead of trusting worker input, and
-- silently drops proposals that duplicate an outstanding one.
CREATE OR REPLACE FUNCTION public.record_document_suggestions(
  _document_id uuid,
  _run_id uuid,
  _items jsonb
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc public.documents%ROWTYPE;
  item jsonb;
  inserted integer := 0;
  affected integer;
BEGIN
  SELECT * INTO doc FROM public.documents WHERE id = _document_id;
  IF doc.id IS NULL THEN
    RAISE EXCEPTION 'Document not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF doc.startup_id IS NULL THEN
    RAISE EXCEPTION 'Document is not linked to a company' USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'Suggestions must be a JSON array' USING ERRCODE = 'check_violation';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.profile_suggestions (
      startup_id, document_id, run_id, field_key, label,
      suggested_value, current_value, confidence, rationale,
      source_key, source_locator, source_excerpt, status
    )
    VALUES (
      doc.startup_id,
      _document_id,
      _run_id,
      item->>'fieldKey',
      item->>'label',
      item->>'suggestedValue',
      nullif(item->>'currentValue', ''),
      coalesce((item->>'confidence')::numeric, 0.5),
      nullif(item->>'rationale', ''),
      coalesce(nullif(item->>'sourceKey', ''), 'fundmatch_ai'),
      nullif(item->>'sourceLocator', ''),
      nullif(item->>'sourceExcerpt', ''),
      'pending'
    )
    ON CONFLICT (
      startup_id,
      field_key,
      coalesce(document_id, '00000000-0000-0000-0000-000000000000'::uuid),
      md5(suggested_value)
    )
      WHERE status = 'pending'
    DO NOTHING;
    GET DIAGNOSTICS affected = ROW_COUNT;
    inserted := inserted + affected;
  END LOOP;

  RETURN inserted;
END; $$;

REVOKE ALL ON FUNCTION public.record_document_suggestions(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_document_suggestions(uuid, uuid, jsonb) TO service_role;

-- ============ HUMAN PROMOTION BOUNDARY ============
-- Replaces the 0002 two-argument version. Adds founder corrections and readiness
-- proposals; the old accept/reject call shape keeps working through the default.
DROP FUNCTION IF EXISTS public.resolve_profile_suggestion(uuid, boolean);

CREATE OR REPLACE FUNCTION public.resolve_profile_suggestion(
  _suggestion_id uuid,
  _accept boolean,
  _corrected_value text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.profile_suggestions%ROWTYPE;
  applied text;
  corrected boolean;
  num numeric;
  readiness_template text;
  readiness_key text;
  readiness_org uuid;
BEGIN
  SELECT * INTO s FROM public.profile_suggestions WHERE id = _suggestion_id FOR UPDATE;
  IF s.id IS NULL OR NOT public.can_edit_startup(s.startup_id) THEN
    RAISE EXCEPTION 'Suggestion not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF s.status <> 'pending' THEN
    RAISE EXCEPTION 'Suggestion already resolved' USING ERRCODE = 'check_violation';
  END IF;

  corrected := _corrected_value IS NOT NULL AND btrim(_corrected_value) <> '';
  applied := CASE WHEN corrected THEN btrim(_corrected_value) ELSE s.suggested_value END;

  IF corrected AND NOT _accept THEN
    RAISE EXCEPTION 'A correction must be accepted, not rejected' USING ERRCODE = 'check_violation';
  END IF;
  IF corrected AND length(applied) > 2000 THEN
    RAISE EXCEPTION 'Corrected value is too long' USING ERRCODE = 'check_violation';
  END IF;

  IF _accept THEN
    IF s.field_key LIKE 'readiness:%' THEN
      -- readiness:<template>:<item_key>
      readiness_template := split_part(s.field_key, ':', 2);
      readiness_key := substr(s.field_key, length('readiness:' || readiness_template || ':') + 1);
      IF readiness_template NOT IN ('vc', 'pe') OR readiness_key = '' THEN
        RAISE EXCEPTION 'Unsupported readiness field %', s.field_key USING ERRCODE = 'check_violation';
      END IF;
      IF applied NOT IN ('Missing', 'In progress', 'Complete', 'Needs update') THEN
        RAISE EXCEPTION 'Unsupported readiness status %', applied USING ERRCODE = 'check_violation';
      END IF;
      SELECT org_id INTO readiness_org FROM public.startup_profiles WHERE id = s.startup_id;
      UPDATE public.readiness_items
      SET status = applied::public.readiness_status,
          notes = CASE
            WHEN coalesce(s.rationale, '') = '' THEN notes
            ELSE left(s.rationale || CASE
              WHEN s.source_locator IS NULL THEN ''
              ELSE ' (' || s.source_locator || ')'
            END, 2000)
          END,
          suggested_by = s.source_key,
          updated_by = auth.uid()
      WHERE startup_id = s.startup_id
        AND template = readiness_template
        AND item_key = readiness_key
        AND org_id = readiness_org;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Readiness item % not found', s.field_key USING ERRCODE = 'no_data_found';
      END IF;
    ELSE
      CASE s.field_key
        WHEN 'name' THEN UPDATE public.startup_profiles SET name = applied WHERE id = s.startup_id;
        WHEN 'tagline' THEN UPDATE public.startup_profiles SET tagline = applied WHERE id = s.startup_id;
        WHEN 'summary' THEN UPDATE public.startup_profiles SET summary = applied WHERE id = s.startup_id;
        WHEN 'story' THEN UPDATE public.startup_profiles SET story = applied WHERE id = s.startup_id;
        WHEN 'sector' THEN UPDATE public.startup_profiles SET sector = applied WHERE id = s.startup_id;
        WHEN 'stage' THEN UPDATE public.startup_profiles SET stage = applied WHERE id = s.startup_id;
        WHEN 'geography' THEN UPDATE public.startup_profiles SET geography = applied WHERE id = s.startup_id;
        WHEN 'website' THEN UPDATE public.startup_profiles SET website = applied WHERE id = s.startup_id;
        WHEN 'business_model' THEN UPDATE public.startup_profiles SET business_model = applied WHERE id = s.startup_id;
        WHEN 'ai_summary' THEN UPDATE public.startup_profiles SET ai_summary = applied WHERE id = s.startup_id;
        WHEN 'funding_ask' THEN UPDATE public.startup_profiles SET funding_ask = applied::numeric WHERE id = s.startup_id;
        WHEN 'team_size' THEN UPDATE public.startup_profiles SET team_size = applied::int WHERE id = s.startup_id;
        WHEN 'founded_year' THEN UPDATE public.startup_profiles SET founded_year = applied::int WHERE id = s.startup_id;
        ELSE
          IF s.field_key LIKE 'metric:%' THEN
            BEGIN num := applied::numeric; EXCEPTION WHEN others THEN num := NULL; END;
            INSERT INTO public.company_metrics (startup_id, metric_key, label, value_numeric, value_display, source_key)
            VALUES (s.startup_id, substr(s.field_key, 8), s.label, num, applied, s.source_key)
            ON CONFLICT (startup_id, metric_key) DO UPDATE SET
              label = EXCLUDED.label, value_numeric = EXCLUDED.value_numeric,
              value_display = EXCLUDED.value_display, source_key = EXCLUDED.source_key, updated_at = now();
          ELSE
            RAISE EXCEPTION 'Unsupported field %', s.field_key USING ERRCODE = 'check_violation';
          END IF;
      END CASE;

      INSERT INTO public.source_provenance (startup_id, field_key, field_label, source_key, confidence, value_preview)
      VALUES (s.startup_id, s.field_key, s.label, s.source_key, s.confidence, left(applied, 120))
      ON CONFLICT (startup_id, field_key) DO UPDATE SET
        source_key = EXCLUDED.source_key, confidence = EXCLUDED.confidence,
        value_preview = EXCLUDED.value_preview, last_updated = now();
    END IF;
  END IF;

  UPDATE public.profile_suggestions
  SET status = CASE WHEN _accept THEN 'accepted'::public.suggestion_status ELSE 'rejected'::public.suggestion_status END,
      -- A correction is recorded as what the human actually approved.
      suggested_value = CASE WHEN corrected THEN applied ELSE suggested_value END,
      rationale = CASE
        WHEN corrected THEN left(
          coalesce(rationale || ' | ', '') || 'Corrected by reviewer from: ' || left(s.suggested_value, 200),
          2000
        )
        ELSE rationale
      END,
      resolved_at = now(),
      resolved_by = auth.uid()
  WHERE id = s.id;
END; $$;

REVOKE ALL ON FUNCTION public.resolve_profile_suggestion(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_profile_suggestion(uuid, boolean, text) TO authenticated, service_role;
