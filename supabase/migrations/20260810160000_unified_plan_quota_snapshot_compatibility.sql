-- Keep legacy access snapshots compatible with unified plans that intentionally
-- omit quota dimensions such as ai_credits_monthly.

CREATE OR REPLACE FUNCTION public.saas_get_quota_snapshot(
  p_company_id uuid,
  p_product_code text DEFAULT 'core_property'
)
RETURNS TABLE(
  quota_code text,
  soft_limit integer,
  hard_limit integer,
  used_value integer,
  remaining integer,
  limit_state text,
  usage_percent integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  v_plan_id := public.saas_get_effective_plan_id(p_company_id, p_product_code);

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'NO_EFFECTIVE_PLAN_FOUND';
  END IF;

  RETURN QUERY
  WITH codes AS (
    SELECT dimension.code
    FROM public.saas_plan_quotas plan_quota
    JOIN public.saas_quota_dimensions dimension
      ON dimension.id = plan_quota.quota_dimension_id
    WHERE plan_quota.plan_id = v_plan_id
      AND dimension.code IN (
        'units_managed',
        'properties_managed',
        'active_tenants',
        'property_manager_seats',
        'ai_credits_monthly'
      )
  ), limits AS (
    SELECT
      codes.code,
      quota.soft_limit,
      quota.hard_limit,
      quota.used_value,
      quota.remaining,
      quota.limit_state
    FROM codes
    JOIN LATERAL public.saas_get_effective_quota_limits(
      p_company_id,
      codes.code,
      p_product_code
    ) quota ON true
  )
  SELECT
    limits.code,
    limits.soft_limit,
    limits.hard_limit,
    limits.used_value,
    limits.remaining,
    limits.limit_state,
    CASE
      WHEN limits.hard_limit <= 0 THEN 0
      ELSE LEAST(
        100,
        GREATEST(
          0,
          floor((limits.used_value::numeric / limits.hard_limit::numeric) * 100)::integer
        )
      )
    END AS usage_percent
  FROM limits
  ORDER BY limits.code;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_get_quota_snapshot(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_get_quota_snapshot(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_catalog_active_subscription_count(p_plan_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT count(*)
      FROM public.saas_company_plan_subscriptions company_subscription
      WHERE company_subscription.plan_id = p_plan_id
        AND company_subscription.status IN ('active', 'trialing', 'grace_period')
    )
    +
    (
      SELECT count(*)
      FROM public.saas_owner_group_plan_subscriptions group_subscription
      JOIN public.owner_billing_groups billing_group
        ON billing_group.id = group_subscription.group_id
       AND billing_group.status = 'active'
      WHERE group_subscription.plan_id = p_plan_id
        AND group_subscription.status IN ('active', 'grace_period')
    );
$$;

REVOKE ALL ON FUNCTION public.saas_catalog_active_subscription_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_catalog_active_subscription_count(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_catalog_plan_has_active_subscriptions(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.saas_catalog_active_subscription_count(p_plan_id) > 0;
$$;

REVOKE ALL ON FUNCTION public.saas_catalog_plan_has_active_subscriptions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_catalog_plan_has_active_subscriptions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_publish_catalog_change_set(p_change_set_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_changes jsonb;
  v_change jsonb;
  v_entity text;
  v_field text;
  v_id uuid;
  v_plan_id uuid;
  v_current_limit integer;
  v_new_limit integer;
  v_affected bigint := 0;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;

  SELECT changes INTO v_changes
  FROM public.saas_catalog_change_sets
  WHERE id = p_change_set_id AND status = 'draft'
  FOR UPDATE;

  IF v_changes IS NULL THEN
    RAISE EXCEPTION 'DRAFT_CHANGE_SET_NOT_FOUND';
  END IF;

  FOR v_change IN SELECT value FROM jsonb_array_elements(v_changes)
  LOOP
    v_entity := v_change->>'entity';
    v_field := v_change->>'field';
    v_id := (v_change->>'id')::uuid;
    v_plan_id := (v_change->>'planId')::uuid;

    IF v_entity = 'quota' AND v_field = 'hard_limit' THEN
      SELECT hard_limit INTO v_current_limit FROM public.saas_plan_quotas WHERE id = v_id;
      v_new_limit := (v_change->>'after')::integer;
      IF v_new_limit < v_current_limit
         AND public.saas_catalog_plan_has_active_subscriptions(v_plan_id) THEN
        RAISE EXCEPTION 'PAID_SUBSCRIBER_QUOTA_DECREASE_POLICY_REQUIRED';
      END IF;
      UPDATE public.saas_plan_quotas
      SET hard_limit = v_new_limit,
          soft_limit = LEAST(soft_limit, v_new_limit),
          updated_at = now()
      WHERE id = v_id;
    ELSIF v_entity = 'quota' AND v_field = 'is_unlimited' THEN
      UPDATE public.saas_plan_quotas SET is_unlimited = (v_change->>'after')::boolean, updated_at = now() WHERE id = v_id;
    ELSIF v_entity = 'price' AND v_field = 'amount_minor' THEN
      UPDATE public.saas_plan_prices SET amount_minor = (v_change->>'after')::integer, updated_at = now() WHERE id = v_id;
    ELSIF v_entity = 'plan' AND v_field = 'trial_days' THEN
      UPDATE public.saas_plans SET trial_days = (v_change->>'after')::integer, updated_at = now() WHERE id = v_id;
    ELSIF v_entity = 'entitlement' AND v_field = 'bool_value' THEN
      UPDATE public.saas_plan_entitlements
      SET bool_value = (v_change->>'after')::boolean, int_value = NULL, json_value = NULL, updated_at = now()
      WHERE id = v_id;
    ELSIF v_entity = 'entitlement' AND v_field = 'json_value' THEN
      UPDATE public.saas_plan_entitlements
      SET bool_value = NULL, int_value = NULL, json_value = v_change->'after', updated_at = now()
      WHERE id = v_id;
    ELSE
      RAISE EXCEPTION 'UNSUPPORTED_CATALOG_CHANGE: %.%', v_entity, v_field;
    END IF;

    v_affected := v_affected + public.saas_catalog_active_subscription_count(v_plan_id);
    INSERT INTO public.platform_audit_events (
      source, event_type, module, action, result_status, actor_user_id,
      target_entity_type, target_entity_id, correlation_id, metadata
    ) VALUES (
      'catalog_management', 'catalog.change.published', 'catalog', 'publish_change', 'success', v_actor,
      v_entity, v_id::text, p_change_set_id::text, v_change
    );
  END LOOP;

  UPDATE public.saas_catalog_change_sets
  SET status = 'published', published_by = v_actor, published_at = now(), updated_at = now()
  WHERE id = p_change_set_id;

  RETURN jsonb_build_object('published_changes', jsonb_array_length(v_changes), 'affected_subscriptions', v_affected);
END;
$$;

REVOKE ALL ON FUNCTION public.saas_publish_catalog_change_set(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_publish_catalog_change_set(uuid) TO authenticated;
