-- Audited group add-on and override mutations.

DO $$
BEGIN
  IF to_regclass('public.saas_owner_group_addon_subscriptions') IS NULL
     OR to_regclass('public.saas_owner_group_quota_overrides') IS NULL
     OR to_regclass('public.saas_owner_group_entitlement_overrides') IS NULL
     OR to_regprocedure('public.owner_billing_group_assert_actor(uuid)') IS NULL
     OR to_regprocedure('public.owner_billing_group_write_audit(text,text,uuid,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_ADDON_OVERRIDE_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_assert_super_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (
    auth.uid() IS NULL OR NOT public.is_platform_super_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_SUPER_ADMIN_REQUIRED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_set_addon_status(
  p_group_id uuid,
  p_addon_code text,
  p_enabled boolean,
  p_reason text,
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
  v_owner_id uuid;
  v_addon_id uuid;
  v_plan_subscription_id uuid;
  v_addon_subscription public.saas_owner_group_addon_subscriptions%ROWTYPE;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  SELECT billing_group.owner_id, plan_subscription.id
  INTO v_owner_id, v_plan_subscription_id
  FROM public.owner_billing_groups billing_group
  JOIN public.saas_owner_group_plan_subscriptions plan_subscription
    ON plan_subscription.group_id = billing_group.id
   AND plan_subscription.status IN ('active', 'grace_period')
  WHERE billing_group.id = p_group_id
    AND billing_group.status = 'active'
  ORDER BY plan_subscription.created_at DESC
  LIMIT 1
  FOR UPDATE OF billing_group, plan_subscription;

  IF v_owner_id IS NULL OR v_plan_subscription_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_ACTIVE_PLAN_REQUIRED';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  SELECT id
  INTO v_addon_id
  FROM public.saas_addons
  WHERE code = p_addon_code
    AND is_active = true
  LIMIT 1;

  IF v_addon_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_ADDON_NOT_FOUND';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.saas_owner_group_addon_subscriptions (
      group_id,
      addon_id,
      status,
      start_at,
      end_at,
      notes,
      metadata,
      created_by
    ) VALUES (
      p_group_id,
      v_addon_id,
      'active',
      now(),
      NULL,
      p_reason,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('updated_at', now()),
      v_actor
    )
    ON CONFLICT (group_id, addon_id) DO UPDATE SET
      status = 'active',
      start_at = CASE
        WHEN public.saas_owner_group_addon_subscriptions.status = 'active'
          THEN public.saas_owner_group_addon_subscriptions.start_at
        ELSE now()
      END,
      end_at = NULL,
      grace_end_at = NULL,
      notes = EXCLUDED.notes,
      metadata = coalesce(public.saas_owner_group_addon_subscriptions.metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object('updated_at', now()),
      updated_at = now()
    RETURNING * INTO v_addon_subscription;
  ELSE
    UPDATE public.saas_owner_group_addon_subscriptions
    SET status = 'canceled',
        end_at = coalesce(p_end_at, now()),
        grace_end_at = NULL,
        notes = p_reason,
        metadata = coalesce(metadata, '{}'::jsonb)
          || coalesce(p_metadata, '{}'::jsonb)
          || jsonb_build_object('updated_at', now()),
        updated_at = now()
    WHERE group_id = p_group_id
      AND addon_id = v_addon_id
    RETURNING * INTO v_addon_subscription;

    IF v_addon_subscription.id IS NULL THEN
      RAISE EXCEPTION 'OWNER_BILLING_GROUP_ADDON_SUBSCRIPTION_NOT_FOUND';
    END IF;
  END IF;

  INSERT INTO public.saas_owner_group_subscription_events (
    subscription_id,
    group_id,
    actor_user_id,
    event_type,
    details,
    correlation_id
  ) VALUES (
    v_plan_subscription_id,
    p_group_id,
    v_actor,
    'billing.group.addon.status_changed',
    jsonb_build_object(
      'addon_code', p_addon_code,
      'enabled', p_enabled,
      'status', v_addon_subscription.status,
      'addon_subscription_id', v_addon_subscription.id,
      'reason', p_reason
    ),
    v_correlation_id
  );

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.addon.status_changed',
    'set_addon_status',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'addon_code', p_addon_code,
      'enabled', p_enabled,
      'status', v_addon_subscription.status,
      'addon_subscription_id', v_addon_subscription.id,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'group_id', p_group_id,
    'addon_code', p_addon_code,
    'enabled', p_enabled,
    'status', v_addon_subscription.status,
    'subscription_id', v_addon_subscription.id,
    'end_at', v_addon_subscription.end_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_set_owner_billing_group_quota_override(
  p_group_id uuid,
  p_quota_code text,
  p_mode text,
  p_value integer,
  p_reason text,
  p_expires_at timestamptz DEFAULT NULL,
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dimension_id uuid;
  v_override_id uuid;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_super_admin();
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  IF p_mode NOT IN ('increment', 'set') OR p_value IS NULL OR p_value < 0 THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_INVALID_QUOTA_OVERRIDE';
  END IF;

  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_OVERRIDE_EXPIRY_MUST_BE_FUTURE';
  END IF;

  SELECT id INTO v_dimension_id
  FROM public.saas_quota_dimensions
  WHERE code = p_quota_code
  LIMIT 1;

  IF v_dimension_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_QUOTA_CODE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.owner_billing_groups WHERE id = p_group_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  INSERT INTO public.saas_owner_group_quota_overrides (
    group_id,
    quota_dimension_id,
    mode,
    increment_by,
    hard_limit_override,
    reason,
    expires_at,
    created_by
  ) VALUES (
    p_group_id,
    v_dimension_id,
    p_mode,
    CASE WHEN p_mode = 'increment' THEN p_value ELSE NULL END,
    CASE WHEN p_mode = 'set' THEN p_value ELSE NULL END,
    p_reason,
    p_expires_at,
    auth.uid()
  )
  ON CONFLICT (group_id, quota_dimension_id) DO UPDATE SET
    mode = EXCLUDED.mode,
    increment_by = EXCLUDED.increment_by,
    hard_limit_override = EXCLUDED.hard_limit_override,
    reason = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at,
    created_by = EXCLUDED.created_by,
    updated_at = now()
  RETURNING id INTO v_override_id;

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.quota_override.set',
    'set_quota_override',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'quota_code', p_quota_code,
      'mode', p_mode,
      'value', p_value,
      'expires_at', p_expires_at,
      'reason', p_reason,
      'override_id', v_override_id
    )
  );

  RETURN v_override_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_clear_owner_billing_group_quota_override(
  p_group_id uuid,
  p_quota_code text,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_id uuid;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_super_admin();
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  DELETE FROM public.saas_owner_group_quota_overrides override
  USING public.saas_quota_dimensions dimension
  WHERE override.group_id = p_group_id
    AND override.quota_dimension_id = dimension.id
    AND dimension.code = p_quota_code
  RETURNING override.id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_QUOTA_OVERRIDE_NOT_FOUND';
  END IF;

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.quota_override.cleared',
    'clear_quota_override',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'quota_code', p_quota_code,
      'override_id', v_deleted_id,
      'reason', p_reason
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_set_owner_billing_group_entitlement_override(
  p_group_id uuid,
  p_entitlement_key text,
  p_decision text,
  p_reason text,
  p_expires_at timestamptz DEFAULT NULL,
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlement_key_id uuid;
  v_override_id uuid;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_super_admin();
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  IF p_decision NOT IN ('allow', 'deny') THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_INVALID_ENTITLEMENT_DECISION';
  END IF;

  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_OVERRIDE_EXPIRY_MUST_BE_FUTURE';
  END IF;

  SELECT id INTO v_entitlement_key_id
  FROM public.saas_entitlement_keys
  WHERE key = p_entitlement_key
  LIMIT 1;

  IF v_entitlement_key_id IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_ENTITLEMENT_KEY';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.owner_billing_groups WHERE id = p_group_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  INSERT INTO public.saas_owner_group_entitlement_overrides (
    group_id,
    entitlement_key_id,
    decision,
    reason,
    expires_at,
    created_by
  ) VALUES (
    p_group_id,
    v_entitlement_key_id,
    p_decision,
    p_reason,
    p_expires_at,
    auth.uid()
  )
  ON CONFLICT (group_id, entitlement_key_id) DO UPDATE SET
    decision = EXCLUDED.decision,
    reason = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at,
    created_by = EXCLUDED.created_by,
    updated_at = now()
  RETURNING id INTO v_override_id;

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.entitlement_override.set',
    'set_entitlement_override',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'entitlement_key', p_entitlement_key,
      'decision', p_decision,
      'expires_at', p_expires_at,
      'reason', p_reason,
      'override_id', v_override_id
    )
  );

  RETURN v_override_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_clear_owner_billing_group_entitlement_override(
  p_group_id uuid,
  p_entitlement_key text,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_id uuid;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_super_admin();
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  DELETE FROM public.saas_owner_group_entitlement_overrides override
  USING public.saas_entitlement_keys entitlement_key
  WHERE override.group_id = p_group_id
    AND override.entitlement_key_id = entitlement_key.id
    AND entitlement_key.key = p_entitlement_key
  RETURNING override.id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_ENTITLEMENT_OVERRIDE_NOT_FOUND';
  END IF;

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.entitlement_override.cleared',
    'clear_entitlement_override',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'entitlement_key', p_entitlement_key,
      'override_id', v_deleted_id,
      'reason', p_reason
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.owner_billing_group_assert_super_admin() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.owner_billing_group_set_addon_status(uuid,text,boolean,text,timestamptz,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_billing_group_set_addon_status(uuid,text,boolean,text,timestamptz,text,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.platform_set_owner_billing_group_quota_override(uuid,text,text,integer,text,timestamptz,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_clear_owner_billing_group_quota_override(uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_set_owner_billing_group_entitlement_override(uuid,text,text,text,timestamptz,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_clear_owner_billing_group_entitlement_override(uuid,text,text,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.platform_set_owner_billing_group_quota_override(uuid,text,text,integer,text,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_clear_owner_billing_group_quota_override(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_set_owner_billing_group_entitlement_override(uuid,text,text,text,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_clear_owner_billing_group_entitlement_override(uuid,text,text,text) TO authenticated;
