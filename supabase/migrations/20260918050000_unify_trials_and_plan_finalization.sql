-- Unified 90-Day Trial Entitlements, Plan Finalization & Catalog Grants
-- Fixes trial feature unlocking across modules, dynamic subscription activation,
-- default Starter tier trial auto-provisioning, and trial expiry locking.

-- 1. Update saas_has_entitlement:
--    - Grants full access during active 90-day trial (trial_end_at > now())
--    - Locks all trial features when trial is over with no active paid plan
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

  -- If trial has expired and status is not active, lock all trial-dependent features
  IF (v_sub_status = 'trialing' AND v_trial_end_at <= now()) OR v_sub_status = 'expired' THEN
    RETURN false;
  END IF;

  -- If no subscription row exists yet, check if company is within the 90-day onboarding window
  IF v_sub_status IS NULL THEN
    SELECT created_at INTO v_company_created_at
    FROM public.companies
    WHERE id = p_company_id;

    IF v_company_created_at IS NOT NULL AND v_company_created_at + interval '90 days' > now() THEN
      RETURN true;
    ELSE
      RETURN false;
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

-- 2. Update auto_provision_company_trial to default to 'fishgate_starter' (1-3 properties)
CREATE OR REPLACE FUNCTION public.auto_provision_company_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_plan_id uuid;
  v_trial_days integer := 90;
BEGIN
  -- Get core property product
  SELECT id INTO v_product_id 
  FROM public.saas_products 
  WHERE code = 'core_property' AND is_active = true 
  LIMIT 1;

  -- Default onboarding plan: Starter pack (fishgate_starter) for 1-3 properties
  SELECT id, COALESCE(trial_days, 90) INTO v_plan_id, v_trial_days
  FROM public.saas_plans
  WHERE code = 'fishgate_starter' AND is_active = true
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT id, COALESCE(trial_days, 90) INTO v_plan_id, v_trial_days
    FROM public.saas_plans
    WHERE is_active = true
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NOT NULL AND v_product_id IS NOT NULL THEN
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
      NEW.id,
      v_product_id,
      v_plan_id,
      'trialing',
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.created_at, now()) + make_interval(days => v_trial_days),
      NEW.owner_id,
      jsonb_build_object('auto_provisioned', true, 'trial_days', v_trial_days)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Update saas_finalize_subscription_payment_attempt to accept target_plan_code or plan_code
--    and ensure company subscription transitions to 'active' on the purchased plan
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
  v_new_plan_id uuid;
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
    SELECT id INTO v_new_plan_id
    FROM public.saas_plans
    WHERE code = v_target_plan_code AND is_active = true
    LIMIT 1;

    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      v_change_result := jsonb_build_object('warning', SQLERRM);
    END;
  END IF;

  -- Transition subscription to active status on purchased plan
  UPDATE public.saas_company_plan_subscriptions
  SET plan_id = COALESCE(v_new_plan_id, plan_id),
      status = 'active',
      payment_state = 'current',
      dunning_attempt_count = 0,
      last_paid_at = now(),
      last_dunning_attempt_at = NULL,
      grace_end_at = NULL,
      next_renewal_at = now() + interval '1 month',
      updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('activated_via_payment', true, 'plan_code', v_target_plan_code)
  WHERE company_id = v_attempt.company_id
    AND (id = v_attempt.subscription_id OR v_attempt.subscription_id IS NULL)
    AND status IN ('active', 'trialing', 'grace_period', 'past_due', 'pending_verification');

  RETURN jsonb_build_object(
    'applied', true,
    'attempt_id', v_attempt.id,
    'invoice_id', v_invoice.id,
    'target_plan_code', v_target_plan_code,
    'change_result', v_change_result
  );
END;
$$;

-- 4. Update saas_process_expired_trials to lock trial features and issue in-app notifications
CREATE OR REPLACE FUNCTION public.saas_process_expired_trials(
  p_limit integer DEFAULT 100,
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
BEGIN
  FOR v_subscription IN
    SELECT s.id, s.company_id, s.plan_id, c.owner_id
    FROM public.saas_company_plan_subscriptions s
    JOIN public.companies c ON c.id = s.company_id
    WHERE s.status = 'trialing'
      AND s.trial_end_at IS NOT NULL
      AND s.trial_end_at <= now()
    ORDER BY s.trial_end_at, s.id
    LIMIT greatest(least(coalesce(p_limit, 100), 1000), 1)
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    UPDATE public.saas_company_plan_subscriptions
    SET status = 'expired',
        payment_state = 'canceled',
        auto_renew = false,
        end_at = now(),
        trial_policy_enforced_at = now(),
        trial_final_action = 'lockout',
        updated_at = now(),
        notes = coalesce(notes, '') || ' Trial ended and advanced modules locked at ' || now()::text
    WHERE id = v_subscription.id;

    IF v_subscription.owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        link,
        metadata
      ) VALUES (
        v_subscription.owner_id,
        'Your 90-Day Free Trial Has Concluded',
        'Your free trial period has ended. Advanced modules (AI Assistant, CRM, Marketplace, and Owner Portals) are currently locked. Your base Property Management workspace remains active. Choose a plan anytime in Billing & Plans to restore all features.',
        'trial_expired',
        '/settings?tab=billing',
        jsonb_build_object('subscription_id', v_subscription.id, 'company_id', v_subscription.company_id, 'action', 'trial_concluded')
      );
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed);
END;
$$;

-- 5. Seed baseline entitlements for unified plans so paid tiers retain their features
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
