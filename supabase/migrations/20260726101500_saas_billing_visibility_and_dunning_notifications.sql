-- SaaS billing visibility and dunning notifications hardening.

DO $$
BEGIN
  IF to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_subscription_invoices') IS NULL
     OR to_regclass('public.notifications') IS NULL
     OR to_regclass('public.companies') IS NULL
     OR to_regprocedure('public.saas_queue_subscription_renewal_invoices(integer,text)') IS NULL
     OR to_regprocedure('public.saas_process_subscription_renewals(integer,text)') IS NULL THEN
    RAISE EXCEPTION 'SAAS_BILLING_VISIBILITY_PREREQUISITES_MISSING';
  END IF;
END;
$$;

ALTER TABLE public.saas_company_plan_subscriptions
  ADD COLUMN IF NOT EXISTS next_billing_at timestamptz;

UPDATE public.saas_company_plan_subscriptions
SET next_billing_at = coalesce(next_billing_at, next_renewal_at)
WHERE next_billing_at IS NULL;

CREATE OR REPLACE FUNCTION public.saas_emit_billing_notification(
  p_company_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'warning',
  p_link text DEFAULT '/settings?tab=billing',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid;
BEGIN
  SELECT c.owner_id
  INTO v_owner_user_id
  FROM public.companies c
  WHERE c.id = p_company_id
  LIMIT 1;

  IF v_owner_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    metadata
  ) VALUES (
    v_owner_user_id,
    left(coalesce(p_title, 'Billing notice'), 180),
    left(coalesce(p_message, 'Billing update available.'), 1000),
    coalesce(nullif(trim(coalesce(p_type, '')), ''), 'warning'),
    p_link,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('company_id', p_company_id)
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
        next_billing_at = date_trunc('month', now()) + interval '1 month',
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
  v_expired_row record;
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

    PERFORM public.saas_emit_billing_notification(
      v_invoice.company_id,
      'Subscription payment retry required',
      format('Automatic renewal charge is pending. Attempt %s/3 has been recorded. Please resolve payment to avoid service restrictions.', coalesce(v_dunning_count, 1)),
      'warning',
      '/settings?tab=billing',
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'subscription_id', v_invoice.subscription_id,
        'attempt', coalesce(v_dunning_count, 1),
        'correlation_id', p_correlation_id
      )
    );

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

      PERFORM public.saas_emit_billing_notification(
        v_invoice.company_id,
        'Subscription in grace period',
        'Your subscription payment retries were exhausted and the account is now in grace period. Please update payment method immediately to avoid downgrade.',
        'error',
        '/settings?tab=billing',
        jsonb_build_object(
          'invoice_id', v_invoice.id,
          'subscription_id', v_invoice.subscription_id,
          'state', 'grace',
          'correlation_id', p_correlation_id
        )
      );
    END IF;
  END LOOP;

  FOR v_expired_row IN
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
    RETURNING id, company_id
  LOOP
    v_expired := v_expired + 1;

    PERFORM public.saas_emit_billing_notification(
      v_expired_row.company_id,
      'Subscription downgraded after grace period',
      'Grace period ended without successful payment. Auto-renew has been disabled and billing state moved to canceled.',
      'error',
      '/settings?tab=billing',
      jsonb_build_object(
        'subscription_id', v_expired_row.id,
        'state', 'canceled',
        'correlation_id', p_correlation_id
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'dunning_started', v_dunning,
    'marked_uncollectible', v_marked_uncollectible,
    'expired_after_grace', v_expired,
    'limit', v_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.saas_emit_billing_notification(uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_emit_billing_notification(uuid, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_emit_billing_notification(uuid, text, text, text, text, jsonb) TO service_role;
