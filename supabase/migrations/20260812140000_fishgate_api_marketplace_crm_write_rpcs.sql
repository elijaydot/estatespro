-- FishGate API Marketplace and CRM writes. All tenant and actor values are
-- server-derived; payload fields are explicitly allow-listed.

CREATE OR REPLACE FUNCTION public.api_create_marketplace_listing(p_api_key_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'marketplace:write','full'); v_actor uuid; v_property uuid; v_unit uuid; v_id uuid := gen_random_uuid(); v_slug text; v_row public.marketplace_listings%ROWTYPE;
BEGIN
  SELECT owner_id INTO v_actor FROM public.companies WHERE id=v_company;
  IF v_actor IS NULL OR nullif(btrim(p_payload->>'title'),'') IS NULL OR nullif(btrim(p_payload->>'city'),'') IS NULL OR NOT (p_payload ? 'rent_amount') THEN RAISE EXCEPTION 'API_VALIDATION_FAILED:listing_required_fields'; END IF;
  v_property := nullif(p_payload->>'property_id','')::uuid; v_unit := nullif(p_payload->>'unit_id','')::uuid;
  IF v_property IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.properties WHERE id=v_property AND company_id=v_company) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF v_unit IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.units unit JOIN public.properties property ON property.id=unit.property_id WHERE unit.id=v_unit AND property.company_id=v_company AND (v_property IS NULL OR unit.property_id=v_property)) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  v_slug := coalesce(nullif(btrim(p_payload->>'slug'),''), trim(both '-' from regexp_replace(lower(btrim(p_payload->>'title')),'[^a-z0-9]+','-','g')) || '-' || left(v_id::text,8));
  IF v_slug = '' THEN RAISE EXCEPTION 'API_VALIDATION_FAILED:slug'; END IF;
  INSERT INTO public.marketplace_listings(id,company_id,property_id,unit_id,title,slug,description,city,area,rent_amount,currency,bedrooms,bathrooms,available_from,status,verification_state,created_by,latitude,longitude)
  VALUES (v_id,v_company,v_property,v_unit,btrim(p_payload->>'title'),lower(v_slug),nullif(btrim(p_payload->>'description'),''),btrim(p_payload->>'city'),nullif(btrim(p_payload->>'area'),''),(p_payload->>'rent_amount')::numeric,coalesce(nullif(btrim(p_payload->>'currency'),''),'NGN'),nullif(p_payload->>'bedrooms','')::integer,nullif(p_payload->>'bathrooms','')::integer,nullif(p_payload->>'available_from','')::date,'draft','unverified',v_actor,nullif(p_payload->>'latitude','')::numeric,nullif(p_payload->>'longitude','')::numeric)
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row)-'company_id'-'created_by'-'address_hash';
END; $$;

CREATE OR REPLACE FUNCTION public.api_update_marketplace_listing(p_api_key_id uuid,p_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'marketplace:write','full'); v_row public.marketplace_listings%ROWTYPE;
BEGIN
  UPDATE public.marketplace_listings listing SET
    title=CASE WHEN p_payload?'title' THEN nullif(btrim(p_payload->>'title'),'') ELSE listing.title END,
    description=CASE WHEN p_payload?'description' THEN nullif(btrim(p_payload->>'description'),'') ELSE listing.description END,
    city=CASE WHEN p_payload?'city' THEN nullif(btrim(p_payload->>'city'),'') ELSE listing.city END,
    area=CASE WHEN p_payload?'area' THEN nullif(btrim(p_payload->>'area'),'') ELSE listing.area END,
    rent_amount=CASE WHEN p_payload?'rent_amount' THEN (p_payload->>'rent_amount')::numeric ELSE listing.rent_amount END,
    currency=CASE WHEN p_payload?'currency' THEN nullif(btrim(p_payload->>'currency'),'') ELSE listing.currency END,
    bedrooms=CASE WHEN p_payload?'bedrooms' THEN nullif(p_payload->>'bedrooms','')::integer ELSE listing.bedrooms END,
    bathrooms=CASE WHEN p_payload?'bathrooms' THEN nullif(p_payload->>'bathrooms','')::integer ELSE listing.bathrooms END,
    available_from=CASE WHEN p_payload?'available_from' THEN nullif(p_payload->>'available_from','')::date ELSE listing.available_from END,
    latitude=CASE WHEN p_payload?'latitude' THEN nullif(p_payload->>'latitude','')::numeric ELSE listing.latitude END,
    longitude=CASE WHEN p_payload?'longitude' THEN nullif(p_payload->>'longitude','')::numeric ELSE listing.longitude END,
    updated_at=now()
  WHERE listing.id=p_id AND listing.company_id=v_company RETURNING listing.* INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF;
  RETURN to_jsonb(v_row)-'company_id'-'created_by'-'address_hash';
END; $$;

CREATE OR REPLACE FUNCTION public.api_create_marketplace_inquiry(p_api_key_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'marketplace:write','full'); v_listing uuid := nullif(p_payload->>'listing_id','')::uuid; v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.marketplace_listings WHERE id=v_listing AND company_id=v_company) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  SELECT jsonb_build_object('inquiry_id',result.inquiry_id,'lead_id',result.lead_id,'reused',result.reused) INTO v_result
  FROM public.create_marketplace_inquiry(v_listing,p_api_key_id::text||':'||(p_payload->>'_idempotency_key'),p_payload->>'full_name',p_payload->>'phone_e164',p_payload->>'email',p_payload->>'message',nullif(p_payload->>'move_in_date','')::date,nullif(p_payload->>'budget_min','')::numeric,nullif(p_payload->>'budget_max','')::numeric,coalesce((p_payload->>'consent_marketing')::boolean,false),p_payload->>'_source_ip') result;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.api_create_crm_lead(p_api_key_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'crm:write','full'); v_listing uuid := nullif(p_payload->>'listing_id','')::uuid; v_source text := coalesce(nullif(p_payload->>'source',''),'manual'); v_row public.leads%ROWTYPE;
BEGIN
  IF v_source NOT IN ('manual','referral','other','system_alert') THEN RAISE EXCEPTION 'API_VALIDATION_FAILED:source'; END IF;
  IF v_listing IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.marketplace_listings WHERE id=v_listing AND company_id=v_company) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  INSERT INTO public.leads(company_id,listing_id,source,pipeline_kind,stage,status,priority,score,lost_reason,first_seen_at,last_activity_at)
  VALUES(v_company,v_listing,v_source,coalesce(nullif(p_payload->>'pipeline_kind',''),'leasing'),coalesce(nullif(p_payload->>'stage',''),'new'),coalesce(nullif(p_payload->>'status',''),'open'),coalesce(nullif(p_payload->>'priority',''),'normal'),coalesce((p_payload->>'score')::integer,0),nullif(btrim(p_payload->>'lost_reason'),''),now(),now()) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row)-'company_id'-'created_by'-'assigned_to';
END; $$;

CREATE OR REPLACE FUNCTION public.api_update_crm_lead(p_api_key_id uuid,p_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'crm:write','full'); v_before_stage text; v_row public.leads%ROWTYPE;
BEGIN
  SELECT stage INTO v_before_stage FROM public.leads WHERE id=p_id AND company_id=v_company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF;
  UPDATE public.leads lead SET
    stage=CASE WHEN p_payload?'stage' THEN p_payload->>'stage' ELSE lead.stage END,
    status=CASE WHEN p_payload?'status' THEN p_payload->>'status' ELSE lead.status END,
    priority=CASE WHEN p_payload?'priority' THEN p_payload->>'priority' ELSE lead.priority END,
    score=CASE WHEN p_payload?'score' THEN (p_payload->>'score')::integer ELSE lead.score END,
    lost_reason=CASE WHEN p_payload?'lost_reason' THEN nullif(btrim(p_payload->>'lost_reason'),'') ELSE lead.lost_reason END,
    converted_at=CASE WHEN coalesce(p_payload->>'status',lead.status)='won' THEN coalesce(lead.converted_at,now()) WHEN coalesce(p_payload->>'status',lead.status)='open' THEN NULL ELSE lead.converted_at END,
    last_activity_at=now(),updated_at=now()
  WHERE lead.id=p_id AND lead.company_id=v_company RETURNING lead.* INTO v_row;
  IF v_row.stage IS DISTINCT FROM v_before_stage THEN INSERT INTO public.lead_stage_history(lead_id,from_stage,to_stage,reason) VALUES(p_id,v_before_stage,v_row.stage,'FishGate Public API'); END IF;
  RETURN to_jsonb(v_row)-'company_id'-'created_by'-'assigned_to';
END; $$;

CREATE OR REPLACE FUNCTION public.api_create_crm_deal(p_api_key_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'crm:write','full'); v_lead uuid := nullif(p_payload->>'lead_id','')::uuid; v_row public.crm_deals%ROWTYPE;
BEGIN
  IF nullif(btrim(p_payload->>'deal_name'),'') IS NULL OR NOT EXISTS (SELECT 1 FROM public.leads WHERE id=v_lead AND company_id=v_company) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF nullif(p_payload->>'account_id','') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.crm_accounts WHERE id=(p_payload->>'account_id')::uuid AND company_id=v_company) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF nullif(p_payload->>'contact_id','') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lead_contacts WHERE id=(p_payload->>'contact_id')::uuid AND lead_id=v_lead) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF nullif(p_payload->>'listing_id','') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.marketplace_listings WHERE id=(p_payload->>'listing_id')::uuid AND company_id=v_company) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF nullif(p_payload->>'unit_id','') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.units unit JOIN public.properties property ON property.id=unit.property_id WHERE unit.id=(p_payload->>'unit_id')::uuid AND property.company_id=v_company) THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  INSERT INTO public.crm_deals(company_id,lead_id,account_id,contact_id,listing_id,unit_id,deal_name,amount,currency,probability,expected_close_date)
  VALUES(v_company,v_lead,nullif(p_payload->>'account_id','')::uuid,nullif(p_payload->>'contact_id','')::uuid,nullif(p_payload->>'listing_id','')::uuid,nullif(p_payload->>'unit_id','')::uuid,btrim(p_payload->>'deal_name'),nullif(p_payload->>'amount','')::numeric,coalesce(nullif(p_payload->>'currency',''),'NGN'),coalesce((p_payload->>'probability')::integer,10),nullif(p_payload->>'expected_close_date','')::date) RETURNING * INTO v_row;
  IF p_payload?'stage' THEN PERFORM public.crm_update_deal_and_lead_stage(v_row.id,v_company,p_payload->>'stage',v_row.probability,v_row.amount,v_row.owner_user_id,v_row.expected_close_date); END IF;
  RETURN to_jsonb(v_row)-'company_id'-'created_by'-'owner_user_id';
END; $$;

CREATE OR REPLACE FUNCTION public.api_update_crm_deal(p_api_key_id uuid,p_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id,'crm:write','full'); v_row public.crm_deals%ROWTYPE; v_stage text;
BEGIN
  UPDATE public.crm_deals deal SET deal_name=CASE WHEN p_payload?'deal_name' THEN nullif(btrim(p_payload->>'deal_name'),'') ELSE deal.deal_name END,currency=CASE WHEN p_payload?'currency' THEN nullif(p_payload->>'currency','') ELSE deal.currency END,updated_at=now()
  WHERE deal.id=p_id AND deal.company_id=v_company RETURNING deal.* INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF;
  SELECT stage INTO v_stage FROM public.leads WHERE id=v_row.lead_id AND company_id=v_company;
  PERFORM public.crm_update_deal_and_lead_stage(p_id,v_company,coalesce(p_payload->>'stage',v_stage),CASE WHEN p_payload?'probability' THEN (p_payload->>'probability')::integer ELSE v_row.probability END,CASE WHEN p_payload?'amount' THEN nullif(p_payload->>'amount','')::numeric ELSE v_row.amount END,v_row.owner_user_id,CASE WHEN p_payload?'expected_close_date' THEN nullif(p_payload->>'expected_close_date','')::date ELSE v_row.expected_close_date END);
  SELECT * INTO v_row FROM public.crm_deals WHERE id=p_id;
  RETURN to_jsonb(v_row)-'company_id'-'created_by'-'owner_user_id';
END; $$;

DO $$ DECLARE v_signature text; BEGIN FOREACH v_signature IN ARRAY ARRAY[
  'public.api_create_marketplace_listing(uuid,jsonb)','public.api_update_marketplace_listing(uuid,uuid,jsonb)','public.api_create_marketplace_inquiry(uuid,jsonb)',
  'public.api_create_crm_lead(uuid,jsonb)','public.api_update_crm_lead(uuid,uuid,jsonb)','public.api_create_crm_deal(uuid,jsonb)','public.api_update_crm_deal(uuid,uuid,jsonb)'
] LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',v_signature); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_signature); END LOOP; END $$;