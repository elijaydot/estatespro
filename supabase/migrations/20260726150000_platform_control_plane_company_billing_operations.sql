-- Phase 11: Control Plane company billing operations and monetization metrics.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL
     OR to_regclass('public.properties') IS NULL
     OR to_regclass('public.units') IS NULL
     OR to_regclass('public.tenants') IS NULL
     OR to_regclass('public.company_members') IS NULL
     OR to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_subscription_invoices') IS NULL
     OR to_regclass('public.saas_subscription_payment_attempts') IS NULL
     OR to_regclass('public.saas_plans') IS NULL
     OR to_regclass('public.saas_products') IS NULL
     OR to_regclass('public.saas_plan_prices') IS NULL
     OR to_regclass('public.saas_addons') IS NULL
     OR to_regclass('public.saas_addon_prices') IS NULL
     OR to_regclass('public.saas_company_addon_subscriptions') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL
     OR to_regprocedure('public.platform_ingest_audit_event(text,text,text,text,text,text,uuid,uuid,text,text,text,integer,text,text,jsonb,jsonb)') IS NULL
     OR to_regprocedure('public.platform_admin_change_company_plan(uuid,text,text,text,text,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_BILLING_PHASE11_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_company_admin_snapshot(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company public.companies%ROWTYPE;
  v_property_count integer := 0;
  v_unit_count integer := 0;
  v_tenant_count integer := 0;
  v_member_count integer := 0;
  v_open_alert_count integer := 0;
  v_abuse_signal_count integer := 0;
  v_risk_decision_count integer := 0;
  v_active_subscription_count integer := 0;
  v_active_addon_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  SELECT * INTO v_company
  FROM public.companies
  WHERE id = p_company_id;

  IF v_company.id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_NOT_FOUND';
  END IF;

  SELECT COUNT(*)::integer INTO v_property_count
  FROM public.properties p
  WHERE p.company_id = p_company_id;

  SELECT COUNT(*)::integer INTO v_unit_count
  FROM public.units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE p.company_id = p_company_id;

  SELECT COUNT(*)::integer INTO v_tenant_count
  FROM public.tenants t
  LEFT JOIN public.properties p ON p.id = t.property_id
  LEFT JOIN public.units u ON u.id = t.unit_id
  LEFT JOIN public.properties pu ON pu.id = u.property_id
  WHERE coalesce(p.company_id, pu.company_id) = p_company_id;

  SELECT COUNT(*)::integer INTO v_member_count
  FROM public.company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.status = 'active';

  SELECT COUNT(*)::integer INTO v_open_alert_count
  FROM public.governance_alerts ga
  WHERE ga.company_id = p_company_id
    AND ga.status = 'open';

  IF to_regclass('public.abuse_signals') IS NOT NULL THEN
    EXECUTE $sql$
      SELECT COUNT(*)::integer
      FROM public.abuse_signals a
      WHERE a.company_id = $1
    $sql$
    INTO v_abuse_signal_count
    USING p_company_id;
  END IF;

  IF to_regclass('public.risk_decisions') IS NOT NULL THEN
    EXECUTE $sql$
      SELECT COUNT(*)::integer
      FROM public.risk_decisions r
      WHERE r.company_id = $1
    $sql$
    INTO v_risk_decision_count
    USING p_company_id;
  END IF;

  SELECT COUNT(*)::integer INTO v_active_subscription_count
  FROM public.saas_company_plan_subscriptions s
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'trialing', 'grace_period');

  SELECT COUNT(*)::integer INTO v_active_addon_count
  FROM public.saas_company_addon_subscriptions cas
  WHERE cas.company_id = p_company_id
    AND cas.status IN ('active', 'trialing', 'grace_period');

  RETURN jsonb_build_object(
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'email', v_company.email,
      'phone', v_company.phone,
      'owner_id', v_company.owner_id,
      'created_at', v_company.created_at,
      'updated_at', v_company.updated_at,
      'is_verified', v_company.is_verified
    ),
    'portfolio', jsonb_build_object(
      'property_count', v_property_count,
      'unit_count', v_unit_count,
      'tenant_count', v_tenant_count,
      'active_member_count', v_member_count
    ),
    'operations', jsonb_build_object(
      'open_alert_count', v_open_alert_count,
      'abuse_signal_count', v_abuse_signal_count,
      'risk_decision_count', v_risk_decision_count
    ),
    'billing', jsonb_build_object(
      'active_subscription_count', v_active_subscription_count,
      'active_addon_count', v_active_addon_count
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_company_billing_context(
  p_company_id uuid,
  p_limit integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_limit integer := LEAST(100, GREATEST(5, COALESCE(p_limit, 25)));
  v_subscriptions jsonb := '[]'::jsonb;
  v_invoices jsonb := '[]'::jsonb;
  v_attempts jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_change_log jsonb := '[]'::jsonb;
  v_addons jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.created_at DESC), '[]'::jsonb)
  INTO v_subscriptions
  FROM (
    SELECT
      s.id,
      s.company_id,
      s.plan_id,
      s.status,
      s.payment_state,
      s.currency_code,
      s.next_renewal_at,
      s.next_billing_at,
      s.trial_end_at,
      s.grace_end_at,
      s.last_paid_at,
      s.updated_at,
      s.created_at,
      pl.code AS plan_code,
      pl.name AS plan_name,
      pl.tier AS plan_tier,
      pr.code AS product_code,
      pr.name AS product_name,
      pp.amount_minor AS amount_minor,
      pp.currency_code AS price_currency
    FROM public.saas_company_plan_subscriptions s
    JOIN public.saas_plans pl ON pl.id = s.plan_id
    JOIN public.saas_products pr ON pr.id = s.product_id
    LEFT JOIN LATERAL (
      SELECT spp.amount_minor, spp.currency_code
      FROM public.saas_plan_prices spp
      WHERE spp.plan_id = s.plan_id
        AND spp.currency_code = s.currency_code
      ORDER BY spp.is_default DESC, spp.created_at DESC
      LIMIT 1
    ) pp ON true
    WHERE s.company_id = p_company_id
    ORDER BY s.created_at DESC
    LIMIT v_limit
  ) row_data;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.created_at DESC), '[]'::jsonb)
  INTO v_invoices
  FROM (
    SELECT
      i.id,
      i.subscription_id,
      i.invoice_kind,
      i.invoice_status,
      i.amount_minor,
      i.currency_code,
      i.due_at,
      i.paid_at,
      i.period_start,
      i.period_end,
      i.external_reference,
      i.correlation_id,
      i.created_at
    FROM public.saas_subscription_invoices i
    WHERE i.company_id = p_company_id
    ORDER BY i.created_at DESC
    LIMIT v_limit
  ) row_data;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.created_at DESC), '[]'::jsonb)
  INTO v_attempts
  FROM (
    SELECT
      a.id,
      a.subscription_id,
      a.invoice_id,
      a.gateway,
      a.payment_method,
      a.payment_status,
      a.amount_minor,
      a.currency_code,
      a.gateway_reference,
      a.gateway_transaction_id,
      a.failure_reason,
      a.attempt_count,
      a.updated_at,
      a.created_at
    FROM public.saas_subscription_payment_attempts a
    WHERE a.company_id = p_company_id
    ORDER BY a.created_at DESC
    LIMIT v_limit
  ) row_data;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.created_at DESC), '[]'::jsonb)
  INTO v_events
  FROM (
    SELECT
      e.id,
      e.subscription_id,
      e.product_id,
      e.event_type,
      e.details,
      e.correlation_id,
      e.created_at
    FROM public.saas_subscription_events e
    WHERE e.company_id = p_company_id
    ORDER BY e.created_at DESC
    LIMIT v_limit
  ) row_data;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.created_at DESC), '[]'::jsonb)
  INTO v_change_log
  FROM (
    SELECT
      c.id,
      c.subscription_id,
      c.product_id,
      c.previous_plan_id,
      c.new_plan_id,
      c.currency_code,
      c.reason,
      c.effective_at,
      c.created_at,
      prev_pl.code AS previous_plan_code,
      new_pl.code AS new_plan_code
    FROM public.saas_subscription_change_log c
    LEFT JOIN public.saas_plans prev_pl ON prev_pl.id = c.previous_plan_id
    LEFT JOIN public.saas_plans new_pl ON new_pl.id = c.new_plan_id
    WHERE c.company_id = p_company_id
    ORDER BY c.created_at DESC
    LIMIT v_limit
  ) row_data;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.addon_name), '[]'::jsonb)
  INTO v_addons
  FROM (
    SELECT
      ad.id AS addon_id,
      ad.code AS addon_code,
      ad.name AS addon_name,
      ad.description,
      ad.attach_scope,
      ad.is_active AS addon_is_active,
      cas.status,
      cas.start_at,
      cas.end_at,
      cas.trial_end_at,
      cas.grace_end_at,
      cas.notes,
      ap.amount_minor,
      ap.currency_code,
      (cas.status IN ('active', 'trialing', 'grace_period')) AS enabled
    FROM public.saas_addons ad
    LEFT JOIN public.saas_company_addon_subscriptions cas
      ON cas.addon_id = ad.id
     AND cas.company_id = p_company_id
    LEFT JOIN LATERAL (
      SELECT sap.amount_minor, sap.currency_code
      FROM public.saas_addon_prices sap
      WHERE sap.addon_id = ad.id
      ORDER BY sap.is_default DESC, sap.created_at DESC
      LIMIT 1
    ) ap ON true
    ORDER BY ad.sort_order ASC, ad.name ASC
  ) row_data;

  RETURN jsonb_build_object(
    'subscriptions', v_subscriptions,
    'invoices', v_invoices,
    'payment_attempts', v_attempts,
    'subscription_events', v_events,
    'subscription_change_log', v_change_log,
    'addons', v_addons
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_billing_catalog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_products jsonb := '[]'::jsonb;
  v_plans jsonb := '[]'::jsonb;
  v_addons jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.sort_order, row_data.code), '[]'::jsonb)
  INTO v_products
  FROM (
    SELECT id, code, name, description, sort_order
    FROM public.saas_products
    WHERE is_active = true
  ) row_data;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.product_sort_order, row_data.plan_sort_order), '[]'::jsonb)
  INTO v_plans
  FROM (
    SELECT
      pl.id,
      pl.code,
      pl.name,
      pl.tier,
      pl.description,
      pl.product_id,
      pr.code AS product_code,
      pr.name AS product_name,
      pr.sort_order AS product_sort_order,
      pl.sort_order AS plan_sort_order,
      pp.amount_minor,
      pp.currency_code,
      pp.billing_interval
    FROM public.saas_plans pl
    JOIN public.saas_products pr ON pr.id = pl.product_id
    LEFT JOIN LATERAL (
      SELECT spp.amount_minor, spp.currency_code, spp.billing_interval
      FROM public.saas_plan_prices spp
      WHERE spp.plan_id = pl.id
      ORDER BY spp.is_default DESC, spp.created_at DESC
      LIMIT 1
    ) pp ON true
    WHERE pl.is_active = true
      AND pr.is_active = true
  ) row_data;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.sort_order, row_data.code), '[]'::jsonb)
  INTO v_addons
  FROM (
    SELECT
      ad.id,
      ad.code,
      ad.name,
      ad.description,
      ad.attach_scope,
      ad.sort_order,
      ap.amount_minor,
      ap.currency_code,
      ap.billing_interval
    FROM public.saas_addons ad
    LEFT JOIN LATERAL (
      SELECT sap.amount_minor, sap.currency_code, sap.billing_interval
      FROM public.saas_addon_prices sap
      WHERE sap.addon_id = ad.id
      ORDER BY sap.is_default DESC, sap.created_at DESC
      LIMIT 1
    ) ap ON true
    WHERE ad.is_active = true
  ) row_data;

  RETURN jsonb_build_object(
    'products', v_products,
    'plans', v_plans,
    'addons', v_addons
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_set_company_addon_status(
  p_company_id uuid,
  p_addon_code text,
  p_enabled boolean,
  p_notes text DEFAULT NULL,
  p_trial_end_at timestamptz DEFAULT NULL,
  p_end_at timestamptz DEFAULT NULL,
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
  v_addon_id uuid;
  v_subscription public.saas_company_addon_subscriptions%ROWTYPE;
  v_status text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  SELECT id INTO v_addon_id
  FROM public.saas_addons
  WHERE code = p_addon_code
  LIMIT 1;

  IF v_addon_id IS NULL THEN
    RAISE EXCEPTION 'ADDON_NOT_FOUND';
  END IF;

  IF p_enabled THEN
    v_status := CASE
      WHEN p_trial_end_at IS NOT NULL AND p_trial_end_at > now() THEN 'trialing'
      ELSE 'active'
    END;

    INSERT INTO public.saas_company_addon_subscriptions (
      company_id,
      addon_id,
      status,
      notes,
      trial_end_at,
      end_at,
      created_by,
      metadata
    ) VALUES (
      p_company_id,
      v_addon_id,
      v_status,
      nullif(trim(coalesce(p_notes, '')), ''),
      p_trial_end_at,
      NULL,
      v_actor,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('updated_by', v_actor, 'updated_at', now())
    )
    ON CONFLICT (company_id, addon_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      trial_end_at = EXCLUDED.trial_end_at,
      end_at = NULL,
      metadata = coalesce(public.saas_company_addon_subscriptions.metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object('updated_by', v_actor, 'updated_at', now()),
      updated_at = now()
    RETURNING * INTO v_subscription;
  ELSE
    UPDATE public.saas_company_addon_subscriptions
    SET status = 'canceled',
        end_at = coalesce(p_end_at, now()),
        notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
        metadata = coalesce(metadata, '{}'::jsonb)
          || coalesce(p_metadata, '{}'::jsonb)
          || jsonb_build_object('updated_by', v_actor, 'updated_at', now()),
        updated_at = now()
    WHERE company_id = p_company_id
      AND addon_id = v_addon_id
    RETURNING * INTO v_subscription;

    IF v_subscription.id IS NULL THEN
      RAISE EXCEPTION 'ADDON_SUBSCRIPTION_NOT_FOUND_FOR_COMPANY';
    END IF;
  END IF;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    'billing.company_addon.status_changed',
    'billing',
    'set_company_addon_status',
    'success',
    'info',
    v_actor,
    p_company_id,
    'company',
    p_company_id::text,
    coalesce(p_correlation_id, concat('company-addon-', p_company_id::text, '-', p_addon_code, '-', extract(epoch FROM now())::bigint::text)),
    0,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object(
      'addon_code', p_addon_code,
      'enabled', p_enabled,
      'status', v_subscription.status,
      'subscription_id', v_subscription.id,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'company_id', p_company_id,
    'addon_code', p_addon_code,
    'enabled', p_enabled,
    'status', v_subscription.status,
    'subscription_id', v_subscription.id,
    'trial_end_at', v_subscription.trial_end_at,
    'end_at', v_subscription.end_at,
    'updated_at', v_subscription.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_revenue_metrics(
  p_currency_code text DEFAULT 'USD'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_currency text := upper(coalesce(nullif(trim(p_currency_code), ''), 'USD'));
  v_mrr_minor bigint := 0;
  v_addon_mrr_minor bigint := 0;
  v_open_invoices_minor bigint := 0;
  v_open_invoice_count integer := 0;
  v_failed_attempt_count integer := 0;
  v_active_companies integer := 0;
  v_dunning_companies integer := 0;
  v_quota_pressure_companies integer := 0;
  v_plan_mix jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  SELECT coalesce(sum(price.amount_minor), 0)::bigint
  INTO v_mrr_minor
  FROM public.saas_company_plan_subscriptions s
  JOIN LATERAL (
    SELECT spp.amount_minor
    FROM public.saas_plan_prices spp
    WHERE spp.plan_id = s.plan_id
      AND spp.currency_code = v_currency
    ORDER BY spp.is_default DESC, spp.created_at DESC
    LIMIT 1
  ) price ON true
  WHERE s.status IN ('active', 'trialing', 'grace_period');

  SELECT coalesce(sum(price.amount_minor), 0)::bigint
  INTO v_addon_mrr_minor
  FROM public.saas_company_addon_subscriptions cas
  JOIN LATERAL (
    SELECT sap.amount_minor
    FROM public.saas_addon_prices sap
    WHERE sap.addon_id = cas.addon_id
      AND sap.currency_code = v_currency
    ORDER BY sap.is_default DESC, sap.created_at DESC
    LIMIT 1
  ) price ON true
  WHERE cas.status IN ('active', 'trialing', 'grace_period');

  SELECT
    coalesce(sum(i.amount_minor), 0)::bigint,
    count(*)::integer
  INTO v_open_invoices_minor, v_open_invoice_count
  FROM public.saas_subscription_invoices i
  WHERE i.invoice_status IN ('open', 'past_due')
    AND i.currency_code = v_currency;

  SELECT count(*)::integer
  INTO v_failed_attempt_count
  FROM public.saas_subscription_payment_attempts a
  WHERE a.payment_status = 'failed'
    AND a.updated_at >= now() - interval '30 days';

  SELECT count(DISTINCT s.company_id)::integer
  INTO v_active_companies
  FROM public.saas_company_plan_subscriptions s
  WHERE s.status IN ('active', 'trialing', 'grace_period');

  SELECT count(DISTINCT s.company_id)::integer
  INTO v_dunning_companies
  FROM public.saas_company_plan_subscriptions s
  WHERE s.payment_state IN ('past_due', 'grace_period')
     OR s.status = 'grace_period';

  WITH latest_usage AS (
    SELECT DISTINCT ON (u.company_id, u.product_code, u.quota_code)
      u.company_id,
      u.usage_percent,
      u.snapshot_at
    FROM public.usage_snapshots u
    WHERE u.snapshot_at >= now() - interval '7 days'
    ORDER BY u.company_id, u.product_code, u.quota_code, u.snapshot_at DESC
  )
  SELECT count(DISTINCT lu.company_id)::integer
  INTO v_quota_pressure_companies
  FROM latest_usage lu
  WHERE lu.usage_percent >= 90;

  SELECT coalesce(jsonb_agg(row_to_json(row_data) ORDER BY row_data.active_subscriptions DESC), '[]'::jsonb)
  INTO v_plan_mix
  FROM (
    SELECT
      pl.code AS plan_code,
      pl.name AS plan_name,
      pl.tier AS plan_tier,
      count(*)::integer AS active_subscriptions
    FROM public.saas_company_plan_subscriptions s
    JOIN public.saas_plans pl ON pl.id = s.plan_id
    WHERE s.status IN ('active', 'trialing', 'grace_period')
    GROUP BY pl.code, pl.name, pl.tier
  ) row_data;

  RETURN jsonb_build_object(
    'currency_code', v_currency,
    'mrr_minor', v_mrr_minor,
    'addon_mrr_minor', v_addon_mrr_minor,
    'arr_minor', (v_mrr_minor + v_addon_mrr_minor) * 12,
    'open_invoices_minor', v_open_invoices_minor,
    'open_invoice_count', v_open_invoice_count,
    'failed_attempt_count_30d', v_failed_attempt_count,
    'active_companies', v_active_companies,
    'dunning_companies', v_dunning_companies,
    'quota_pressure_companies_7d', v_quota_pressure_companies,
    'plan_mix', v_plan_mix
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_company_admin_snapshot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_company_billing_context(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_billing_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_admin_set_company_addon_status(uuid, text, boolean, text, timestamptz, timestamptz, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_revenue_metrics(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.platform_get_company_admin_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_company_billing_context(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_billing_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_set_company_addon_status(uuid, text, boolean, text, timestamptz, timestamptz, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_revenue_metrics(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.platform_get_company_admin_snapshot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_company_billing_context(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_billing_catalog() TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_admin_set_company_addon_status(uuid, text, boolean, text, timestamptz, timestamptz, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_revenue_metrics(text) TO service_role;
