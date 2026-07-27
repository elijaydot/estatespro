-- Phase 12 hardening: server-side pagination and filtering for risk triage history.

DO $$
BEGIN
  IF to_regclass('public.platform_risk_queue_triage_actions') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_TRIAGE_HISTORY_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_platform_risk_triage_company_created
  ON public.platform_risk_queue_triage_actions (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_risk_triage_actor_created
  ON public.platform_risk_queue_triage_actions (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_risk_triage_status_created
  ON public.platform_risk_queue_triage_actions (triage_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.platform_get_risk_queue_triage_actions_page(
  p_company_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_triage_status text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_triage_status text := nullif(lower(trim(coalesce(p_triage_status, ''))), '');
  v_page integer := GREATEST(1, COALESCE(p_page, 1));
  v_page_size integer := LEAST(100, GREATEST(5, COALESCE(p_page_size, 20)));
  v_offset integer;
  v_rows jsonb := '[]'::jsonb;
  v_total_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  IF v_triage_status IS NOT NULL
     AND v_triage_status NOT IN ('acknowledged', 'resolved', 'escalated', 'false_positive') THEN
    RAISE EXCEPTION 'INVALID_TRIAGE_STATUS';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  WITH filtered AS (
    SELECT
      t.id,
      t.row_type,
      t.row_id,
      t.triage_status,
      t.company_id,
      t.actor_user_id,
      t.notes,
      t.metadata,
      t.created_at
    FROM public.platform_risk_queue_triage_actions t
    WHERE (p_company_id IS NULL OR t.company_id = p_company_id)
      AND (p_actor_user_id IS NULL OR t.actor_user_id = p_actor_user_id)
      AND (v_triage_status IS NULL OR t.triage_status = v_triage_status)
      AND (p_created_after IS NULL OR t.created_at >= p_created_after)
      AND (p_created_before IS NULL OR t.created_at <= p_created_before)
  ),
  counted AS (
    SELECT count(*)::integer AS total_count
    FROM filtered
  ),
  paged AS (
    SELECT *
    FROM filtered
    ORDER BY created_at DESC
    OFFSET v_offset
    LIMIT v_page_size
  )
  SELECT
    coalesce((SELECT jsonb_agg(row_to_json(paged)) FROM paged), '[]'::jsonb),
    coalesce((SELECT total_count FROM counted), 0)
  INTO v_rows, v_total_count;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'page', v_page,
    'page_size', v_page_size,
    'total_count', v_total_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_risk_queue_triage_actions_page(uuid, uuid, text, timestamptz, timestamptz, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.platform_get_risk_queue_triage_actions_page(uuid, uuid, text, timestamptz, timestamptz, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_risk_queue_triage_actions_page(uuid, uuid, text, timestamptz, timestamptz, integer, integer) TO service_role;
