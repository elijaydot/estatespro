-- Serialize authoritative quota writes at the effective billing scope so two
-- member companies cannot concurrently overshoot one pooled group quota.

DO $$
BEGIN
  IF to_regprocedure('public.saas_get_effective_quota_limits(uuid,text,text)') IS NULL
     OR to_regclass('public.owner_billing_group_members') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_METERING_PREREQUISITES_MISSING: Run group resolution first.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_record_usage(
  p_company_id uuid,
  p_quota_code text,
  p_delta integer,
  p_product_code text DEFAULT 'core_property',
  p_correlation_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_group_id uuid;
  v_scope_key text;
  v_product_id uuid;
  v_dimension_id uuid;
  v_plan_id uuid;
  v_soft_limit integer;
  v_hard_limit integer;
  v_pooled_used integer;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_counter_id uuid;
  v_company_used integer;
  v_new_company_used integer;
  v_new_pooled_used integer;
  v_is_unlimited boolean := false;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'USAGE_DELTA_MUST_BE_POSITIVE';
  END IF;

  IF auth.role() <> 'service_role' AND (
    v_actor IS NULL OR NOT public.saas_user_can_access_company(v_actor, p_company_id)
  ) THEN
    RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_USAGE';
  END IF;

  SELECT member.group_id
  INTO v_group_id
  FROM public.owner_billing_group_members member
  JOIN public.owner_billing_groups billing_group
    ON billing_group.id = member.group_id
   AND billing_group.status = 'active'
  JOIN public.saas_owner_group_plan_subscriptions subscription
    ON subscription.group_id = member.group_id
   AND subscription.status IN ('active', 'grace_period')
  WHERE member.company_id = p_company_id
  LIMIT 1;

  v_scope_key := CASE
    WHEN v_group_id IS NOT NULL THEN 'group:' || v_group_id::text
    ELSE 'company:' || p_company_id::text
  END;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(':', 'saas_usage', v_scope_key, p_product_code, p_quota_code, v_period_start::text),
      0
    )
  );

  SELECT quota.product_id, quota.plan_id, quota.soft_limit, quota.hard_limit, quota.used_value
  INTO v_product_id, v_plan_id, v_soft_limit, v_hard_limit, v_pooled_used
  FROM public.saas_get_effective_quota_limits(p_company_id, p_quota_code, p_product_code) quota;

  v_is_unlimited := public.saas_quota_is_unlimited(v_plan_id, p_quota_code);

  SELECT id INTO v_dimension_id
  FROM public.saas_quota_dimensions
  WHERE code = p_quota_code
  LIMIT 1;

  IF v_product_id IS NULL OR v_dimension_id IS NULL THEN
    RAISE EXCEPTION 'QUOTA_LOOKUP_FAILED';
  END IF;

  INSERT INTO public.saas_usage_counters (
    company_id,
    product_id,
    quota_dimension_id,
    period_start,
    period_end,
    used_value
  ) VALUES (
    p_company_id,
    v_product_id,
    v_dimension_id,
    v_period_start,
    v_period_end,
    0
  )
  ON CONFLICT (company_id, product_id, quota_dimension_id, period_start, period_end)
  DO NOTHING;

  SELECT id, used_value
  INTO v_counter_id, v_company_used
  FROM public.saas_usage_counters
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND quota_dimension_id = v_dimension_id
    AND period_start = v_period_start
    AND period_end = v_period_end
  FOR UPDATE;

  IF NOT v_is_unlimited AND (v_pooled_used + p_delta) > v_hard_limit THEN
    INSERT INTO public.saas_usage_events (
      company_id,
      product_id,
      quota_dimension_id,
      actor_user_id,
      delta,
      resulting_used,
      allowed,
      reason,
      correlation_id,
      metadata
    ) VALUES (
      p_company_id,
      v_product_id,
      v_dimension_id,
      v_actor,
      p_delta,
      v_company_used,
      false,
      'hard_limit_exceeded',
      p_correlation_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'billing_scope', v_scope_key,
        'pooled_used_value', v_pooled_used
      )
    );

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
      'saas_quota',
      'entitlement.quota.blocked',
      'warning',
      v_actor,
      'company',
      p_company_id::text,
      jsonb_build_object(
        'product_code', p_product_code,
        'quota_code', p_quota_code,
        'delta', p_delta,
        'hard_limit', v_hard_limit,
        'used_value', v_pooled_used,
        'plan_id', v_plan_id,
        'billing_scope', v_scope_key
      ),
      p_correlation_id
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'hard_limit_exceeded',
      'is_unlimited', false,
      'used_value', v_pooled_used,
      'company_used_value', v_company_used,
      'soft_limit', v_soft_limit,
      'hard_limit', v_hard_limit,
      'remaining', greatest(v_hard_limit - v_pooled_used, 0),
      'plan_id', v_plan_id,
      'quota_code', p_quota_code,
      'product_code', p_product_code,
      'billing_scope', v_scope_key
    );
  END IF;

  UPDATE public.saas_usage_counters
  SET used_value = used_value + p_delta,
      updated_at = now()
  WHERE id = v_counter_id
  RETURNING used_value INTO v_new_company_used;

  v_new_pooled_used := v_pooled_used + p_delta;

  INSERT INTO public.saas_usage_events (
    company_id,
    product_id,
    quota_dimension_id,
    actor_user_id,
    delta,
    resulting_used,
    allowed,
    reason,
    correlation_id,
    metadata
  ) VALUES (
    p_company_id,
    v_product_id,
    v_dimension_id,
    v_actor,
    p_delta,
    v_new_company_used,
    true,
    CASE
      WHEN NOT v_is_unlimited AND v_new_pooled_used >= v_soft_limit THEN 'soft_limit_reached'
      ELSE 'ok'
    END,
    p_correlation_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'billing_scope', v_scope_key,
      'pooled_used_value', v_new_pooled_used
    )
  );

  IF NOT v_is_unlimited AND v_new_pooled_used >= v_soft_limit THEN
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
      'saas_quota',
      'entitlement.quota.soft_warning',
      'info',
      v_actor,
      'company',
      p_company_id::text,
      jsonb_build_object(
        'product_code', p_product_code,
        'quota_code', p_quota_code,
        'used_value', v_new_pooled_used,
        'company_used_value', v_new_company_used,
        'soft_limit', v_soft_limit,
        'hard_limit', v_hard_limit,
        'plan_id', v_plan_id,
        'billing_scope', v_scope_key
      ),
      p_correlation_id
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', CASE
      WHEN NOT v_is_unlimited AND v_new_pooled_used >= v_soft_limit THEN 'soft_limit_reached'
      ELSE 'ok'
    END,
    'is_unlimited', v_is_unlimited,
    'used_value', v_new_pooled_used,
    'company_used_value', v_new_company_used,
    'soft_limit', v_soft_limit,
    'hard_limit', v_hard_limit,
    'remaining', CASE
      WHEN v_is_unlimited THEN NULL
      ELSE greatest(v_hard_limit - v_new_pooled_used, 0)
    END,
    'plan_id', v_plan_id,
    'quota_code', p_quota_code,
    'product_code', p_product_code,
    'billing_scope', v_scope_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_record_usage(uuid, text, integer, text, text, jsonb) TO authenticated;
