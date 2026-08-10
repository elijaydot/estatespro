-- One invoice, payment attempt, renewal, and dunning lifecycle per Owner Billing Group.

DO $$
BEGIN
  IF to_regclass('public.saas_owner_group_subscription_invoices') IS NULL
     OR to_regclass('public.saas_owner_group_subscription_payment_attempts') IS NULL
     OR to_regclass('public.notifications') IS NULL
     OR to_regprocedure('public.saas_get_plan_price_minor(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_BILLING_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_emit_owner_group_billing_notification(
  p_group_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'warning',
  p_link text DEFAULT '/account/billing',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.owner_billing_groups
  WHERE id = p_group_id;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
  VALUES (
    v_owner_id,
    left(coalesce(p_title, 'Billing notice'), 180),
    left(coalesce(p_message, 'Billing update available.'), 1000),
    coalesce(nullif(btrim(p_type), ''), 'warning'),
    p_link,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('owner_billing_group_id', p_group_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_queue_owner_group_renewal_invoices(
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
  v_plan_amount integer;
  v_addon_amount integer;
  v_total_amount integer;
  v_reference text;
  v_invoice_id uuid;
  v_processed integer := 0;
  v_created integer := 0;
  v_limit integer := greatest(coalesce(p_limit, 50), 1);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;

  FOR v_subscription IN
    SELECT subscription.id, subscription.group_id, subscription.plan_id, subscription.next_renewal_at
    FROM public.saas_owner_group_plan_subscriptions subscription
    JOIN public.owner_billing_groups billing_group ON billing_group.id = subscription.group_id
    WHERE billing_group.status = 'active'
      AND subscription.auto_renew = true
      AND subscription.status IN ('active', 'grace_period')
      AND coalesce(subscription.next_renewal_at, now()) <= now()
    ORDER BY subscription.next_renewal_at ASC NULLS FIRST
    LIMIT v_limit
    FOR UPDATE OF subscription SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;

    IF EXISTS (
      SELECT 1
      FROM public.saas_owner_group_subscription_invoices invoice
      WHERE invoice.subscription_id = v_subscription.id
        AND invoice.invoice_kind = 'renewal'
        AND invoice.invoice_status IN ('draft', 'open', 'paid')
        AND invoice.period_start = date_trunc('month', now())
    ) THEN
      CONTINUE;
    END IF;

    v_plan_amount := public.saas_get_plan_price_minor(v_subscription.plan_id, 'USD');

    SELECT coalesce(sum(price.amount_minor), 0)::integer
    INTO v_addon_amount
    FROM public.saas_owner_group_addon_subscriptions group_addon
    JOIN public.saas_addon_prices price
      ON price.addon_id = group_addon.addon_id
     AND price.currency_code = 'USD'
     AND price.billing_interval = 'monthly'
    WHERE group_addon.group_id = v_subscription.group_id
      AND group_addon.status = 'active';

    v_total_amount := v_plan_amount + v_addon_amount;
    v_reference := concat('SAAS-GROUP-REN-', upper(replace(gen_random_uuid()::text, '-', '')));

    INSERT INTO public.saas_owner_group_subscription_invoices (
      group_id,
      subscription_id,
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
      v_subscription.group_id,
      v_subscription.id,
      'renewal',
      'open',
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month',
      v_total_amount,
      'USD',
      now(),
      v_reference,
      p_correlation_id,
      jsonb_build_object(
        'source', 'owner_group_renewal_scheduler',
        'plan_amount_minor', v_plan_amount,
        'group_addon_amount_minor', v_addon_amount
      )
    ) RETURNING id INTO v_invoice_id;

    UPDATE public.saas_owner_group_plan_subscriptions
    SET current_period_start = date_trunc('month', now()),
        current_period_end = date_trunc('month', now()) + interval '1 month',
        next_renewal_at = date_trunc('month', now()) + interval '1 month',
        payment_state = CASE WHEN payment_state = 'canceled' THEN payment_state ELSE 'pending' END,
        updated_at = now()
    WHERE id = v_subscription.id;

    INSERT INTO public.saas_owner_group_subscription_events (
      subscription_id, group_id, event_type, details, correlation_id
    ) VALUES (
      v_subscription.id,
      v_subscription.group_id,
      'billing.group.renewal_invoice_queued',
      jsonb_build_object(
        'invoice_id', v_invoice_id,
        'plan_amount_minor', v_plan_amount,
        'group_addon_amount_minor', v_addon_amount,
        'amount_minor', v_total_amount,
        'currency_code', 'USD'
      ),
      p_correlation_id
    );

    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'created', v_created, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_prepare_owner_group_renewal_payment_attempts(
  p_limit integer DEFAULT 50,
  p_gateway text DEFAULT 'paystack',
  p_payment_method text DEFAULT 'link',
  p_correlation_id text DEFAULT NULL
)
RETURNS TABLE(
  attempt_id uuid,
  invoice_id uuid,
  group_id uuid,
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
  v_gateway text := lower(coalesce(nullif(btrim(p_gateway), ''), 'paystack'));
  v_method text := lower(coalesce(nullif(btrim(p_payment_method), ''), 'link'));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;

  IF v_gateway NOT IN ('paystack', 'flutterwave') THEN
    RAISE EXCEPTION 'UNSUPPORTED_GATEWAY';
  END IF;

  IF v_method NOT IN ('card', 'bank_transfer', 'mtn_momo', 'link') THEN
    RAISE EXCEPTION 'UNSUPPORTED_PAYMENT_METHOD';
  END IF;

  FOR v_invoice IN
    SELECT invoice.id, invoice.group_id, invoice.subscription_id, invoice.amount_minor, invoice.currency_code
    FROM public.saas_owner_group_subscription_invoices invoice
    WHERE invoice.invoice_kind = 'renewal'
      AND invoice.invoice_status = 'open'
      AND invoice.due_at <= now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.saas_owner_group_subscription_payment_attempts attempt
        WHERE attempt.invoice_id = invoice.id
          AND attempt.payment_status IN ('pending', 'processing', 'succeeded')
      )
    ORDER BY invoice.due_at ASC, invoice.created_at ASC
    LIMIT v_limit
    FOR UPDATE OF invoice SKIP LOCKED
  LOOP
    v_attempt_id := NULL;
    v_reference := concat('SAAS-GROUP-REN-PAY-', upper(replace(gen_random_uuid()::text, '-', '')));

    INSERT INTO public.saas_owner_group_subscription_payment_attempts (
      invoice_id,
      group_id,
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
      v_invoice.group_id,
      v_invoice.subscription_id,
      'pending',
      v_gateway,
      v_method,
      0,
      v_invoice.amount_minor,
      v_invoice.currency_code,
      concat('saas-group-renewal:', v_invoice.id::text),
      v_reference,
      p_correlation_id,
      jsonb_build_object('source', 'owner_group_renewal_collection')
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_attempt_id;

    IF v_attempt_id IS NULL THEN
      CONTINUE;
    END IF;

    attempt_id := v_attempt_id;
    invoice_id := v_invoice.id;
    group_id := v_invoice.group_id;
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

CREATE OR REPLACE FUNCTION public.saas_finalize_owner_group_payment_attempt(
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
  v_attempt public.saas_owner_group_subscription_payment_attempts%ROWTYPE;
  v_invoice public.saas_owner_group_subscription_invoices%ROWTYPE;
  v_correlation_id text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;

  SELECT * INTO v_attempt
  FROM public.saas_owner_group_subscription_payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_PAYMENT_ATTEMPT_NOT_FOUND';
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
  FROM public.saas_owner_group_subscription_invoices
  WHERE id = v_attempt.invoice_id
  FOR UPDATE;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_INVOICE_NOT_FOUND';
  END IF;

  v_correlation_id := coalesce(
    nullif(btrim(p_correlation_id), ''),
    v_attempt.correlation_id,
    gen_random_uuid()::text
  );

  UPDATE public.saas_owner_group_subscription_payment_attempts
  SET payment_status = 'succeeded',
      attempt_count = attempt_count + 1,
      gateway_transaction_id = coalesce(p_gateway_transaction_id, gateway_transaction_id),
      gateway_reference = coalesce(nullif(p_gateway_reference, ''), gateway_reference),
      failure_reason = NULL,
      correlation_id = v_correlation_id,
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object('verified_at', now()),
      updated_at = now()
  WHERE id = v_attempt.id;

  UPDATE public.saas_owner_group_subscription_invoices
  SET invoice_status = 'paid',
      paid_at = now(),
      correlation_id = v_correlation_id,
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object('paid_attempt_id', v_attempt.id),
      updated_at = now()
  WHERE id = v_invoice.id;

  UPDATE public.saas_owner_group_plan_subscriptions
  SET payment_state = 'current',
      dunning_attempt_count = 0,
      last_paid_at = now(),
      last_dunning_attempt_at = NULL,
      grace_end_at = NULL,
      status = CASE WHEN status = 'grace_period' THEN 'active' ELSE status END,
      updated_at = now()
  WHERE id = v_attempt.subscription_id;

  INSERT INTO public.saas_owner_group_subscription_events (
    subscription_id, group_id, actor_user_id, event_type, details, correlation_id
  ) VALUES (
    v_attempt.subscription_id,
    v_attempt.group_id,
    v_actor,
    'billing.group.renewal_paid',
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'amount_minor', v_invoice.amount_minor,
      'currency_code', v_invoice.currency_code,
      'payment_attempt_id', v_attempt.id
    ),
    v_correlation_id
  );

  PERFORM public.saas_emit_owner_group_billing_notification(
    v_attempt.group_id,
    'Billing group renewal paid',
    'Your shared FishGate subscription renewal was paid successfully.',
    'success',
    '/account/billing',
    jsonb_build_object('invoice_id', v_invoice.id, 'payment_attempt_id', v_attempt.id)
  );

  RETURN jsonb_build_object(
    'applied', true,
    'idempotent', false,
    'attempt_id', v_attempt.id,
    'invoice_id', v_invoice.id,
    'invoice_kind', v_invoice.invoice_kind,
    'group_id', v_attempt.group_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_mark_owner_group_payment_attempt_failed(
  p_attempt_id uuid,
  p_failure_reason text,
  p_correlation_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.saas_owner_group_subscription_payment_attempts%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;

  SELECT * INTO v_attempt
  FROM public.saas_owner_group_subscription_payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  IF v_attempt.payment_status = 'succeeded' THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_SUCCEEDED_PAYMENT_CANNOT_FAIL';
  END IF;

  UPDATE public.saas_owner_group_subscription_payment_attempts
  SET payment_status = 'failed',
      attempt_count = attempt_count + 1,
      failure_reason = left(coalesce(nullif(btrim(p_failure_reason), ''), 'unknown_failure'), 500),
      correlation_id = coalesce(nullif(btrim(p_correlation_id), ''), correlation_id),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'marked_failed', true,
    'attempt_id', p_attempt_id,
    'invoice_id', v_attempt.invoice_id,
    'group_id', v_attempt.group_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_process_owner_group_renewals(
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
  v_expired record;
  v_dunning_count integer;
  v_processed integer := 0;
  v_dunning integer := 0;
  v_marked_uncollectible integer := 0;
  v_expired_count integer := 0;
  v_limit integer := greatest(coalesce(p_limit, 50), 1);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;

  PERFORM public.saas_queue_owner_group_renewal_invoices(v_limit, p_correlation_id);

  FOR v_invoice IN
    SELECT invoice.id, invoice.group_id, invoice.subscription_id
    FROM public.saas_owner_group_subscription_invoices invoice
    JOIN public.saas_owner_group_plan_subscriptions subscription
      ON subscription.id = invoice.subscription_id
    WHERE invoice.invoice_kind = 'renewal'
      AND invoice.invoice_status = 'open'
      AND invoice.due_at <= now()
      AND (
        subscription.last_dunning_attempt_at IS NULL
        OR subscription.last_dunning_attempt_at <= now() - interval '1 day'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.saas_owner_group_subscription_payment_attempts attempt
        WHERE attempt.invoice_id = invoice.id
          AND attempt.payment_status IN ('pending', 'processing', 'succeeded')
      )
    ORDER BY invoice.due_at ASC, invoice.created_at ASC
    LIMIT v_limit
    FOR UPDATE OF invoice SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;

    UPDATE public.saas_owner_group_plan_subscriptions
    SET dunning_attempt_count = dunning_attempt_count + 1,
        last_dunning_attempt_at = now(),
        payment_state = 'past_due',
        updated_at = now()
    WHERE id = v_invoice.subscription_id
    RETURNING dunning_attempt_count INTO v_dunning_count;

    v_dunning := v_dunning + 1;

    PERFORM public.saas_emit_owner_group_billing_notification(
      v_invoice.group_id,
      'Billing group payment needs attention',
      format('Shared subscription renewal payment attempt %s failed. Update billing to avoid service interruption.', v_dunning_count),
      'warning',
      '/account/billing',
      jsonb_build_object('invoice_id', v_invoice.id, 'dunning_attempt_count', v_dunning_count)
    );

    IF coalesce(v_dunning_count, 0) >= 3 THEN
      UPDATE public.saas_owner_group_plan_subscriptions
      SET payment_state = 'grace',
          status = CASE WHEN status = 'active' THEN 'grace_period' ELSE status END,
          grace_end_at = coalesce(grace_end_at, now() + interval '7 days'),
          updated_at = now()
      WHERE id = v_invoice.subscription_id;

      UPDATE public.saas_owner_group_subscription_invoices
      SET invoice_status = 'uncollectible',
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'dunning_marked_uncollectible_at', now(),
            'dunning_attempt_count', v_dunning_count
          ),
          updated_at = now()
      WHERE id = v_invoice.id;

      PERFORM public.saas_emit_owner_group_billing_notification(
        v_invoice.group_id,
        'Billing group entered grace period',
        'Your shared subscription is in a seven-day grace period. All member companies will require a new plan if payment is not resolved.',
        'error',
        '/account/billing',
        jsonb_build_object('invoice_id', v_invoice.id, 'grace_days', 7)
      );

      v_marked_uncollectible := v_marked_uncollectible + 1;
    END IF;
  END LOOP;

  FOR v_expired IN
    UPDATE public.saas_owner_group_plan_subscriptions
    SET status = 'expired',
        payment_state = 'canceled',
        auto_renew = false,
        end_at = now(),
        updated_at = now()
    WHERE payment_state = 'grace'
      AND grace_end_at IS NOT NULL
      AND grace_end_at <= now()
      AND status = 'grace_period'
    RETURNING id, group_id
  LOOP
    PERFORM public.owner_billing_group_set_company_state(
      ARRAY(
        SELECT member.company_id
        FROM public.owner_billing_group_members member
        WHERE member.group_id = v_expired.group_id
      ),
      'needs_plan',
      v_expired.group_id,
      'group_subscription_expired_after_dunning'
    );

    INSERT INTO public.saas_owner_group_subscription_events (
      subscription_id, group_id, event_type, details, correlation_id
    ) VALUES (
      v_expired.id,
      v_expired.group_id,
      'billing.group.expired_after_grace',
      jsonb_build_object('access_state', 'needs_plan'),
      p_correlation_id
    );

    PERFORM public.saas_emit_owner_group_billing_notification(
      v_expired.group_id,
      'Billing group subscription expired',
      'The shared subscription expired. Member companies are read-only until new plans are selected.',
      'error',
      '/account/billing',
      jsonb_build_object('subscription_id', v_expired.id, 'access_state', 'needs_plan')
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'dunning_started', v_dunning,
    'marked_uncollectible', v_marked_uncollectible,
    'expired_after_grace', v_expired_count,
    'limit', v_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.saas_emit_owner_group_billing_notification(uuid,text,text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_queue_owner_group_renewal_invoices(integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_prepare_owner_group_renewal_payment_attempts(integer,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_mark_owner_group_payment_attempt_failed(uuid,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_process_owner_group_renewals(integer,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.saas_queue_owner_group_renewal_invoices(integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.saas_prepare_owner_group_renewal_payment_attempts(integer,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.saas_mark_owner_group_payment_attempt_failed(uuid,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.saas_process_owner_group_renewals(integer,text) TO service_role;

REVOKE ALL ON FUNCTION public.saas_finalize_owner_group_payment_attempt(uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_finalize_owner_group_payment_attempt(uuid,text,text,text,jsonb) TO service_role;
