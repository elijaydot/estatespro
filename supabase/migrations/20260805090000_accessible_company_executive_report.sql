CREATE OR REPLACE FUNCTION public.get_accessible_company_executive_report()
RETURNS TABLE (
  company_id uuid,
  company_name text,
  company_email text,
  company_phone text,
  company_address text,
  is_verified boolean,
  access_role text,
  property_count bigint,
  unit_count bigint,
  occupied_unit_count bigint,
  occupancy_rate numeric,
  active_tenant_count bigint,
  team_member_count bigint,
  total_collected numeric,
  outstanding_balance numeric,
  open_maintenance_count bigint,
  ai_credits_used bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH caller AS (
    SELECT
      auth.uid() AS user_id,
      COALESCE(
        (SELECT p.role::text FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1),
        (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1)
      ) AS app_role
  ), accessible_companies AS (
    SELECT
      c.*,
      CASE
        WHEN caller.app_role = 'super_admin' THEN 'super_admin'
        WHEN c.owner_id = caller.user_id THEN 'owner'
        ELSE 'property_manager'
      END AS access_role,
      caller.user_id,
      caller.app_role
    FROM public.companies c
    CROSS JOIN caller
    WHERE caller.user_id IS NOT NULL
      AND (
        caller.app_role = 'super_admin'
        OR c.owner_id = caller.user_id
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.company_id = c.id
            AND cm.user_id = caller.user_id
            AND cm.status = 'approved'
        )
      )
  ), scoped_properties AS (
    SELECT p.id, p.company_id
    FROM public.properties p
    JOIN accessible_companies ac ON ac.id = p.company_id
    WHERE ac.app_role = 'super_admin'
      OR ac.owner_id = ac.user_id
      OR EXISTS (
        SELECT 1
        FROM public.property_manager_assignments pma
        WHERE pma.company_id = ac.id
          AND pma.property_id = p.id
          AND pma.manager_id = ac.user_id
      )
  )
  SELECT
    ac.id AS company_id,
    ac.name AS company_name,
    ac.email AS company_email,
    ac.phone AS company_phone,
    ac.address AS company_address,
    COALESCE(ac.is_verified, false) AS is_verified,
    ac.access_role,
    COALESCE(portfolio.property_count, 0) AS property_count,
    COALESCE(portfolio.unit_count, 0) AS unit_count,
    COALESCE(portfolio.occupied_unit_count, 0) AS occupied_unit_count,
    CASE
      WHEN COALESCE(portfolio.unit_count, 0) = 0 THEN 0
      ELSE ROUND((portfolio.occupied_unit_count::numeric / portfolio.unit_count::numeric) * 100, 1)
    END AS occupancy_rate,
    COALESCE(portfolio.active_tenant_count, 0) AS active_tenant_count,
    COALESCE(team.team_member_count, 0) AS team_member_count,
    COALESCE(financial.total_collected, 0) AS total_collected,
    COALESCE(financial.outstanding_balance, 0) AS outstanding_balance,
    COALESCE(portfolio.open_maintenance_count, 0) AS open_maintenance_count,
    CASE
      WHEN ac.access_role IN ('owner', 'super_admin') THEN COALESCE(usage.ai_credits_used, 0)
      ELSE NULL
    END AS ai_credits_used
  FROM accessible_companies ac
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT sp.id) AS property_count,
      COUNT(DISTINCT u.id) AS unit_count,
      COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'occupied') AS occupied_unit_count,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') AS active_tenant_count,
      COUNT(DISTINCT mr.id) FILTER (WHERE mr.status NOT IN ('completed', 'cancelled')) AS open_maintenance_count
    FROM scoped_properties sp
    LEFT JOIN public.units u ON u.property_id = sp.id
    LEFT JOIN public.tenants t ON t.property_id = sp.id
    LEFT JOIN public.maintenance_requests mr ON mr.property_id = sp.id
    WHERE sp.company_id = ac.id
  ) portfolio ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE cm.status = 'approved') AS team_member_count
    FROM public.company_members cm
    WHERE cm.company_id = ac.id
  ) team ON true
  LEFT JOIN LATERAL (
    SELECT
      COALESCE((
        SELECT SUM(pay.amount)
        FROM public.payments pay
        JOIN public.invoices paid_invoice ON paid_invoice.id = pay.invoice_id
        JOIN scoped_properties paid_property ON paid_property.id = paid_invoice.property_id
        WHERE paid_property.company_id = ac.id
          AND pay.status = 'completed'
      ), 0) AS total_collected,
      COALESCE((
        SELECT SUM(GREATEST(inv.amount - COALESCE(inv.paid_amount, 0), 0))
        FROM public.invoices inv
        JOIN scoped_properties invoice_property ON invoice_property.id = inv.property_id
        WHERE invoice_property.company_id = ac.id
          AND inv.status NOT IN ('paid', 'cancelled')
      ), 0) AS outstanding_balance
  ) financial ON true
  LEFT JOIN LATERAL (
    SELECT SUM(suc.used_value)::bigint AS ai_credits_used
    FROM public.saas_usage_counters suc
    JOIN public.saas_quota_dimensions sqd ON sqd.id = suc.quota_dimension_id
    WHERE suc.company_id = ac.id
      AND sqd.code = 'ai_credits_monthly'
      AND CURRENT_DATE BETWEEN suc.period_start AND suc.period_end
  ) usage ON true
  ORDER BY ac.name;
$$;

REVOKE ALL ON FUNCTION public.get_accessible_company_executive_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accessible_company_executive_report() TO authenticated;