-- SaaS Phase 4: usage metering and quota enforcement.
-- Adds company plan/add-on assignment tables, monthly counters, usage events,
-- and security-definer functions for deterministic quota checks.

CREATE OR REPLACE FUNCTION public.saas_user_can_access_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_platform_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = _company_id
        AND c.owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = _company_id
        AND cm.user_id = _user_id
        AND cm.status = 'approved'
        AND cm.role IN ('landlord', 'property_manager')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.saas_user_can_access_company(uuid, uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.saas_company_plan_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'grace_period', 'paused', 'canceled', 'expired')),
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  trial_end_at timestamptz,
  grace_end_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_company_addon_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.saas_addons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'grace_period', 'paused', 'canceled', 'expired')),
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  trial_end_at timestamptz,
  grace_end_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, addon_id)
);

CREATE TABLE IF NOT EXISTS public.saas_usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
  quota_dimension_id uuid NOT NULL REFERENCES public.saas_quota_dimensions(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  used_value integer NOT NULL DEFAULT 0 CHECK (used_value >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, product_id, quota_dimension_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.saas_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
  quota_dimension_id uuid NOT NULL REFERENCES public.saas_quota_dimensions(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delta integer NOT NULL CHECK (delta > 0),
  resulting_used integer NOT NULL CHECK (resulting_used >= 0),
  allowed boolean NOT NULL,
  reason text,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_company_active_product_subscription
  ON public.saas_company_plan_subscriptions(company_id, product_id)
  WHERE status IN ('active', 'trialing', 'grace_period');

CREATE INDEX IF NOT EXISTS idx_saas_company_plan_subscriptions_company_product
  ON public.saas_company_plan_subscriptions(company_id, product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_company_addon_subscriptions_company
  ON public.saas_company_addon_subscriptions(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_usage_counters_scope
  ON public.saas_usage_counters(company_id, product_id, quota_dimension_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_saas_usage_events_scope
  ON public.saas_usage_events(company_id, product_id, quota_dimension_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_usage_events_correlation
  ON public.saas_usage_events(correlation_id)
  WHERE correlation_id IS NOT NULL;

ALTER TABLE public.saas_company_plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_company_addon_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_company_plan_subscriptions'
      AND policyname = 'Super admins can manage company plan subscriptions'
  ) THEN
    CREATE POLICY "Super admins can manage company plan subscriptions"
    ON public.saas_company_plan_subscriptions
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_company_plan_subscriptions'
      AND policyname = 'Company managers can view own plan subscriptions'
  ) THEN
    CREATE POLICY "Company managers can view own plan subscriptions"
    ON public.saas_company_plan_subscriptions
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_company_addon_subscriptions'
      AND policyname = 'Super admins can manage company addon subscriptions'
  ) THEN
    CREATE POLICY "Super admins can manage company addon subscriptions"
    ON public.saas_company_addon_subscriptions
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_company_addon_subscriptions'
      AND policyname = 'Company managers can view own addon subscriptions'
  ) THEN
    CREATE POLICY "Company managers can view own addon subscriptions"
    ON public.saas_company_addon_subscriptions
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_usage_counters'
      AND policyname = 'Super admins can manage usage counters'
  ) THEN
    CREATE POLICY "Super admins can manage usage counters"
    ON public.saas_usage_counters
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_usage_counters'
      AND policyname = 'Company managers can view own usage counters'
  ) THEN
    CREATE POLICY "Company managers can view own usage counters"
    ON public.saas_usage_counters
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_usage_events'
      AND policyname = 'Super admins can manage usage events'
  ) THEN
    CREATE POLICY "Super admins can manage usage events"
    ON public.saas_usage_events
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_usage_events'
      AND policyname = 'Company managers can view own usage events'
  ) THEN
    CREATE POLICY "Company managers can view own usage events"
    ON public.saas_usage_events
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_saas_company_plan_subscriptions_updated_at ON public.saas_company_plan_subscriptions;
CREATE TRIGGER update_saas_company_plan_subscriptions_updated_at
BEFORE UPDATE ON public.saas_company_plan_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_company_addon_subscriptions_updated_at ON public.saas_company_addon_subscriptions;
CREATE TRIGGER update_saas_company_addon_subscriptions_updated_at
BEFORE UPDATE ON public.saas_company_addon_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_usage_counters_updated_at ON public.saas_usage_counters;
CREATE TRIGGER update_saas_usage_counters_updated_at
BEFORE UPDATE ON public.saas_usage_counters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
BEGIN
  SELECT cps.plan_id
  INTO v_plan_id
  FROM public.saas_company_plan_subscriptions cps
  JOIN public.saas_products sp ON sp.id = cps.product_id
  WHERE cps.company_id = p_company_id
    AND sp.code = p_product_code
    AND cps.status IN ('active', 'trialing', 'grace_period')
  ORDER BY cps.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT spn.id
    INTO v_plan_id
    FROM public.saas_plans spn
    JOIN public.saas_products spr ON spr.id = spn.product_id
    WHERE spr.code = p_product_code
      AND spn.tier = 'free'
      AND spn.is_active = true
    LIMIT 1;
  END IF;

  RETURN v_plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_get_effective_plan_id(uuid, text) TO authenticated;

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
  v_base_soft integer;
  v_base_hard integer;
  v_set_override integer;
  v_increment integer;
  v_final_hard integer;
  v_final_soft integer;
  v_used integer;
  v_period_start date;
  v_period_end date;
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

  SELECT pq.soft_limit, pq.hard_limit
  INTO v_base_soft, v_base_hard
  FROM public.saas_plan_quotas pq
  WHERE pq.plan_id = v_plan_id
    AND pq.quota_dimension_id = v_dimension_id;

  IF v_base_hard IS NULL THEN
    RAISE EXCEPTION 'PLAN_QUOTA_NOT_CONFIGURED';
  END IF;

  SELECT MAX(ao.hard_limit_override)
  INTO v_set_override
  FROM public.saas_company_addon_subscriptions cas
  JOIN public.saas_addon_quota_overrides ao ON ao.addon_id = cas.addon_id
  WHERE cas.company_id = p_company_id
    AND cas.status IN ('active', 'trialing', 'grace_period')
    AND ao.quota_dimension_id = v_dimension_id
    AND ao.mode = 'set';

  SELECT COALESCE(SUM(ao.increment_by), 0)
  INTO v_increment
  FROM public.saas_company_addon_subscriptions cas
  JOIN public.saas_addon_quota_overrides ao ON ao.addon_id = cas.addon_id
  WHERE cas.company_id = p_company_id
    AND cas.status IN ('active', 'trialing', 'grace_period')
    AND ao.quota_dimension_id = v_dimension_id
    AND ao.mode = 'increment';

  v_final_hard := COALESCE(v_set_override, v_base_hard + COALESCE(v_increment, 0));
  v_final_soft := LEAST(v_final_hard, GREATEST(v_base_soft, floor(v_final_hard * 0.8)::integer));

  v_period_start := date_trunc('month', now())::date;
  v_period_end := (date_trunc('month', now()) + interval '1 month - 1 day')::date;

  SELECT COALESCE(uc.used_value, 0)
  INTO v_used
  FROM public.saas_usage_counters uc
  WHERE uc.company_id = p_company_id
    AND uc.product_id = v_product_id
    AND uc.quota_dimension_id = v_dimension_id
    AND uc.period_start = v_period_start
    AND uc.period_end = v_period_end
  LIMIT 1;

  RETURN QUERY
  SELECT
    v_product_id,
    v_plan_id,
    v_final_soft,
    v_final_hard,
    COALESCE(v_used, 0),
    GREATEST(v_final_hard - COALESCE(v_used, 0), 0),
    CASE
      WHEN COALESCE(v_used, 0) >= v_final_hard THEN 'hard_exceeded'
      WHEN COALESCE(v_used, 0) >= v_final_soft THEN 'soft_exceeded'
      ELSE 'ok'
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_get_effective_quota_limits(uuid, text, text) TO authenticated;

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
  v_product_id uuid;
  v_dimension_id uuid;
  v_plan_id uuid;
  v_soft_limit integer;
  v_hard_limit integer;
  v_used integer;
  v_remaining integer;
  v_state text;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_counter_id uuid;
  v_new_used integer;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'USAGE_DELTA_MUST_BE_POSITIVE';
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_access_company(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_USAGE';
    END IF;
  END IF;

  SELECT q.product_id, q.plan_id, q.soft_limit, q.hard_limit, q.used_value, q.remaining, q.limit_state
  INTO v_product_id, v_plan_id, v_soft_limit, v_hard_limit, v_used, v_remaining, v_state
  FROM public.saas_get_effective_quota_limits(p_company_id, p_quota_code, p_product_code) q;

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
  ON CONFLICT (company_id, product_id, quota_dimension_id, period_start, period_end) DO NOTHING;

  SELECT id, used_value
  INTO v_counter_id, v_used
  FROM public.saas_usage_counters
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND quota_dimension_id = v_dimension_id
    AND period_start = v_period_start
    AND period_end = v_period_end
  FOR UPDATE;

  IF (v_used + p_delta) > v_hard_limit THEN
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
      v_used,
      false,
      'hard_limit_exceeded',
      p_correlation_id,
      p_metadata
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
        'used_value', v_used,
        'plan_id', v_plan_id
      ),
      p_correlation_id
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'hard_limit_exceeded',
      'used_value', v_used,
      'soft_limit', v_soft_limit,
      'hard_limit', v_hard_limit,
      'remaining', GREATEST(v_hard_limit - v_used, 0),
      'plan_id', v_plan_id,
      'quota_code', p_quota_code,
      'product_code', p_product_code
    );
  END IF;

  UPDATE public.saas_usage_counters
  SET used_value = used_value + p_delta,
      updated_at = now()
  WHERE id = v_counter_id
  RETURNING used_value INTO v_new_used;

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
    v_new_used,
    true,
    CASE WHEN v_new_used >= v_soft_limit THEN 'soft_limit_reached' ELSE 'ok' END,
    p_correlation_id,
    p_metadata
  );

  IF v_new_used >= v_soft_limit THEN
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
        'used_value', v_new_used,
        'soft_limit', v_soft_limit,
        'hard_limit', v_hard_limit,
        'plan_id', v_plan_id
      ),
      p_correlation_id
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', CASE WHEN v_new_used >= v_soft_limit THEN 'soft_limit_reached' ELSE 'ok' END,
    'used_value', v_new_used,
    'soft_limit', v_soft_limit,
    'hard_limit', v_hard_limit,
    'remaining', GREATEST(v_hard_limit - v_new_used, 0),
    'plan_id', v_plan_id,
    'quota_code', p_quota_code,
    'product_code', p_product_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_record_usage(uuid, text, integer, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_check_quota(
  p_company_id uuid,
  p_quota_code text,
  p_requested_delta integer DEFAULT 1,
  p_product_code text DEFAULT 'core_property'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_quota record;
  v_after integer;
BEGIN
  IF p_requested_delta IS NULL OR p_requested_delta <= 0 THEN
    RAISE EXCEPTION 'REQUESTED_DELTA_MUST_BE_POSITIVE';
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_access_company(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_USAGE';
    END IF;
  END IF;

  SELECT *
  INTO v_quota
  FROM public.saas_get_effective_quota_limits(p_company_id, p_quota_code, p_product_code);

  v_after := v_quota.used_value + p_requested_delta;

  RETURN jsonb_build_object(
    'allowed', (v_after <= v_quota.hard_limit),
    'reason', CASE
      WHEN v_after > v_quota.hard_limit THEN 'hard_limit_exceeded'
      WHEN v_after > v_quota.soft_limit THEN 'soft_limit_warning'
      ELSE 'ok'
    END,
    'used_value', v_quota.used_value,
    'requested_delta', p_requested_delta,
    'projected_used_value', v_after,
    'soft_limit', v_quota.soft_limit,
    'hard_limit', v_quota.hard_limit,
    'remaining', GREATEST(v_quota.hard_limit - v_quota.used_value, 0),
    'plan_id', v_quota.plan_id,
    'quota_code', p_quota_code,
    'product_code', p_product_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_check_quota(uuid, text, integer, text) TO authenticated;
