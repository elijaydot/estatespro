-- Additive cross-product rollup for Company 360 admin snapshot

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

  -- Cross-product activity metrics
  v_marketplace_listing_count integer := 0;
  v_marketplace_listing_active_count integer := 0;
  v_crm_lead_count integer := 0;
  v_crm_deal_open_count integer := 0;
  v_guest_booking_count integer := 0;
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

  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  IF v_company.id IS NULL THEN RAISE EXCEPTION 'COMPANY_NOT_FOUND'; END IF;

  SELECT COUNT(*)::integer INTO v_property_count FROM public.properties property WHERE property.company_id = p_company_id;
  SELECT COUNT(*)::integer INTO v_unit_count FROM public.units unit JOIN public.properties property ON property.id = unit.property_id WHERE property.company_id = p_company_id;
  SELECT COUNT(*)::integer INTO v_tenant_count
  FROM public.tenants tenant
  LEFT JOIN public.properties property ON property.id = tenant.property_id
  LEFT JOIN public.units unit ON unit.id = tenant.unit_id
  LEFT JOIN public.properties unit_property ON unit_property.id = unit.property_id
  WHERE COALESCE(property.company_id, unit_property.company_id) = p_company_id;
  SELECT COUNT(*)::integer INTO v_member_count FROM public.company_members member WHERE member.company_id = p_company_id AND member.status = 'active';
  SELECT COUNT(*)::integer INTO v_open_alert_count FROM public.governance_alerts alert WHERE alert.company_id = p_company_id AND alert.status = 'open';

  IF to_regclass('public.abuse_signals') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*)::integer FROM public.abuse_signals WHERE company_id = $1' INTO v_abuse_signal_count USING p_company_id;
  END IF;
  IF to_regclass('public.risk_decisions') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*)::integer FROM public.risk_decisions WHERE company_id = $1' INTO v_risk_decision_count USING p_company_id;
  END IF;

  SELECT COUNT(*)::integer INTO v_active_subscription_count FROM public.saas_company_plan_subscriptions subscription WHERE subscription.company_id = p_company_id AND subscription.status IN ('active', 'trialing', 'grace_period');
  SELECT COUNT(*)::integer INTO v_active_addon_count FROM public.saas_company_addon_subscriptions subscription WHERE subscription.company_id = p_company_id AND subscription.status IN ('active', 'trialing', 'grace_period');

  -- Marketplace metrics
  IF to_regclass('public.marketplace_listings') IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_marketplace_listing_count FROM public.marketplace_listings WHERE company_id = p_company_id;
    SELECT COUNT(*)::integer INTO v_marketplace_listing_active_count FROM public.marketplace_listings WHERE company_id = p_company_id AND status = 'live';
  END IF;

  -- CRM metrics
  IF to_regclass('public.leads') IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_crm_lead_count FROM public.leads WHERE company_id = p_company_id;
  END IF;
  IF to_regclass('public.crm_deals') IS NOT NULL AND to_regclass('public.leads') IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_crm_deal_open_count
    FROM public.crm_deals deal
    JOIN public.leads lead ON lead.id = deal.lead_id
    WHERE deal.company_id = p_company_id AND lead.stage NOT IN ('converted', 'lost');
  END IF;

  -- Guest booking metrics
  IF to_regclass('public.bookings') IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_guest_booking_count
    FROM public.bookings booking
    JOIN public.properties prop ON prop.id = booking.property_id
    WHERE prop.company_id = p_company_id;
  END IF;

  RETURN jsonb_build_object(
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'email', v_company.email,
      'phone', v_company.phone,
      'owner_id', v_company.owner_id,
      'created_at', v_company.created_at,
      'updated_at', v_company.updated_at
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
    ),
    'product_activity', jsonb_build_object(
      'marketplace_listing_count', v_marketplace_listing_count,
      'marketplace_listing_active_count', v_marketplace_listing_active_count,
      'crm_lead_count', v_crm_lead_count,
      'crm_deal_open_count', v_crm_deal_open_count,
      'guest_booking_count', v_guest_booking_count
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_company_admin_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_company_admin_snapshot(uuid) TO authenticated, service_role;
