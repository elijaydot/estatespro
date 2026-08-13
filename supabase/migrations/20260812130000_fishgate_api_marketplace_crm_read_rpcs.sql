-- Marketplace, CRM, and remaining Full-tier read surfaces. The pagination core
-- accepts only named resources from this fixed allow-list.

CREATE OR REPLACE FUNCTION public.api_get_scoped_resource_page(
  p_api_key_id uuid, p_resource text, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table text; v_scope text; v_tier text; v_status_column text; v_order_column text := 'created_at'; v_strip text[];
  v_company uuid; v_page integer := greatest(1, coalesce(p_page, 1));
  v_size integer := least(100, greatest(1, coalesce(p_per_page, 20))); v_rows jsonb; v_total bigint; v_sql text;
BEGIN
  CASE p_resource
    WHEN 'marketplace_listings' THEN v_table := 'marketplace_listings'; v_scope := 'marketplace:read'; v_tier := 'limited'; v_status_column := 'status'; v_strip := ARRAY['company_id','created_by','address_hash'];
    WHEN 'marketplace_inquiries' THEN v_table := 'marketplace_inquiries'; v_scope := 'marketplace:read'; v_tier := 'full'; v_status_column := 'risk_state'; v_strip := ARRAY['company_id','idempotency_key','source_ip'];
    WHEN 'crm_leads' THEN v_table := 'leads'; v_scope := 'crm:read'; v_tier := 'limited'; v_status_column := 'status'; v_strip := ARRAY['company_id','created_by','assigned_to'];
    WHEN 'crm_accounts' THEN v_table := 'crm_accounts'; v_scope := 'crm:read'; v_tier := 'full'; v_status_column := NULL; v_strip := ARRAY['company_id','created_by','owner_user_id','metadata'];
    WHEN 'crm_documents' THEN v_table := 'crm_documents'; v_scope := 'crm:read'; v_tier := 'full'; v_status_column := NULL; v_strip := ARRAY['company_id','uploaded_by','storage_path'];
    WHEN 'crm_trust_flags' THEN v_table := 'crm_trust_flags'; v_scope := 'crm:read'; v_tier := 'full'; v_status_column := 'state'; v_strip := ARRAY['company_id','metadata','source_id'];
    WHEN 'crm_automation_runs' THEN v_table := 'crm_automation_runs'; v_scope := 'crm:read'; v_tier := 'full'; v_status_column := 'status'; v_strip := ARRAY['company_id','payload_json','result_json'];
    WHEN 'vendors' THEN v_table := 'vendors'; v_scope := 'pm:read'; v_tier := 'full'; v_status_column := 'status'; v_strip := ARRAY['company_id','created_by','notes'];
    WHEN 'property_manager_assignments' THEN v_table := 'property_manager_assignments'; v_scope := 'pm:read'; v_tier := 'full'; v_status_column := NULL; v_strip := ARRAY['company_id','assigned_by'];
    ELSE RAISE EXCEPTION 'API_RESOURCE_NOT_ALLOWED';
  END CASE;
  v_company := public.api_authorized_company_id(p_api_key_id, v_scope, v_tier);
  v_sql := format(
    'WITH filtered AS MATERIALIZED (SELECT * FROM public.%I row WHERE row.company_id = $1 AND ($2 IS NULL OR row.id = $2)%s),
     paged AS (SELECT * FROM filtered ORDER BY %I DESC, id DESC OFFSET ($3 - 1) * $4 LIMIT $4)
     SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) - $6 ORDER BY %I DESC, id DESC) FROM paged), ''[]''::jsonb),
       (SELECT count(*) FROM filtered)',
    v_table, CASE WHEN v_status_column IS NULL THEN '' ELSE format(' AND ($5 IS NULL OR row.%I = $5)', v_status_column) END,
    v_order_column, v_order_column
  );
  EXECUTE v_sql INTO v_rows, v_total USING v_company, p_id, v_page, v_size, p_status, v_strip;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total);
END; $$;

CREATE OR REPLACE FUNCTION public.api_get_marketplace_listings(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'marketplace_listings', p_id, p_page, p_per_page, p_status); $$;
CREATE OR REPLACE FUNCTION public.api_get_marketplace_inquiries(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'marketplace_inquiries', p_id, p_page, p_per_page, p_status); $$;
CREATE OR REPLACE FUNCTION public.api_get_crm_leads(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'crm_leads', p_id, p_page, p_per_page, p_status); $$;
CREATE OR REPLACE FUNCTION public.api_get_crm_deals(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'crm:read', 'full'); v_page integer := greatest(1,p_page); v_size integer := least(100,greatest(1,p_per_page)); v_rows jsonb; v_total bigint;
BEGIN WITH filtered AS MATERIALIZED (
  SELECT deal.id, deal.lead_id, deal.account_id, deal.contact_id, deal.listing_id, deal.unit_id, deal.deal_name, deal.amount,
    deal.currency, lead.stage, lead.status, deal.probability, deal.expected_close_date, deal.created_at, deal.updated_at
  FROM public.crm_deals deal JOIN public.leads lead ON lead.id=deal.lead_id AND lead.company_id=deal.company_id
  WHERE deal.company_id=v_company AND (p_id IS NULL OR deal.id=p_id) AND (p_status IS NULL OR lead.stage=p_status)
), paged AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC OFFSET (v_page-1)*v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC,id DESC) FROM paged),'[]'::jsonb),(SELECT count(*) FROM filtered) INTO v_rows,v_total;
RETURN jsonb_build_object('rows',v_rows,'page',v_page,'per_page',v_size,'total',v_total,'has_more',v_page*v_size<v_total); END; $$;
CREATE OR REPLACE FUNCTION public.api_get_crm_accounts(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'crm_accounts', p_id, p_page, p_per_page, p_status); $$;
CREATE OR REPLACE FUNCTION public.api_get_crm_documents(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'crm_documents', p_id, p_page, p_per_page, p_status); $$;
CREATE OR REPLACE FUNCTION public.api_get_crm_trust_flags(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'crm_trust_flags', p_id, p_page, p_per_page, p_status); $$;
CREATE OR REPLACE FUNCTION public.api_get_vendors(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'vendors', p_id, p_page, p_per_page, p_status); $$;
CREATE OR REPLACE FUNCTION public.api_get_property_manager_assignments(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.api_get_scoped_resource_page(p_api_key_id, 'property_manager_assignments', p_id, p_page, p_per_page, p_status); $$;

CREATE OR REPLACE FUNCTION public.api_get_crm_activity(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'crm:read', 'full'); v_page integer := greatest(1,p_page); v_size integer := least(100,greatest(1,p_per_page)); v_rows jsonb; v_total bigint;
BEGIN WITH activity AS MATERIALIZED (
  SELECT call.id, 'call'::text AS activity_type, call.subject AS title, call.started_at AS starts_at, call.result AS outcome, call.created_at FROM public.crm_calls call WHERE call.company_id = v_company
  UNION ALL SELECT meeting.id, 'meeting', meeting.title, meeting.starts_at, meeting.status, meeting.created_at FROM public.crm_meetings meeting WHERE meeting.company_id = v_company
  UNION ALL SELECT visit.id, 'visit', coalesce(visit.locality, visit.address_text, 'Property visit'), visit.check_in_at, visit.outcome, visit.created_at FROM public.crm_visits visit WHERE visit.company_id = v_company
), filtered AS (SELECT * FROM activity WHERE p_id IS NULL OR id = p_id), paged AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC OFFSET (v_page-1)*v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC,id DESC) FROM paged),'[]'::jsonb),(SELECT count(*) FROM filtered) INTO v_rows,v_total;
RETURN jsonb_build_object('rows',v_rows,'page',v_page,'per_page',v_size,'total',v_total,'has_more',v_page*v_size<v_total); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_crm_automation_log(p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1, p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'crm:read', 'full'); v_page integer := greatest(1,p_page); v_size integer := least(100,greatest(1,p_per_page)); v_rows jsonb; v_total bigint;
BEGIN WITH log_rows AS MATERIALIZED (
  SELECT run.id, 'run'::text AS record_type, run.event_type, run.status, run.attempts, run.max_attempts, run.last_error, run.next_retry_at, run.created_at FROM public.crm_automation_runs run WHERE run.company_id=v_company
  UNION ALL SELECT log.id, 'followup', log.source_type, log.status, 0, 0, CASE WHEN log.status='failed' THEN log.message ELSE NULL END, NULL::timestamptz, log.created_at FROM public.crm_followup_automation_log log WHERE log.company_id=v_company
), filtered AS (SELECT * FROM log_rows WHERE (p_id IS NULL OR id=p_id) AND (p_status IS NULL OR status=p_status)), paged AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC OFFSET (v_page-1)*v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC,id DESC) FROM paged),'[]'::jsonb),(SELECT count(*) FROM filtered) INTO v_rows,v_total;
RETURN jsonb_build_object('rows',v_rows,'page',v_page,'per_page',v_size,'total',v_total,'has_more',v_page*v_size<v_total); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_marketplace_verification_status(p_api_key_id uuid, p_listing_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'marketplace:read','full'); v_result jsonb;
BEGIN SELECT jsonb_build_object('listing_id',listing.id,'listing_state',listing.verification_state,'publisher_state',verification.state,
  'verified_at',verification.verified_at,'rejection_reason',verification.rejection_reason,
  'documents',coalesce((SELECT jsonb_agg(jsonb_build_object('id',document.id,'document_type',document.document_type,'state',document.state,'reviewed_at',document.reviewed_at,'rejection_reason',document.rejection_reason,'created_at',document.created_at) ORDER BY document.created_at DESC) FROM public.verification_documents document WHERE document.verification_id=verification.id),'[]'::jsonb))
INTO v_result FROM public.marketplace_listings listing LEFT JOIN public.publisher_verifications verification ON verification.company_id=listing.company_id WHERE listing.id=p_listing_id AND listing.company_id=v_company;
IF v_result IS NULL THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF; RETURN v_result; END; $$;

CREATE OR REPLACE FUNCTION public.api_get_company(p_api_key_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'pm:read','limited'); v_result jsonb;
BEGIN SELECT jsonb_build_object('id',company.id,'name',company.name,'logo_url',company.logo_url,'address',company.address,'email',company.email,'phone',company.phone,'is_verified',company.is_verified,
  'members',coalesce((SELECT jsonb_agg(jsonb_build_object('id',member.id,'role',member.role,'status',member.status,'created_at',member.created_at) ORDER BY member.created_at) FROM public.company_members member WHERE member.company_id=company.id),'[]'::jsonb))
INTO v_result FROM public.companies company WHERE company.id=v_company; RETURN v_result; END; $$;

CREATE OR REPLACE FUNCTION public.api_get_subscription(p_api_key_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'pm:read','full');
BEGIN RETURN jsonb_build_object('access_state',(SELECT access_state FROM public.saas_company_billing_access_states WHERE company_id=v_company),
  'plans',coalesce((SELECT jsonb_agg(jsonb_build_object('id',subscription.id,'product_code',product.code,'plan_code',plan.code,'plan_name',plan.name,'status',subscription.status,'start_at',subscription.start_at,'end_at',subscription.end_at,'trial_end_at',subscription.trial_end_at,'grace_end_at',subscription.grace_end_at)) FROM public.saas_company_plan_subscriptions subscription JOIN public.saas_products product ON product.id=subscription.product_id JOIN public.saas_plans plan ON plan.id=subscription.plan_id WHERE subscription.company_id=v_company),'[]'::jsonb),
  'addons',coalesce((SELECT jsonb_agg(jsonb_build_object('id',subscription.id,'addon_code',addon.code,'addon_name',addon.name,'status',subscription.status,'start_at',subscription.start_at,'end_at',subscription.end_at)) FROM public.saas_company_addon_subscriptions subscription JOIN public.saas_addons addon ON addon.id=subscription.addon_id WHERE subscription.company_id=v_company),'[]'::jsonb)); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_lease_inventory(p_api_key_id uuid, p_lease_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'pm:read','full'); v_result jsonb;
BEGIN SELECT jsonb_build_object('lease_id',p_lease_id,'snapshots',coalesce(jsonb_agg(jsonb_build_object('id',snapshot.id,'tenant_id',snapshot.tenant_id,'property_id',snapshot.property_id,'unit_id',snapshot.unit_id,'phase',snapshot.phase,'status',snapshot.status,'notes',snapshot.notes,'captured_at',snapshot.captured_at,'created_at',snapshot.created_at,
  'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',item.id,'item_name',item.item_name,'item_category',item.item_category,'condition',item.condition,'notes',item.notes,'photo_url',item.photo_url,'damage_cost',item.damage_cost) ORDER BY item.item_category,item.item_name) FROM public.lease_inventory_items item WHERE item.snapshot_id=snapshot.id),'[]'::jsonb)) ORDER BY snapshot.created_at DESC),'[]'::jsonb)) INTO v_result
FROM public.lease_inventory_snapshots snapshot JOIN public.properties property ON property.id=snapshot.property_id WHERE snapshot.lease_id=p_lease_id AND property.company_id=v_company;
RETURN coalesce(v_result,jsonb_build_object('lease_id',p_lease_id,'snapshots','[]'::jsonb)); END; $$;

DO $$ DECLARE v_signature text; BEGIN FOREACH v_signature IN ARRAY ARRAY[
  'public.api_get_scoped_resource_page(uuid,text,uuid,integer,integer,text)',
  'public.api_get_marketplace_listings(uuid,uuid,integer,integer,text,text)','public.api_get_marketplace_inquiries(uuid,uuid,integer,integer,text,text)',
  'public.api_get_crm_leads(uuid,uuid,integer,integer,text,text)','public.api_get_crm_deals(uuid,uuid,integer,integer,text,text)',
  'public.api_get_crm_accounts(uuid,uuid,integer,integer,text,text)','public.api_get_crm_documents(uuid,uuid,integer,integer,text,text)',
  'public.api_get_crm_activity(uuid,uuid,integer,integer,text,text)','public.api_get_crm_automation_log(uuid,uuid,integer,integer,text,text)',
  'public.api_get_crm_trust_flags(uuid,uuid,integer,integer,text,text)','public.api_get_vendors(uuid,uuid,integer,integer,text,text)',
  'public.api_get_property_manager_assignments(uuid,uuid,integer,integer,text,text)','public.api_get_marketplace_verification_status(uuid,uuid)',
  'public.api_get_company(uuid)','public.api_get_subscription(uuid)','public.api_get_lease_inventory(uuid,uuid)'
] LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',v_signature); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_signature); END LOOP; END $$;