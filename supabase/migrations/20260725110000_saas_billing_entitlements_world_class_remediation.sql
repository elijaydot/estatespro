-- World-class SaaS billing + entitlement hardening.
-- Section 1: payment-before-entitlement, renewals/dunning, invoice ledger.
-- Section 2: metering decrements/reconciliation, PM seat + AI quota enforcement hooks.

DO $$
BEGIN
  IF to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_products') IS NULL
     OR to_regclass('public.saas_plans') IS NULL
     OR to_regclass('public.saas_usage_counters') IS NULL
     OR to_regclass('public.saas_usage_events') IS NULL
     OR to_regclass('public.audit_events') IS NULL THEN
    RAISE EXCEPTION 'SAAS_REMEDIATION_PREREQUISITES_MISSING: Run foundational SaaS migrations first.';
  END IF;
END;
$$;

ALTER TABLE public.saas_company_plan_subscriptions
  ADD COLUMN IF NOT EXISTS renewal_interval text NOT NULL DEFAULT 'monthly' CHECK (renewal_interval IN ('monthly')),
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS next_renewal_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'current' CHECK (payment_state IN ('current', 'pending', 'past_due', 'grace', 'canceled')),
  ADD COLUMN IF NOT EXISTS dunning_attempt_count integer NOT NULL DEFAULT 0 CHECK (dunning_attempt_count >= 0),
  ADD COLUMN IF NOT EXISTS last_dunning_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_paid_at timestamptz;

UPDATE public.saas_company_plan_subscriptions
SET current_period_start = coalesce(current_period_start, date_trunc('month', coalesce(start_at, created_at))),
    current_period_end = coalesce(current_period_end, date_trunc('month', coalesce(start_at, created_at)) + interval '1 month'),
    next_renewal_at = coalesce(next_renewal_at, date_trunc('month', coalesce(start_at, created_at)) + interval '1 month')
WHERE current_period_start IS NULL
   OR current_period_end IS NULL
   OR next_renewal_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_saas_company_plan_subscriptions_next_renewal
  ON public.saas_company_plan_subscriptions(next_renewal_at)
  WHERE status IN ('active', 'trialing', 'grace_period');

CREATE TABLE IF NOT EXISTS public.saas_subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.saas_company_plan_subscriptions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
  invoice_kind text NOT NULL CHECK (invoice_kind IN ('plan_change_proration', 'renewal', 'addon_renewal', 'manual_adjustment')),
  invoice_status text NOT NULL DEFAULT 'open' CHECK (invoice_status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  period_start timestamptz,
  period_end timestamptz,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency_code text NOT NULL DEFAULT 'USD' CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  due_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  external_reference text,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_subscription_invoice_external_reference
  ON public.saas_subscription_invoices(external_reference)
  WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saas_subscription_invoices_scope
  ON public.saas_subscription_invoices(company_id, subscription_id, invoice_status, due_at);

CREATE TABLE IF NOT EXISTS public.saas_subscription_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.saas_subscription_invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.saas_company_plan_subscriptions(id) ON DELETE CASCADE,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  gateway text NOT NULL CHECK (gateway IN ('paystack', 'flutterwave')),
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'mtn_momo', 'link')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency_code text NOT NULL CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  idempotency_key text NOT NULL,
  gateway_reference text NOT NULL,
  gateway_transaction_id text,
  correlation_id text,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key),
  UNIQUE (gateway, gateway_reference)
);

CREATE INDEX IF NOT EXISTS idx_saas_subscription_payment_attempts_scope
  ON public.saas_subscription_payment_attempts(company_id, payment_status, created_at DESC);

ALTER TABLE public.saas_subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscription_payment_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_invoices'
      AND policyname = 'Super admins can manage saas subscription invoices'
  ) THEN
    CREATE POLICY "Super admins can manage saas subscription invoices"
    ON public.saas_subscription_invoices
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_invoices'
      AND policyname = 'Company managers can view own saas subscription invoices'
  ) THEN
    CREATE POLICY "Company managers can view own saas subscription invoices"
    ON public.saas_subscription_invoices
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_payment_attempts'
      AND policyname = 'Super admins can manage saas payment attempts'
  ) THEN
    CREATE POLICY "Super admins can manage saas payment attempts"
    ON public.saas_subscription_payment_attempts
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_subscription_payment_attempts'
      AND policyname = 'Company managers can view own saas payment attempts'
  ) THEN
    CREATE POLICY "Company managers can view own saas payment attempts"
    ON public.saas_subscription_payment_attempts
    FOR SELECT TO authenticated
    USING (public.saas_user_can_access_company(auth.uid(), company_id));
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_saas_subscription_invoices_updated_at ON public.saas_subscription_invoices;
CREATE TRIGGER update_saas_subscription_invoices_updated_at
BEFORE UPDATE ON public.saas_subscription_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_subscription_payment_attempts_updated_at ON public.saas_subscription_payment_attempts;
CREATE TRIGGER update_saas_subscription_payment_attempts_updated_at
BEFORE UPDATE ON public.saas_subscription_payment_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.saas_adjust_usage_counter(
  p_company_id uuid,
  p_quota_code text,
  p_delta integer,
  p_product_code text DEFAULT 'core_property',
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
  v_quota_dimension_id uuid;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_counter public.saas_usage_counters%ROWTYPE;
  v_new_used integer;
BEGIN
  IF p_delta = 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'zero_delta');
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_access_company(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_ACCESS';
    END IF;
  END IF;

  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT id INTO v_quota_dimension_id
  FROM public.saas_quota_dimensions
  WHERE code = p_quota_code
  LIMIT 1;

  IF v_quota_dimension_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_QUOTA_CODE';
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
    v_quota_dimension_id,
    v_period_start,
    v_period_end,
    0
  )
  ON CONFLICT (company_id, product_id, quota_dimension_id, period_start, period_end)
  DO NOTHING;

  SELECT *
  INTO v_counter
  FROM public.saas_usage_counters
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND quota_dimension_id = v_quota_dimension_id
    AND period_start = v_period_start
    AND period_end = v_period_end
  FOR UPDATE;

  v_new_used := greatest(coalesce(v_counter.used_value, 0) + p_delta, 0);

  UPDATE public.saas_usage_counters
  SET used_value = v_new_used,
      updated_at = now()
  WHERE id = v_counter.id;

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
    v_quota_dimension_id,
    v_actor,
    GREATEST(abs(p_delta), 1),
    v_new_used,
    true,
    coalesce(p_reason, CASE WHEN p_delta > 0 THEN 'usage_increment' ELSE 'usage_decrement' END),
    p_correlation_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('signed_delta', p_delta)
  );

  RETURN jsonb_build_object(
    'applied', true,
    'quota_code', p_quota_code,
    'signed_delta', p_delta,
    'used_value', v_new_used
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_prepare_plan_change_charge(
  p_company_id uuid,
  p_product_code text,
  p_new_plan_code text,
  p_currency_code text DEFAULT 'USD',
  p_gateway text DEFAULT 'paystack',
  p_payment_method text DEFAULT 'link',
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
  v_subscription public.saas_company_plan_subscriptions%ROWTYPE;
  v_new_plan_id uuid;
  v_old_price integer;
  v_new_price integer;
  v_total_seconds numeric;
  v_remaining_seconds numeric;
  v_ratio numeric;
  v_credit integer;
  v_charge integer;
  v_invoice_id uuid;
  v_attempt_id uuid;
  v_reference text;
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

  SELECT * INTO v_subscription
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND status IN ('active', 'trialing', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription.id IS NULL THEN
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

  IF v_new_plan_id = v_subscription.plan_id THEN
    RETURN jsonb_build_object('requires_payment', false, 'changed', false, 'reason', 'same_plan');
  END IF;

  v_old_price := public.saas_get_plan_price_minor(v_subscription.plan_id, p_currency_code);
  v_new_price := public.saas_get_plan_price_minor(v_new_plan_id, p_currency_code);

  v_total_seconds := EXTRACT(EPOCH FROM ((date_trunc('month', now()) + interval '1 month') - date_trunc('month', now())));
  v_remaining_seconds := GREATEST(EXTRACT(EPOCH FROM ((date_trunc('month', now()) + interval '1 month') - now())), 0);
  v_ratio := CASE WHEN v_total_seconds > 0 THEN v_remaining_seconds / v_total_seconds ELSE 0 END;

  v_credit := floor(v_old_price * v_ratio)::integer;
  v_charge := GREATEST(floor(v_new_price * v_ratio)::integer - v_credit, 0);

  IF v_charge <= 0 THEN
    RETURN jsonb_build_object(
      'requires_payment', false,
      'changed', true,
      'estimated_credit_minor', v_credit,
      'estimated_charge_minor', v_charge,
      'currency_code', p_currency_code,
      'subscription_id', v_subscription.id
    );
  END IF;

  v_reference := concat('SAAS-', upper(replace(gen_random_uuid()::text, '-', '')));

  INSERT INTO public.saas_subscription_invoices (
    company_id,
    subscription_id,
    product_id,
    invoice_kind,
    invoice_status,
    period_start,
    period_end,
    amount_minor,
    currency_code,
    due_at,
    external_reference,
    correlation_id,
    metadata
  ) VALUES (
    p_company_id,
    v_subscription.id,
    v_product_id,
    'plan_change_proration',
    'open',
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    v_charge,
    p_currency_code,
    now() + interval '15 minutes',
    v_reference,
    p_correlation_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'target_plan_code', p_new_plan_code,
      'target_plan_id', v_new_plan_id,
      'previous_plan_id', v_subscription.plan_id,
      'estimated_credit_minor', v_credit,
      'estimated_charge_minor', v_charge
    )
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.saas_subscription_payment_attempts (
    invoice_id,
    company_id,
    subscription_id,
    payment_status,
    gateway,
    payment_method,
    attempt_count,
    amount_minor,
    currency_code,
    idempotency_key,
    gateway_reference,
    correlation_id,
    metadata
  ) VALUES (
    v_invoice_id,
    p_company_id,
    v_subscription.id,
    'pending',
    p_gateway,
    p_payment_method,
    0,
    v_charge,
    p_currency_code,
    concat('saas-plan-change:', p_company_id::text, ':', p_product_code, ':', p_new_plan_code, ':', coalesce(p_correlation_id, v_reference)),
    v_reference,
    p_correlation_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('target_plan_code', p_new_plan_code)
  ) RETURNING id INTO v_attempt_id;

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
    'billing.subscription.payment_required',
    'info',
    v_actor,
    'saas_subscription_payment_attempt',
    v_attempt_id::text,
    jsonb_build_object(
      'company_id', p_company_id,
      'product_code', p_product_code,
      'new_plan_code', p_new_plan_code,
      'amount_minor', v_charge,
      'currency_code', p_currency_code,
      'invoice_id', v_invoice_id,
      'subscription_id', v_subscription.id
    ),
    p_correlation_id
  );

  RETURN jsonb_build_object(
    'requires_payment', true,
    'invoice_id', v_invoice_id,
    'attempt_id', v_attempt_id,
    'subscription_id', v_subscription.id,
    'estimated_credit_minor', v_credit,
    'estimated_charge_minor', v_charge,
    'currency_code', p_currency_code,
    'gateway_reference', v_reference,
    'gateway', p_gateway,
    'payment_method', p_payment_method
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_finalize_plan_change_after_payment(
  p_attempt_id uuid,
  p_gateway_transaction_id text DEFAULT NULL,
  p_gateway_reference text DEFAULT NULL,
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
  v_attempt public.saas_subscription_payment_attempts%ROWTYPE;
  v_invoice public.saas_subscription_invoices%ROWTYPE;
  v_target_plan_code text;
  v_change_result jsonb;
BEGIN
  SELECT * INTO v_attempt
  FROM public.saas_subscription_payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.saas_user_can_administer_billing(v_actor, v_attempt.company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN';
    END IF;
  END IF;

  IF v_attempt.payment_status = 'succeeded' THEN
    RETURN jsonb_build_object(
      'applied', true,
      'idempotent', true,
      'attempt_id', v_attempt.id,
      'invoice_id', v_attempt.invoice_id
    );
  END IF;

  SELECT * INTO v_invoice
  FROM public.saas_subscription_invoices
  WHERE id = v_attempt.invoice_id
  FOR UPDATE;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INVOICE_NOT_FOUND';
  END IF;

  v_target_plan_code := coalesce(v_invoice.metadata->>'target_plan_code', v_attempt.metadata->>'target_plan_code');

  IF v_target_plan_code IS NULL OR v_target_plan_code = '' THEN
    RAISE EXCEPTION 'TARGET_PLAN_CODE_MISSING';
  END IF;

  UPDATE public.saas_subscription_payment_attempts
  SET payment_status = 'succeeded',
      attempt_count = attempt_count + 1,
      gateway_transaction_id = coalesce(p_gateway_transaction_id, gateway_transaction_id),
      gateway_reference = coalesce(nullif(p_gateway_reference, ''), gateway_reference),
      failure_reason = NULL,
      correlation_id = coalesce(p_correlation_id, correlation_id),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('verified_at', now())
  WHERE id = v_attempt.id;

  UPDATE public.saas_subscription_invoices
  SET invoice_status = 'paid',
      paid_at = now(),
      correlation_id = coalesce(p_correlation_id, correlation_id),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('paid_attempt_id', v_attempt.id)
  WHERE id = v_invoice.id;

  SELECT public.saas_change_subscription_plan(
    v_attempt.company_id,
    (SELECT code FROM public.saas_products WHERE id = v_invoice.product_id LIMIT 1),
    v_target_plan_code,
    v_attempt.currency_code,
    true,
    'payment_verified_plan_change',
    coalesce(p_correlation_id, v_attempt.correlation_id),
    jsonb_build_object('payment_attempt_id', v_attempt.id, 'invoice_id', v_invoice.id)
  ) INTO v_change_result;

  UPDATE public.saas_company_plan_subscriptions
  SET payment_state = 'current',
      dunning_attempt_count = 0,
      last_paid_at = now(),
      last_dunning_attempt_at = NULL,
      updated_at = now()
  WHERE id = v_attempt.subscription_id;

  RETURN jsonb_build_object(
    'applied', true,
    'idempotent', false,
    'attempt_id', v_attempt.id,
    'invoice_id', v_invoice.id,
    'change_result', v_change_result
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_mark_plan_change_payment_failed(
  p_attempt_id uuid,
  p_failure_reason text DEFAULT 'gateway_verification_failed',
  p_correlation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.saas_subscription_payment_attempts%ROWTYPE;
  v_product_code text;
BEGIN
  SELECT * INTO v_attempt
  FROM public.saas_subscription_payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  UPDATE public.saas_subscription_payment_attempts
  SET payment_status = 'failed',
      attempt_count = attempt_count + 1,
      failure_reason = left(coalesce(p_failure_reason, 'unknown_failure'), 500),
      correlation_id = coalesce(p_correlation_id, correlation_id),
      updated_at = now()
  WHERE id = v_attempt.id;

  UPDATE public.saas_subscription_invoices
  SET invoice_status = CASE WHEN invoice_status = 'paid' THEN 'paid' ELSE 'open' END,
      updated_at = now()
  WHERE id = v_attempt.invoice_id;

  SELECT sp.code INTO v_product_code
  FROM public.saas_products sp
  JOIN public.saas_subscription_invoices si ON si.product_id = sp.id
  WHERE si.id = v_attempt.invoice_id
  LIMIT 1;

  IF v_product_code IS NOT NULL THEN
    PERFORM public.saas_mark_subscription_grace(
      v_attempt.company_id,
      v_product_code,
      7,
      left(coalesce(p_failure_reason, 'payment_failed'), 120),
      p_correlation_id
    );
  END IF;

  RETURN jsonb_build_object(
    'marked_failed', true,
    'attempt_id', v_attempt.id,
    'invoice_id', v_attempt.invoice_id,
    'failure_reason', left(coalesce(p_failure_reason, 'unknown_failure'), 500)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_queue_subscription_renewal_invoices(
  p_limit integer DEFAULT 50,
  p_correlation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription record;
  v_processed integer := 0;
  v_created integer := 0;
  v_amount integer;
  v_reference text;
  v_limit integer := greatest(coalesce(p_limit, 50), 1);
BEGIN
  FOR v_subscription IN
    SELECT s.id, s.company_id, s.product_id, s.plan_id, s.next_renewal_at
    FROM public.saas_company_plan_subscriptions s
    WHERE s.auto_renew = true
      AND s.status IN ('active', 'trialing', 'grace_period')
      AND coalesce(s.next_renewal_at, now()) <= now()
    ORDER BY s.next_renewal_at ASC NULLS FIRST
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;

    IF EXISTS (
      SELECT 1
      FROM public.saas_subscription_invoices i
      WHERE i.subscription_id = v_subscription.id
        AND i.invoice_kind = 'renewal'
        AND i.invoice_status IN ('draft', 'open')
        AND i.period_start = date_trunc('month', now())
    ) THEN
      CONTINUE;
    END IF;

    v_amount := public.saas_get_plan_price_minor(v_subscription.plan_id, 'USD');
    v_reference := concat('SAAS-REN-', upper(replace(gen_random_uuid()::text, '-', '')));

    INSERT INTO public.saas_subscription_invoices (
      company_id,
      subscription_id,
      product_id,
      invoice_kind,
      invoice_status,
      period_start,
      period_end,
      amount_minor,
      currency_code,
      due_at,
      external_reference,
      correlation_id,
      metadata
    ) VALUES (
      v_subscription.company_id,
      v_subscription.id,
      v_subscription.product_id,
      'renewal',
      'open',
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month',
      v_amount,
      'USD',
      now(),
      v_reference,
      p_correlation_id,
      jsonb_build_object('source', 'renewal_scheduler')
    );

    UPDATE public.saas_company_plan_subscriptions
    SET current_period_start = date_trunc('month', now()),
        current_period_end = date_trunc('month', now()) + interval '1 month',
        next_renewal_at = date_trunc('month', now()) + interval '1 month',
        payment_state = CASE WHEN payment_state = 'canceled' THEN payment_state ELSE 'pending' END,
        updated_at = now()
    WHERE id = v_subscription.id;

    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'created', v_created, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_process_subscription_renewals(
  p_limit integer DEFAULT 50,
  p_correlation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice record;
  v_processed integer := 0;
  v_dunning integer := 0;
  v_marked_uncollectible integer := 0;
  v_expired integer := 0;
  v_limit integer := greatest(coalesce(p_limit, 50), 1);
BEGIN
  PERFORM public.saas_queue_subscription_renewal_invoices(v_limit, p_correlation_id);

  FOR v_invoice IN
    SELECT i.id, i.company_id, i.subscription_id, i.product_id, i.amount_minor, i.currency_code
    FROM public.saas_subscription_invoices i
    WHERE i.invoice_kind = 'renewal'
      AND i.invoice_status = 'open'
      AND i.due_at <= now()
    ORDER BY i.due_at ASC, i.created_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;

    UPDATE public.saas_company_plan_subscriptions
    SET dunning_attempt_count = dunning_attempt_count + 1,
        last_dunning_attempt_at = now(),
        payment_state = 'past_due',
        updated_at = now()
    WHERE id = v_invoice.subscription_id;

    v_dunning := v_dunning + 1;

    IF (
      SELECT dunning_attempt_count
      FROM public.saas_company_plan_subscriptions
      WHERE id = v_invoice.subscription_id
    ) >= 3 THEN
      UPDATE public.saas_company_plan_subscriptions
      SET payment_state = 'grace',
          status = CASE WHEN status = 'active' THEN 'grace_period' ELSE status END,
          grace_end_at = coalesce(grace_end_at, now() + interval '7 days'),
          updated_at = now()
      WHERE id = v_invoice.subscription_id;

      UPDATE public.saas_subscription_invoices
      SET invoice_status = 'uncollectible',
          updated_at = now(),
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'dunning_marked_uncollectible_at', now(),
            'dunning_attempt_count', (
              SELECT dunning_attempt_count
              FROM public.saas_company_plan_subscriptions
              WHERE id = v_invoice.subscription_id
            )
          )
      WHERE id = v_invoice.id;

      v_marked_uncollectible := v_marked_uncollectible + 1;
    END IF;
  END LOOP;

  WITH expired_rows AS (
    UPDATE public.saas_company_plan_subscriptions
    SET status = 'expired',
        payment_state = 'canceled',
        auto_renew = false,
        end_at = now(),
        updated_at = now(),
        notes = coalesce(notes, '') || ' Auto-expired after grace period ended at ' || now()::text
    WHERE payment_state = 'grace'
      AND grace_end_at IS NOT NULL
      AND grace_end_at <= now()
      AND status IN ('active', 'trialing', 'grace_period')
    RETURNING id
  )
  SELECT count(*)::integer INTO v_expired FROM expired_rows;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'dunning_started', v_dunning,
    'marked_uncollectible', v_marked_uncollectible,
    'expired_after_grace', v_expired,
    'limit', v_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_reconcile_usage_counters(
  p_company_id uuid,
  p_product_code text DEFAULT 'core_property',
  p_correlation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_properties integer := 0;
  v_units integer := 0;
  v_tenants integer := 0;
  v_pm integer := 0;
BEGIN
  SELECT id INTO v_product_id
  FROM public.saas_products
  WHERE code = p_product_code
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE';
  END IF;

  SELECT count(*)::integer INTO v_properties
  FROM public.properties
  WHERE company_id = p_company_id;

  SELECT count(*)::integer INTO v_units
  FROM public.units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE p.company_id = p_company_id;

  SELECT count(*)::integer INTO v_tenants
  FROM public.tenants t
  JOIN public.properties p ON p.id = t.property_id
  WHERE p.company_id = p_company_id
    AND t.status = 'active';

  SELECT count(*)::integer INTO v_pm
  FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.status = 'approved'
    AND cm.role = 'property_manager';

  PERFORM public.saas_adjust_usage_counter(p_company_id, 'properties_managed', 0 - 999999, p_product_code, 'reconcile.reset', p_correlation_id, jsonb_build_object('scope', 'reconcile'));
  PERFORM public.saas_adjust_usage_counter(p_company_id, 'units_managed', 0 - 999999, p_product_code, 'reconcile.reset', p_correlation_id, jsonb_build_object('scope', 'reconcile'));
  PERFORM public.saas_adjust_usage_counter(p_company_id, 'active_tenants', 0 - 999999, p_product_code, 'reconcile.reset', p_correlation_id, jsonb_build_object('scope', 'reconcile'));
  PERFORM public.saas_adjust_usage_counter(p_company_id, 'property_manager_seats', 0 - 999999, p_product_code, 'reconcile.reset', p_correlation_id, jsonb_build_object('scope', 'reconcile'));

  PERFORM public.saas_adjust_usage_counter(p_company_id, 'properties_managed', v_properties, p_product_code, 'reconcile.rebuild', p_correlation_id, jsonb_build_object('scope', 'reconcile'));
  PERFORM public.saas_adjust_usage_counter(p_company_id, 'units_managed', v_units, p_product_code, 'reconcile.rebuild', p_correlation_id, jsonb_build_object('scope', 'reconcile'));
  PERFORM public.saas_adjust_usage_counter(p_company_id, 'active_tenants', v_tenants, p_product_code, 'reconcile.rebuild', p_correlation_id, jsonb_build_object('scope', 'reconcile'));
  PERFORM public.saas_adjust_usage_counter(p_company_id, 'property_manager_seats', v_pm, p_product_code, 'reconcile.rebuild', p_correlation_id, jsonb_build_object('scope', 'reconcile'));

  RETURN jsonb_build_object(
    'reconciled', true,
    'company_id', p_company_id,
    'product_code', p_product_code,
    'properties_managed', v_properties,
    'units_managed', v_units,
    'active_tenants', v_tenants,
    'property_manager_seats', v_pm
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_pm_seat_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.role = 'property_manager' THEN
    PERFORM public.saas_check_quota(NEW.company_id, 'property_manager_seats', 1, 'core_property');
    PERFORM public.saas_adjust_usage_counter(
      NEW.company_id,
      'property_manager_seats',
      1,
      'core_property',
      'company_member.property_manager.approved',
      concat('pm-seat-insert:', NEW.id::text),
      jsonb_build_object('company_member_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_pm_seat_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'property_manager' AND OLD.status = 'approved'
     AND (NEW.status <> 'approved' OR NEW.role <> 'property_manager') THEN
    PERFORM public.saas_adjust_usage_counter(
      OLD.company_id,
      'property_manager_seats',
      -1,
      'core_property',
      'company_member.property_manager.deactivated',
      concat('pm-seat-update-out:', OLD.id::text),
      jsonb_build_object('company_member_id', OLD.id)
    );
  END IF;

  IF NEW.role = 'property_manager' AND NEW.status = 'approved'
     AND (OLD.status <> 'approved' OR OLD.role <> 'property_manager') THEN
    PERFORM public.saas_check_quota(NEW.company_id, 'property_manager_seats', 1, 'core_property');
    PERFORM public.saas_adjust_usage_counter(
      NEW.company_id,
      'property_manager_seats',
      1,
      'core_property',
      'company_member.property_manager.activated',
      concat('pm-seat-update-in:', NEW.id::text),
      jsonb_build_object('company_member_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_pm_seat_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'property_manager' AND OLD.status = 'approved' THEN
    PERFORM public.saas_adjust_usage_counter(
      OLD.company_id,
      'property_manager_seats',
      -1,
      'core_property',
      'company_member.property_manager.deleted',
      concat('pm-seat-delete:', OLD.id::text),
      jsonb_build_object('company_member_id', OLD.id)
    );
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_tenant_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM public.properties p
  WHERE p.id = coalesce(NEW.property_id, OLD.property_id)
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'active' AND NEW.status <> 'active' THEN
    PERFORM public.saas_adjust_usage_counter(
      v_company_id,
      'active_tenants',
      -1,
      'core_property',
      'tenant.status.deactivated',
      concat('tenant-status-down:', NEW.id::text),
      jsonb_build_object('tenant_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  ELSIF OLD.status <> 'active' AND NEW.status = 'active' THEN
    PERFORM public.saas_check_quota(v_company_id, 'active_tenants', 1, 'core_property');
    PERFORM public.saas_adjust_usage_counter(
      v_company_id,
      'active_tenants',
      1,
      'core_property',
      'tenant.status.activated',
      concat('tenant-status-up:', NEW.id::text),
      jsonb_build_object('tenant_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saas_meter_pm_seat_insert ON public.company_members;
CREATE TRIGGER trg_saas_meter_pm_seat_insert
BEFORE INSERT ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_pm_seat_insert();

DROP TRIGGER IF EXISTS trg_saas_meter_pm_seat_update ON public.company_members;
CREATE TRIGGER trg_saas_meter_pm_seat_update
BEFORE UPDATE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_pm_seat_update();

DROP TRIGGER IF EXISTS trg_saas_meter_pm_seat_delete ON public.company_members;
CREATE TRIGGER trg_saas_meter_pm_seat_delete
BEFORE DELETE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_pm_seat_delete();

DROP TRIGGER IF EXISTS trg_saas_meter_tenant_status_update ON public.tenants;
CREATE TRIGGER trg_saas_meter_tenant_status_update
BEFORE UPDATE OF status ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_tenant_status_update();

CREATE OR REPLACE FUNCTION public.saas_schedule_subscription_renewal_worker()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension not found; skipping saas renewal worker schedule setup.';
    RETURN false;
  END IF;

  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'saas_subscription_renewal_worker_hourly'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'saas_subscription_renewal_worker_hourly',
    '0 * * * *',
    'SELECT public.saas_process_subscription_renewals(100, ''cron:saas_subscription_renewal_worker_hourly'');'
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unable to schedule saas subscription renewal worker: %', SQLERRM;
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_adjust_usage_counter(uuid, text, integer, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_prepare_plan_change_charge(uuid, text, text, text, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_finalize_plan_change_after_payment(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_mark_plan_change_payment_failed(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_queue_subscription_renewal_invoices(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_process_subscription_renewals(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_reconcile_usage_counters(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_schedule_subscription_renewal_worker() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.saas_adjust_usage_counter(uuid, text, integer, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_prepare_plan_change_charge(uuid, text, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_finalize_plan_change_after_payment(uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_mark_plan_change_payment_failed(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_queue_subscription_renewal_invoices(integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.saas_process_subscription_renewals(integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.saas_reconcile_usage_counters(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_schedule_subscription_renewal_worker() TO service_role;

DO $$
BEGIN
  PERFORM public.saas_schedule_subscription_renewal_worker();
END;
$$;
