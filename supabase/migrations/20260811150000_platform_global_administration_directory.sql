-- Unified scale-grade directory for global Control Plane administration.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.company_members') IS NULL
     OR to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_owner_group_plan_subscriptions') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'GLOBAL_ADMIN_DIRECTORY_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
DECLARE
  v_trgm_schema text;
BEGIN
  SELECT n.nspname INTO v_trgm_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';
  IF v_trgm_schema IS NULL THEN RAISE EXCEPTION 'PG_TRGM_EXTENSION_MISSING'; END IF;

  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_platform_companies_email_search ON public.companies USING gin (lower(email) %I.gin_trgm_ops)', v_trgm_schema);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_platform_profiles_name_search ON public.profiles USING gin (lower(name) %I.gin_trgm_ops)', v_trgm_schema);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_platform_profiles_email_search ON public.profiles USING gin (lower(email) %I.gin_trgm_ops)', v_trgm_schema);
END;
$$;

CREATE INDEX IF NOT EXISTS idx_platform_companies_owner_created
  ON public.companies (owner_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_company_members_role_status_user
  ON public.company_members (role, status, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_company_subscriptions_status_created
  ON public.saas_company_plan_subscriptions (status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_group_subscriptions_status_created
  ON public.saas_owner_group_plan_subscriptions (status, created_at DESC, id DESC);

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
  IF v_type NOT IN ('company', 'user', 'landlord', 'property_manager', 'billing_group', 'subscription') THEN
    RAISE EXCEPTION 'INVALID_GLOBAL_ENTITY_TYPE';
  END IF;

  WITH entities AS MATERIALIZED (
    SELECT 'company'::text AS entity_type, c.id AS entity_id, c.name AS label, c.email AS secondary_label,
      c.id AS company_id, c.owner_id AS user_id, NULL::uuid AS billing_group_id, NULL::uuid AS subscription_id,
      CASE WHEN c.is_verified THEN 'verified' ELSE 'unverified' END AS status, c.created_at,
      jsonb_build_object('owner_id', c.owner_id, 'phone', c.phone) AS metadata
    FROM public.companies c WHERE v_type = 'company'
    UNION ALL
    SELECT 'user', p.user_id, coalesce(nullif(p.name, ''), p.email, p.user_id::text), p.email,
      NULL, p.user_id, NULL, NULL, NULL, p.created_at, '{}'::jsonb
    FROM public.profiles p WHERE v_type = 'user'
    UNION ALL
    SELECT 'landlord', c.owner_id, coalesce(nullif(p.name, ''), p.email, c.owner_id::text), p.email,
      NULL, c.owner_id, NULL, NULL, 'active', min(c.created_at),
      jsonb_build_object('company_count', count(c.id), 'company_ids', jsonb_agg(c.id ORDER BY c.created_at DESC))
    FROM public.companies c LEFT JOIN public.profiles p ON p.user_id = c.owner_id
    WHERE v_type = 'landlord' GROUP BY c.owner_id, p.name, p.email
    UNION ALL
    SELECT 'property_manager', cm.user_id, coalesce(nullif(p.name, ''), p.email, cm.user_id::text), p.email,
      NULL, cm.user_id, NULL, NULL, 'approved', min(cm.created_at),
      jsonb_build_object('company_count', count(DISTINCT cm.company_id), 'company_ids', jsonb_agg(DISTINCT cm.company_id))
    FROM public.company_members cm LEFT JOIN public.profiles p ON p.user_id = cm.user_id
    WHERE v_type = 'property_manager' AND cm.role = 'property_manager' AND cm.status = 'approved'
    GROUP BY cm.user_id, p.name, p.email
    UNION ALL
    SELECT 'billing_group', g.id, g.name, g.owner_id::text, NULL, g.owner_id, g.id, NULL, g.status, g.created_at,
      jsonb_build_object('member_count', (SELECT count(*) FROM public.owner_billing_group_members m WHERE m.group_id = g.id))
    FROM public.owner_billing_groups g WHERE v_type = 'billing_group'
    UNION ALL
    SELECT 'subscription', s.id, c.name || ' / ' || p.name, c.email, c.id, c.owner_id, NULL, s.id, s.status, s.created_at,
      jsonb_build_object('scope_type', 'company', 'plan_id', s.plan_id, 'plan_code', p.code, 'plan_name', p.name,
        'product_id', s.product_id, 'grace_end_at', s.grace_end_at, 'trial_end_at', s.trial_end_at)
    FROM public.saas_company_plan_subscriptions s JOIN public.companies c ON c.id = s.company_id JOIN public.saas_plans p ON p.id = s.plan_id
    WHERE v_type = 'subscription'
    UNION ALL
    SELECT 'subscription', s.id, g.name || ' / ' || p.name, g.owner_id::text, NULL, g.owner_id, g.id, s.id, s.status, s.created_at,
      jsonb_build_object('scope_type', 'owner_group', 'plan_id', s.plan_id, 'plan_code', p.code, 'plan_name', p.name,
        'payment_state', s.payment_state, 'grace_end_at', s.grace_end_at, 'next_renewal_at', s.next_renewal_at)
    FROM public.saas_owner_group_plan_subscriptions s JOIN public.owner_billing_groups g ON g.id = s.group_id JOIN public.saas_plans p ON p.id = s.plan_id
    WHERE v_type = 'subscription'
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