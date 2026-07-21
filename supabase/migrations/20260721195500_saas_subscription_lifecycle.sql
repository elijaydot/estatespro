
-- Bootstrap helper for environments that execute this migration out of order.
CREATE OR REPLACE FUNCTION public.is_platform_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_super_admin(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.saas_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.saas_company_plan_subscriptions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_subscription_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.saas_company_plan_subscriptions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
  previous_plan_id uuid REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  new_plan_id uuid REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  currency_code text NOT NULL CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  estimated_credit_minor integer,
  estimated_charge_minor integer,
  effective_at timestamptz NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_subscription_events_subscription
  ON public.saas_subscription_events(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_subscription_events_company
  ON public.saas_subscription_events(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_subscription_change_log_subscription
  ON public.saas_subscription_change_log(subscription_id, created_at DESC);

ALTER TABLE public.saas_subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscription_change_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_events'
      AND policyname = 'Super admins can manage subscription events'
  ) THEN
    CREATE POLICY "Super admins can manage subscription events"
    ON public.saas_subscription_events
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_events'
      AND policyname = 'Company managers can view subscription events'
  ) THEN
    CREATE POLICY "Company managers can view subscription events"
    ON public.saas_subscription_events
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_change_log'
      AND policyname = 'Super admins can manage subscription change log'
  ) THEN
    CREATE POLICY "Super admins can manage subscription change log"
    ON public.saas_subscription_change_log
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_change_log'
      AND policyname = 'Company managers can view subscription change log'
  ) THEN
    CREATE POLICY "Company managers can view subscription change log"
    ON public.saas_subscription_change_log
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_user_can_administer_billing(_user_id uuid, _company_id uuid)
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.saas_user_can_administer_billing(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_get_plan_price_minor(
  p_plan_id uuid,
  p_currency_code text DEFAULT 'USD'
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount integer;
BEGIN
  SELECT spp.amount_minor
  INTO v_amount
  FROM public.saas_plan_prices spp
  WHERE spp.plan_id = p_plan_id
    AND spp.currency_code = p_currency_code
    AND spp.billing_interval = 'monthly'
  LIMIT 1;

  IF v_amount IS NULL THEN
    SELECT spp.amount_minor
    INTO v_amount
    FROM public.saas_plan_prices spp
    WHERE spp.plan_id = p_plan_id
      AND spp.is_default = true
      AND spp.billing_interval = 'monthly'
    LIMIT 1;
  END IF;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'PLAN_PRICE_NOT_FOUND';
  END IF;

  RETURN v_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_get_plan_price_minor(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_start_or_replace_subscription(
  p_company_id uuid,
  p_product_code text,
  p_plan_code text,
  p_trial_days integer DEFAULT 0,
  p_correlation_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_product_id uuid;
  v_plan_id uuid;
  v_existing_id uuid;
  v_trial_end timestamptz;
  v_status text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_administer_billing(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN';
    END IF;
  END IF;

  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
    AND is_active = true
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT id INTO v_plan_id
  FROM public.saas_plans
  WHERE code = p_plan_code
    AND product_id = v_product_id
    AND is_active = true
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_OR_INCOMPATIBLE_PLAN_CODE';
  END IF;

  IF p_trial_days > 0 THEN
    v_status := 'trialing';
    v_trial_end := now() + make_interval(days => p_trial_days);
  ELSE
    v_status := 'active';
    v_trial_end := NULL;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND status IN ('active', 'trialing', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.saas_company_plan_subscriptions
    SET status = 'expired',
        end_at = now(),
        updated_at = now(),
        notes = COALESCE(notes, '') || ' Replaced by new subscription on ' || now()::text
    WHERE id = v_existing_id;
  END IF;

  INSERT INTO public.saas_company_plan_subscriptions (
    company_id,
    product_id,
    plan_id,
    status,
    start_at,
    trial_end_at,
    created_by,
    metadata
  ) VALUES (
    p_company_id,
    v_product_id,
    v_plan_id,
    v_status,
    now(),
    v_trial_end,
    v_actor,
    p_metadata
  ) RETURNING id INTO v_existing_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    correlation_id
  ) VALUES (
    v_existing_id,
    p_company_id,
    v_product_id,
    v_actor,
    'billing.subscription.started',
    jsonb_build_object(
      'plan_code', p_plan_code,
      'status', v_status,
      'trial_days', p_trial_days
    ),
    p_correlation_id
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
    'saas_billing',
    'billing.subscription.started',
    'info',
    v_actor,
    'company',
    p_company_id::text,
    jsonb_build_object(
      'product_code', p_product_code,
      'plan_code', p_plan_code,
      'status', v_status,
      'trial_days', p_trial_days,
      'subscription_id', v_existing_id
    ),
    p_correlation_id
  );

  RETURN v_existing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_start_or_replace_subscription(uuid, text, text, integer, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_change_subscription_plan(
  p_company_id uuid,
  p_product_code text,
  p_new_plan_code text,
  p_currency_code text DEFAULT 'USD',
  p_effective_now boolean DEFAULT true,
  p_reason text DEFAULT NULL,
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
  v_subscription_id uuid;
  v_old_plan_id uuid;
  v_new_plan_id uuid;
  v_old_price integer;
  v_new_price integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_total_seconds numeric;
  v_remaining_seconds numeric;
  v_ratio numeric;
  v_credit integer;
  v_charge integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_administer_billing(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN';
    END IF;
  END IF;

  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
    AND is_active = true
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT id, plan_id
  INTO v_subscription_id, v_old_plan_id
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND status IN ('active', 'trialing', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION_FOR_PRODUCT';
  END IF;

  SELECT id INTO v_new_plan_id
  FROM public.saas_plans
  WHERE code = p_new_plan_code
    AND product_id = v_product_id
    AND is_active = true
  LIMIT 1;

  IF v_new_plan_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_OR_INCOMPATIBLE_NEW_PLAN';
  END IF;

  IF v_new_plan_id = v_old_plan_id THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'same_plan');
  END IF;

  v_old_price := public.saas_get_plan_price_minor(v_old_plan_id, p_currency_code);
  v_new_price := public.saas_get_plan_price_minor(v_new_plan_id, p_currency_code);

  v_period_start := date_trunc('month', now());
  v_period_end := date_trunc('month', now()) + interval '1 month';
  v_total_seconds := EXTRACT(EPOCH FROM (v_period_end - v_period_start));
  v_remaining_seconds := GREATEST(EXTRACT(EPOCH FROM (v_period_end - now())), 0);
  v_ratio := CASE WHEN v_total_seconds > 0 THEN v_remaining_seconds / v_total_seconds ELSE 0 END;

  v_credit := floor(v_old_price * v_ratio)::integer;
  v_charge := floor(v_new_price * v_ratio)::integer;

  UPDATE public.saas_company_plan_subscriptions
  SET plan_id = v_new_plan_id,
      updated_at = now(),
      notes = COALESCE(notes, '') || ' Plan changed at ' || now()::text || COALESCE(' Reason: ' || p_reason, '')
  WHERE id = v_subscription_id;

  INSERT INTO public.saas_subscription_change_log (
    subscription_id,
    company_id,
    product_id,
    previous_plan_id,
    new_plan_id,
    currency_code,
    estimated_credit_minor,
    estimated_charge_minor,
    effective_at,
    reason,
    actor_user_id
  ) VALUES (
    v_subscription_id,
    p_company_id,
    v_product_id,
    v_old_plan_id,
    v_new_plan_id,
    p_currency_code,
    v_credit,
    v_charge,
    CASE WHEN p_effective_now THEN now() ELSE date_trunc('month', now()) + interval '1 month' END,
    p_reason,
    v_actor
  );

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    correlation_id
  ) VALUES (
    v_subscription_id,
    p_company_id,
    v_product_id,
    v_actor,
    'billing.subscription.plan_changed',
    jsonb_build_object(
      'old_plan_id', v_old_plan_id,
      'new_plan_id', v_new_plan_id,
      'currency_code', p_currency_code,
      'estimated_credit_minor', v_credit,
      'estimated_charge_minor', v_charge,
      'effective_now', p_effective_now,
      'reason', p_reason,
      'metadata', p_metadata
    ),
    p_correlation_id
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
    'saas_billing',
    'billing.subscription.plan_changed',
    'info',
    v_actor,
    'company',
    p_company_id::text,
    jsonb_build_object(
      'product_code', p_product_code,
      'new_plan_code', p_new_plan_code,
      'currency_code', p_currency_code,
      'estimated_credit_minor', v_credit,
      'estimated_charge_minor', v_charge,
      'effective_now', p_effective_now,
      'reason', p_reason,
      'subscription_id', v_subscription_id
    ),
    p_correlation_id
  );

  RETURN jsonb_build_object(
    'changed', true,
    'subscription_id', v_subscription_id,
    'estimated_credit_minor', v_credit,
    'estimated_charge_minor', v_charge,
    'currency_code', p_currency_code,
    'effective_now', p_effective_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_change_subscription_plan(uuid, text, text, text, boolean, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_mark_subscription_grace(
  p_company_id uuid,
  p_product_code text,
  p_grace_days integer DEFAULT 7,
  p_reason text DEFAULT 'payment_overdue',
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_product_id uuid;
  v_subscription_id uuid;
  v_grace_end timestamptz;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_administer_billing(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN';
    END IF;
  END IF;

  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT id INTO v_subscription_id
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'NO_ELIGIBLE_SUBSCRIPTION_FOR_GRACE';
  END IF;

  v_grace_end := now() + make_interval(days => GREATEST(p_grace_days, 1));

  UPDATE public.saas_company_plan_subscriptions
  SET status = 'grace_period',
      grace_end_at = v_grace_end,
      updated_at = now(),
      notes = COALESCE(notes, '') || ' Entered grace period at ' || now()::text || ' reason=' || p_reason
  WHERE id = v_subscription_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    correlation_id
  ) VALUES (
    v_subscription_id,
    p_company_id,
    v_product_id,
    v_actor,
    'billing.subscription.grace_started',
    jsonb_build_object(
      'grace_end_at', v_grace_end,
      'reason', p_reason,
      'grace_days', p_grace_days
    ),
    p_correlation_id
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
    'saas_billing',
    'billing.subscription.grace_started',
    'warning',
    v_actor,
    'company',
    p_company_id::text,
    jsonb_build_object(
      'product_code', p_product_code,
      'grace_end_at', v_grace_end,
      'reason', p_reason,
      'subscription_id', v_subscription_id
    ),
    p_correlation_id
  );

  RETURN v_subscription_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_mark_subscription_grace(uuid, text, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_cancel_subscription(
  p_company_id uuid,
  p_product_code text,
  p_at_period_end boolean DEFAULT true,
  p_reason text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_product_id uuid;
  v_subscription_id uuid;
  v_end_at timestamptz;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_administer_billing(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN';
    END IF;
  END IF;

  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT id INTO v_subscription_id
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND status IN ('active', 'trialing', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION_TO_CANCEL';
  END IF;

  v_end_at := CASE
    WHEN p_at_period_end THEN date_trunc('month', now()) + interval '1 month'
    ELSE now()
  END;

  UPDATE public.saas_company_plan_subscriptions
  SET status = 'canceled',
      end_at = v_end_at,
      updated_at = now(),
      notes = COALESCE(notes, '') || ' Canceled at ' || now()::text || COALESCE(' Reason: ' || p_reason, '')
  WHERE id = v_subscription_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    correlation_id
  ) VALUES (
    v_subscription_id,
    p_company_id,
    v_product_id,
    v_actor,
    'billing.subscription.canceled',
    jsonb_build_object(
      'at_period_end', p_at_period_end,
      'end_at', v_end_at,
      'reason', p_reason
    ),
    p_correlation_id
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
    'saas_billing',
    'billing.subscription.canceled',
    'warning',
    v_actor,
    'company',
    p_company_id::text,
    jsonb_build_object(
      'product_code', p_product_code,
      'at_period_end', p_at_period_end,
      'end_at', v_end_at,
      'reason', p_reason,
      'subscription_id', v_subscription_id
    ),
    p_correlation_id
  );

  RETURN v_subscription_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_cancel_subscription(uuid, text, boolean, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_reactivate_subscription(
  p_company_id uuid,
  p_product_code text,
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_product_id uuid;
  v_subscription_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_administer_billing(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN';
    END IF;
  END IF;

  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT id INTO v_subscription_id
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND status IN ('canceled', 'paused', 'expired', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'NO_SUBSCRIPTION_AVAILABLE_TO_REACTIVATE';
  END IF;

  UPDATE public.saas_company_plan_subscriptions
  SET status = 'active',
      grace_end_at = NULL,
      end_at = NULL,
      updated_at = now(),
      notes = COALESCE(notes, '') || ' Reactivated at ' || now()::text
  WHERE id = v_subscription_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    correlation_id
  ) VALUES (
    v_subscription_id,
    p_company_id,
    v_product_id,
    v_actor,
    'billing.subscription.reactivated',
    jsonb_build_object(
      'previous_statuses', jsonb_build_array('canceled', 'paused', 'expired', 'grace_period')
    ),
    p_correlation_id
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
    'saas_billing',
    'billing.subscription.reactivated',
    'info',
    v_actor,
    'company',
    p_company_id::text,
    jsonb_build_object(
      'product_code', p_product_code,
      'subscription_id', v_subscription_id
    ),
    p_correlation_id
  );

  RETURN v_subscription_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_reactivate_subscription(uuid, text, text) TO authenticated;
