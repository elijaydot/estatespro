-- Section 4.1: Expand CRM automation action vocabulary.
-- Adds support for:
-- - send_notification
-- - send_message
-- - update_lead_stage
-- - reassign_lead
--
-- Behavior keeps existing resilience guarantees:
-- each action executes inside the per-action try/catch block so one action failure
-- increments error_count but does not abort sibling actions.

CREATE OR REPLACE FUNCTION public.crm_execute_automation_rule(
  p_rule_id uuid,
  p_payload jsonb,
  p_event_type text,
  p_source_type text,
  p_source_id uuid,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.crm_automation_rules%ROWTYPE;
  v_run_id uuid;
  v_action jsonb;
  v_error_count integer := 0;
  v_task_id uuid;
  v_notification_id uuid;
  v_message_id uuid;
  v_lead_id uuid;
  v_owner_user_id uuid;
  v_due_in_hours integer;
  v_result jsonb := '{}'::jsonb;
  v_stage text;
  v_from_stage text;
  v_sender_user_id uuid;
  v_recipient_user_id uuid;
  v_message_content text;
BEGIN
  SELECT *
  INTO v_rule
  FROM public.crm_automation_rules
  WHERE id = p_rule_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.crm_automation_runs (
    rule_id,
    company_id,
    event_type,
    event_source_type,
    event_source_id,
    correlation_id,
    status,
    attempts,
    max_attempts,
    payload_json,
    result_json
  ) VALUES (
    v_rule.id,
    v_rule.company_id,
    p_event_type,
    p_source_type,
    p_source_id,
    p_correlation_id,
    'pending',
    0,
    v_rule.retry_limit,
    coalesce(p_payload, '{}'::jsonb),
    '{}'::jsonb
  ) RETURNING id INTO v_run_id;

  IF NOT v_rule.is_active THEN
    UPDATE public.crm_automation_runs
    SET status = 'skipped',
        result_json = jsonb_build_object('reason', 'rule_inactive'),
        updated_at = now()
    WHERE id = v_run_id;
    RETURN;
  END IF;

  IF NOT public.crm_conditions_match(v_rule.conditions_json, p_payload) THEN
    UPDATE public.crm_automation_runs
    SET status = 'skipped',
        result_json = jsonb_build_object('reason', 'condition_not_matched'),
        updated_at = now()
    WHERE id = v_run_id;
    RETURN;
  END IF;

  FOR v_action IN
    SELECT value FROM jsonb_array_elements(coalesce(v_rule.actions_json, '[]'::jsonb))
  LOOP
    BEGIN
      IF v_action->>'type' = 'create_task' THEN
        v_lead_id := coalesce(nullif(v_action->>'lead_id', '')::uuid, nullif(p_payload->>'lead_id', '')::uuid);
        v_owner_user_id := coalesce(nullif(v_action->>'owner_user_id', '')::uuid, nullif(p_payload->>'owner_user_id', '')::uuid, auth.uid());
        v_due_in_hours := coalesce(nullif(v_action->>'due_in_hours', '')::integer, 24);

        IF v_lead_id IS NULL OR v_owner_user_id IS NULL THEN
          v_error_count := v_error_count + 1;
        ELSE
          INSERT INTO public.lead_tasks (
            lead_id,
            task_type,
            owner_user_id,
            due_at,
            status,
            notes
          ) VALUES (
            v_lead_id,
            coalesce(nullif(v_action->>'task_type', ''), 'automation_follow_up'),
            v_owner_user_id,
            now() + make_interval(hours => v_due_in_hours),
            'open',
            coalesce(nullif(v_action->>'notes', ''), format('Automation task for %s', p_event_type))
          ) RETURNING id INTO v_task_id;

          v_result := v_result || jsonb_build_object('task_id', v_task_id);
        END IF;
      ELSIF v_action->>'type' = 'audit_event' THEN
        INSERT INTO public.audit_events (
          source,
          event_type,
          severity,
          actor_user_id,
          entity_type,
          entity_id,
          details,
          correlation_id
        ) VALUES (
          'marketplace_crm_automation',
          coalesce(nullif(v_action->>'event_type', ''), 'crm.automation.executed'),
          coalesce(nullif(v_action->>'severity', ''), 'info'),
          auth.uid(),
          p_source_type,
          p_source_id,
          jsonb_build_object(
            'rule_id', v_rule.id,
            'event_type', p_event_type,
            'action', v_action
          ),
          p_correlation_id
        );
      ELSIF v_action->>'type' = 'set_handoff_status' THEN
        UPDATE public.crm_deal_handoffs
        SET status = coalesce(nullif(v_action->>'status', ''), status),
            started_at = CASE WHEN coalesce(nullif(v_action->>'status', ''), '') = 'in_progress' THEN coalesce(started_at, now()) ELSE started_at END,
            updated_at = now()
        WHERE deal_id = coalesce(nullif(v_action->>'deal_id', '')::uuid, nullif(p_payload->>'deal_id', '')::uuid)
          AND company_id = v_rule.company_id;
      ELSIF v_action->>'type' = 'send_notification' THEN
        v_recipient_user_id := coalesce(
          nullif(v_action->>'user_id', '')::uuid,
          nullif(v_action->>'recipient_user_id', '')::uuid,
          nullif(p_payload->>'user_id', '')::uuid,
          nullif(p_payload->>'owner_user_id', '')::uuid,
          nullif(p_payload->>'assigned_to', '')::uuid
        );

        IF v_recipient_user_id IS NULL THEN
          v_error_count := v_error_count + 1;
        ELSE
          INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            link,
            metadata
          ) VALUES (
            v_recipient_user_id,
            coalesce(nullif(v_action->>'title', ''), format('CRM automation: %s', p_event_type)),
            coalesce(nullif(v_action->>'message', ''), format('Automation rule executed for %s', p_event_type)),
            coalesce(nullif(v_action->>'notification_type', ''), 'info'),
            nullif(v_action->>'link', ''),
            jsonb_build_object(
              'source', 'crm_automation',
              'rule_id', v_rule.id,
              'event_type', p_event_type,
              'action', v_action,
              'correlation_id', p_correlation_id
            )
          ) RETURNING id INTO v_notification_id;

          v_result := v_result || jsonb_build_object('notification_id', v_notification_id);
        END IF;
      ELSIF v_action->>'type' = 'send_message' THEN
        v_sender_user_id := coalesce(nullif(v_action->>'sender_user_id', '')::uuid, auth.uid());
        v_recipient_user_id := coalesce(
          nullif(v_action->>'recipient_user_id', '')::uuid,
          nullif(v_action->>'user_id', '')::uuid,
          nullif(p_payload->>'recipient_user_id', '')::uuid,
          nullif(p_payload->>'owner_user_id', '')::uuid,
          nullif(p_payload->>'assigned_to', '')::uuid
        );
        v_message_content := coalesce(nullif(v_action->>'content', ''), format('Automation message for %s', p_event_type));

        IF v_sender_user_id IS NULL OR v_recipient_user_id IS NULL OR btrim(v_message_content) = '' THEN
          v_error_count := v_error_count + 1;
        ELSE
          INSERT INTO public.messages (
            user_id,
            sender_id,
            recipient_id,
            property_id,
            subject,
            content,
            is_read,
            parent_message_id,
            client_message_id
          ) VALUES (
            v_sender_user_id,
            v_sender_user_id,
            v_recipient_user_id,
            nullif(v_action->>'property_id', '')::uuid,
            coalesce(nullif(v_action->>'subject', ''), format('Automation: %s', p_event_type)),
            v_message_content,
            false,
            nullif(v_action->>'parent_message_id', '')::uuid,
            gen_random_uuid()::text
          ) RETURNING id INTO v_message_id;

          v_result := v_result || jsonb_build_object('message_id', v_message_id);
        END IF;
      ELSIF v_action->>'type' = 'update_lead_stage' THEN
        v_lead_id := coalesce(nullif(v_action->>'lead_id', '')::uuid, nullif(p_payload->>'lead_id', '')::uuid);
        v_stage := coalesce(nullif(v_action->>'stage', ''), nullif(p_payload->>'stage', ''), nullif(p_payload->>'to_stage', ''));

        IF v_lead_id IS NULL OR v_stage IS NULL THEN
          v_error_count := v_error_count + 1;
        ELSE
          SELECT l.stage
          INTO v_from_stage
          FROM public.leads l
          WHERE l.id = v_lead_id
            AND l.company_id = v_rule.company_id;

          IF NOT FOUND THEN
            v_error_count := v_error_count + 1;
          ELSE
            UPDATE public.leads
            SET stage = v_stage,
                status = CASE
                  WHEN v_stage = 'converted' THEN 'won'
                  WHEN v_stage = 'lost' THEN 'lost'
                  ELSE status
                END,
                converted_at = CASE
                  WHEN v_stage = 'converted' THEN COALESCE(converted_at, now())
                  ELSE converted_at
                END,
                last_activity_at = now()
            WHERE id = v_lead_id
              AND company_id = v_rule.company_id;

            INSERT INTO public.lead_stage_history (
              lead_id,
              from_stage,
              to_stage,
              actor_user_id,
              reason,
              changed_at
            ) VALUES (
              v_lead_id,
              v_from_stage,
              v_stage,
              auth.uid(),
              coalesce(nullif(v_action->>'reason', ''), 'automation_rule'),
              now()
            );

            INSERT INTO public.lead_activities (
              lead_id,
              activity_type,
              channel,
              actor_user_id,
              payload_json,
              occurred_at
            ) VALUES (
              v_lead_id,
              'status_change',
              'internal',
              auth.uid(),
              jsonb_build_object(
                'from_stage', v_from_stage,
                'to_stage', v_stage,
                'source', 'automation_rule',
                'rule_id', v_rule.id
              ),
              now()
            );

            v_result := v_result || jsonb_build_object('lead_stage_updated', v_lead_id);
          END IF;
        END IF;
      ELSIF v_action->>'type' = 'reassign_lead' THEN
        v_lead_id := coalesce(nullif(v_action->>'lead_id', '')::uuid, nullif(p_payload->>'lead_id', '')::uuid);
        v_owner_user_id := coalesce(
          nullif(v_action->>'assignee_user_id', '')::uuid,
          nullif(v_action->>'owner_user_id', '')::uuid,
          nullif(p_payload->>'owner_user_id', '')::uuid,
          nullif(p_payload->>'assigned_to', '')::uuid
        );

        IF v_lead_id IS NULL OR v_owner_user_id IS NULL THEN
          v_error_count := v_error_count + 1;
        ELSE
          UPDATE public.leads
          SET assigned_to = v_owner_user_id,
              last_activity_at = now()
          WHERE id = v_lead_id
            AND company_id = v_rule.company_id;

          IF NOT FOUND THEN
            v_error_count := v_error_count + 1;
          ELSE
            INSERT INTO public.lead_activities (
              lead_id,
              activity_type,
              channel,
              actor_user_id,
              payload_json,
              occurred_at
            ) VALUES (
              v_lead_id,
              'status_change',
              'internal',
              auth.uid(),
              jsonb_build_object(
                'assigned_to', v_owner_user_id,
                'source', 'automation_rule',
                'rule_id', v_rule.id
              ),
              now()
            );

            v_result := v_result || jsonb_build_object('lead_reassigned', v_lead_id);
          END IF;
        END IF;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;

  UPDATE public.crm_automation_runs
  SET status = CASE WHEN v_error_count = 0 THEN 'success' ELSE 'failed' END,
      attempts = 1,
      next_retry_at = CASE WHEN v_error_count = 0 THEN NULL ELSE now() + interval '5 minutes' END,
      last_error = CASE WHEN v_error_count = 0 THEN NULL ELSE 'One or more automation actions failed' END,
      result_json = v_result || jsonb_build_object('error_count', v_error_count),
      updated_at = now()
  WHERE id = v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_execute_automation_rule(uuid, jsonb, text, text, uuid, text) TO authenticated;
