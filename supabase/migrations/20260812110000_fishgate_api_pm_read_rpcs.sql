-- FishGate API Property Management read surface. Every function derives tenant
-- ownership from the validated key identifier; callers never provide company_id.

CREATE OR REPLACE FUNCTION public.api_authorized_company_id(
  p_api_key_id uuid,
  p_required_scope text,
  p_required_tier text DEFAULT 'limited'
) RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key public.api_keys%ROWTYPE;
  v_access text;
BEGIN
  SELECT * INTO v_key FROM public.api_keys WHERE id = p_api_key_id AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_API_KEY'; END IF;
  IF NOT (p_required_scope = ANY(v_key.scopes)) THEN RAISE EXCEPTION 'API_SCOPE_DENIED'; END IF;

  v_access := public.api_get_access_level(v_key.company_id);
  IF v_access = 'none' THEN RAISE EXCEPTION 'API_ACCESS_NOT_ENTITLED'; END IF;
  IF p_required_tier = 'full' AND (v_access <> 'full' OR v_key.tier <> 'full') THEN
    RAISE EXCEPTION 'API_UPGRADE_REQUIRED';
  END IF;
  RETURN v_key.company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.api_get_properties(
  p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:read');
  v_page integer := greatest(1, coalesce(p_page, 1)); v_size integer := least(100, greatest(1, coalesce(p_per_page, 20)));
  v_rows jsonb; v_total bigint;
BEGIN
  WITH filtered AS MATERIALIZED (
    SELECT property.id, property.name, property.address, property.city, property.state, property.zip_code,
      property.country, property.type, property.description, property.total_units, property.occupied_units,
      property.image_url, property.image_urls, property.created_at, property.updated_at
    FROM public.properties property WHERE property.company_id = v_company AND (p_id IS NULL OR property.id = p_id)
  ), paged AS (
    SELECT * FROM filtered ORDER BY
      CASE WHEN p_sort = 'name' THEN lower(name) END ASC,
      CASE WHEN p_sort = '-name' THEN lower(name) END DESC,
      CASE WHEN p_sort = 'created_at' THEN created_at END ASC,
      created_at DESC, id DESC OFFSET (v_page - 1) * v_size LIMIT v_size
  ) SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_rows, v_total;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total);
END; $$;

CREATE OR REPLACE FUNCTION public.api_get_units(
  p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:read');
  v_page integer := greatest(1, coalesce(p_page, 1)); v_size integer := least(100, greatest(1, coalesce(p_per_page, 20))); v_rows jsonb; v_total bigint;
BEGIN WITH filtered AS MATERIALIZED (
  SELECT unit.id, unit.property_id, unit.unit_number, unit.floor, unit.bedrooms, unit.bathrooms, unit.sqft,
    unit.rent_amount, unit.status, unit.amenities, unit.description, unit.image_url, unit.image_urls, unit.created_at, unit.updated_at
  FROM public.units unit JOIN public.properties property ON property.id = unit.property_id
  WHERE property.company_id = v_company AND (p_id IS NULL OR unit.id = p_id) AND (p_status IS NULL OR unit.status = p_status)
), paged AS (SELECT * FROM filtered ORDER BY
  CASE WHEN p_sort = 'created_at' THEN created_at END ASC, created_at DESC, id DESC
  OFFSET (v_page - 1) * v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_rows, v_total;
RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_leases(
  p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:read');
  v_page integer := greatest(1, coalesce(p_page, 1)); v_size integer := least(100, greatest(1, coalesce(p_per_page, 20))); v_rows jsonb; v_total bigint;
BEGIN WITH filtered AS MATERIALIZED (
  SELECT lease.id, lease.tenant_id, lease.property_id, lease.unit_id, lease.lease_number, lease.start_date, lease.end_date,
    lease.monthly_rent, lease.security_deposit, lease.status, lease.terms, lease.special_conditions,
    lease.landlord_signed_at, lease.tenant_signed_at, lease.created_at, lease.updated_at
  FROM public.leases lease JOIN public.properties property ON property.id = lease.property_id
  WHERE property.company_id = v_company AND (p_id IS NULL OR lease.id = p_id) AND (p_status IS NULL OR lease.status = p_status)
), paged AS (SELECT * FROM filtered ORDER BY CASE WHEN p_sort = 'created_at' THEN created_at END ASC, created_at DESC, id DESC OFFSET (v_page - 1) * v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_rows, v_total;
RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_tenants(
  p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:read');
  v_page integer := greatest(1, coalesce(p_page, 1)); v_size integer := least(100, greatest(1, coalesce(p_per_page, 20))); v_rows jsonb; v_total bigint;
BEGIN WITH filtered AS MATERIALIZED (
  SELECT tenant.id, tenant.unit_id, tenant.property_id, tenant.name, tenant.email, tenant.phone, tenant.emergency_contact,
    tenant.emergency_phone, tenant.employer, tenant.occupation, tenant.move_in_date, tenant.lease_end_date,
    tenant.monthly_rent, tenant.security_deposit, tenant.balance, tenant.status, tenant.avatar_url, tenant.created_at, tenant.updated_at
  FROM public.tenants tenant JOIN public.properties property ON property.id = tenant.property_id
  WHERE property.company_id = v_company AND (p_id IS NULL OR tenant.id = p_id) AND (p_status IS NULL OR tenant.status = p_status)
), paged AS (SELECT * FROM filtered ORDER BY
  CASE WHEN p_sort = 'name' THEN lower(name) END ASC, CASE WHEN p_sort = '-name' THEN lower(name) END DESC,
  CASE WHEN p_sort = 'created_at' THEN created_at END ASC, created_at DESC, id DESC OFFSET (v_page - 1) * v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_rows, v_total;
RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_invoices(
  p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:read');
  v_page integer := greatest(1, coalesce(p_page, 1)); v_size integer := least(100, greatest(1, coalesce(p_per_page, 20))); v_rows jsonb; v_total bigint;
BEGIN WITH filtered AS MATERIALIZED (
  SELECT invoice.id, invoice.tenant_id, invoice.unit_id, invoice.property_id, invoice.invoice_number, invoice.amount,
    invoice.due_date, invoice.status, invoice.description, invoice.paid_amount, invoice.paid_at, invoice.created_at, invoice.updated_at
  FROM public.invoices invoice JOIN public.properties property ON property.id = invoice.property_id
  WHERE property.company_id = v_company AND (p_id IS NULL OR invoice.id = p_id) AND (p_status IS NULL OR invoice.status = p_status)
), paged AS (SELECT * FROM filtered ORDER BY CASE WHEN p_sort = 'created_at' THEN created_at END ASC, created_at DESC, id DESC OFFSET (v_page - 1) * v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_rows, v_total;
RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_payments(
  p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:read');
  v_page integer := greatest(1, coalesce(p_page, 1)); v_size integer := least(100, greatest(1, coalesce(p_per_page, 20))); v_rows jsonb; v_total bigint;
BEGIN WITH filtered AS MATERIALIZED (
  SELECT payment.id, payment.invoice_id, payment.tenant_id, payment.amount, payment.method, payment.reference,
    payment.status, payment.receipt_number, payment.created_at
  FROM public.payments payment JOIN public.invoices invoice ON invoice.id = payment.invoice_id
  JOIN public.properties property ON property.id = invoice.property_id
  WHERE property.company_id = v_company AND (p_id IS NULL OR payment.id = p_id) AND (p_status IS NULL OR payment.status = p_status)
), paged AS (SELECT * FROM filtered ORDER BY CASE WHEN p_sort = 'created_at' THEN created_at END ASC, created_at DESC, id DESC OFFSET (v_page - 1) * v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_rows, v_total;
RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total); END; $$;

CREATE OR REPLACE FUNCTION public.api_get_maintenance_requests(
  p_api_key_id uuid, p_id uuid DEFAULT NULL, p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 20, p_status text DEFAULT NULL, p_sort text DEFAULT '-created_at'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.api_authorized_company_id(p_api_key_id, 'pm:read');
  v_page integer := greatest(1, coalesce(p_page, 1)); v_size integer := least(100, greatest(1, coalesce(p_per_page, 20))); v_rows jsonb; v_total bigint;
BEGIN WITH filtered AS MATERIALIZED (
  SELECT request.id, request.unit_id, request.tenant_id, request.property_id, request.title, request.description,
    request.priority, request.status, request.assigned_to, request.completed_at, request.image_url,
    request.created_at, request.updated_at
  FROM public.maintenance_requests request JOIN public.properties property ON property.id = request.property_id
  WHERE property.company_id = v_company AND (p_id IS NULL OR request.id = p_id) AND (p_status IS NULL OR request.status = p_status)
), paged AS (SELECT * FROM filtered ORDER BY CASE WHEN p_sort = 'created_at' THEN created_at END ASC, created_at DESC, id DESC OFFSET (v_page - 1) * v_size LIMIT v_size)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_rows, v_total;
RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'per_page', v_size, 'total', v_total, 'has_more', v_page * v_size < v_total); END; $$;

REVOKE ALL ON FUNCTION public.api_authorized_company_id(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_authorized_company_id(uuid,text,text) TO service_role;

DO $$ DECLARE v_signature text; BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.api_get_properties(uuid,uuid,integer,integer,text,text)',
    'public.api_get_units(uuid,uuid,integer,integer,text,text)',
    'public.api_get_leases(uuid,uuid,integer,integer,text,text)',
    'public.api_get_tenants(uuid,uuid,integer,integer,text,text)',
    'public.api_get_invoices(uuid,uuid,integer,integer,text,text)',
    'public.api_get_payments(uuid,uuid,integer,integer,text,text)',
    'public.api_get_maintenance_requests(uuid,uuid,integer,integer,text,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature);
  END LOOP;
END $$;