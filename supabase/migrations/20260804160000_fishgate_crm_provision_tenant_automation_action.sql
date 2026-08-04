-- Extend the current automation executor in place so all existing action handlers and retry behavior remain intact.

DO $migration$
DECLARE
  v_definition text;
  v_boundary constant text := '      ELSIF v_action->>''type'' = ''reassign_lead'' THEN';
  v_branch constant text := $branch$      ELSIF v_action->>'type' = 'provision_tenant' THEN
        SELECT id INTO v_task_id
        FROM public.crm_deal_handoffs
        WHERE deal_id = coalesce(nullif(v_action->>'deal_id', '')::uuid, nullif(p_payload->>'deal_id', '')::uuid)
          AND company_id = v_rule.company_id
        LIMIT 1;

        IF v_task_id IS NULL
           OR coalesce(nullif(v_action->>'lease_start', ''), nullif(p_payload->>'lease_start', '')) IS NULL
           OR coalesce(nullif(v_action->>'lease_end', ''), nullif(p_payload->>'lease_end', '')) IS NULL
           OR coalesce(nullif(v_action->>'monthly_rent', ''), nullif(p_payload->>'monthly_rent', '')) IS NULL THEN
          v_error_count := v_error_count + 1;
        ELSE
          v_message_id := public.crm_complete_handoff(
            v_task_id,
            coalesce(nullif(v_action->>'lease_start', ''), nullif(p_payload->>'lease_start', ''))::date,
            coalesce(nullif(v_action->>'lease_end', ''), nullif(p_payload->>'lease_end', ''))::date,
            coalesce(nullif(v_action->>'monthly_rent', ''), nullif(p_payload->>'monthly_rent', ''))::numeric,
            coalesce(nullif(v_action->>'security_deposit', ''), nullif(p_payload->>'security_deposit', ''), '0')::numeric
          );

          IF v_message_id IS NULL THEN
            v_error_count := v_error_count + 1;
          ELSE
            v_result := v_result || jsonb_build_object('provisioned_lease_id', v_message_id);
          END IF;
        END IF;
$branch$;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'crm_execute_automation_rule'
    AND pg_get_function_identity_arguments(p.oid) = 'p_rule_id uuid, p_payload jsonb, p_event_type text, p_source_type text, p_source_id uuid, p_correlation_id text';

  IF v_definition IS NULL OR strpos(v_definition, v_boundary) = 0 THEN
    RAISE EXCEPTION 'CRM_AUTOMATION_EXECUTOR_ACTION_BOUNDARY_NOT_FOUND';
  END IF;

  IF strpos(v_definition, 'provision_tenant') = 0 THEN
    v_definition := replace(v_definition, v_boundary, v_branch || v_boundary);
    EXECUTE v_definition;
  END IF;
END;
$migration$;

GRANT EXECUTE ON FUNCTION public.crm_execute_automation_rule(uuid, jsonb, text, text, uuid, text) TO authenticated;