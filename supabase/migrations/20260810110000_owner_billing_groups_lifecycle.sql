-- Transactional Owner Billing Group lifecycle operations.
-- Company subscriptions are paused and preserved when joining a group. Leaving a
-- group requires a new standalone plan and never reactivates a previous plan.

DO $$
BEGIN
  IF to_regclass('public.owner_billing_groups') IS NULL
     OR to_regclass('public.owner_billing_group_members') IS NULL
     OR to_regclass('public.saas_owner_group_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_owner_group_subscription_events') IS NULL
     OR to_regclass('public.saas_owner_group_subscription_change_log') IS NULL
     OR to_regclass('public.platform_audit_events') IS NULL
     OR to_regclass('public.saas_usage_counters') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_LIFECYCLE_PREREQUISITES_MISSING: Run Owner Billing Groups foundation and platform audit migrations first.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.saas_company_billing_access_states (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  access_state text NOT NULL DEFAULT 'standalone' CHECK (access_state IN ('standalone', 'grouped', 'needs_plan')),
  source_group_id uuid REFERENCES public.owner_billing_groups(id) ON DELETE SET NULL,
  needs_plan_since timestamptz,
  transition_reason text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_company_billing_access_states_consistency_check CHECK (
    (access_state = 'standalone' AND source_group_id IS NULL AND needs_plan_since IS NULL)
    OR (access_state = 'grouped' AND source_group_id IS NOT NULL AND needs_plan_since IS NULL)
    OR (access_state = 'needs_plan' AND needs_plan_since IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_saas_company_billing_access_states_group
  ON public.saas_company_billing_access_states(source_group_id, access_state);

DROP TRIGGER IF EXISTS trg_saas_company_billing_access_states_updated_at ON public.saas_company_billing_access_states;
CREATE TRIGGER trg_saas_company_billing_access_states_updated_at
  BEFORE UPDATE ON public.saas_company_billing_access_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.saas_company_billing_access_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view company billing access state"
ON public.saas_company_billing_access_states
FOR SELECT TO authenticated
USING (public.saas_user_can_access_company(auth.uid(), company_id));

REVOKE ALL ON public.saas_company_billing_access_states FROM anon;
GRANT SELECT ON public.saas_company_billing_access_states TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_billing_group_assert_actor(
  p_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN;
  END IF;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF v_actor <> p_owner_id AND NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_PERMISSION_DENIED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_assert_reason(
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_REASON_REQUIRED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_capacity_violations(
  p_plan_id uuid,
  p_company_ids uuid[]
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH selected_plan AS (
    SELECT id
    FROM public.saas_plans
    WHERE id = p_plan_id
      AND product_id IS NULL
      AND is_active = true
  ), plan_limits AS (
    SELECT
      quota.quota_dimension_id,
      dimension.code,
      quota.hard_limit,
      quota.is_unlimited
    FROM selected_plan
    JOIN public.saas_plan_quotas quota ON quota.plan_id = selected_plan.id
    JOIN public.saas_quota_dimensions dimension ON dimension.id = quota.quota_dimension_id
  ), pooled_usage AS (
    SELECT
      limits.quota_dimension_id,
      coalesce(sum(counter.used_value), 0)::bigint AS used_value
    FROM plan_limits limits
    LEFT JOIN public.saas_usage_counters counter
      ON counter.quota_dimension_id = limits.quota_dimension_id
     AND counter.company_id = ANY(coalesce(p_company_ids, ARRAY[]::uuid[]))
     AND current_date BETWEEN counter.period_start AND counter.period_end
    GROUP BY limits.quota_dimension_id
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'quota_code', limits.code,
        'used_value', usage.used_value,
        'hard_limit', limits.hard_limit
      )
      ORDER BY limits.code
    ) FILTER (WHERE NOT limits.is_unlimited AND usage.used_value > limits.hard_limit),
    '[]'::jsonb
  )
  FROM plan_limits limits
  JOIN pooled_usage usage ON usage.quota_dimension_id = limits.quota_dimension_id;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_assert_capacity(
  p_plan_id uuid,
  p_company_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_violations jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.saas_plans
    WHERE id = p_plan_id
      AND product_id IS NULL
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_REQUIRES_ACTIVE_UNIFIED_PLAN';
  END IF;

  v_violations := public.owner_billing_group_capacity_violations(p_plan_id, p_company_ids);

  IF jsonb_array_length(v_violations) > 0 THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_PLAN_CAPACITY_EXCEEDED: %', v_violations::text;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_preview_capacity(
  p_plan_id uuid,
  p_company_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_ids uuid[];
  v_company_count integer;
  v_owner_count integer;
  v_owner_id uuid;
  v_violations jsonb;
BEGIN
  SELECT array_agg(DISTINCT company_id ORDER BY company_id)
  INTO v_company_ids
  FROM unnest(coalesce(p_company_ids, ARRAY[]::uuid[])) AS company_id;

  IF coalesce(array_length(v_company_ids, 1), 0) < 2 THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_REQUIRES_TWO_MEMBERS';
  END IF;

  SELECT count(*), count(DISTINCT owner_id), min(owner_id::text)::uuid
  INTO v_company_count, v_owner_count, v_owner_id
  FROM public.companies
  WHERE id = ANY(v_company_ids);

  IF v_company_count <> array_length(v_company_ids, 1) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_NOT_FOUND';
  END IF;

  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANIES_REQUIRE_ONE_OWNER';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  v_violations := public.owner_billing_group_capacity_violations(p_plan_id, v_company_ids);

  RETURN jsonb_build_object(
    'eligible', jsonb_array_length(v_violations) = 0,
    'company_count', array_length(v_company_ids, 1),
    'violations', v_violations
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_write_audit(
  p_event_type text,
  p_action text,
  p_group_id uuid,
  p_correlation_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_audit_events (
    source,
    event_type,
    module,
    action,
    severity,
    result_status,
    actor_user_id,
    target_entity_type,
    target_entity_id,
    correlation_id,
    metadata
  ) VALUES (
    'catalog_management',
    p_event_type,
    'owner_billing_groups',
    p_action,
    'info',
    'success',
    auth.uid(),
    'owner_billing_group',
    p_group_id::text,
    p_correlation_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_pause_company_subscriptions(
  p_group_id uuid,
  p_company_ids uuid[],
  p_reason text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paused_count integer;
BEGIN
  UPDATE public.saas_company_plan_subscriptions
  SET status = 'paused',
      auto_renew = false,
      metadata = jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{owner_billing_group}',
        jsonb_build_object(
          'group_id', p_group_id,
          'previous_status', status,
          'paused_at', now(),
          'reason', p_reason
        ),
        true
      ),
      updated_at = now()
  WHERE company_id = ANY(p_company_ids)
    AND status IN ('active', 'trialing', 'grace_period');

  GET DIAGNOSTICS v_paused_count = ROW_COUNT;
  RETURN v_paused_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_set_company_state(
  p_company_ids uuid[],
  p_access_state text,
  p_group_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.saas_company_billing_access_states (
    company_id,
    access_state,
    source_group_id,
    needs_plan_since,
    transition_reason,
    updated_by
  )
  SELECT
    company_id,
    p_access_state,
    p_group_id,
    CASE WHEN p_access_state = 'needs_plan' THEN now() ELSE NULL END,
    p_reason,
    auth.uid()
  FROM unnest(p_company_ids) AS company_id
  ON CONFLICT (company_id) DO UPDATE SET
    access_state = EXCLUDED.access_state,
    source_group_id = EXCLUDED.source_group_id,
    needs_plan_since = EXCLUDED.needs_plan_since,
    transition_reason = EXCLUDED.transition_reason,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_create(
  p_name text,
  p_company_ids uuid[],
  p_plan_id uuid,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company_ids uuid[];
  v_owner_id uuid;
  v_owner_count integer;
  v_company_count integer;
  v_group_id uuid;
  v_subscription_id uuid;
  v_paused_count integer;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  SELECT array_agg(DISTINCT company_id ORDER BY company_id)
  INTO v_company_ids
  FROM unnest(coalesce(p_company_ids, ARRAY[]::uuid[])) AS company_id;

  IF coalesce(array_length(v_company_ids, 1), 0) < 2 THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_REQUIRES_TWO_MEMBERS';
  END IF;

  PERFORM 1
  FROM public.companies
  WHERE id = ANY(v_company_ids)
  ORDER BY id
  FOR UPDATE;

  SELECT count(*), count(DISTINCT owner_id), min(owner_id::text)::uuid
  INTO v_company_count, v_owner_count, v_owner_id
  FROM public.companies
  WHERE id = ANY(v_company_ids);

  IF v_company_count <> array_length(v_company_ids, 1) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_NOT_FOUND';
  END IF;

  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANIES_REQUIRE_ONE_OWNER';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  IF EXISTS (
    SELECT 1
    FROM public.owner_billing_group_members
    WHERE company_id = ANY(v_company_ids)
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_ALREADY_GROUPED';
  END IF;

  PERFORM public.owner_billing_group_assert_capacity(p_plan_id, v_company_ids);

  INSERT INTO public.owner_billing_groups (owner_id, name, created_by)
  VALUES (v_owner_id, btrim(p_name), v_actor)
  RETURNING id INTO v_group_id;

  INSERT INTO public.owner_billing_group_members (group_id, company_id, added_by)
  SELECT v_group_id, company_id, v_actor
  FROM unnest(v_company_ids) AS company_id;

  v_paused_count := public.owner_billing_group_pause_company_subscriptions(
    v_group_id,
    v_company_ids,
    p_reason
  );

  PERFORM public.owner_billing_group_set_company_state(
    v_company_ids,
    'grouped',
    v_group_id,
    p_reason
  );

  INSERT INTO public.saas_owner_group_plan_subscriptions (
    group_id,
    plan_id,
    status,
    start_at,
    current_period_start,
    current_period_end,
    next_renewal_at,
    created_by,
    metadata
  ) VALUES (
    v_group_id,
    p_plan_id,
    'active',
    now(),
    now(),
    now() + interval '1 month',
    now() + interval '1 month',
    v_actor,
    jsonb_build_object('created_reason', p_reason)
  )
  RETURNING id INTO v_subscription_id;

  INSERT INTO public.saas_owner_group_subscription_events (
    subscription_id,
    group_id,
    actor_user_id,
    event_type,
    details,
    correlation_id
  ) VALUES (
    v_subscription_id,
    v_group_id,
    v_actor,
    'billing.group.created',
    jsonb_build_object(
      'company_ids', v_company_ids,
      'plan_id', p_plan_id,
      'paused_company_subscriptions', v_paused_count,
      'reason', p_reason
    ),
    v_correlation_id
  );

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.created',
    'create',
    v_group_id,
    v_correlation_id,
    jsonb_build_object(
      'owner_id', v_owner_id,
      'company_ids', v_company_ids,
      'plan_id', p_plan_id,
      'paused_company_subscriptions', v_paused_count,
      'reason', p_reason
    )
  );

  RETURN v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_add_company(
  p_group_id uuid,
  p_company_id uuid,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_company_owner_id uuid;
  v_plan_id uuid;
  v_company_ids uuid[];
  v_subscription_id uuid;
  v_paused_count integer;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  SELECT owner_id
  INTO v_owner_id
  FROM public.owner_billing_groups
  WHERE id = p_group_id
    AND status = 'active'
  FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  SELECT owner_id
  INTO v_company_owner_id
  FROM public.companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF v_company_owner_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_NOT_FOUND';
  END IF;

  IF v_company_owner_id <> v_owner_id THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_OWNER_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.owner_billing_group_members WHERE company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_ALREADY_GROUPED';
  END IF;

  SELECT id, plan_id
  INTO v_subscription_id, v_plan_id
  FROM public.saas_owner_group_plan_subscriptions
  WHERE group_id = p_group_id
    AND status IN ('active', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_ACTIVE_PLAN_REQUIRED';
  END IF;

  SELECT array_agg(company_id ORDER BY company_id)
  INTO v_company_ids
  FROM (
    SELECT company_id
    FROM public.owner_billing_group_members
    WHERE group_id = p_group_id
    UNION
    SELECT p_company_id
  ) candidates;

  PERFORM public.owner_billing_group_assert_capacity(v_plan_id, v_company_ids);

  INSERT INTO public.owner_billing_group_members (group_id, company_id, added_by)
  VALUES (p_group_id, p_company_id, v_actor);

  v_paused_count := public.owner_billing_group_pause_company_subscriptions(
    p_group_id,
    ARRAY[p_company_id],
    p_reason
  );

  PERFORM public.owner_billing_group_set_company_state(
    ARRAY[p_company_id],
    'grouped',
    p_group_id,
    p_reason
  );

  INSERT INTO public.saas_owner_group_subscription_events (
    subscription_id, group_id, actor_user_id, event_type, details, correlation_id
  ) VALUES (
    v_subscription_id,
    p_group_id,
    v_actor,
    'billing.group.company_added',
    jsonb_build_object(
      'company_id', p_company_id,
      'paused_company_subscriptions', v_paused_count,
      'reason', p_reason
    ),
    v_correlation_id
  );

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.company_added',
    'add_company',
    p_group_id,
    v_correlation_id,
    jsonb_build_object('company_id', p_company_id, 'reason', p_reason)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_remove_company(
  p_group_id uuid,
  p_company_id uuid,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_member_count integer;
  v_subscription_id uuid;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  SELECT owner_id
  INTO v_owner_id
  FROM public.owner_billing_groups
  WHERE id = p_group_id
    AND status = 'active'
  FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.owner_billing_group_members
    WHERE group_id = p_group_id
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_NOT_MEMBER';
  END IF;

  SELECT count(*)
  INTO v_member_count
  FROM public.owner_billing_group_members
  WHERE group_id = p_group_id;

  IF v_member_count <= 2 THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_DISSOLVE_REQUIRED';
  END IF;

  SELECT id
  INTO v_subscription_id
  FROM public.saas_owner_group_plan_subscriptions
  WHERE group_id = p_group_id
    AND status IN ('active', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1;

  DELETE FROM public.owner_billing_group_members
  WHERE group_id = p_group_id
    AND company_id = p_company_id;

  PERFORM public.owner_billing_group_set_company_state(
    ARRAY[p_company_id],
    'needs_plan',
    p_group_id,
    p_reason
  );

  INSERT INTO public.saas_owner_group_subscription_events (
    subscription_id, group_id, actor_user_id, event_type, details, correlation_id
  ) VALUES (
    v_subscription_id,
    p_group_id,
    v_actor,
    'billing.group.company_removed',
    jsonb_build_object(
      'company_id', p_company_id,
      'access_state', 'needs_plan',
      'previous_subscription_reactivated', false,
      'reason', p_reason
    ),
    v_correlation_id
  );

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.company_removed',
    'remove_company',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'company_id', p_company_id,
      'access_state', 'needs_plan',
      'reason', p_reason
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_dissolve(
  p_group_id uuid,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_company_ids uuid[];
  v_subscription_id uuid;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  SELECT owner_id
  INTO v_owner_id
  FROM public.owner_billing_groups
  WHERE id = p_group_id
    AND status = 'active'
  FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  SELECT array_agg(company_id ORDER BY company_id)
  INTO v_company_ids
  FROM public.owner_billing_group_members
  WHERE group_id = p_group_id;

  SELECT id
  INTO v_subscription_id
  FROM public.saas_owner_group_plan_subscriptions
  WHERE group_id = p_group_id
    AND status IN ('active', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_subscription_id IS NOT NULL THEN
    INSERT INTO public.saas_owner_group_subscription_events (
      subscription_id, group_id, actor_user_id, event_type, details, correlation_id
    ) VALUES (
      v_subscription_id,
      p_group_id,
      v_actor,
      'billing.group.dissolved',
      jsonb_build_object(
        'company_ids', coalesce(v_company_ids, ARRAY[]::uuid[]),
        'access_state', 'needs_plan',
        'previous_subscriptions_reactivated', false,
        'reason', p_reason
      ),
      v_correlation_id
    );

    UPDATE public.saas_owner_group_plan_subscriptions
    SET status = 'expired',
        end_at = now(),
        auto_renew = false,
        payment_state = 'canceled',
        updated_at = now()
    WHERE id = v_subscription_id;
  END IF;

  IF coalesce(array_length(v_company_ids, 1), 0) > 0 THEN
    PERFORM public.owner_billing_group_set_company_state(
      v_company_ids,
      'needs_plan',
      p_group_id,
      p_reason
    );
  END IF;

  DELETE FROM public.owner_billing_group_members
  WHERE group_id = p_group_id;

  UPDATE public.owner_billing_groups
  SET status = 'dissolved',
      dissolved_at = now(),
      updated_at = now()
  WHERE id = p_group_id;

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.dissolved',
    'dissolve',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'company_ids', coalesce(v_company_ids, ARRAY[]::uuid[]),
      'access_state', 'needs_plan',
      'reason', p_reason
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_rename(
  p_group_id uuid,
  p_name text,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_previous_name text;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  SELECT owner_id, name
  INTO v_owner_id, v_previous_name
  FROM public.owner_billing_groups
  WHERE id = p_group_id
    AND status = 'active'
  FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  UPDATE public.owner_billing_groups
  SET name = btrim(p_name),
      updated_at = now()
  WHERE id = p_group_id;

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.renamed',
    'rename',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'previous_name', v_previous_name,
      'new_name', btrim(p_name),
      'reason', p_reason
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_change_plan(
  p_group_id uuid,
  p_plan_id uuid,
  p_currency_code text,
  p_reason text,
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_company_ids uuid[];
  v_subscription_id uuid;
  v_previous_plan_id uuid;
  v_new_subscription_id uuid;
  v_correlation_id text := coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text);
BEGIN
  PERFORM public.owner_billing_group_assert_reason(p_reason);

  IF p_currency_code NOT IN ('USD', 'NGN', 'GBP') THEN
    RAISE EXCEPTION 'UNSUPPORTED_CURRENCY';
  END IF;

  SELECT owner_id
  INTO v_owner_id
  FROM public.owner_billing_groups
  WHERE id = p_group_id
    AND status = 'active'
  FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  PERFORM public.owner_billing_group_assert_actor(v_owner_id);

  SELECT array_agg(company_id ORDER BY company_id)
  INTO v_company_ids
  FROM public.owner_billing_group_members
  WHERE group_id = p_group_id;

  PERFORM public.owner_billing_group_assert_capacity(p_plan_id, v_company_ids);

  SELECT id, plan_id
  INTO v_subscription_id, v_previous_plan_id
  FROM public.saas_owner_group_plan_subscriptions
  WHERE group_id = p_group_id
    AND status IN ('active', 'grace_period')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_ACTIVE_PLAN_REQUIRED';
  END IF;

  IF v_previous_plan_id = p_plan_id THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_PLAN_UNCHANGED';
  END IF;

  UPDATE public.saas_owner_group_plan_subscriptions
  SET status = 'expired',
      end_at = now(),
      auto_renew = false,
      updated_at = now()
  WHERE id = v_subscription_id;

  INSERT INTO public.saas_owner_group_plan_subscriptions (
    group_id,
    plan_id,
    status,
    start_at,
    current_period_start,
    current_period_end,
    next_renewal_at,
    created_by,
    metadata
  ) VALUES (
    p_group_id,
    p_plan_id,
    'active',
    now(),
    now(),
    now() + interval '1 month',
    now() + interval '1 month',
    v_actor,
    jsonb_build_object('change_reason', p_reason, 'previous_subscription_id', v_subscription_id)
  )
  RETURNING id INTO v_new_subscription_id;

  INSERT INTO public.saas_owner_group_subscription_change_log (
    subscription_id,
    group_id,
    previous_plan_id,
    new_plan_id,
    currency_code,
    effective_at,
    reason,
    actor_user_id,
    correlation_id
  ) VALUES (
    v_new_subscription_id,
    p_group_id,
    v_previous_plan_id,
    p_plan_id,
    p_currency_code,
    now(),
    p_reason,
    v_actor,
    v_correlation_id
  );

  INSERT INTO public.saas_owner_group_subscription_events (
    subscription_id, group_id, actor_user_id, event_type, details, correlation_id
  ) VALUES (
    v_new_subscription_id,
    p_group_id,
    v_actor,
    'billing.group.plan_changed',
    jsonb_build_object(
      'previous_plan_id', v_previous_plan_id,
      'new_plan_id', p_plan_id,
      'reason', p_reason
    ),
    v_correlation_id
  );

  PERFORM public.owner_billing_group_write_audit(
    'billing.group.plan_changed',
    'change_plan',
    p_group_id,
    v_correlation_id,
    jsonb_build_object(
      'previous_plan_id', v_previous_plan_id,
      'new_plan_id', p_plan_id,
      'reason', p_reason
    )
  );

  RETURN v_new_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_billing_group_assert_actor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_assert_reason(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_assert_capacity(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_write_audit(text, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_pause_company_subscriptions(uuid, uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_set_company_state(uuid[], text, uuid, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.owner_billing_group_capacity_violations(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_preview_capacity(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_billing_group_preview_capacity(uuid, uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.owner_billing_group_create(text, uuid[], uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_add_company(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_remove_company(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_dissolve(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_rename(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_billing_group_change_plan(uuid, uuid, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.owner_billing_group_create(text, uuid[], uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_billing_group_add_company(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_billing_group_remove_company(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_billing_group_dissolve(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_billing_group_rename(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_billing_group_change_plan(uuid, uuid, text, text, text) TO authenticated;
