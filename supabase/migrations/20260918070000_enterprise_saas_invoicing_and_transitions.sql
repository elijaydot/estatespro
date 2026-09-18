-- Migration: 20260918070000_enterprise_saas_invoicing_and_transitions.sql
-- Description: Unify FishGate platform-to-landlord SaaS invoicing, support multi-currency, scheduled downgrades, and invoice lifecycle management

-- 1. Relax rigid currency_code check constraints across billing tables to allow all supported currencies
ALTER TABLE public.saas_subscription_invoices DROP CONSTRAINT IF EXISTS saas_subscription_invoices_currency_code_check;
ALTER TABLE public.saas_subscription_payment_attempts DROP CONSTRAINT IF EXISTS saas_subscription_payment_attempts_currency_code_check;
ALTER TABLE public.saas_subscription_change_log DROP CONSTRAINT IF EXISTS saas_subscription_change_log_currency_code_check;

-- 2. Add sequential invoice number generator sequence
CREATE SEQUENCE IF NOT EXISTS public.saas_invoice_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_saas_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'FG-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.saas_invoice_number_seq')::text, 5, '0');
END;
$$;

-- 3. Add invoice columns for official FishGate platform receipts
ALTER TABLE public.saas_subscription_invoices
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS customer_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_details jsonb DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_subscription_invoices_number
  ON public.saas_subscription_invoices(invoice_number)
  WHERE invoice_number IS NOT NULL;

-- Backfill invoice_number for existing invoices
UPDATE public.saas_subscription_invoices
SET invoice_number = 'FG-INV-' || to_char(created_at, 'YYYY') || '-' || lpad((abs(hashtext(id::text)) % 90000 + 10000)::text, 5, '0')
WHERE invoice_number IS NULL;

-- 4. Add scheduled downgrade fields to saas_company_plan_subscriptions
ALTER TABLE public.saas_company_plan_subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_plan_id uuid REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_change_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_reason text;

-- 5. Fix and reconcile orphaned/abandoned open checkout invoices
-- Mark older uncompleted plan_change_proration invoices as void so phantom debts do not linger
UPDATE public.saas_subscription_invoices
SET invoice_status = 'void',
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || '{"void_reason": "abandoned_checkout_superseded"}'::jsonb
WHERE invoice_status = 'open'
  AND invoice_kind = 'plan_change_proration'
  AND created_at < now() - interval '30 minutes';

-- 6. RPC: Schedule Plan Downgrade (deferred to end of prepaid period)
CREATE OR REPLACE FUNCTION public.saas_schedule_plan_downgrade(
  p_company_id uuid,
  p_target_plan_code text,
  p_reason text DEFAULT 'Customer requested downgrade at end of cycle'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_sub_id uuid;
  v_target_plan_id uuid;
  v_target_plan_name text;
  v_effective_at timestamptz;
  v_current_plan_name text;
  v_current_plan_tier text;
BEGIN
  -- Load target plan
  SELECT id, name INTO v_target_plan_id, v_target_plan_name
  FROM public.saas_plans
  WHERE code = p_target_plan_code
    AND is_active = true
  LIMIT 1;

  IF v_target_plan_id IS NULL THEN
    RAISE EXCEPTION 'TARGET_PLAN_NOT_FOUND';
  END IF;

  -- Load active subscription
  SELECT s.id, p.name, p.tier, coalesce(s.current_period_end, s.next_renewal_at, now() + interval '30 days')
  INTO v_sub_id, v_current_plan_name, v_current_plan_tier, v_effective_at
  FROM public.saas_company_plan_subscriptions s
  JOIN public.saas_plans p ON p.id = s.plan_id
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'trialing', 'grace_period')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION';
  END IF;

  -- Schedule the downgrade on the subscription record
  UPDATE public.saas_company_plan_subscriptions
  SET scheduled_plan_id = v_target_plan_id,
      scheduled_change_at = v_effective_at,
      scheduled_reason = p_reason,
      updated_at = now()
  WHERE id = v_sub_id;

  -- Log audit event
  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    created_at
  )
  SELECT
    v_sub_id,
    p_company_id,
    product_id,
    v_actor,
    'billing.subscription.downgrade_scheduled',
    jsonb_build_object(
      'current_plan', v_current_plan_name,
      'target_plan_code', p_target_plan_code,
      'target_plan_name', v_target_plan_name,
      'effective_at', v_effective_at,
      'reason', p_reason
    ),
    now()
  FROM public.saas_company_plan_subscriptions
  WHERE id = v_sub_id;

  RETURN jsonb_build_object(
    'success', true,
    'scheduled_plan_code', p_target_plan_code,
    'scheduled_plan_name', v_target_plan_name,
    'effective_at', v_effective_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_schedule_plan_downgrade(uuid, text, text) TO authenticated, service_role;

-- 7. RPC: Cancel Scheduled Downgrade
CREATE OR REPLACE FUNCTION public.saas_cancel_scheduled_downgrade(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_sub_id uuid;
  v_cancelled_plan_id uuid;
BEGIN
  SELECT id, scheduled_plan_id INTO v_sub_id, v_cancelled_plan_id
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id
    AND status IN ('active', 'trialing', 'grace_period')
    AND scheduled_plan_id IS NOT NULL
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No scheduled downgrade found');
  END IF;

  UPDATE public.saas_company_plan_subscriptions
  SET scheduled_plan_id = NULL,
      scheduled_change_at = NULL,
      scheduled_reason = NULL,
      updated_at = now()
  WHERE id = v_sub_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    created_at
  )
  SELECT
    v_sub_id,
    p_company_id,
    product_id,
    v_actor,
    'billing.subscription.downgrade_cancelled',
    jsonb_build_object('cancelled_plan_id', v_cancelled_plan_id),
    now()
  FROM public.saas_company_plan_subscriptions
  WHERE id = v_sub_id;

  RETURN jsonb_build_object('success', true, 'message', 'Scheduled downgrade cancelled successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_cancel_scheduled_downgrade(uuid) TO authenticated, service_role;

-- 8. RPC: SuperAdmin Mark Invoice as Paid (offline bank wire / cash reconciliation)
CREATE OR REPLACE FUNCTION public.saas_admin_mark_invoice_paid(
  p_invoice_id uuid,
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_invoice record;
  v_ref text := coalesce(nullif(p_payment_reference, ''), 'MANUAL-WIRE-' || upper(substr(md5(random()::text), 1, 8)));
BEGIN
  SELECT * INTO v_invoice
  FROM public.saas_subscription_invoices
  WHERE id = p_invoice_id;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND';
  END IF;

  IF v_invoice.invoice_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Invoice already marked as paid');
  END IF;

  UPDATE public.saas_subscription_invoices
  SET invoice_status = 'paid',
      paid_at = now(),
      external_reference = coalesce(external_reference, v_ref),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'paid_manually_by', v_actor,
        'manual_payment_notes', p_notes,
        'paid_at', now()
      ),
      updated_at = now()
  WHERE id = p_invoice_id;

  -- Ensure subscription status is active
  UPDATE public.saas_company_plan_subscriptions
  SET status = 'active',
      payment_state = 'current',
      last_paid_at = now(),
      dunning_attempt_count = 0,
      updated_at = now()
  WHERE id = v_invoice.subscription_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    created_at
  ) VALUES (
    v_invoice.subscription_id,
    v_invoice.company_id,
    v_invoice.product_id,
    v_actor,
    'billing.invoice.admin_marked_paid',
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'amount_minor', v_invoice.amount_minor,
      'currency_code', v_invoice.currency_code,
      'reference', v_ref,
      'notes', p_notes
    ),
    now()
  );

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id, 'reference', v_ref);
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_admin_mark_invoice_paid(uuid, text, text) TO authenticated, service_role;

-- 9. RPC: SuperAdmin Void Invoice
CREATE OR REPLACE FUNCTION public.saas_admin_void_invoice(
  p_invoice_id uuid,
  p_reason text DEFAULT 'Administrative void'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_invoice record;
BEGIN
  SELECT * INTO v_invoice
  FROM public.saas_subscription_invoices
  WHERE id = p_invoice_id;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND';
  END IF;

  UPDATE public.saas_subscription_invoices
  SET invoice_status = 'void',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'voided_by', v_actor,
        'void_reason', p_reason,
        'voided_at', now()
      ),
      updated_at = now()
  WHERE id = p_invoice_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id,
    company_id,
    product_id,
    actor_user_id,
    event_type,
    details,
    created_at
  ) VALUES (
    v_invoice.subscription_id,
    v_invoice.company_id,
    v_invoice.product_id,
    v_actor,
    'billing.invoice.voided',
    jsonb_build_object('invoice_id', p_invoice_id, 'reason', p_reason),
    now()
  );

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_admin_void_invoice(uuid, text) TO authenticated, service_role;
