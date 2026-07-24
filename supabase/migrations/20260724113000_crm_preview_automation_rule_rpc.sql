-- Section 2.3: Read-only automation rule preview
-- Evaluates crm_conditions_match against a sample payload without executing actions or writing runs.

CREATE OR REPLACE FUNCTION public.crm_preview_automation_rule(
  p_rule_id uuid,
  p_sample_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_rule public.crm_automation_rules%ROWTYPE;
  v_can_manage boolean := false;
  v_matches boolean := false;
  v_actions jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT *
  INTO v_rule
  FROM public.crm_automation_rules
  WHERE id = p_rule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUTOMATION_RULE_NOT_FOUND';
  END IF;

  SELECT (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = v_rule.company_id
        AND cm.user_id = v_actor
        AND cm.status = 'approved'
        AND cm.role IN ('property_manager', 'landlord')
    )
  )
  INTO v_can_manage;

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_TO_PREVIEW_AUTOMATION_RULE';
  END IF;

  v_actions := coalesce(v_rule.actions_json, '[]'::jsonb);
  v_matches := public.crm_conditions_match(v_rule.conditions_json, coalesce(p_sample_payload, '{}'::jsonb));

  RETURN jsonb_build_object(
    'rule_id', v_rule.id,
    'company_id', v_rule.company_id,
    'event_type', v_rule.event_type,
    'is_active', v_rule.is_active,
    'conditions_matched', v_matches,
    'would_run_actions', (v_rule.is_active AND v_matches),
    'action_count', jsonb_array_length(v_actions),
    'actions', v_actions,
    'sample_payload', coalesce(p_sample_payload, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_preview_automation_rule(uuid, jsonb) TO authenticated;
