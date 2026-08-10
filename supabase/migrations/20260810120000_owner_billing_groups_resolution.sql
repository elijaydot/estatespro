-- Group-first plan, pooled quota, and layered entitlement resolution.
-- Usage counters remain company/product scoped; only effective reads pool members.

DO $$
BEGIN
  IF to_regclass('public.owner_billing_group_members') IS NULL
     OR to_regclass('public.saas_owner_group_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_owner_group_addon_subscriptions') IS NULL
     OR to_regclass('public.saas_owner_group_quota_overrides') IS NULL
     OR to_regclass('public.saas_owner_group_entitlement_overrides') IS NULL
     OR to_regclass('public.saas_company_billing_access_states') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_RESOLUTION_PREREQUISITES_MISSING: Run group foundation and lifecycle migrations first.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_get_effective_plan_id(
  p_company_id uuid,
  p_product_code text DEFAULT 'core_property'
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_access_state text;
BEGIN
  SELECT subscription.plan_id
  INTO v_plan_id
  FROM public.owner_billing_group_members member
  JOIN public.owner_billing_groups billing_group
    ON billing_group.id = member.group_id
   AND billing_group.status = 'active'
  JOIN public.saas_owner_group_plan_subscriptions subscription
    ON subscription.group_id = billing_group.id
   AND subscription.status IN ('active', 'grace_period')
  JOIN public.saas_plans plan ON plan.id = subscription.plan_id
  WHERE member.company_id = p_company_id
    AND plan.product_id IS NULL
    AND plan.is_active = true
  ORDER BY subscription.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
    RETURN v_plan_id;
  END IF;

  SELECT company_subscription.plan_id
  INTO v_plan_id
  FROM public.saas_company_plan_subscriptions company_subscription
  JOIN public.saas_products product ON product.id = company_subscription.product_id
  JOIN public.saas_plans plan ON plan.id = company_subscription.plan_id
  WHERE company_subscription.company_id = p_company_id
    AND product.code = p_product_code
    AND company_subscription.status IN ('active', 'trialing', 'grace_period')
    AND (plan.product_id IS NULL OR plan.product_id = product.id)
    AND plan.is_active = true
  ORDER BY company_subscription.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
    RETURN v_plan_id;
  END IF;

  SELECT access_state
  INTO v_access_state
  FROM public.saas_company_billing_access_states
  WHERE company_id = p_company_id;

  IF v_access_state IN ('grouped', 'needs_plan') THEN
    RETURN NULL;
  END IF;

  SELECT plan.id
  INTO v_plan_id
  FROM public.saas_plans plan
  JOIN public.saas_products product ON product.id = plan.product_id
  WHERE product.code = p_product_code
    AND plan.tier = 'free'
    AND plan.is_active = true
  LIMIT 1;

  RETURN v_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_get_effective_quota_limits(
  p_company_id uuid,
  p_quota_code text,
  p_product_code text DEFAULT 'core_property'
)
RETURNS TABLE (
  product_id uuid,
  plan_id uuid,
  soft_limit integer,
  hard_limit integer,
  used_value integer,
  remaining integer,
  limit_state text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_product_id uuid;
  v_dimension_id uuid;
  v_group_id uuid;
  v_base_soft integer;
  v_base_hard integer;
  v_is_unlimited boolean := false;
  v_group_increment integer := 0;
  v_company_increment integer := 0;
  v_set_override integer;
  v_final_hard integer;
  v_final_soft integer;
  v_used integer := 0;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
BEGIN
  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT id INTO v_dimension_id
  FROM public.saas_quota_dimensions
  WHERE code = p_quota_code
  LIMIT 1;

  IF v_dimension_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_QUOTA_CODE';
  END IF;

  v_plan_id := public.saas_get_effective_plan_id(p_company_id, p_product_code);

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'NO_EFFECTIVE_PLAN_FOUND';
  END IF;

  SELECT quota.soft_limit, quota.hard_limit, quota.is_unlimited
  INTO v_base_soft, v_base_hard, v_is_unlimited
  FROM public.saas_plan_quotas quota
  WHERE quota.plan_id = v_plan_id
    AND quota.quota_dimension_id = v_dimension_id;

  IF v_base_hard IS NULL THEN
    RAISE EXCEPTION 'PLAN_QUOTA_NOT_CONFIGURED';
  END IF;

  SELECT member.group_id
  INTO v_group_id
  FROM public.owner_billing_group_members member
  JOIN public.owner_billing_groups billing_group
    ON billing_group.id = member.group_id
   AND billing_group.status = 'active'
  JOIN public.saas_owner_group_plan_subscriptions subscription
    ON subscription.group_id = member.group_id
   AND subscription.plan_id = v_plan_id
   AND subscription.status IN ('active', 'grace_period')
  WHERE member.company_id = p_company_id
  LIMIT 1;

  IF v_group_id IS NOT NULL THEN
    SELECT coalesce(sum(addon_override.increment_by), 0)
    INTO v_group_increment
    FROM public.saas_owner_group_addon_subscriptions group_addon
    JOIN public.saas_addon_quota_overrides addon_override
      ON addon_override.addon_id = group_addon.addon_id
    WHERE group_addon.group_id = v_group_id
      AND group_addon.status IN ('active', 'grace_period')
      AND addon_override.quota_dimension_id = v_dimension_id
      AND addon_override.mode = 'increment';

    SELECT v_group_increment + coalesce(sum(group_override.increment_by), 0)
    INTO v_group_increment
    FROM public.saas_owner_group_quota_overrides group_override
    WHERE group_override.group_id = v_group_id
      AND group_override.quota_dimension_id = v_dimension_id
      AND group_override.mode = 'increment'
      AND (group_override.expires_at IS NULL OR group_override.expires_at > now());
  END IF;

  SELECT coalesce(sum(addon_override.increment_by), 0)
  INTO v_company_increment
  FROM public.saas_company_addon_subscriptions company_addon
  JOIN public.saas_addon_quota_overrides addon_override
    ON addon_override.addon_id = company_addon.addon_id
  WHERE company_addon.company_id = p_company_id
    AND company_addon.status IN ('active', 'trialing', 'grace_period')
    AND addon_override.quota_dimension_id = v_dimension_id
    AND addon_override.mode = 'increment';

  SELECT max(set_value)
  INTO v_set_override
  FROM (
    SELECT addon_override.hard_limit_override AS set_value
    FROM public.saas_owner_group_addon_subscriptions group_addon
    JOIN public.saas_addon_quota_overrides addon_override
      ON addon_override.addon_id = group_addon.addon_id
    WHERE group_addon.group_id = v_group_id
      AND group_addon.status IN ('active', 'grace_period')
      AND addon_override.quota_dimension_id = v_dimension_id
      AND addon_override.mode = 'set'

    UNION ALL

    SELECT group_override.hard_limit_override
    FROM public.saas_owner_group_quota_overrides group_override
    WHERE group_override.group_id = v_group_id
      AND group_override.quota_dimension_id = v_dimension_id
      AND group_override.mode = 'set'
      AND (group_override.expires_at IS NULL OR group_override.expires_at > now())

    UNION ALL

    SELECT addon_override.hard_limit_override
    FROM public.saas_company_addon_subscriptions company_addon
    JOIN public.saas_addon_quota_overrides addon_override
      ON addon_override.addon_id = company_addon.addon_id
    WHERE company_addon.company_id = p_company_id
      AND company_addon.status IN ('active', 'trialing', 'grace_period')
      AND addon_override.quota_dimension_id = v_dimension_id
      AND addon_override.mode = 'set'
  ) set_overrides;

  v_final_hard := greatest(
    v_base_hard + coalesce(v_group_increment, 0) + coalesce(v_company_increment, 0),
    coalesce(v_set_override, 0)
  );
  v_final_soft := least(v_final_hard, greatest(v_base_soft, floor(v_final_hard * 0.8)::integer));

  IF v_group_id IS NOT NULL THEN
    SELECT coalesce(sum(counter.used_value), 0)::integer
    INTO v_used
    FROM public.owner_billing_group_members member
    LEFT JOIN public.saas_usage_counters counter
      ON counter.company_id = member.company_id
     AND counter.product_id = v_product_id
     AND counter.quota_dimension_id = v_dimension_id
     AND counter.period_start = v_period_start
     AND counter.period_end = v_period_end
    WHERE member.group_id = v_group_id;
  ELSE
    SELECT coalesce(sum(counter.used_value), 0)::integer
    INTO v_used
    FROM public.saas_usage_counters counter
    WHERE counter.company_id = p_company_id
      AND counter.product_id = v_product_id
      AND counter.quota_dimension_id = v_dimension_id
      AND counter.period_start = v_period_start
      AND counter.period_end = v_period_end;
  END IF;

  RETURN QUERY
  SELECT
    v_product_id,
    v_plan_id,
    v_final_soft,
    v_final_hard,
    coalesce(v_used, 0),
    CASE
      WHEN v_is_unlimited THEN NULL
      ELSE greatest(v_final_hard - coalesce(v_used, 0), 0)
    END,
    CASE
      WHEN v_is_unlimited THEN 'ok'
      WHEN coalesce(v_used, 0) >= v_final_hard THEN 'hard_exceeded'
      WHEN coalesce(v_used, 0) >= v_final_soft THEN 'soft_exceeded'
      ELSE 'ok'
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_has_entitlement(
  p_company_id uuid,
  p_entitlement_key text,
  p_product_code text DEFAULT 'core_property'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_group_id uuid;
  v_entitlement_key_id uuid;
  v_base_bool boolean := false;
  v_group_addon_allow boolean := false;
  v_company_addon_allow boolean := false;
  v_group_decision text;
  v_company_decision text;
BEGIN
  SELECT override.decision
  INTO v_company_decision
  FROM public.platform_entitlement_overrides override
  WHERE override.company_id = p_company_id
    AND override.entitlement_key = p_entitlement_key
    AND override.revoked_at IS NULL
    AND (override.expires_at IS NULL OR override.expires_at > now())
  ORDER BY override.created_at DESC
  LIMIT 1;

  IF v_company_decision = 'allow' THEN
    RETURN true;
  ELSIF v_company_decision = 'deny' THEN
    RETURN false;
  END IF;

  v_plan_id := public.saas_get_effective_plan_id(p_company_id, p_product_code);

  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_entitlement_key_id
  FROM public.saas_entitlement_keys
  WHERE key = p_entitlement_key
  LIMIT 1;

  IF v_entitlement_key_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT member.group_id
  INTO v_group_id
  FROM public.owner_billing_group_members member
  JOIN public.saas_owner_group_plan_subscriptions subscription
    ON subscription.group_id = member.group_id
   AND subscription.plan_id = v_plan_id
   AND subscription.status IN ('active', 'grace_period')
  WHERE member.company_id = p_company_id
  LIMIT 1;

  IF v_group_id IS NOT NULL THEN
    SELECT override.decision
    INTO v_group_decision
    FROM public.saas_owner_group_entitlement_overrides override
    WHERE override.group_id = v_group_id
      AND override.entitlement_key_id = v_entitlement_key_id
      AND (override.expires_at IS NULL OR override.expires_at > now())
    ORDER BY override.created_at DESC
    LIMIT 1;

    IF v_group_decision = 'allow' THEN
      RETURN true;
    ELSIF v_group_decision = 'deny' THEN
      RETURN false;
    END IF;
  END IF;

  SELECT coalesce(entitlement.bool_value, false)
  INTO v_base_bool
  FROM public.saas_plan_entitlements entitlement
  WHERE entitlement.plan_id = v_plan_id
    AND entitlement.entitlement_key_id = v_entitlement_key_id
  LIMIT 1;

  IF v_group_id IS NOT NULL THEN
    SELECT coalesce(bool_or(coalesce(entitlement.bool_value, false)), false)
    INTO v_group_addon_allow
    FROM public.saas_owner_group_addon_subscriptions group_addon
    JOIN public.saas_addon_entitlements entitlement
      ON entitlement.addon_id = group_addon.addon_id
    WHERE group_addon.group_id = v_group_id
      AND group_addon.status IN ('active', 'grace_period')
      AND entitlement.entitlement_key_id = v_entitlement_key_id
      AND entitlement.mode = 'set';
  END IF;

  SELECT coalesce(bool_or(coalesce(entitlement.bool_value, false)), false)
  INTO v_company_addon_allow
  FROM public.saas_company_addon_subscriptions company_addon
  JOIN public.saas_addon_entitlements entitlement
    ON entitlement.addon_id = company_addon.addon_id
  WHERE company_addon.company_id = p_company_id
    AND company_addon.status IN ('active', 'trialing', 'grace_period')
    AND entitlement.entitlement_key_id = v_entitlement_key_id
    AND entitlement.mode = 'set';

  RETURN coalesce(v_base_bool, false)
    OR coalesce(v_group_addon_allow, false)
    OR coalesce(v_company_addon_allow, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_get_effective_plan_id(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_get_effective_quota_limits(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_has_entitlement(uuid, text, text) TO authenticated;
