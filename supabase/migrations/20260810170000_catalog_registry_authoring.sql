-- Audited authoring operations for catalog registry records.

CREATE OR REPLACE FUNCTION public.saas_catalog_create_addon(
  p_code text,
  p_name text,
  p_description text,
  p_attach_scope text,
  p_usd_amount_minor integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_addon_id uuid;
  v_code text := lower(btrim(p_code));
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;
  IF v_code !~ '^[a-z][a-z0-9_]{2,79}$' OR nullif(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_ADDON_DEFINITION';
  END IF;
  IF p_attach_scope NOT IN ('any_product', 'core_only', 'marketplace_only', 'crm_only')
     OR p_usd_amount_minor IS NULL OR p_usd_amount_minor < 0 THEN
    RAISE EXCEPTION 'INVALID_ADDON_CONFIGURATION';
  END IF;

  INSERT INTO public.saas_addons (code, name, description, attach_scope, is_active)
  VALUES (v_code, btrim(p_name), nullif(btrim(p_description), ''), p_attach_scope, true)
  RETURNING id INTO v_addon_id;

  INSERT INTO public.saas_addon_prices (addon_id, currency_code, amount_minor, billing_interval, is_default)
  VALUES (v_addon_id, 'USD', p_usd_amount_minor, 'monthly', true);

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.addon.created', 'catalog', 'create_addon', 'success', v_actor,
    'saas_addon', v_addon_id::text,
    jsonb_build_object('code', v_code, 'attach_scope', p_attach_scope, 'usd_amount_minor', p_usd_amount_minor)
  );

  RETURN v_addon_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_catalog_create_quota_dimension(
  p_code text,
  p_name text,
  p_description text,
  p_unit text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_dimension_id uuid;
  v_code text := lower(btrim(p_code));
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;
  IF v_code !~ '^[a-z][a-z0-9_]{2,79}$'
     OR nullif(btrim(p_name), '') IS NULL
     OR nullif(btrim(p_unit), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_QUOTA_DIMENSION';
  END IF;

  INSERT INTO public.saas_quota_dimensions (code, name, description, unit)
  VALUES (v_code, btrim(p_name), nullif(btrim(p_description), ''), lower(btrim(p_unit)))
  RETURNING id INTO v_dimension_id;

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.quota_dimension.created', 'catalog', 'create_quota_dimension', 'success', v_actor,
    'saas_quota_dimension', v_dimension_id::text, jsonb_build_object('code', v_code, 'unit', lower(btrim(p_unit)))
  );

  RETURN v_dimension_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_catalog_create_entitlement_key(
  p_key text,
  p_domain text,
  p_value_type text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_key_id uuid;
  v_key text := lower(btrim(p_key));
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;
  IF v_key !~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'
     OR nullif(btrim(p_domain), '') IS NULL
     OR p_value_type NOT IN ('boolean', 'integer', 'json') THEN
    RAISE EXCEPTION 'INVALID_ENTITLEMENT_KEY';
  END IF;

  INSERT INTO public.saas_entitlement_keys (key, domain, value_type, description)
  VALUES (v_key, lower(btrim(p_domain)), p_value_type, nullif(btrim(p_description), ''))
  RETURNING id INTO v_key_id;

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.entitlement_key.created', 'catalog', 'create_entitlement_key', 'success', v_actor,
    'saas_entitlement_key', v_key_id::text,
    jsonb_build_object('key', v_key, 'domain', lower(btrim(p_domain)), 'value_type', p_value_type)
  );

  RETURN v_key_id;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_catalog_create_addon(text,text,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_catalog_create_quota_dimension(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_catalog_create_entitlement_key(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_catalog_create_addon(text,text,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_catalog_create_quota_dimension(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_catalog_create_entitlement_key(text,text,text,text) TO authenticated;
