-- SaaS pending payment verification operations reporting.
-- Adds read-only helpers to inspect delayed gateway settlement and retry health.

DO $$
BEGIN
  IF to_regclass('public.saas_subscription_payment_attempts') IS NULL
     OR to_regprocedure('public.saas_user_can_access_company(uuid,uuid)') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'SAAS_PENDING_VERIFICATION_REPORTING_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_get_pending_payment_attempts(
  p_company_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  attempt_id uuid,
  company_id uuid,
  subscription_id uuid,
  gateway text,
  payment_status text,
  pending_verification_count integer,
  last_pending_verification_at timestamptz,
  last_pending_provider_status text,
  last_pending_reference text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_limit integer := greatest(coalesce(p_limit, 100), 1);
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF p_company_id IS NOT NULL
      AND NOT public.is_platform_super_admin(v_actor)
      AND NOT public.saas_user_can_access_company(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_ACCESS';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    spa.id,
    spa.company_id,
    spa.subscription_id,
    spa.gateway,
    spa.payment_status,
    CASE
      WHEN coalesce(spa.metadata->>'pending_verification_count', '') ~ '^[0-9]+$'
        THEN (spa.metadata->>'pending_verification_count')::integer
      ELSE 0
    END AS pending_verification_count,
    NULLIF(spa.metadata->>'last_pending_verification_at', '')::timestamptz AS last_pending_verification_at,
    NULLIF(spa.metadata->>'last_pending_provider_status', '') AS last_pending_provider_status,
    NULLIF(spa.metadata->>'last_pending_reference', '') AS last_pending_reference,
    spa.updated_at
  FROM public.saas_subscription_payment_attempts spa
  WHERE spa.payment_status IN ('pending', 'processing')
    AND (p_company_id IS NULL OR spa.company_id = p_company_id)
    AND (
      auth.role() = 'service_role'
      OR public.is_platform_super_admin(v_actor)
      OR public.saas_user_can_access_company(v_actor, spa.company_id)
    )
    AND CASE
      WHEN coalesce(spa.metadata->>'pending_verification_count', '') ~ '^[0-9]+$'
        THEN (spa.metadata->>'pending_verification_count')::integer
      ELSE 0
    END > 0
  ORDER BY
    NULLIF(spa.metadata->>'last_pending_verification_at', '')::timestamptz DESC NULLS LAST,
    spa.updated_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_get_pending_verification_health(
  p_company_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  company_id uuid,
  pending_attempt_count integer,
  max_pending_verification_count integer,
  oldest_pending_verification_at timestamptz,
  latest_pending_verification_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_limit integer := greatest(coalesce(p_limit, 100), 1);
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF p_company_id IS NOT NULL
      AND NOT public.is_platform_super_admin(v_actor)
      AND NOT public.saas_user_can_access_company(v_actor, p_company_id) THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_ACCESS';
    END IF;
  END IF;

  RETURN QUERY
  WITH pending_attempts AS (
    SELECT
      spa.company_id,
      CASE
        WHEN coalesce(spa.metadata->>'pending_verification_count', '') ~ '^[0-9]+$'
          THEN (spa.metadata->>'pending_verification_count')::integer
        ELSE 0
      END AS pending_verification_count,
      NULLIF(spa.metadata->>'last_pending_verification_at', '')::timestamptz AS last_pending_verification_at
    FROM public.saas_subscription_payment_attempts spa
    WHERE spa.payment_status IN ('pending', 'processing')
      AND (p_company_id IS NULL OR spa.company_id = p_company_id)
      AND (
        auth.role() = 'service_role'
        OR public.is_platform_super_admin(v_actor)
        OR public.saas_user_can_access_company(v_actor, spa.company_id)
      )
      AND CASE
        WHEN coalesce(spa.metadata->>'pending_verification_count', '') ~ '^[0-9]+$'
          THEN (spa.metadata->>'pending_verification_count')::integer
        ELSE 0
      END > 0
  )
  SELECT
    pa.company_id,
    count(*)::integer AS pending_attempt_count,
    max(pa.pending_verification_count)::integer AS max_pending_verification_count,
    min(pa.last_pending_verification_at) AS oldest_pending_verification_at,
    max(pa.last_pending_verification_at) AS latest_pending_verification_at
  FROM pending_attempts pa
  GROUP BY pa.company_id
  ORDER BY latest_pending_verification_at DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_get_pending_payment_attempts(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_get_pending_verification_health(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.saas_get_pending_payment_attempts(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_get_pending_verification_health(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_get_pending_payment_attempts(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.saas_get_pending_verification_health(uuid, integer) TO service_role;
