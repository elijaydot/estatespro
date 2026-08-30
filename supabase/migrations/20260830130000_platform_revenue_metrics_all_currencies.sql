-- Multi-currency revenue metrics RPC for global SaaS monetization oversight

CREATE OR REPLACE FUNCTION public.platform_get_revenue_metrics_all_currencies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_currency text;
  v_results jsonb := '[]'::jsonb;
  v_currency_record jsonb;
  v_mrr_minor bigint;
  v_addon_mrr_minor bigint;
  v_open_invoices_minor bigint;
  v_open_invoice_count integer;
  v_failed_attempt_count integer;
  v_active_companies integer;
  v_dunning_companies integer;
  v_quota_pressure_companies integer;
  v_plan_mix jsonb;
  v_currencies text[];
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

  -- Collect all distinct currencies used in the system
  SELECT ARRAY(
    SELECT DISTINCT currency_code FROM (
      SELECT currency_code FROM public.saas_plan_prices
      UNION
      SELECT currency_code FROM public.saas_addon_prices
      UNION
      SELECT currency_code FROM public.saas_subscription_invoices
      UNION
      SELECT 'USD' AS currency_code
      UNION
      SELECT 'NGN' AS currency_code
      UNION
      SELECT 'GBP' AS currency_code
    ) all_curr
    WHERE currency_code IS NOT NULL AND btrim(currency_code) <> ''
    ORDER BY currency_code ASC
  ) INTO v_currencies;

  -- Global metric counts that are independent of currency
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

  -- Loop through each currency and compute revenue metrics
  FOREACH v_currency IN ARRAY v_currencies
  LOOP
    v_mrr_minor := 0;
    v_addon_mrr_minor := 0;
    v_open_invoices_minor := 0;
    v_open_invoice_count := 0;
    v_plan_mix := '[]'::jsonb;

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
      JOIN public.saas_plan_prices spp ON spp.plan_id = pl.id AND spp.currency_code = v_currency
      WHERE s.status IN ('active', 'trialing', 'grace_period')
      GROUP BY pl.code, pl.name, pl.tier
    ) row_data;

    -- Only append currency block if it has pricing or subscriptions, or is a standard currency
    v_currency_record := jsonb_build_object(
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

    v_results := v_results || jsonb_build_array(v_currency_record);
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_revenue_metrics_all_currencies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_revenue_metrics_all_currencies() TO authenticated, service_role;
