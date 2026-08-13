-- FishGate API Property Management writes. Payloads are allow-listed and every
-- ownership relationship is checked against the company derived from api_key_id.

CREATE OR REPLACE FUNCTION public.api_begin_idempotency(
  p_api_key_id uuid, p_idempotency_key text, p_request_fingerprint text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_record public.api_idempotency_records%ROWTYPE; v_inserted integer := 0;
BEGIN
  IF char_length(p_idempotency_key) < 8 OR char_length(p_idempotency_key) > 255 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY';
  END IF;
  DELETE FROM public.api_idempotency_records
  WHERE api_key_id = p_api_key_id AND idempotency_key = p_idempotency_key AND expires_at <= now();

  INSERT INTO public.api_idempotency_records(api_key_id, idempotency_key, request_fingerprint)
  VALUES (p_api_key_id, p_idempotency_key, p_request_fingerprint)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 1 THEN RETURN jsonb_build_object('state', 'started'); END IF;

  SELECT * INTO v_record FROM public.api_idempotency_records
  WHERE api_key_id = p_api_key_id AND idempotency_key = p_idempotency_key FOR UPDATE;
  IF v_record.request_fingerprint <> p_request_fingerprint THEN
    RETURN jsonb_build_object('state', 'conflict');
  END IF;
  IF v_record.response_status IS NOT NULL THEN
    RETURN jsonb_build_object('state', 'replay', 'response_status', v_record.response_status, 'response_body', v_record.response_body);
  END IF;
  IF v_record.created_at < now() - interval '2 minutes' THEN
    UPDATE public.api_idempotency_records SET created_at = now() WHERE api_key_id = p_api_key_id AND idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('state', 'started');
  END IF;
  RETURN jsonb_build_object('state', 'in_progress');
END; $$;

CREATE OR REPLACE FUNCTION public.api_complete_idempotency(
  p_api_key_id uuid, p_idempotency_key text, p_response_status integer, p_response_body jsonb
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.api_idempotency_records SET response_status = p_response_status, response_body = p_response_body
  WHERE api_key_id = p_api_key_id AND idempotency_key = p_idempotency_key AND response_status IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.api_create_property(p_api_key_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_owner uuid; v_row public.properties%ROWTYPE;
BEGIN
  SELECT owner_id INTO v_owner FROM public.companies WHERE id = v_company;
  IF nullif(btrim(p_payload->>'name'), '') IS NULL OR nullif(btrim(p_payload->>'address'), '') IS NULL
     OR nullif(btrim(p_payload->>'city'), '') IS NULL OR nullif(btrim(p_payload->>'state'), '') IS NULL
     OR nullif(btrim(p_payload->>'zip_code'), '') IS NULL THEN RAISE EXCEPTION 'API_VALIDATION_FAILED:required_property_fields'; END IF;
  INSERT INTO public.properties(company_id, user_id, name, address, city, state, zip_code, country, type, description)
  VALUES (v_company, v_owner, btrim(p_payload->>'name'), btrim(p_payload->>'address'), btrim(p_payload->>'city'),
    btrim(p_payload->>'state'), btrim(p_payload->>'zip_code'), coalesce(nullif(btrim(p_payload->>'country'), ''), 'Ghana'),
    coalesce(nullif(p_payload->>'type', ''), 'apartment'), nullif(btrim(p_payload->>'description'), '')) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row) - 'user_id' - 'company_id';
END; $$;

CREATE OR REPLACE FUNCTION public.api_update_property(p_api_key_id uuid, p_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_row public.properties%ROWTYPE;
BEGIN
  UPDATE public.properties SET
    name = CASE WHEN p_payload ? 'name' THEN nullif(btrim(p_payload->>'name'), '') ELSE name END,
    address = CASE WHEN p_payload ? 'address' THEN nullif(btrim(p_payload->>'address'), '') ELSE address END,
    city = CASE WHEN p_payload ? 'city' THEN nullif(btrim(p_payload->>'city'), '') ELSE city END,
    state = CASE WHEN p_payload ? 'state' THEN nullif(btrim(p_payload->>'state'), '') ELSE state END,
    zip_code = CASE WHEN p_payload ? 'zip_code' THEN nullif(btrim(p_payload->>'zip_code'), '') ELSE zip_code END,
    country = CASE WHEN p_payload ? 'country' THEN nullif(btrim(p_payload->>'country'), '') ELSE country END,
    type = CASE WHEN p_payload ? 'type' THEN p_payload->>'type' ELSE type END,
    description = CASE WHEN p_payload ? 'description' THEN nullif(btrim(p_payload->>'description'), '') ELSE description END,
    updated_at = now()
  WHERE id = p_id AND company_id = v_company RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF;
  RETURN to_jsonb(v_row) - 'user_id' - 'company_id';
END; $$;

CREATE OR REPLACE FUNCTION public.api_create_unit(p_api_key_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_owner uuid; v_property uuid; v_row public.units%ROWTYPE;
BEGIN
  v_property := nullif(p_payload->>'property_id', '')::uuid;
  SELECT company.owner_id INTO v_owner FROM public.properties property JOIN public.companies company ON company.id = property.company_id WHERE property.id = v_property AND property.company_id = v_company;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF nullif(btrim(p_payload->>'unit_number'), '') IS NULL THEN RAISE EXCEPTION 'API_VALIDATION_FAILED:unit_number'; END IF;
  INSERT INTO public.units(property_id, user_id, unit_number, floor, bedrooms, bathrooms, sqft, rent_amount, status, amenities, description)
  VALUES (v_property, v_owner, btrim(p_payload->>'unit_number'), coalesce((p_payload->>'floor')::integer, 1),
    coalesce((p_payload->>'bedrooms')::integer, 1), coalesce((p_payload->>'bathrooms')::integer, 1),
    coalesce((p_payload->>'sqft')::integer, 0), coalesce((p_payload->>'rent_amount')::numeric, 0),
    coalesce(nullif(p_payload->>'status', ''), 'vacant'),
    coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(p_payload->'amenities', '[]'::jsonb))), '{}'), nullif(btrim(p_payload->>'description'), '')) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row) - 'user_id';
END; $$;

CREATE OR REPLACE FUNCTION public.api_update_unit(p_api_key_id uuid, p_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_row public.units%ROWTYPE;
BEGIN
  UPDATE public.units unit SET
    unit_number = CASE WHEN p_payload ? 'unit_number' THEN nullif(btrim(p_payload->>'unit_number'), '') ELSE unit.unit_number END,
    floor = CASE WHEN p_payload ? 'floor' THEN (p_payload->>'floor')::integer ELSE unit.floor END,
    bedrooms = CASE WHEN p_payload ? 'bedrooms' THEN (p_payload->>'bedrooms')::integer ELSE unit.bedrooms END,
    bathrooms = CASE WHEN p_payload ? 'bathrooms' THEN (p_payload->>'bathrooms')::integer ELSE unit.bathrooms END,
    sqft = CASE WHEN p_payload ? 'sqft' THEN (p_payload->>'sqft')::integer ELSE unit.sqft END,
    rent_amount = CASE WHEN p_payload ? 'rent_amount' THEN (p_payload->>'rent_amount')::numeric ELSE unit.rent_amount END,
    status = CASE WHEN p_payload ? 'status' THEN p_payload->>'status' ELSE unit.status END,
    amenities = CASE WHEN p_payload ? 'amenities' THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'amenities')) ELSE unit.amenities END,
    description = CASE WHEN p_payload ? 'description' THEN nullif(btrim(p_payload->>'description'), '') ELSE unit.description END,
    updated_at = now()
  FROM public.properties property WHERE unit.id = p_id AND property.id = unit.property_id AND property.company_id = v_company RETURNING unit.* INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF; RETURN to_jsonb(v_row) - 'user_id';
END; $$;

CREATE OR REPLACE FUNCTION public.api_create_tenant(p_api_key_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_owner uuid; v_property uuid; v_unit uuid; v_row public.tenants%ROWTYPE;
BEGIN
  v_property := nullif(p_payload->>'property_id', '')::uuid; v_unit := nullif(p_payload->>'unit_id', '')::uuid;
  SELECT company.owner_id INTO v_owner FROM public.properties property JOIN public.companies company ON company.id = property.company_id
  WHERE property.id = v_property AND property.company_id = v_company AND (v_unit IS NULL OR EXISTS (SELECT 1 FROM public.units unit WHERE unit.id = v_unit AND unit.property_id = property.id));
  IF v_owner IS NULL THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF nullif(btrim(p_payload->>'name'), '') IS NULL OR nullif(btrim(p_payload->>'email'), '') IS NULL OR nullif(btrim(p_payload->>'phone'), '') IS NULL THEN RAISE EXCEPTION 'API_VALIDATION_FAILED:tenant_identity'; END IF;
  INSERT INTO public.tenants(user_id, property_id, unit_id, name, email, phone, emergency_contact, emergency_phone, employer, occupation, move_in_date, lease_end_date, monthly_rent, security_deposit, status)
  VALUES (v_owner, v_property, v_unit, btrim(p_payload->>'name'), lower(btrim(p_payload->>'email')), btrim(p_payload->>'phone'),
    nullif(btrim(p_payload->>'emergency_contact'), ''), nullif(btrim(p_payload->>'emergency_phone'), ''), nullif(btrim(p_payload->>'employer'), ''), nullif(btrim(p_payload->>'occupation'), ''),
    nullif(p_payload->>'move_in_date', '')::date, nullif(p_payload->>'lease_end_date', '')::date, coalesce((p_payload->>'monthly_rent')::numeric, 0), coalesce((p_payload->>'security_deposit')::numeric, 0), coalesce(nullif(p_payload->>'status', ''), 'active')) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row) - 'user_id' - 'tenant_user_id' - 'id_document';
END; $$;

CREATE OR REPLACE FUNCTION public.api_update_tenant(p_api_key_id uuid, p_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_row public.tenants%ROWTYPE;
BEGIN
  UPDATE public.tenants tenant SET
    name = CASE WHEN p_payload ? 'name' THEN nullif(btrim(p_payload->>'name'), '') ELSE tenant.name END,
    email = CASE WHEN p_payload ? 'email' THEN lower(nullif(btrim(p_payload->>'email'), '')) ELSE tenant.email END,
    phone = CASE WHEN p_payload ? 'phone' THEN nullif(btrim(p_payload->>'phone'), '') ELSE tenant.phone END,
    emergency_contact = CASE WHEN p_payload ? 'emergency_contact' THEN nullif(btrim(p_payload->>'emergency_contact'), '') ELSE tenant.emergency_contact END,
    emergency_phone = CASE WHEN p_payload ? 'emergency_phone' THEN nullif(btrim(p_payload->>'emergency_phone'), '') ELSE tenant.emergency_phone END,
    employer = CASE WHEN p_payload ? 'employer' THEN nullif(btrim(p_payload->>'employer'), '') ELSE tenant.employer END,
    occupation = CASE WHEN p_payload ? 'occupation' THEN nullif(btrim(p_payload->>'occupation'), '') ELSE tenant.occupation END,
    move_in_date = CASE WHEN p_payload ? 'move_in_date' THEN nullif(p_payload->>'move_in_date', '')::date ELSE tenant.move_in_date END,
    lease_end_date = CASE WHEN p_payload ? 'lease_end_date' THEN nullif(p_payload->>'lease_end_date', '')::date ELSE tenant.lease_end_date END,
    monthly_rent = CASE WHEN p_payload ? 'monthly_rent' THEN (p_payload->>'monthly_rent')::numeric ELSE tenant.monthly_rent END,
    security_deposit = CASE WHEN p_payload ? 'security_deposit' THEN (p_payload->>'security_deposit')::numeric ELSE tenant.security_deposit END,
    status = CASE WHEN p_payload ? 'status' THEN p_payload->>'status' ELSE tenant.status END, updated_at = now()
  FROM public.properties property WHERE tenant.id = p_id AND property.id = tenant.property_id AND property.company_id = v_company RETURNING tenant.* INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF; RETURN to_jsonb(v_row) - 'user_id' - 'tenant_user_id' - 'id_document';
END; $$;

CREATE OR REPLACE FUNCTION public.api_create_lease(p_api_key_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_owner uuid; v_property uuid; v_unit uuid; v_tenant uuid; v_row public.leases%ROWTYPE;
BEGIN
  v_property := nullif(p_payload->>'property_id', '')::uuid; v_unit := nullif(p_payload->>'unit_id', '')::uuid; v_tenant := nullif(p_payload->>'tenant_id', '')::uuid;
  SELECT company.owner_id INTO v_owner FROM public.properties property JOIN public.companies company ON company.id = property.company_id
  WHERE property.id = v_property AND property.company_id = v_company
    AND EXISTS (SELECT 1 FROM public.units unit WHERE unit.id = v_unit AND unit.property_id = property.id)
    AND EXISTS (SELECT 1 FROM public.tenants tenant WHERE tenant.id = v_tenant AND tenant.property_id = property.id);
  IF v_owner IS NULL THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  INSERT INTO public.leases(user_id, tenant_id, property_id, unit_id, lease_number, start_date, end_date, monthly_rent, security_deposit, status, terms, special_conditions)
  VALUES (v_owner, v_tenant, v_property, v_unit, nullif(btrim(p_payload->>'lease_number'), ''), (p_payload->>'start_date')::date, (p_payload->>'end_date')::date,
    coalesce((p_payload->>'monthly_rent')::numeric, 0), coalesce((p_payload->>'security_deposit')::numeric, 0), coalesce(nullif(p_payload->>'status', ''), 'draft'),
    nullif(btrim(p_payload->>'terms'), ''), nullif(btrim(p_payload->>'special_conditions'), '')) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row) - 'user_id' - 'landlord_signature_url' - 'tenant_signature_url' - 'document_url';
END; $$;

CREATE OR REPLACE FUNCTION public.api_update_lease(p_api_key_id uuid, p_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_row public.leases%ROWTYPE;
BEGIN
  UPDATE public.leases lease SET
    lease_number = CASE WHEN p_payload ? 'lease_number' THEN nullif(btrim(p_payload->>'lease_number'), '') ELSE lease.lease_number END,
    start_date = CASE WHEN p_payload ? 'start_date' THEN (p_payload->>'start_date')::date ELSE lease.start_date END,
    end_date = CASE WHEN p_payload ? 'end_date' THEN (p_payload->>'end_date')::date ELSE lease.end_date END,
    monthly_rent = CASE WHEN p_payload ? 'monthly_rent' THEN (p_payload->>'monthly_rent')::numeric ELSE lease.monthly_rent END,
    security_deposit = CASE WHEN p_payload ? 'security_deposit' THEN (p_payload->>'security_deposit')::numeric ELSE lease.security_deposit END,
    status = CASE WHEN p_payload ? 'status' THEN p_payload->>'status' ELSE lease.status END,
    terms = CASE WHEN p_payload ? 'terms' THEN nullif(btrim(p_payload->>'terms'), '') ELSE lease.terms END,
    special_conditions = CASE WHEN p_payload ? 'special_conditions' THEN nullif(btrim(p_payload->>'special_conditions'), '') ELSE lease.special_conditions END, updated_at = now()
  FROM public.properties property WHERE lease.id = p_id AND property.id = lease.property_id AND property.company_id = v_company RETURNING lease.* INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'API_RESOURCE_NOT_FOUND'; END IF; RETURN to_jsonb(v_row) - 'user_id' - 'landlord_signature_url' - 'tenant_signature_url' - 'document_url';
END; $$;

CREATE OR REPLACE FUNCTION public.api_create_maintenance_request(p_api_key_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:write', 'full'); v_owner uuid; v_property uuid; v_unit uuid; v_tenant uuid; v_row public.maintenance_requests%ROWTYPE;
BEGIN
  v_property := nullif(p_payload->>'property_id', '')::uuid; v_unit := nullif(p_payload->>'unit_id', '')::uuid; v_tenant := nullif(p_payload->>'tenant_id', '')::uuid;
  SELECT company.owner_id INTO v_owner FROM public.properties property JOIN public.companies company ON company.id = property.company_id
  WHERE property.id = v_property AND property.company_id = v_company AND EXISTS (SELECT 1 FROM public.units unit WHERE unit.id = v_unit AND unit.property_id = property.id)
    AND (v_tenant IS NULL OR EXISTS (SELECT 1 FROM public.tenants tenant WHERE tenant.id = v_tenant AND tenant.property_id = property.id));
  IF v_owner IS NULL THEN RAISE EXCEPTION 'API_PARENT_NOT_FOUND'; END IF;
  IF nullif(btrim(p_payload->>'title'), '') IS NULL OR nullif(btrim(p_payload->>'description'), '') IS NULL THEN RAISE EXCEPTION 'API_VALIDATION_FAILED:maintenance_content'; END IF;
  INSERT INTO public.maintenance_requests(user_id, property_id, unit_id, tenant_id, title, description, priority, status)
  VALUES (v_owner, v_property, v_unit, v_tenant, btrim(p_payload->>'title'), btrim(p_payload->>'description'), coalesce(nullif(p_payload->>'priority', ''), 'medium'), 'submitted') RETURNING * INTO v_row;
  RETURN to_jsonb(v_row) - 'user_id';
END; $$;

DO $$ DECLARE v_signature text; BEGIN FOREACH v_signature IN ARRAY ARRAY[
  'public.api_begin_idempotency(uuid,text,text)', 'public.api_complete_idempotency(uuid,text,integer,jsonb)',
  'public.api_create_property(uuid,jsonb)', 'public.api_update_property(uuid,uuid,jsonb)',
  'public.api_create_unit(uuid,jsonb)', 'public.api_update_unit(uuid,uuid,jsonb)',
  'public.api_create_lease(uuid,jsonb)', 'public.api_update_lease(uuid,uuid,jsonb)',
  'public.api_create_tenant(uuid,jsonb)', 'public.api_update_tenant(uuid,uuid,jsonb)',
  'public.api_create_maintenance_request(uuid,jsonb)'
] LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_signature); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature); END LOOP; END $$;