-- Unified 90-Day Trial Entitlements, Plan Finalization & Catalog Grants
-- Fixes trial feature unlocking across modules and dynamic subscription activation.

-- 1. Update saas_has_entitlement to automatically grant full access during active company trials
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
  v_sub_status text;
  v_trial_end_at timestamptz;
  v_company_created_at timestamptz;
BEGIN
  -- Check active subscription status & trial window
  SELECT status, trial_end_at
  INTO v_sub_status, v_trial_end_at
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If company is in an active trial, unlock all platform capabilities
  IF v_sub_status = 'trialing' AND (v_trial_end_at IS NULL OR v_trial_end_at > now()) THEN
    RETURN true;
  END IF;

  -- If no subscription row exists yet, check if company is within the 90-day onboarding window
  IF v_sub_status IS NULL THEN
    SELECT created_at INTO v_company_created_at
    FROM public.companies
    WHERE id = p_company_id;

    IF v_company_created_at IS NOT NULL AND v_company_created_at + interval '90 days' > now() THEN
      RETURN true;
    END IF;
  END IF;

  -- Standard plan entitlement resolution
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

-- 2. Update saas_finalize_subscription_payment_attempt to accept target_plan_code or plan_code
CREATE OR REPLACE FUNCTION public.saas_finalize_subscription_payment_attempt(
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
  v_product_code text;
  v_target_plan_code text;
  v_change_result jsonb := '{}'::jsonb;
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

  SELECT code INTO v_product_code
  FROM public.saas_products
  WHERE id = v_invoice.product_id
  LIMIT 1;

  IF v_product_code IS NULL THEN
    v_product_code := 'core_property';
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

  -- Flexible resolution of target plan code
  v_target_plan_code := coalesce(
    v_invoice.metadata->>'target_plan_code',
    v_attempt.metadata->>'target_plan_code',
    v_invoice.metadata->>'plan_code',
    v_attempt.metadata->>'plan_code',
    p_metadata->>'target_plan_code',
    p_metadata->>'plan_code'
  );

  IF v_target_plan_code IS NOT NULL AND v_target_plan_code <> '' THEN
    SELECT public.saas_change_subscription_plan(
      v_attempt.company_id,
      v_product_code,
      v_target_plan_code,
      v_attempt.currency_code,
      true,
      'payment_verified_plan_change',
      coalesce(p_correlation_id, v_attempt.correlation_id),
      jsonb_build_object('payment_attempt_id', v_attempt.id, 'invoice_id', v_invoice.id)
    ) INTO v_change_result;
  ELSE
    UPDATE public.saas_company_plan_subscriptions
    SET payment_state = 'current',
        dunning_attempt_count = 0,
        last_paid_at = now(),
        last_dunning_attempt_at = NULL,
        grace_end_at = NULL,
        status = CASE WHEN status = 'grace_period' THEN 'active' ELSE status END,
        updated_at = now()
    WHERE id = v_attempt.subscription_id;
  END IF;

  RETURN jsonb_build_object(
    'applied', true,
    'attempt_id', v_attempt.id,
    'invoice_id', v_invoice.id,
    'target_plan_code', v_target_plan_code,
    'change_result', v_change_result
  );
END;
$$;

-- 3. Seed baseline entitlements for unified plans so paid tiers retain their features
WITH all_plans AS (
  SELECT id, code
  FROM public.saas_plans
  WHERE code IN ('fishgate_starter', 'fishgate_growth', 'fishgate_professional', 'fishgate_enterprise')
),
all_keys AS (
  SELECT id, key
  FROM public.saas_entitlement_keys
  WHERE key IN (
    'marketplace.listings.manage',
    'marketplace.verification.manage',
    'marketplace.moderation.view',
    'crm.leads.manage',
    'crm.deals.manage',
    'crm.calls_meetings.manage',
    'crm.automation.manage',
    'portal.owner.enabled',
    'portal.tenant.enabled',
    'notifications.whatsapp.enabled',
    'ai.assistant.enabled'
  )
)
INSERT INTO public.saas_plan_entitlements (plan_id, entitlement_key_id, bool_value)
SELECT p.id, k.id, true
FROM all_plans p
CROSS JOIN all_keys k
ON CONFLICT (plan_id, entitlement_key_id) DO UPDATE
SET bool_value = true;
