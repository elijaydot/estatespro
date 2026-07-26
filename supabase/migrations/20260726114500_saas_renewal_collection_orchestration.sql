-- SaaS renewal collection orchestration.
-- Ensures renewal invoices enter a real payment-attempt + checkout flow before dunning escalation.

DO $$
BEGIN
  IF to_regclass('public.saas_subscription_invoices') IS NULL
     OR to_regclass('public.saas_subscription_payment_attempts') IS NULL
     OR to_regprocedure('public.saas_queue_subscription_renewal_invoices(integer,text)') IS NULL
     OR to_regprocedure('public.saas_process_subscription_renewals(integer,text)') IS NULL THEN
    RAISE EXCEPTION 'SAAS_RENEWAL_COLLECTION_ORCHESTRATION_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_prepare_renewal_payment_attempts(
  p_limit integer DEFAULT 50,
  p_gateway text DEFAULT 'paystack',
  p_payment_method text DEFAULT 'link',
  p_correlation_id text DEFAULT NULL
)
RETURNS TABLE(
  attempt_id uuid,
  invoice_id uuid,
  company_id uuid,
  subscription_id uuid,
  amount_minor integer,
  currency_code text,
  gateway text,
  payment_method text,
  gateway_reference text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice record;
  v_attempt_id uuid;
  v_reference text;
  v_limit integer := greatest(coalesce(p_limit, 50), 1);
  v_gateway text := lower(coalesce(nullif(trim(coalesce(p_gateway, '')), ''), 'paystack'));
  v_method text := lower(coalesce(nullif(trim(coalesce(p_payment_method, '')), ''), 'link'));
BEGIN
  IF v_gateway NOT IN ('paystack', 'flutterwave') THEN
    RAISE EXCEPTION 'UNSUPPORTED_GATEWAY';
  END IF;

  IF v_method NOT IN ('card', 'bank_transfer', 'mtn_momo', 'link') THEN
    RAISE EXCEPTION 'UNSUPPORTED_PAYMENT_METHOD';
  END IF;

  FOR v_invoice IN
    SELECT i.id, i.company_id, i.subscription_id, i.amount_minor, i.currency_code
    FROM public.saas_subscription_invoices i
    WHERE i.invoice_kind = 'renewal'
      AND i.invoice_status = 'open'
      AND i.due_at <= now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.saas_subscription_payment_attempts spa
        WHERE spa.invoice_id = i.id
          AND spa.payment_status IN ('pending', 'processing', 'succeeded')
      )
    ORDER BY i.due_at ASC, i.created_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_reference := concat('SAAS-REN-PAY-', upper(replace(gen_random_uuid()::text, '-', '')));

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
      v_invoice.id,
      v_invoice.company_id,
      v_invoice.subscription_id,
      'pending',
      v_gateway,
      v_method,
      0,
      v_invoice.amount_minor,
      v_invoice.currency_code,
      concat('saas-renewal:', v_invoice.id::text),
      v_reference,
      p_correlation_id,
      jsonb_build_object(
        'source', 'renewal_collection_orchestration',
        'invoice_kind', 'renewal',
        'created_at', now(),
        'gateway_reference', v_reference
      )
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_attempt_id;

    IF v_attempt_id IS NULL THEN
      CONTINUE;
    END IF;

    attempt_id := v_attempt_id;
    invoice_id := v_invoice.id;
    company_id := v_invoice.company_id;
    subscription_id := v_invoice.subscription_id;
    amount_minor := v_invoice.amount_minor;
    currency_code := v_invoice.currency_code;
    gateway := v_gateway;
    payment_method := v_method;
    gateway_reference := v_reference;
    RETURN NEXT;
  END LOOP;
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
  v_dunning_count integer;
BEGIN
  PERFORM public.saas_queue_subscription_renewal_invoices(v_limit, p_correlation_id);

  FOR v_invoice IN
    SELECT i.id, i.company_id, i.subscription_id, i.product_id, i.amount_minor, i.currency_code
    FROM public.saas_subscription_invoices i
    WHERE i.invoice_kind = 'renewal'
      AND i.invoice_status = 'open'
      AND i.due_at <= now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.saas_subscription_payment_attempts spa
        WHERE spa.invoice_id = i.id
          AND spa.payment_status IN ('pending', 'processing')
      )
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
    WHERE id = v_invoice.subscription_id
    RETURNING dunning_attempt_count INTO v_dunning_count;

    v_dunning := v_dunning + 1;

    IF coalesce(v_dunning_count, 0) >= 3 THEN
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
            'dunning_attempt_count', coalesce(v_dunning_count, 0)
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

REVOKE ALL ON FUNCTION public.saas_prepare_renewal_payment_attempts(integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_prepare_renewal_payment_attempts(integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_prepare_renewal_payment_attempts(integer, text, text, text) TO service_role;
