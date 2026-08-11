-- Audited plan assignment and add-on effect authoring for catalog definitions.

CREATE OR REPLACE FUNCTION public.saas_catalog_assign_quota_to_plan(
  p_plan_id uuid,
  p_quota_code text,
  p_soft_limit integer,
  p_hard_limit integer,
  p_is_unlimited boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_dimension_id uuid;
  v_assignment_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;
  IF p_plan_id IS NULL OR nullif(btrim(p_quota_code), '') IS NULL
     OR p_soft_limit IS NULL OR p_hard_limit IS NULL
     OR p_soft_limit < 0 OR p_hard_limit < p_soft_limit THEN
    RAISE EXCEPTION 'INVALID_PLAN_QUOTA_ASSIGNMENT';
  END IF;

  SELECT id INTO v_dimension_id
  FROM public.saas_quota_dimensions
  WHERE code = lower(btrim(p_quota_code));
  IF v_dimension_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'CATALOG_DEFINITION_NOT_FOUND';
  END IF;

  INSERT INTO public.saas_plan_quotas (
    plan_id, quota_dimension_id, soft_limit, hard_limit, is_unlimited
  ) VALUES (
    p_plan_id, v_dimension_id, p_soft_limit, p_hard_limit, coalesce(p_is_unlimited, false)
  )
  ON CONFLICT (plan_id, quota_dimension_id) DO UPDATE SET
    soft_limit = EXCLUDED.soft_limit,
    hard_limit = EXCLUDED.hard_limit,
    is_unlimited = EXCLUDED.is_unlimited,
    updated_at = now()
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.plan_quota.assigned', 'catalog', 'assign_plan_quota', 'success', v_actor,
    'saas_plan_quota', v_assignment_id::text,
    jsonb_build_object('plan_id', p_plan_id, 'quota_code', lower(btrim(p_quota_code)),
      'soft_limit', p_soft_limit, 'hard_limit', p_hard_limit, 'is_unlimited', coalesce(p_is_unlimited, false))
  );

  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_catalog_assign_entitlement_to_plan(
  p_plan_id uuid,
  p_entitlement_key text,
  p_bool_value boolean DEFAULT NULL,
  p_int_value integer DEFAULT NULL,
  p_json_value jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_key_id uuid;
  v_value_type text;
  v_assignment_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;
  SELECT id, value_type INTO v_key_id, v_value_type
  FROM public.saas_entitlement_keys
  WHERE key = lower(btrim(p_entitlement_key));
  IF p_plan_id IS NULL OR v_key_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'CATALOG_DEFINITION_NOT_FOUND';
  END IF;
  IF (v_value_type = 'boolean' AND p_bool_value IS NULL)
     OR (v_value_type = 'integer' AND p_int_value IS NULL)
     OR (v_value_type = 'json' AND p_json_value IS NULL)
     OR ((p_bool_value IS NOT NULL)::integer + (p_int_value IS NOT NULL)::integer + (p_json_value IS NOT NULL)::integer) <> 1 THEN
    RAISE EXCEPTION 'ENTITLEMENT_VALUE_TYPE_MISMATCH';
  END IF;

  INSERT INTO public.saas_plan_entitlements (
    plan_id, entitlement_key_id, bool_value, int_value, json_value
  ) VALUES (
    p_plan_id, v_key_id, p_bool_value, p_int_value, p_json_value
  )
  ON CONFLICT (plan_id, entitlement_key_id) DO UPDATE SET
    bool_value = EXCLUDED.bool_value,
    int_value = EXCLUDED.int_value,
    json_value = EXCLUDED.json_value,
    updated_at = now()
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.plan_entitlement.assigned', 'catalog', 'assign_plan_entitlement', 'success', v_actor,
    'saas_plan_entitlement', v_assignment_id::text,
    jsonb_build_object('plan_id', p_plan_id, 'entitlement_key', lower(btrim(p_entitlement_key)), 'value_type', v_value_type)
  );

  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_catalog_set_addon_quota_effect(
  p_addon_id uuid,
  p_quota_code text,
  p_mode text,
  p_value integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_dimension_id uuid;
  v_effect_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;
  SELECT id INTO v_dimension_id FROM public.saas_quota_dimensions
  WHERE code = lower(btrim(p_quota_code));
  IF p_addon_id IS NULL OR v_dimension_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.saas_addons WHERE id = p_addon_id) THEN
    RAISE EXCEPTION 'CATALOG_DEFINITION_NOT_FOUND';
  END IF;
  IF p_mode NOT IN ('increment', 'set') OR p_value IS NULL OR p_value < 0 THEN
    RAISE EXCEPTION 'INVALID_ADDON_QUOTA_EFFECT';
  END IF;

  INSERT INTO public.saas_addon_quota_overrides (
    addon_id, quota_dimension_id, mode, increment_by, hard_limit_override
  ) VALUES (
    p_addon_id, v_dimension_id, p_mode,
    CASE WHEN p_mode = 'increment' THEN p_value END,
    CASE WHEN p_mode = 'set' THEN p_value END
  )
  ON CONFLICT (addon_id, quota_dimension_id) DO UPDATE SET
    mode = EXCLUDED.mode,
    increment_by = EXCLUDED.increment_by,
    hard_limit_override = EXCLUDED.hard_limit_override,
    updated_at = now()
  RETURNING id INTO v_effect_id;

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.addon_quota_effect.set', 'catalog', 'set_addon_quota_effect', 'success', v_actor,
    'saas_addon_quota_override', v_effect_id::text,
    jsonb_build_object('addon_id', p_addon_id, 'quota_code', lower(btrim(p_quota_code)), 'mode', p_mode, 'value', p_value)
  );

  RETURN v_effect_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_catalog_set_addon_entitlement_effect(
  p_addon_id uuid,
  p_entitlement_key text,
  p_mode text DEFAULT 'set',
  p_bool_value boolean DEFAULT NULL,
  p_int_value integer DEFAULT NULL,
  p_json_value jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_key_id uuid;
  v_value_type text;
  v_effect_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;
  SELECT id, value_type INTO v_key_id, v_value_type
  FROM public.saas_entitlement_keys
  WHERE key = lower(btrim(p_entitlement_key));
  IF p_addon_id IS NULL OR v_key_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.saas_addons WHERE id = p_addon_id) THEN
    RAISE EXCEPTION 'CATALOG_DEFINITION_NOT_FOUND';
  END IF;
  IF p_mode NOT IN ('set', 'increment')
     OR (v_value_type = 'boolean' AND p_bool_value IS NULL)
     OR (v_value_type = 'integer' AND p_int_value IS NULL)
     OR (v_value_type = 'json' AND p_json_value IS NULL)
     OR ((p_bool_value IS NOT NULL)::integer + (p_int_value IS NOT NULL)::integer + (p_json_value IS NOT NULL)::integer) <> 1 THEN
    RAISE EXCEPTION 'ENTITLEMENT_VALUE_TYPE_MISMATCH';
  END IF;

  INSERT INTO public.saas_addon_entitlements (
    addon_id, entitlement_key_id, mode, bool_value, int_value, json_value
  ) VALUES (
    p_addon_id, v_key_id, p_mode, p_bool_value, p_int_value, p_json_value
  )
  ON CONFLICT (addon_id, entitlement_key_id) DO UPDATE SET
    mode = EXCLUDED.mode,
    bool_value = EXCLUDED.bool_value,
    int_value = EXCLUDED.int_value,
    json_value = EXCLUDED.json_value,
    updated_at = now()
  RETURNING id INTO v_effect_id;

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.addon_entitlement_effect.set', 'catalog', 'set_addon_entitlement_effect', 'success', v_actor,
    'saas_addon_entitlement', v_effect_id::text,
    jsonb_build_object('addon_id', p_addon_id, 'entitlement_key', lower(btrim(p_entitlement_key)),
      'mode', p_mode, 'value_type', v_value_type)
  );

  RETURN v_effect_id;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_catalog_assign_quota_to_plan(uuid,text,integer,integer,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_catalog_assign_entitlement_to_plan(uuid,text,boolean,integer,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_catalog_set_addon_quota_effect(uuid,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_catalog_set_addon_entitlement_effect(uuid,text,text,boolean,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_catalog_assign_quota_to_plan(uuid,text,integer,integer,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_catalog_assign_entitlement_to_plan(uuid,text,boolean,integer,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_catalog_set_addon_quota_effect(uuid,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_catalog_set_addon_entitlement_effect(uuid,text,text,boolean,integer,jsonb) TO authenticated;