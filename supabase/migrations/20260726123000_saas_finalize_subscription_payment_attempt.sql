-- Unified subscription payment finalization for plan changes and renewals.

DO $$
BEGIN
  IF to_regclass('public.saas_subscription_payment_attempts') IS NULL
     OR to_regclass('public.saas_subscription_invoices') IS NULL
     OR to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regprocedure('public.saas_change_subscription_plan(uuid,text,text,text,boolean,text,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'SAAS_FINALIZE_SUBSCRIPTION_PAYMENT_PREREQUISITES_MISSING';
  END IF;
END;
$$;

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

  IF v_invoice.invoice_kind = 'plan_change_proration' THEN
    v_target_plan_code := coalesce(v_invoice.metadata->>'target_plan_code', v_attempt.metadata->>'target_plan_code');

    IF v_target_plan_code IS NULL OR v_target_plan_code = '' THEN
      RAISE EXCEPTION 'TARGET_PLAN_CODE_MISSING';
    END IF;

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

    INSERT INTO public.saas_subscription_events (
      subscription_id,
      company_id,
      product_id,
      actor_user_id,
      event_type,
      details,
      correlation_id
    ) VALUES (
      v_attempt.subscription_id,
      v_attempt.company_id,
      v_invoice.product_id,
      v_actor,
      'billing.subscription.renewal_paid',
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_kind', v_invoice.invoice_kind,
        'amount_minor', v_invoice.amount_minor,
        'currency_code', v_invoice.currency_code,
        'payment_attempt_id', v_attempt.id
      ),
      coalesce(p_correlation_id, v_attempt.correlation_id)
    );
  END IF;

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
    'invoice_kind', v_invoice.invoice_kind,
    'change_result', v_change_result
  );
END;
$$;

REVOKE ALL ON FUNCTION public.saas_finalize_subscription_payment_attempt(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_finalize_subscription_payment_attempt(uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_finalize_subscription_payment_attempt(uuid, text, text, text, jsonb) TO service_role;
