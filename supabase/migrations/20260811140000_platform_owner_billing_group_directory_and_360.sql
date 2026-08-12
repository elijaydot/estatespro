-- Scale-grade Billing Group directory and selected Group 360 read APIs.

DO $$
BEGIN
  IF to_regclass('public.owner_billing_groups') IS NULL
     OR to_regclass('public.owner_billing_group_members') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_360_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
DECLARE
  v_trgm_schema text;
BEGIN
  SELECT n.nspname INTO v_trgm_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  IF v_trgm_schema IS NULL THEN
    RAISE EXCEPTION 'PG_TRGM_EXTENSION_MISSING';
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_owner_billing_groups_name_search ON public.owner_billing_groups USING gin (lower(name) %I.gin_trgm_ops)',
    v_trgm_schema
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_owner_billing_group_members_company_name ON public.companies USING gin (lower(name) %I.gin_trgm_ops)',
    v_trgm_schema
  );
END;
$$;

CREATE INDEX IF NOT EXISTS idx_owner_billing_groups_status_created
  ON public.owner_billing_groups (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_owner_group_invoices_group_status_created
  ON public.saas_owner_group_subscription_invoices (group_id, invoice_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_owner_group_events_group_type_created
  ON public.saas_owner_group_subscription_events (group_id, event_type, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.platform_get_owner_billing_groups_page(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := auth.uid();
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
  IF v_status IS NOT NULL AND v_status NOT IN ('active', 'dissolved') THEN
    RAISE EXCEPTION 'INVALID_GROUP_STATUS';
  END IF;

  WITH filtered AS MATERIALIZED (
    SELECT g.id, g.owner_id, g.name, g.status, g.created_at,
      (SELECT count(*)::integer FROM public.owner_billing_group_members m WHERE m.group_id = g.id) AS member_count,
      s.id AS subscription_id, s.status AS subscription_status, s.payment_state, s.grace_end_at
    FROM public.owner_billing_groups g
    LEFT JOIN public.saas_owner_group_plan_subscriptions s
      ON s.group_id = g.id AND s.status IN ('active', 'grace_period')
    WHERE (v_status IS NULL OR g.status = v_status)
      AND (v_search IS NULL OR lower(g.name) LIKE '%' || v_search || '%'
        OR g.id::text = v_search OR g.owner_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered)
  INTO v_rows, v_total_count;

  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_owner_billing_group_360(
  p_group_id uuid,
  p_member_search text DEFAULT NULL,
  p_member_page integer DEFAULT 1,
  p_member_page_size integer DEFAULT 20,
  p_invoice_status text DEFAULT NULL,
  p_invoice_page integer DEFAULT 1,
  p_invoice_page_size integer DEFAULT 20,
  p_override_search text DEFAULT NULL,
  p_quota_page integer DEFAULT 1,
  p_entitlement_page integer DEFAULT 1,
  p_override_page_size integer DEFAULT 20,
  p_event_type text DEFAULT NULL,
  p_event_page integer DEFAULT 1,
  p_event_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_member_search text := nullif(lower(btrim(coalesce(p_member_search, ''))), '');
  v_invoice_status text := nullif(lower(btrim(coalesce(p_invoice_status, ''))), '');
  v_override_search text := nullif(lower(btrim(coalesce(p_override_search, ''))), '');
  v_event_type text := nullif(btrim(coalesce(p_event_type, '')), '');
  v_member_page integer := greatest(1, coalesce(p_member_page, 1));
  v_invoice_page integer := greatest(1, coalesce(p_invoice_page, 1));
  v_quota_page integer := greatest(1, coalesce(p_quota_page, 1));
  v_entitlement_page integer := greatest(1, coalesce(p_entitlement_page, 1));
  v_event_page integer := greatest(1, coalesce(p_event_page, 1));
  v_member_size integer := least(100, greatest(10, coalesce(p_member_page_size, 20)));
  v_invoice_size integer := least(100, greatest(10, coalesce(p_invoice_page_size, 20)));
  v_override_size integer := least(100, greatest(10, coalesce(p_override_page_size, 20)));
  v_event_size integer := least(100, greatest(10, coalesce(p_event_page_size, 20)));
  v_group jsonb;
  v_subscription jsonb;
  v_members jsonb;
  v_invoices jsonb;
  v_quota_overrides jsonb;
  v_entitlement_overrides jsonb;
  v_events jsonb;
  v_member_total bigint;
  v_invoice_total bigint;
  v_quota_total bigint;
  v_entitlement_total bigint;
  v_event_total bigint;
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
  IF p_group_id IS NULL THEN RAISE EXCEPTION 'GROUP_ID_REQUIRED'; END IF;

  SELECT to_jsonb(g) INTO v_group FROM public.owner_billing_groups g WHERE g.id = p_group_id;
  IF v_group IS NULL THEN RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_FOUND'; END IF;

  SELECT to_jsonb(s) || jsonb_build_object('plan_name', p.name, 'plan_code', p.code)
  INTO v_subscription
  FROM public.saas_owner_group_plan_subscriptions s
  JOIN public.saas_plans p ON p.id = s.plan_id
  WHERE s.group_id = p_group_id
  ORDER BY (s.status IN ('active', 'grace_period')) DESC, s.created_at DESC LIMIT 1;

  WITH filtered AS MATERIALIZED (
    SELECT m.id, m.group_id, m.company_id, m.added_at, c.name AS company_name
    FROM public.owner_billing_group_members m JOIN public.companies c ON c.id = m.company_id
    WHERE m.group_id = p_group_id AND (v_member_search IS NULL OR lower(c.name) LIKE '%' || v_member_search || '%' OR m.company_id::text = v_member_search)
  ), paged AS (
    SELECT * FROM filtered ORDER BY added_at DESC, id DESC OFFSET (v_member_page - 1) * v_member_size LIMIT v_member_size
  ) SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY added_at DESC, id DESC) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_members, v_member_total;

  WITH filtered AS MATERIALIZED (
    SELECT id, group_id, invoice_status, invoice_kind, amount_minor, currency_code, due_at, external_reference, created_at
    FROM public.saas_owner_group_subscription_invoices
    WHERE group_id = p_group_id AND (v_invoice_status IS NULL OR invoice_status = v_invoice_status)
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC OFFSET (v_invoice_page - 1) * v_invoice_size LIMIT v_invoice_size
  ) SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_invoices, v_invoice_total;

  WITH filtered AS MATERIALIZED (
    SELECT o.*, d.code AS quota_code, d.name AS quota_name
    FROM public.saas_owner_group_quota_overrides o JOIN public.saas_quota_dimensions d ON d.id = o.quota_dimension_id
    WHERE o.group_id = p_group_id AND (v_override_search IS NULL OR lower(o.reason) LIKE '%' || v_override_search || '%' OR lower(d.name) LIKE '%' || v_override_search || '%' OR lower(d.code) LIKE '%' || v_override_search || '%')
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC OFFSET (v_quota_page - 1) * v_override_size LIMIT v_override_size
  ) SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_quota_overrides, v_quota_total;

  WITH filtered AS MATERIALIZED (
    SELECT o.*, k.key AS entitlement_key, k.domain AS entitlement_domain
    FROM public.saas_owner_group_entitlement_overrides o JOIN public.saas_entitlement_keys k ON k.id = o.entitlement_key_id
    WHERE o.group_id = p_group_id AND (v_override_search IS NULL OR lower(o.reason) LIKE '%' || v_override_search || '%' OR lower(k.key) LIKE '%' || v_override_search || '%')
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC OFFSET (v_entitlement_page - 1) * v_override_size LIMIT v_override_size
  ) SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_entitlement_overrides, v_entitlement_total;

  WITH filtered AS MATERIALIZED (
    SELECT id, group_id, event_type, actor_user_id, details, created_at
    FROM public.saas_owner_group_subscription_events
    WHERE group_id = p_group_id AND (v_event_type IS NULL OR event_type = v_event_type)
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC OFFSET (v_event_page - 1) * v_event_size LIMIT v_event_size
  ) SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb), (SELECT count(*) FROM filtered) INTO v_events, v_event_total;

  RETURN jsonb_build_object(
    'group', v_group, 'subscription', v_subscription,
    'summary', jsonb_build_object(
      'member_count', (SELECT count(*) FROM public.owner_billing_group_members WHERE group_id = p_group_id),
      'outstanding_by_currency', coalesce((
        SELECT jsonb_object_agg(currency_code, amount_minor)
        FROM (
          SELECT currency_code, sum(amount_minor)::bigint AS amount_minor
          FROM public.saas_owner_group_subscription_invoices
          WHERE group_id = p_group_id AND invoice_status IN ('open', 'uncollectible')
          GROUP BY currency_code
        ) totals
      ), '{}'::jsonb)
    ),
    'members', jsonb_build_object('rows', v_members, 'page', v_member_page, 'page_size', v_member_size, 'total_count', v_member_total),
    'invoices', jsonb_build_object('rows', v_invoices, 'page', v_invoice_page, 'page_size', v_invoice_size, 'total_count', v_invoice_total),
    'quota_overrides', jsonb_build_object('rows', v_quota_overrides, 'page', v_quota_page, 'page_size', v_override_size, 'total_count', v_quota_total),
    'entitlement_overrides', jsonb_build_object('rows', v_entitlement_overrides, 'page', v_entitlement_page, 'page_size', v_override_size, 'total_count', v_entitlement_total),
    'events', jsonb_build_object('rows', v_events, 'page', v_event_page, 'page_size', v_event_size, 'total_count', v_event_total),
    'event_types', coalesce((SELECT jsonb_agg(event_type ORDER BY event_type) FROM (SELECT DISTINCT event_type FROM public.saas_owner_group_subscription_events WHERE group_id = p_group_id) types), '[]'::jsonb),
    'catalog', jsonb_build_object(
      'plans', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', code) ORDER BY sort_order) FROM public.saas_plans WHERE product_id IS NULL), '[]'::jsonb),
      'dimensions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name) ORDER BY name) FROM public.saas_quota_dimensions), '[]'::jsonb),
      'entitlement_keys', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'key', key, 'domain', domain) ORDER BY domain, key) FROM public.saas_entitlement_keys), '[]'::jsonb)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_owner_billing_groups_page(text,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_owner_billing_group_360(uuid,text,integer,integer,text,integer,integer,text,integer,integer,integer,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_owner_billing_groups_page(text,text,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_owner_billing_group_360(uuid,text,integer,integer,text,integer,integer,text,integer,integer,integer,text,integer,integer) TO authenticated, service_role;