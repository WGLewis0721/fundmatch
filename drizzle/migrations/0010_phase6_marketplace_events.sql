-- Phase 6 — production discovery sessions + append-only marketplace events.
--
-- This migration is intentionally independent from the demo feed. It creates
-- an auditable production boundary around candidate retrieval and decisions.
-- It does NOT start Phase 7 introductions or Phase 9 semantic matching.

CREATE TABLE public.discovery_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  thesis_updated_at timestamptz,
  eligibility_version text NOT NULL DEFAULT 'eligibility-v1',
  score_version text NOT NULL DEFAULT 'rules-v1',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT discovery_sessions_filters_object CHECK (jsonb_typeof(filters) = 'object')
);

CREATE INDEX discovery_sessions_resume_idx
  ON public.discovery_sessions (user_id, investor_id, created_at DESC)
  WHERE closed_at IS NULL;

GRANT SELECT ON public.discovery_sessions TO authenticated;
GRANT ALL ON public.discovery_sessions TO service_role;
ALTER TABLE public.discovery_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery sessions select" ON public.discovery_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_org_member(org_id));

-- The event ledger is append-only for normal application users. Browser code
-- receives SELECT only; authenticated writes go through bounded RPCs below.
CREATE TABLE public.marketplace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES public.investor_profiles(id) ON DELETE SET NULL,
  startup_id uuid REFERENCES public.startup_profiles(id) ON DELETE SET NULL,
  actor_id uuid,
  event_type text NOT NULL,
  session_id uuid REFERENCES public.discovery_sessions(id) ON DELETE SET NULL,
  score numeric,
  score_version text,
  rank_position integer,
  eligibility_version text,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_events_type_check CHECK (
    event_type IN (
      'impression',
      'profile_open',
      'pass',
      'save',
      'interested',
      'decision_reset',
      'intro_requested',
      'intro_accepted',
      'intro_declined',
      'meeting',
      'diligence',
      'funded',
      'no_deal',
      'readiness_changed'
    )
  ),
  CONSTRAINT marketplace_events_score_check CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT marketplace_events_rank_check CHECK (rank_position IS NULL OR rank_position > 0),
  CONSTRAINT marketplace_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX marketplace_events_org_time_idx
  ON public.marketplace_events (org_id, created_at DESC);
CREATE INDEX marketplace_events_startup_time_idx
  ON public.marketplace_events (startup_id, created_at DESC)
  WHERE startup_id IS NOT NULL;
CREATE INDEX marketplace_events_session_idx
  ON public.marketplace_events (session_id, created_at);
CREATE UNIQUE INDEX marketplace_events_idempotency_idx
  ON public.marketplace_events (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

GRANT SELECT ON public.marketplace_events TO authenticated;
GRANT ALL ON public.marketplace_events TO service_role;
ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace events select" ON public.marketplace_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE OR REPLACE FUNCTION public.start_discovery_session(
  _investor_id uuid,
  _filters jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _thesis_updated_at timestamptz;
  _session_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_investor(_investor_id) THEN
    RAISE EXCEPTION 'Investor workspace not found';
  END IF;

  IF _filters IS NULL OR jsonb_typeof(_filters) <> 'object' THEN
    RAISE EXCEPTION 'Discovery filters must be a JSON object';
  END IF;

  SELECT i.org_id INTO _org_id
  FROM public.investor_profiles i
  WHERE i.id = _investor_id AND i.is_demo = false;

  SELECT t.updated_at INTO _thesis_updated_at
  FROM public.investor_theses t
  WHERE t.investor_id = _investor_id;

  INSERT INTO public.discovery_sessions (
    org_id, investor_id, user_id, thesis_updated_at, filters
  )
  VALUES (
    _org_id, _investor_id, auth.uid(), _thesis_updated_at, _filters
  )
  RETURNING id INTO _session_id;

  RETURN _session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_eligible_discovery_candidates(
  _investor_id uuid,
  _session_id uuid,
  _limit integer DEFAULT 100
)
RETURNS TABLE(startup_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session public.discovery_sessions%ROWTYPE;
  _thesis public.investor_theses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_investor(_investor_id) THEN
    RAISE EXCEPTION 'Investor workspace not found';
  END IF;

  SELECT * INTO _session
  FROM public.discovery_sessions ds
  WHERE ds.id = _session_id
    AND ds.investor_id = _investor_id
    AND ds.user_id = auth.uid()
    AND ds.closed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Discovery session not found';
  END IF;

  SELECT * INTO _thesis
  FROM public.investor_theses t
  WHERE t.investor_id = _investor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set an investment thesis before discovery';
  END IF;

  UPDATE public.discovery_sessions
  SET last_seen_at = now()
  WHERE id = _session_id;

  RETURN QUERY
  SELECT s.id
  FROM public.startup_profiles s
  WHERE s.is_demo = false
    AND s.visibility = 'public'
    AND s.org_id IS DISTINCT FROM _session.org_id

    -- Hard eligibility only. Sector/business-model preference remains ranking
    -- input in rules-v1; it is not silently promoted to a production exclusion.
    AND (cardinality(_thesis.stages) = 0 OR s.stage = ANY(_thesis.stages))
    AND (cardinality(_thesis.geographies) = 0 OR s.geography = ANY(_thesis.geographies))

    -- Conservative cheque feasibility: a round smaller than the investor's
    -- minimum cheque cannot accommodate that minimum. Missing ask stays
    -- eligible and is handled as uncertainty by ranking/explanation.
    AND (
      _thesis.check_min IS NULL
      OR s.funding_ask IS NULL
      OR s.funding_ask >= _thesis.check_min
    )

    -- Explicit thesis exclusions are hard constraints against the structured
    -- sector/model/tags text. No model is allowed to override this predicate.
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(_thesis.exclusions) ex
      WHERE btrim(ex) <> ''
        AND lower(concat_ws(' ', s.sector, coalesce(s.business_model, ''), array_to_string(s.tags, ' ')))
            LIKE '%' || lower(btrim(ex)) || '%'
    )

    -- Resume behavior: any current decision removes the candidate from the
    -- active feed. Historical events remain append-only even if current state
    -- is reset later.
    AND NOT EXISTS (
      SELECT 1
      FROM public.swipes sw
      WHERE sw.user_id = auth.uid()
        AND sw.startup_id = s.id
    )
  ORDER BY s.updated_at DESC, s.id
  LIMIT greatest(1, least(coalesce(_limit, 100), 250));
END;
$$;

CREATE OR REPLACE FUNCTION public.record_discovery_impression(
  _session_id uuid,
  _startup_id uuid,
  _score numeric,
  _score_version text,
  _rank_position integer,
  _eligibility_version text DEFAULT 'eligibility-v1'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session public.discovery_sessions%ROWTYPE;
  _event_id uuid;
  _key text;
BEGIN
  SELECT * INTO _session
  FROM public.discovery_sessions ds
  WHERE ds.id = _session_id
    AND ds.user_id = auth.uid()
    AND ds.closed_at IS NULL;

  IF NOT FOUND OR NOT public.can_edit_investor(_session.investor_id) THEN
    RAISE EXCEPTION 'Discovery session not found';
  END IF;

  IF _score IS NULL OR _score < 0 OR _score > 100 OR _rank_position IS NULL OR _rank_position < 1 THEN
    RAISE EXCEPTION 'Invalid discovery score metadata';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.startup_profiles s
    WHERE s.id = _startup_id AND s.is_demo = false AND s.visibility = 'public'
  ) THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  _key := 'impression:' || _session_id::text || ':' || _startup_id::text;

  INSERT INTO public.marketplace_events (
    org_id, investor_id, startup_id, actor_id, event_type, session_id,
    score, score_version, rank_position, eligibility_version, idempotency_key
  )
  VALUES (
    _session.org_id, _session.investor_id, _startup_id, auth.uid(), 'impression', _session_id,
    _score, nullif(btrim(_score_version), ''), _rank_position,
    nullif(btrim(_eligibility_version), ''), _key
  )
  ON CONFLICT (org_id, idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO _event_id;

  IF _event_id IS NULL THEN
    SELECT id INTO _event_id
    FROM public.marketplace_events
    WHERE org_id = _session.org_id AND idempotency_key = _key;
  END IF;

  RETURN _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_discovery_profile_open(
  _session_id uuid,
  _startup_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session public.discovery_sessions%ROWTYPE;
  _event_id uuid;
BEGIN
  SELECT * INTO _session
  FROM public.discovery_sessions ds
  WHERE ds.id = _session_id AND ds.user_id = auth.uid() AND ds.closed_at IS NULL;

  IF NOT FOUND OR NOT public.can_edit_investor(_session.investor_id) THEN
    RAISE EXCEPTION 'Discovery session not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.marketplace_events e
    WHERE e.session_id = _session_id AND e.startup_id = _startup_id AND e.event_type = 'impression'
  ) THEN
    RAISE EXCEPTION 'Candidate was not surfaced in this session';
  END IF;

  INSERT INTO public.marketplace_events (
    org_id, investor_id, startup_id, actor_id, event_type, session_id
  )
  VALUES (
    _session.org_id, _session.investor_id, _startup_id, auth.uid(), 'profile_open', _session_id
  )
  RETURNING id INTO _event_id;

  RETURN _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_discovery_decision(
  _session_id uuid,
  _startup_id uuid,
  _decision public.swipe_decision
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session public.discovery_sessions%ROWTYPE;
  _event_id uuid;
  _impression public.marketplace_events%ROWTYPE;
BEGIN
  SELECT * INTO _session
  FROM public.discovery_sessions ds
  WHERE ds.id = _session_id AND ds.user_id = auth.uid() AND ds.closed_at IS NULL;

  IF NOT FOUND OR NOT public.can_edit_investor(_session.investor_id) THEN
    RAISE EXCEPTION 'Discovery session not found';
  END IF;

  SELECT * INTO _impression
  FROM public.marketplace_events e
  WHERE e.session_id = _session_id
    AND e.startup_id = _startup_id
    AND e.event_type = 'impression'
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate was not surfaced in this session';
  END IF;

  INSERT INTO public.swipes (user_id, investor_id, startup_id, decision)
  VALUES (auth.uid(), _session.investor_id, _startup_id, _decision)
  ON CONFLICT (user_id, startup_id)
  DO UPDATE SET investor_id = EXCLUDED.investor_id, decision = EXCLUDED.decision, created_at = now();

  IF _decision = 'save' THEN
    INSERT INTO public.saved_companies (user_id, startup_id)
    VALUES (auth.uid(), _startup_id)
    ON CONFLICT (user_id, startup_id) DO NOTHING;
  ELSE
    DELETE FROM public.saved_companies
    WHERE user_id = auth.uid() AND startup_id = _startup_id;
  END IF;

  -- Preserve the current Phase 4/6 product behavior: Interested may create the
  -- firm's private pipeline item. It does NOT create an intro request or expose
  -- founder contact information; that remains Phase 7.
  IF _decision = 'interested' THEN
    INSERT INTO public.pipeline_items (
      org_id, investor_id, startup_id, owner_id, status
    )
    VALUES (
      _session.org_id, _session.investor_id, _startup_id, auth.uid(), 'new'
    )
    ON CONFLICT (investor_id, startup_id) DO NOTHING;
  END IF;

  INSERT INTO public.marketplace_events (
    org_id, investor_id, startup_id, actor_id, event_type, session_id,
    score, score_version, rank_position, eligibility_version
  )
  VALUES (
    _session.org_id, _session.investor_id, _startup_id, auth.uid(), _decision::text, _session_id,
    _impression.score, _impression.score_version, _impression.rank_position, _impression.eligibility_version
  )
  RETURNING id INTO _event_id;

  RETURN _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_discovery_decisions(
  _investor_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_investor(_investor_id) THEN
    RAISE EXCEPTION 'Investor workspace not found';
  END IF;

  SELECT org_id INTO _org_id
  FROM public.investor_profiles
  WHERE id = _investor_id AND is_demo = false;

  SELECT count(*)::integer INTO _count
  FROM public.swipes
  WHERE user_id = auth.uid() AND investor_id = _investor_id;

  DELETE FROM public.saved_companies sc
  USING public.swipes sw
  WHERE sw.user_id = auth.uid()
    AND sw.investor_id = _investor_id
    AND sc.user_id = sw.user_id
    AND sc.startup_id = sw.startup_id;

  DELETE FROM public.swipes
  WHERE user_id = auth.uid() AND investor_id = _investor_id;

  INSERT INTO public.marketplace_events (
    org_id, investor_id, actor_id, event_type, metadata
  )
  VALUES (
    _org_id, _investor_id, auth.uid(), 'decision_reset',
    jsonb_build_object('cleared_current_decisions', _count)
  );

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.start_discovery_session(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_eligible_discovery_candidates(uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_discovery_impression(uuid, uuid, numeric, text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_discovery_profile_open(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_discovery_decision(uuid, uuid, public.swipe_decision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_discovery_decisions(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_discovery_session(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_discovery_candidates(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_discovery_impression(uuid, uuid, numeric, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_discovery_profile_open(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_discovery_decision(uuid, uuid, public.swipe_decision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_discovery_decisions(uuid) TO authenticated;
