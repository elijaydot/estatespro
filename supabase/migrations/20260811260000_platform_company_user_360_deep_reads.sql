-- Deep, bounded entity profiles for platform Company 360 and User 360.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL
     OR to_regclass('public.company_members') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.platform_operator_roles') IS NULL
     OR to_regclass('public.platform_principal_suspensions') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_ENTITY_360_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_platform_company_members_user_status_created
  ON public.company_members (user_id, status, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.platform_get_company_360_members_page(
  p_company_id uuid,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 20)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
  v_company jsonb; v_owner jsonb; v_suspension jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  )) THEN RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE'; END IF;

  SELECT jsonb_build_object(
    'id', company.id, 'name', company.name, 'email', company.email, 'phone', company.phone,
    'owner_id', company.owner_id, 'created_at', company.created_at, 'updated_at', company.updated_at
  ) INTO v_company FROM public.companies company WHERE company.id = p_company_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'COMPANY_NOT_FOUND'; END IF;

  SELECT jsonb_build_object('user_id', profile.user_id, 'name', profile.name, 'email', profile.email, 'phone', profile.phone)
  INTO v_owner FROM public.companies company
  LEFT JOIN public.profiles profile ON profile.user_id = company.owner_id
  WHERE company.id = p_company_id;

  SELECT jsonb_build_object('id', suspension.id, 'reason', suspension.reason,
    'created_by', suspension.created_by, 'created_at', suspension.created_at)
  INTO v_suspension FROM public.platform_principal_suspensions suspension
  WHERE suspension.principal_type = 'company' AND suspension.principal_id = p_company_id AND suspension.is_active = true
  ORDER BY suspension.created_at DESC, suspension.id DESC LIMIT 1;

  WITH filtered AS MATERIALIZED (
    SELECT member.id, member.user_id, member.role, member.status, member.created_at, member.updated_at,
      profile.name, profile.email, profile.phone
    FROM public.company_members member
    LEFT JOIN public.profiles profile ON profile.user_id = member.user_id
    WHERE member.company_id = p_company_id
      AND (v_status IS NULL OR member.status = v_status)
      AND (v_search IS NULL OR member.user_id::text = v_search
        OR lower(coalesce(profile.name, '')) LIKE '%' || v_search || '%'
        OR lower(coalesce(profile.email, '')) LIKE '%' || v_search || '%'
        OR lower(member.role) LIKE '%' || v_search || '%')
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered) INTO v_rows, v_total_count;

  RETURN jsonb_build_object('company', v_company, 'owner', v_owner, 'active_suspension', v_suspension,
    'rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_user_360_companies_page(
  p_user_id uuid,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 20)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
  v_profile jsonb; v_roles jsonb := '[]'::jsonb; v_suspension jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  )) THEN RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE'; END IF;

  SELECT jsonb_build_object('user_id', profile.user_id, 'name', profile.name, 'email', profile.email,
    'phone', profile.phone, 'role', profile.role, 'avatar_url', profile.avatar_url,
    'created_at', profile.created_at, 'updated_at', profile.updated_at)
  INTO v_profile FROM public.profiles profile WHERE profile.user_id = p_user_id;
  IF v_profile IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  SELECT coalesce(jsonb_agg(role.role ORDER BY role.role), '[]'::jsonb) INTO v_roles
  FROM public.platform_operator_roles role WHERE role.user_id = p_user_id;

  SELECT jsonb_build_object('id', suspension.id, 'reason', suspension.reason,
    'created_by', suspension.created_by, 'created_at', suspension.created_at)
  INTO v_suspension FROM public.platform_principal_suspensions suspension
  WHERE suspension.principal_type = 'user' AND suspension.principal_id = p_user_id AND suspension.is_active = true
  ORDER BY suspension.created_at DESC, suspension.id DESC LIMIT 1;

  WITH memberships AS MATERIALIZED (
    SELECT member.id, member.company_id, company.name AS company_name, company.email AS company_email,
      member.role, member.status, member.created_at, member.updated_at
    FROM public.company_members member
    JOIN public.companies company ON company.id = member.company_id
    WHERE member.user_id = p_user_id
      AND (v_status IS NULL OR member.status = v_status)
      AND (v_search IS NULL OR member.company_id::text = v_search
        OR lower(company.name) LIKE '%' || v_search || '%'
        OR lower(coalesce(company.email, '')) LIKE '%' || v_search || '%'
        OR lower(member.role) LIKE '%' || v_search || '%')
    UNION ALL
    SELECT company.id, company.id, company.name, company.email, 'owner', 'active', company.created_at, company.updated_at
    FROM public.companies company
    WHERE company.owner_id = p_user_id
      AND (v_status IS NULL OR v_status = 'active')
      AND (v_search IS NULL OR company.id::text = v_search OR lower(company.name) LIKE '%' || v_search || '%'
        OR lower(coalesce(company.email, '')) LIKE '%' || v_search || '%' OR v_search = 'owner')
      AND NOT EXISTS (SELECT 1 FROM public.company_members member WHERE member.company_id = company.id AND member.user_id = p_user_id)
  ), paged AS (
    SELECT * FROM memberships ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM memberships) INTO v_rows, v_total_count;

  RETURN jsonb_build_object('profile', v_profile, 'platform_roles', v_roles, 'active_suspension', v_suspension,
    'rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_company_360_members_page(uuid,text,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_user_360_companies_page(uuid,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_company_360_members_page(uuid,text,text,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_user_360_companies_page(uuid,text,text,integer,integer) TO authenticated, service_role;