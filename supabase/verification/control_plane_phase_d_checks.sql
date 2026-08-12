-- Non-destructive Control Plane Phase D readiness checks.
-- Run in staging after migrations through 20260811260000.

DO $$
DECLARE v_missing text[];
BEGIN
  SELECT array_agg(required.signature ORDER BY required.signature) INTO v_missing
  FROM (VALUES
    ('public.platform_get_entitlement_overrides_page(uuid,text,text,boolean,integer,integer)'),
    ('public.platform_get_active_suspensions_page(text,text,integer,integer)'),
    ('public.platform_get_impersonation_sessions_page(uuid,uuid,text,boolean,integer,integer)'),
    ('public.platform_get_current_operator_impersonation_session()'),
    ('public.platform_get_company_360_members_page(uuid,text,text,integer,integer)'),
    ('public.platform_get_user_360_companies_page(uuid,text,text,integer,integer)')
  ) AS required(signature)
  WHERE to_regprocedure(required.signature) IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_FUNCTIONS_MISSING: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;

DO $$
DECLARE v_missing text[];
BEGIN
  SELECT array_agg(required.index_name ORDER BY required.index_name) INTO v_missing
  FROM (VALUES
    ('idx_platform_entitlement_overrides_active_created'),
    ('idx_platform_principal_suspensions_active_created'),
    ('idx_platform_impersonation_actor_active_started'),
    ('idx_platform_impersonation_company_active_started'),
    ('idx_platform_company_members_user_status_created')
  ) AS required(index_name)
  WHERE to_regclass('public.' || required.index_name) IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_INDEXES_MISSING: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;

SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'platform_get_entitlement_overrides_page',
    'platform_get_active_suspensions_page',
    'platform_get_impersonation_sessions_page',
    'platform_get_current_operator_impersonation_session',
    'platform_get_company_360_members_page',
    'platform_get_user_360_companies_page'
  )
ORDER BY routine_name, grantee;

-- Replace the UUIDs before running plans. Confirm bounded index-assisted reads and no
-- unbounded sequential scans on populated operational tables.
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, created_at
FROM public.platform_entitlement_overrides
WHERE company_id = '00000000-0000-0000-0000-000000000000'::uuid AND revoked_at IS NULL
ORDER BY created_at DESC, id DESC LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, started_at
FROM public.platform_impersonation_sessions
WHERE actor_user_id = '00000000-0000-0000-0000-000000000000'::uuid AND ended_at IS NULL
ORDER BY started_at DESC, id DESC LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, created_at
FROM public.company_members
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY created_at DESC, id DESC LIMIT 20;