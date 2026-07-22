-- SaaS Phase 6: app integration support for server-side entitlement checks
-- and dashboard usage snapshots.

-- Guard prerequisites so this migration fails with clear guidance if applied early.
DO $$
BEGIN
  IF to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_plan_entitlements') IS NULL
     OR to_regclass('public.saas_entitlement_keys') IS NULL
     OR to_regclass('public.saas_company_addon_subscriptions') IS NULL
     OR to_regclass('public.saas_addon_entitlements') IS NULL THEN
    RAISE EXCEPTION 'SAAS_PHASE6_PREREQUISITES_MISSING: Run Phase 1, Phase 4, and Phase 5 migrations first.';
  END IF;
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
  v_entitlement_key_id uuid;
  v_base_bool boolean := false;
  v_addon_override boolean := false;
BEGIN
  v_plan_id := public.saas_get_effective_plan_id(p_company_id, p_product_code);

  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT sek.id INTO v_entitlement_key_id
  FROM public.saas_entitlement_keys sek
  WHERE sek.key = p_entitlement_key
  LIMIT 1;

  IF v_entitlement_key_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(spe.bool_value, false)
  INTO v_base_bool
  FROM public.saas_plan_entitlements spe
  WHERE spe.plan_id = v_plan_id
    AND spe.entitlement_key_id = v_entitlement_key_id
  LIMIT 1;

  SELECT COALESCE(bool_or(COALESCE(sae.bool_value, false)), false)
  INTO v_addon_override
  FROM public.saas_company_addon_subscriptions cas
  JOIN public.saas_addon_entitlements sae ON sae.addon_id = cas.addon_id
  WHERE cas.company_id = p_company_id
    AND cas.status IN ('active', 'trialing', 'grace_period')
    AND sae.entitlement_key_id = v_entitlement_key_id
    AND sae.mode = 'set';

  RETURN (COALESCE(v_base_bool, false) OR COALESCE(v_addon_override, false));
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_has_entitlement(uuid, text, text) TO authenticated;

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
BEGIN
  RETURN QUERY
  WITH codes AS (
    SELECT code
    FROM public.saas_quota_dimensions
    WHERE code IN (
      'units_managed',
      'properties_managed',
      'active_tenants',
      'property_manager_seats',
      'ai_credits_monthly'
    )
  ), limits AS (
    SELECT
      c.code,
      q.soft_limit,
      q.hard_limit,
      q.used_value,
      q.remaining,
      q.limit_state
    FROM codes c
    JOIN LATERAL public.saas_get_effective_quota_limits(p_company_id, c.code, p_product_code) q ON true
  )
  SELECT
    l.code,
    l.soft_limit,
    l.hard_limit,
    l.used_value,
    l.remaining,
    l.limit_state,
    CASE
      WHEN l.hard_limit <= 0 THEN 0
      ELSE LEAST(100, GREATEST(0, floor((l.used_value::numeric / l.hard_limit::numeric) * 100)::integer))
    END AS usage_percent
  FROM limits l
  ORDER BY l.code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_get_quota_snapshot(uuid, text) TO authenticated;
