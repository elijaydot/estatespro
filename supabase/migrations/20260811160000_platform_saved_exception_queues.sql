-- Saved, server-executed exception queue definitions for Control Plane operators.

DO $$
BEGIN
  IF to_regclass('public.platform_risk_queue_triage_actions') IS NULL
     OR to_regclass('public.platform_audit_events') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'SAVED_EXCEPTION_QUEUE_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.platform_saved_exception_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 80),
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team')),
  queue_type text NOT NULL DEFAULT 'triage_history' CHECK (queue_type = 'triage_history'),
  filter_config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filter_config) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_saved_exception_queues_owner_name
  ON public.platform_saved_exception_queues (owner_user_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_platform_saved_exception_queues_owner_created
  ON public.platform_saved_exception_queues (owner_user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_saved_exception_queues_team_created
  ON public.platform_saved_exception_queues (created_at DESC, id DESC) WHERE visibility = 'team';

ALTER TABLE public.platform_saved_exception_queues ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.platform_create_saved_exception_queue(
  p_name text,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT 'private',
  p_filter_config jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_visibility text := lower(btrim(coalesce(p_visibility, 'private')));
  v_filters jsonb := coalesce(p_filter_config, '{}'::jsonb);
  v_queue public.platform_saved_exception_queues%ROWTYPE;
  v_correlation_id text := gen_random_uuid()::text;
BEGIN
  IF v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  ) THEN RAISE EXCEPTION 'RISK_OPERATOR_REQUIRED'; END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 3 AND 80 THEN RAISE EXCEPTION 'INVALID_QUEUE_NAME'; END IF;
  IF v_visibility NOT IN ('private', 'team') THEN RAISE EXCEPTION 'INVALID_QUEUE_VISIBILITY'; END IF;
  IF jsonb_typeof(v_filters) <> 'object' THEN RAISE EXCEPTION 'INVALID_QUEUE_FILTERS'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_filters) key WHERE key NOT IN ('company_id', 'actor_user_id', 'triage_status', 'time_range')) THEN
    RAISE EXCEPTION 'UNSUPPORTED_QUEUE_FILTER';
  END IF;
  IF coalesce(v_filters->>'triage_status', 'all') NOT IN ('all', 'acknowledged', 'resolved', 'escalated', 'false_positive') THEN
    RAISE EXCEPTION 'INVALID_TRIAGE_STATUS';
  END IF;
  IF coalesce(v_filters->>'time_range', 'all') NOT IN ('24h', '7d', '30d', 'all') THEN RAISE EXCEPTION 'INVALID_TIME_RANGE'; END IF;
  IF nullif(v_filters->>'company_id', '') IS NOT NULL AND (v_filters->>'company_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'INVALID_COMPANY_ID'; END IF;
  IF nullif(v_filters->>'actor_user_id', '') IS NOT NULL AND (v_filters->>'actor_user_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'INVALID_ACTOR_USER_ID'; END IF;

  INSERT INTO public.platform_saved_exception_queues (owner_user_id, name, description, visibility, filter_config)
  VALUES (v_actor, btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), v_visibility, v_filters)
  RETURNING * INTO v_queue;

  INSERT INTO public.platform_audit_events (source, event_type, module, action, severity, result_status, actor_user_id,
    target_entity_type, target_entity_id, correlation_id, metadata)
  VALUES ('control_plane', 'risk.saved_queue.created', 'security', 'create_saved_exception_queue', 'info', 'success', v_actor,
    'platform_saved_exception_queue', v_queue.id::text, v_correlation_id,
    jsonb_build_object('name', v_queue.name, 'visibility', v_queue.visibility, 'filter_config', v_queue.filter_config));

  RETURN to_jsonb(v_queue) || jsonb_build_object('correlation_id', v_correlation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_list_saved_exception_queues(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_limit integer := least(200, greatest(1, coalesce(p_limit, 100)));
BEGIN
  IF v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  ) THEN RAISE EXCEPTION 'RISK_OPERATOR_REQUIRED'; END IF;

  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(q) || jsonb_build_object('is_owner', q.owner_user_id = v_actor) ORDER BY q.created_at DESC, q.id DESC)
    FROM (SELECT * FROM public.platform_saved_exception_queues
      WHERE owner_user_id = v_actor OR visibility = 'team'
      ORDER BY created_at DESC, id DESC LIMIT v_limit) q
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_delete_saved_exception_queue(p_queue_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_queue public.platform_saved_exception_queues%ROWTYPE;
  v_correlation_id text := gen_random_uuid()::text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_queue FROM public.platform_saved_exception_queues WHERE id = p_queue_id FOR UPDATE;
  IF v_queue.id IS NULL THEN RAISE EXCEPTION 'SAVED_QUEUE_NOT_FOUND'; END IF;
  IF v_queue.owner_user_id <> v_actor THEN RAISE EXCEPTION 'SAVED_QUEUE_OWNER_REQUIRED'; END IF;

  DELETE FROM public.platform_saved_exception_queues WHERE id = v_queue.id;
  INSERT INTO public.platform_audit_events (source, event_type, module, action, severity, result_status, actor_user_id,
    target_entity_type, target_entity_id, correlation_id, metadata)
  VALUES ('control_plane', 'risk.saved_queue.deleted', 'security', 'delete_saved_exception_queue', 'info', 'success', v_actor,
    'platform_saved_exception_queue', v_queue.id::text, v_correlation_id,
    jsonb_build_object('name', v_queue.name, 'visibility', v_queue.visibility));
  RETURN jsonb_build_object('queue_id', v_queue.id, 'deleted', true, 'correlation_id', v_correlation_id);
END;
$$;

REVOKE ALL ON TABLE public.platform_saved_exception_queues FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.platform_create_saved_exception_queue(text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_list_saved_exception_queues(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_delete_saved_exception_queue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_create_saved_exception_queue(text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_saved_exception_queues(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_delete_saved_exception_queue(uuid) TO authenticated;