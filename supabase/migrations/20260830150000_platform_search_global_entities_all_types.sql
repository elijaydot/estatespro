-- Extended platform_search_global_entities covering all 14 platform entity types

CREATE OR REPLACE FUNCTION public.platform_search_global_entities(
  p_entity_type text,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text := lower(btrim(coalesce(p_entity_type, '')));
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(10, coalesce(p_page_size, 20)));
  v_rows jsonb := '[]'::jsonb;
  v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND (
    v_actor IS NULL OR (
      NOT public.is_platform_super_admin(v_actor)
      AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
      AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
      AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
    )
  ) THEN
    RAISE EXCEPTION 'PLATFORM_OPERATOR_REQUIRED';
  END IF;

  IF v_type NOT IN (
    'company', 'user', 'landlord', 'property_manager', 'billing_group', 'subscription',
    'property', 'unit', 'marketplace_listing', 'crm_lead', 'crm_deal', 'crm_account',
    'guest_booking', 'vendor'
  ) THEN
    RAISE EXCEPTION 'INVALID_GLOBAL_ENTITY_TYPE';
  END IF;

  WITH entities AS MATERIALIZED (
    -- 1. Company
    SELECT 'company'::text AS entity_type, c.id AS entity_id, c.name AS label, c.email AS secondary_label,
      c.id AS company_id, c.owner_id AS user_id, NULL::uuid AS billing_group_id, NULL::uuid AS subscription_id,
      CASE WHEN pv.state = 'verified' THEN 'verified' ELSE 'unverified' END AS status, c.created_at,
      jsonb_build_object('owner_id', c.owner_id, 'phone', c.phone) AS metadata
    FROM public.companies c
    LEFT JOIN public.publisher_verifications pv ON pv.company_id = c.id
    WHERE v_type = 'company'

    UNION ALL
    -- 2. User
    SELECT 'user', p.user_id, coalesce(nullif(p.name, ''), p.email, p.user_id::text), p.email,
      NULL, p.user_id, NULL, NULL, NULL, p.created_at, '{}'::jsonb
    FROM public.profiles p WHERE v_type = 'user'

    UNION ALL
    -- 3. Landlord
    SELECT 'landlord', c.owner_id, coalesce(nullif(p.name, ''), p.email, c.owner_id::text), p.email,
      NULL, c.owner_id, NULL, NULL, 'active', min(c.created_at),
      jsonb_build_object('company_count', count(c.id), 'company_ids', jsonb_agg(c.id ORDER BY c.created_at DESC))
    FROM public.companies c LEFT JOIN public.profiles p ON p.user_id = c.owner_id
    WHERE v_type = 'landlord' GROUP BY c.owner_id, p.name, p.email

    UNION ALL
    -- 4. Property Manager
    SELECT 'property_manager', cm.user_id, coalesce(nullif(p.name, ''), p.email, cm.user_id::text), p.email,
      NULL, cm.user_id, NULL, NULL, 'approved', min(cm.created_at),
      jsonb_build_object('company_count', count(DISTINCT cm.company_id), 'company_ids', jsonb_agg(DISTINCT cm.company_id))
    FROM public.company_members cm LEFT JOIN public.profiles p ON p.user_id = cm.user_id
    WHERE v_type = 'property_manager' AND cm.role = 'property_manager' AND cm.status = 'approved'
    GROUP BY cm.user_id, p.name, p.email

    UNION ALL
    -- 5. Billing Group
    SELECT 'billing_group', g.id, g.name, g.owner_id::text, NULL, g.owner_id, g.id, NULL, g.status, g.created_at,
      jsonb_build_object('member_count', (SELECT count(*) FROM public.owner_billing_group_members m WHERE m.group_id = g.id))
    FROM public.owner_billing_groups g WHERE v_type = 'billing_group'

    UNION ALL
    -- 6. Subscription (Company)
    SELECT 'subscription', s.id, c.name || ' / ' || p.name, c.email, c.id, c.owner_id, NULL, s.id, s.status, s.created_at,
      jsonb_build_object('scope_type', 'company', 'plan_id', s.plan_id, 'plan_code', p.code, 'plan_name', p.name,
        'product_id', s.product_id, 'grace_end_at', s.grace_end_at, 'trial_end_at', s.trial_end_at)
    FROM public.saas_company_plan_subscriptions s JOIN public.companies c ON c.id = s.company_id JOIN public.saas_plans p ON p.id = s.plan_id
    WHERE v_type = 'subscription'

    UNION ALL
    -- 6b. Subscription (Group)
    SELECT 'subscription', s.id, g.name || ' / ' || p.name, g.owner_id::text, NULL, g.owner_id, g.id, s.id, s.status, s.created_at,
      jsonb_build_object('scope_type', 'owner_group', 'plan_id', s.plan_id, 'plan_code', p.code, 'plan_name', p.name,
        'payment_state', s.payment_state, 'grace_end_at', s.grace_end_at, 'next_renewal_at', s.next_renewal_at)
    FROM public.saas_owner_group_plan_subscriptions s JOIN public.owner_billing_groups g ON g.id = s.group_id JOIN public.saas_plans p ON p.id = s.plan_id
    WHERE v_type = 'subscription'

    UNION ALL
    -- 7. Property
    SELECT 'property', prop.id, prop.name, coalesce(prop.city, prop.address, c.name),
      prop.company_id, prop.created_by, NULL, NULL, coalesce(prop.status, 'active'), prop.created_at,
      jsonb_build_object('company_name', c.name, 'city', prop.city, 'address', prop.address)
    FROM public.properties prop
    LEFT JOIN public.companies c ON c.id = prop.company_id
    WHERE v_type = 'property'

    UNION ALL
    -- 8. Unit
    SELECT 'unit', u.id, coalesce(u.unit_number, 'Unit #' || u.id), coalesce(prop.name, c.name),
      prop.company_id, NULL, NULL, NULL, coalesce(u.status, 'vacant'), u.created_at,
      jsonb_build_object('property_name', prop.name, 'company_name', c.name, 'rent_amount', u.rent_amount)
    FROM public.units u
    LEFT JOIN public.properties prop ON prop.id = u.property_id
    LEFT JOIN public.companies c ON c.id = prop.company_id
    WHERE v_type = 'unit'

    UNION ALL
    -- 9. Marketplace Listing
    SELECT 'marketplace_listing', ml.id, ml.title, coalesce(ml.city, c.name),
      ml.company_id, ml.created_by, NULL, NULL, ml.status, ml.created_at,
      jsonb_build_object('company_name', c.name, 'rent_amount', ml.rent_amount, 'currency', ml.currency, 'slug', ml.slug)
    FROM public.marketplace_listings ml
    LEFT JOIN public.companies c ON c.id = ml.company_id
    WHERE v_type = 'marketplace_listing'

    UNION ALL
    -- 10. CRM Lead
    SELECT 'crm_lead', l.id, coalesce(lc.full_name, 'Lead #' || l.id), coalesce(lc.email, lc.phone_e164, c.name),
      l.company_id, l.created_by, NULL, NULL, l.stage, l.created_at,
      jsonb_build_object('company_name', c.name, 'stage', l.stage, 'source', l.source, 'contact_name', lc.full_name)
    FROM public.leads l
    LEFT JOIN public.lead_contacts lc ON lc.lead_id = l.id
    LEFT JOIN public.companies c ON c.id = l.company_id
    WHERE v_type = 'crm_lead'

    UNION ALL
    -- 11. CRM Deal
    SELECT 'crm_deal', d.id, d.deal_name, coalesce(c.name, 'Deal #' || d.id),
      d.company_id, NULL, NULL, NULL, coalesce(l.stage, 'open'), d.created_at,
      jsonb_build_object('company_name', c.name, 'amount', d.amount, 'currency', d.currency, 'stage', l.stage)
    FROM public.crm_deals d
    LEFT JOIN public.leads l ON l.id = d.lead_id
    LEFT JOIN public.companies c ON c.id = d.company_id
    WHERE v_type = 'crm_deal'

    UNION ALL
    -- 12. CRM Account
    SELECT 'crm_account', a.id, a.name, coalesce(a.industry, a.account_kind, c.name),
      a.company_id, a.created_by, NULL, NULL, coalesce(a.status, 'active'), a.created_at,
      jsonb_build_object('company_name', c.name, 'industry', a.industry, 'account_kind', a.account_kind)
    FROM public.crm_accounts a
    LEFT JOIN public.companies c ON c.id = a.company_id
    WHERE v_type = 'crm_account'

    UNION ALL
    -- 13. Guest Booking
    SELECT 'guest_booking', b.id, b.guest_name, coalesce(b.guest_email, prop.name, c.name),
      prop.company_id, b.user_id, NULL, NULL, b.status, b.created_at,
      jsonb_build_object('company_name', c.name, 'property_name', prop.name, 'check_in', b.check_in, 'check_out', b.check_out, 'total_amount', b.total_amount)
    FROM public.bookings b
    LEFT JOIN public.properties prop ON prop.id = b.property_id
    LEFT JOIN public.companies c ON c.id = prop.company_id
    WHERE v_type = 'guest_booking'

    UNION ALL
    -- 14. Vendor
    SELECT 'vendor', v.id, v.name, coalesce(v.vendor_type, v.email, c.name),
      v.company_id, NULL, NULL, NULL, coalesce(v.status, 'active'), v.created_at,
      jsonb_build_object('company_name', c.name, 'vendor_type', v.vendor_type, 'phone', v.phone)
    FROM public.vendors v
    LEFT JOIN public.companies c ON c.id = v.company_id
    WHERE v_type = 'vendor'
  ), filtered AS MATERIALIZED (
    SELECT * FROM entities e
    WHERE (v_status IS NULL OR lower(coalesce(e.status, '')) = v_status)
      AND (v_search IS NULL OR lower(e.label) LIKE '%' || v_search || '%'
        OR lower(coalesce(e.secondary_label, '')) LIKE '%' || v_search || '%'
        OR e.entity_id::text = v_search OR e.company_id::text = v_search
        OR e.user_id::text = v_search OR e.billing_group_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC NULLS LAST, entity_id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC NULLS LAST, entity_id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered)
  INTO v_rows, v_total_count;

  RETURN jsonb_build_object('entity_type', v_type, 'rows', v_rows, 'page', v_page,
    'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_search_global_entities(text,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_search_global_entities(text,text,text,integer,integer) TO authenticated, service_role;
