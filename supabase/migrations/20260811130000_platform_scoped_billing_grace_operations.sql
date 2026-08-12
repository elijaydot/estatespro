-- Subscription-scoped Super Admin grace operations for company and owner-group billing.

CREATE OR REPLACE FUNCTION public.platform_admin_set_company_subscription_grace(
  p_company_id uuid,
  p_subscription_id uuid,
  p_grace_days integer,
  p_mode text,
  p_reason text,
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
  v_subscription public.saas_company_plan_subscriptions%ROWTYPE;
  v_previous_grace_end timestamptz;
  v_grace_end timestamptz;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  IF v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
  ) THEN
    RAISE EXCEPTION 'BILLING_OPERATOR_REQUIRED';
  END IF;
  IF p_company_id IS NULL OR p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'BILLING_SCOPE_REQUIRED';
  END IF;
  IF p_grace_days IS NULL OR p_grace_days < 1 OR p_grace_days > 90 THEN
    RAISE EXCEPTION 'INVALID_GRACE_DAYS';
  END IF;
  IF p_mode NOT IN ('from_now', 'extend') THEN
    RAISE EXCEPTION 'INVALID_GRACE_MODE';
  END IF;
  IF nullif(btrim(p_reason), '') IS NULL OR length(btrim(p_reason)) < 8 THEN
    RAISE EXCEPTION 'AUDIT_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_subscription
  FROM public.saas_company_plan_subscriptions
  WHERE id = p_subscription_id AND company_id = p_company_id
  FOR UPDATE;

  IF v_subscription.id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_SUBSCRIPTION_NOT_FOUND';
  END IF;
  IF v_subscription.status NOT IN ('active', 'trialing', 'grace_period') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_ELIGIBLE_FOR_GRACE';
  END IF;

  v_previous_grace_end := v_subscription.grace_end_at;
  v_grace_end := CASE
    WHEN p_mode = 'extend' AND v_previous_grace_end > now()
      THEN v_previous_grace_end + make_interval(days => p_grace_days)
    ELSE now() + make_interval(days => p_grace_days)
  END;

  UPDATE public.saas_company_plan_subscriptions
  SET status = 'grace_period', payment_state = 'grace', grace_end_at = v_grace_end,
      updated_at = now(),
      notes = coalesce(notes, '') || ' Admin grace ' || p_mode || ' until ' || v_grace_end::text || ' reason=' || btrim(p_reason)
  WHERE id = v_subscription.id;

  INSERT INTO public.saas_subscription_events (
    subscription_id, company_id, product_id, actor_user_id, event_type, details, correlation_id
  ) VALUES (
    v_subscription.id, v_subscription.company_id, v_subscription.product_id, v_actor,
    'billing.subscription.admin_grace_set',
    jsonb_build_object('mode', p_mode, 'grace_days', p_grace_days, 'previous_grace_end_at', v_previous_grace_end,
      'grace_end_at', v_grace_end, 'reason', btrim(p_reason), 'metadata', coalesce(p_metadata, '{}'::jsonb)),
    v_correlation_id
  );

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, severity, result_status, actor_user_id, company_id,
    target_entity_type, target_entity_id, correlation_id, metadata
  ) VALUES (
    'control_plane', 'billing.subscription.admin_grace_set', 'billing', 'set_company_subscription_grace',
    'warning', 'success', v_actor, v_subscription.company_id,
    'saas_company_plan_subscription', v_subscription.id::text, v_correlation_id,
    jsonb_build_object('mode', p_mode, 'grace_days', p_grace_days, 'previous_grace_end_at', v_previous_grace_end,
      'grace_end_at', v_grace_end, 'reason', btrim(p_reason), 'metadata', coalesce(p_metadata, '{}'::jsonb))
  );

  RETURN jsonb_build_object('scope_type', 'company', 'scope_id', v_subscription.company_id,
    'subscription_id', v_subscription.id, 'grace_end_at', v_grace_end, 'correlation_id', v_correlation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_set_owner_group_subscription_grace(
  p_group_id uuid,
  p_subscription_id uuid,
  p_grace_days integer,
  p_mode text,
  p_reason text,
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
  v_subscription public.saas_owner_group_plan_subscriptions%ROWTYPE;
  v_previous_grace_end timestamptz;
  v_grace_end timestamptz;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  IF v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
  ) THEN
    RAISE EXCEPTION 'BILLING_OPERATOR_REQUIRED';
  END IF;
  IF p_group_id IS NULL OR p_subscription_id IS NULL THEN
    RAISE EXCEPTION 'BILLING_SCOPE_REQUIRED';
  END IF;
  IF p_grace_days IS NULL OR p_grace_days < 1 OR p_grace_days > 90 THEN
    RAISE EXCEPTION 'INVALID_GRACE_DAYS';
  END IF;
  IF p_mode NOT IN ('from_now', 'extend') THEN
    RAISE EXCEPTION 'INVALID_GRACE_MODE';
  END IF;
  IF nullif(btrim(p_reason), '') IS NULL OR length(btrim(p_reason)) < 8 THEN
    RAISE EXCEPTION 'AUDIT_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_subscription
  FROM public.saas_owner_group_plan_subscriptions
  WHERE id = p_subscription_id AND group_id = p_group_id
  FOR UPDATE;

  IF v_subscription.id IS NULL THEN
    RAISE EXCEPTION 'OWNER_GROUP_SUBSCRIPTION_NOT_FOUND';
  END IF;
  IF v_subscription.status NOT IN ('active', 'grace_period') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_ELIGIBLE_FOR_GRACE';
  END IF;

  v_previous_grace_end := v_subscription.grace_end_at;
  v_grace_end := CASE
    WHEN p_mode = 'extend' AND v_previous_grace_end > now()
      THEN v_previous_grace_end + make_interval(days => p_grace_days)
    ELSE now() + make_interval(days => p_grace_days)
  END;

  UPDATE public.saas_owner_group_plan_subscriptions
  SET status = 'grace_period', payment_state = 'grace', grace_end_at = v_grace_end,
      updated_at = now(),
      notes = coalesce(notes, '') || ' Admin grace ' || p_mode || ' until ' || v_grace_end::text || ' reason=' || btrim(p_reason)
  WHERE id = v_subscription.id;

  INSERT INTO public.saas_owner_group_subscription_events (
    subscription_id, group_id, actor_user_id, event_type, details, correlation_id
  ) VALUES (
    v_subscription.id, v_subscription.group_id, v_actor, 'billing.group.admin_grace_set',
    jsonb_build_object('mode', p_mode, 'grace_days', p_grace_days, 'previous_grace_end_at', v_previous_grace_end,
      'grace_end_at', v_grace_end, 'reason', btrim(p_reason), 'metadata', coalesce(p_metadata, '{}'::jsonb)),
    v_correlation_id
  );

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, severity, result_status, actor_user_id,
    target_entity_type, target_entity_id, correlation_id, metadata
  ) VALUES (
    'control_plane', 'billing.group.admin_grace_set', 'billing', 'set_owner_group_subscription_grace',
    'warning', 'success', v_actor, 'saas_owner_group_plan_subscription', v_subscription.id::text, v_correlation_id,
    jsonb_build_object('group_id', v_subscription.group_id, 'mode', p_mode, 'grace_days', p_grace_days,
      'previous_grace_end_at', v_previous_grace_end, 'grace_end_at', v_grace_end,
      'reason', btrim(p_reason), 'metadata', coalesce(p_metadata, '{}'::jsonb))
  );

  RETURN jsonb_build_object('scope_type', 'owner_group', 'scope_id', v_subscription.group_id,
    'subscription_id', v_subscription.id, 'grace_end_at', v_grace_end, 'correlation_id', v_correlation_id);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_admin_set_company_subscription_grace(uuid,uuid,integer,text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_admin_set_owner_group_subscription_grace(uuid,uuid,integer,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_admin_set_company_subscription_grace(uuid,uuid,integer,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_set_owner_group_subscription_grace(uuid,uuid,integer,text,text,text,jsonb) TO authenticated;
