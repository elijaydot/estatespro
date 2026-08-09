BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_trust_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  min_account_age_days integer NOT NULL DEFAULT 7 CHECK (min_account_age_days BETWEEN 0 AND 365)
);

INSERT INTO public.marketplace_trust_config (singleton, min_account_age_days)
VALUES (true, 7)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.publisher_verification_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.publisher_verifications(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('auto_verified', 'revoked_to_manual_review')),
  from_state text,
  to_state text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publisher_verification_audit_company_created
  ON public.publisher_verification_audit(company_id, created_at DESC);

ALTER TABLE public.publisher_verification_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal reviewers can read publisher verification audit" ON public.publisher_verification_audit;
CREATE POLICY "Internal reviewers can read publisher verification audit"
ON public.publisher_verification_audit
FOR SELECT TO authenticated
USING (public.is_internal_marketplace_reviewer(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_publisher_verification_sod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_reviewer boolean := false;
  v_is_auto_trust boolean := COALESCE(current_setting('app.publisher_auto_trust', true), '') = 'on';
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_is_reviewer := public.is_internal_marketplace_reviewer(v_uid);

  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'pending' THEN
      RAISE EXCEPTION 'ONLY_PENDING_SUBMISSION_ALLOWED';
    END IF;

    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.last_submitted_at := COALESCE(NEW.last_submitted_at, now());
    RETURN NEW;
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NEW.state IN ('verified', 'rejected', 'needs_review') AND NOT v_is_reviewer AND NOT (v_is_auto_trust AND NEW.state = 'verified') THEN
      RAISE EXCEPTION 'REVIEWER_APPROVAL_REQUIRED';
    END IF;

    IF NEW.state = 'pending' AND OLD.state IN ('verified', 'rejected', 'needs_review') THEN
      NEW.verified_by := NULL;
      NEW.verified_at := NULL;
      NEW.rejection_reason := NULL;
      NEW.last_submitted_at := now();
    ELSIF NEW.state = 'verified' AND v_is_auto_trust THEN
      NEW.verified_by := NULL;
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.rejection_reason := NULL;
    ELSIF NEW.state = 'verified' THEN
      NEW.verified_by := COALESCE(NEW.verified_by, v_uid);
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.rejection_reason := NULL;
    ELSIF NEW.state = 'rejected' THEN
      NEW.verified_by := COALESCE(NEW.verified_by, v_uid);
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      IF NEW.rejection_reason IS NULL OR btrim(NEW.rejection_reason) = '' THEN
        RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
      END IF;
    ELSIF NEW.state = 'needs_review' THEN
      NEW.verified_by := COALESCE(NEW.verified_by, v_uid);
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    END IF;
  ELSE
    IF (NEW.verified_by IS DISTINCT FROM OLD.verified_by OR NEW.verified_at IS DISTINCT FROM OLD.verified_at)
       AND NOT v_is_reviewer AND NOT v_is_auto_trust THEN
      RAISE EXCEPTION 'REVIEWER_FIELDS_LOCKED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_publisher_auto_trust(p_company_id uuid)
RETURNS TABLE (
  verification_id uuid,
  state text,
  auto_qualified boolean,
  has_tenancy_history boolean,
  has_active_paid_plan boolean,
  property_count bigint,
  account_age_days integer,
  min_account_age_days integer,
  verified_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company public.companies%ROWTYPE;
  v_verification public.publisher_verifications%ROWTYPE;
  v_has_tenancy_history boolean := false;
  v_has_active_paid_plan boolean := false;
  v_has_manual_review_hold boolean := false;
  v_property_count bigint := 0;
  v_account_age_days integer := 0;
  v_min_account_age_days integer := 7;
  v_auto_qualified boolean := false;
  v_previous_state text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public.saas_user_can_access_company(auth.uid(), p_company_id)
     AND NOT public.is_internal_marketplace_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'COMPANY_ACCESS_DENIED';
  END IF;

  SELECT * INTO v_company
  FROM public.companies
  WHERE id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMPANY_NOT_FOUND';
  END IF;

  SELECT config.min_account_age_days INTO v_min_account_age_days
  FROM public.marketplace_trust_config config
  WHERE config.singleton = true;

  v_account_age_days := GREATEST(0, floor(EXTRACT(epoch FROM (now() - v_company.created_at)) / 86400)::integer);

  SELECT COUNT(*) INTO v_property_count
  FROM public.properties property
  WHERE property.company_id = p_company_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.tenants tenant
    JOIN public.properties property ON property.id = tenant.property_id
    WHERE property.company_id = p_company_id
  ) INTO v_has_tenancy_history;

  SELECT EXISTS (
    SELECT 1
    FROM public.saas_company_plan_subscriptions subscription
    JOIN public.saas_plans plan ON plan.id = subscription.plan_id
    WHERE subscription.company_id = p_company_id
      AND subscription.status = 'active'
      AND plan.tier IN ('bronze', 'silver', 'gold', 'platinum')
      AND EXISTS (
        SELECT 1
        FROM public.saas_plan_prices price
        WHERE price.plan_id = plan.id
          AND price.amount_minor > 0
      )
  ) INTO v_has_active_paid_plan;

  SELECT EXISTS (
    SELECT 1
    FROM public.publisher_verification_audit audit
    WHERE audit.company_id = p_company_id
      AND audit.action_type = 'revoked_to_manual_review'
  ) INTO v_has_manual_review_hold;

  v_auto_qualified := v_has_tenancy_history
    AND (v_account_age_days >= v_min_account_age_days OR v_has_active_paid_plan)
    AND NOT v_has_manual_review_hold;

  INSERT INTO public.publisher_verifications (company_id, state, last_submitted_at)
  VALUES (p_company_id, 'pending', now())
  ON CONFLICT (company_id) DO NOTHING;

  SELECT * INTO v_verification
  FROM public.publisher_verifications
  WHERE company_id = p_company_id
  FOR UPDATE;

  v_previous_state := v_verification.state;

  IF v_auto_qualified AND v_verification.state = 'pending' THEN
    PERFORM set_config('app.publisher_auto_trust', 'on', true);

    UPDATE public.publisher_verifications
    SET state = 'verified',
        verified_by = NULL,
        verified_at = now(),
        rejection_reason = NULL
    WHERE id = v_verification.id
    RETURNING * INTO v_verification;

    PERFORM set_config('app.publisher_auto_trust', 'off', true);

    INSERT INTO public.publisher_verification_audit (
      verification_id,
      company_id,
      action_type,
      from_state,
      to_state,
      actor_user_id,
      reason,
      metadata
    ) VALUES (
      v_verification.id,
      p_company_id,
      'auto_verified',
      v_previous_state,
      'verified',
      NULL,
      'Qualified automatically from account history',
      jsonb_build_object(
        'has_tenancy_history', v_has_tenancy_history,
        'has_active_paid_plan', v_has_active_paid_plan,
        'property_count', v_property_count,
        'account_age_days', v_account_age_days,
        'min_account_age_days', v_min_account_age_days
      )
    );
  END IF;

  UPDATE public.marketplace_listings
  SET verification_state = v_verification.state
  WHERE company_id = p_company_id
    AND verification_state IS DISTINCT FROM v_verification.state;

  RETURN QUERY SELECT
    v_verification.id,
    v_verification.state,
    v_auto_qualified AND v_verification.state = 'verified' AND v_verification.verified_by IS NULL,
    v_has_tenancy_history,
    v_has_active_paid_plan,
    v_property_count,
    v_account_age_days,
    v_min_account_age_days,
    v_verification.verified_at;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_publisher_auto_trust(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_publisher_auto_trust(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_publisher_verification_to_manual_review(
  p_verification_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_verification public.publisher_verifications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_internal_marketplace_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'REVIEWER_APPROVAL_REQUIRED';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'REVIEW_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_verification
  FROM public.publisher_verifications
  WHERE id = p_verification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERIFICATION_NOT_FOUND';
  END IF;

  IF v_verification.state <> 'verified' THEN
    RAISE EXCEPTION 'ONLY_VERIFIED_PUBLISHERS_CAN_BE_REVOKED';
  END IF;

  UPDATE public.publisher_verifications
  SET state = 'needs_review',
      verified_by = auth.uid(),
      verified_at = now(),
      rejection_reason = btrim(p_reason)
  WHERE id = p_verification_id;

  UPDATE public.marketplace_listings
  SET verification_state = 'needs_review'
  WHERE company_id = v_verification.company_id
    AND verification_state IS DISTINCT FROM 'needs_review';

  INSERT INTO public.publisher_verification_audit (
    verification_id,
    company_id,
    action_type,
    from_state,
    to_state,
    actor_user_id,
    reason
  ) VALUES (
    p_verification_id,
    v_verification.company_id,
    'revoked_to_manual_review',
    'verified',
    'needs_review',
    auth.uid(),
    btrim(p_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_publisher_verification_to_manual_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_publisher_verification_to_manual_review(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_marketplace_listing_publisher_trust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.marketplace_listings
  SET verification_state = NEW.state
  WHERE company_id = NEW.company_id
    AND verification_state IS DISTINCT FROM NEW.state;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_marketplace_listing_publisher_trust_trigger ON public.publisher_verifications;
CREATE TRIGGER sync_marketplace_listing_publisher_trust_trigger
AFTER INSERT OR UPDATE OF state ON public.publisher_verifications
FOR EACH ROW
EXECUTE FUNCTION public.sync_marketplace_listing_publisher_trust();

CREATE OR REPLACE FUNCTION public.enforce_marketplace_publish_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_landlord boolean := false;
  v_verification_state text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NEW.status IN ('pending_review', 'live', 'paused', 'archived', 'blocked') THEN
   IF NEW.status IN ('live', 'paused', 'archived', 'blocked')
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.company_members member
        WHERE member.company_id = OLD.company_id
          AND member.user_id = auth.uid()
          AND member.status = 'approved'
          AND member.role = 'landlord'
      ) INTO v_is_landlord;

      IF NOT v_is_landlord THEN
        RAISE EXCEPTION 'ONLY_LANDLORD_CAN_CHANGE_LISTING_STATUS';
      END IF;
    END IF;

    IF NEW.status IN ('pending_review', 'live') THEN
      PERFORM public.evaluate_publisher_auto_trust(NEW.company_id);

      SELECT verification.state INTO v_verification_state
      FROM public.publisher_verifications verification
      WHERE verification.company_id = NEW.company_id;

      NEW.verification_state := COALESCE(v_verification_state, 'pending');
    END IF;

    IF NEW.status = 'live' THEN
      IF NEW.verification_state <> 'verified' THEN
        RAISE EXCEPTION 'VERIFICATION_REQUIRED_BEFORE_PUBLISH';
      END IF;

      NEW.published_at := COALESCE(NEW.published_at, now());
      NEW.paused_at := NULL;
      NEW.archived_at := NULL;
    ELSIF NEW.status = 'paused' THEN
      NEW.paused_at := COALESCE(NEW.paused_at, now());
    ELSIF NEW.status = 'archived' THEN
      NEW.archived_at := COALESCE(NEW.archived_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.get_accessible_company_executive_report();

CREATE FUNCTION public.get_accessible_company_executive_report()
RETURNS TABLE (
  company_id uuid,
  company_name text,
  company_email text,
  company_phone text,
  company_address text,
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
        (SELECT profile.role::text FROM public.profiles profile WHERE profile.user_id = auth.uid() LIMIT 1),
        (SELECT user_role.role::text FROM public.user_roles user_role WHERE user_role.user_id = auth.uid() LIMIT 1)
      ) AS app_role
  ), accessible_companies AS (
    SELECT
      company.*,
      CASE
        WHEN caller.app_role = 'super_admin' THEN 'super_admin'
        WHEN company.owner_id = caller.user_id THEN 'owner'
        ELSE 'property_manager'
      END AS access_role,
      caller.user_id,
      caller.app_role
    FROM public.companies company
    CROSS JOIN caller
    WHERE caller.user_id IS NOT NULL
      AND (
        caller.app_role = 'super_admin'
        OR company.owner_id = caller.user_id
        OR EXISTS (
          SELECT 1
          FROM public.company_members member
          WHERE member.company_id = company.id
            AND member.user_id = caller.user_id
            AND member.status = 'approved'
        )
      )
  ), scoped_properties AS (
    SELECT property.id, property.company_id
    FROM public.properties property
    JOIN accessible_companies company ON company.id = property.company_id
    WHERE company.app_role = 'super_admin'
      OR company.owner_id = company.user_id
      OR EXISTS (
        SELECT 1
        FROM public.property_manager_assignments assignment
        WHERE assignment.company_id = company.id
          AND assignment.property_id = property.id
          AND assignment.manager_id = company.user_id
      )
  )
  SELECT
    company.id,
    company.name,
    company.email,
    company.phone,
    company.address,
    company.access_role,
    COALESCE(portfolio.property_count, 0),
    COALESCE(portfolio.unit_count, 0),
    COALESCE(portfolio.occupied_unit_count, 0),
    CASE
      WHEN COALESCE(portfolio.unit_count, 0) = 0 THEN 0
      ELSE ROUND((portfolio.occupied_unit_count::numeric / portfolio.unit_count::numeric) * 100, 1)
    END,
    COALESCE(portfolio.active_tenant_count, 0),
    COALESCE(team.team_member_count, 0),
    COALESCE(financial.total_collected, 0),
    COALESCE(financial.outstanding_balance, 0),
    COALESCE(portfolio.open_maintenance_count, 0),
    CASE WHEN company.access_role IN ('owner', 'super_admin') THEN COALESCE(usage.ai_credits_used, 0) ELSE NULL END
  FROM accessible_companies company
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT scoped_property.id) AS property_count,
      COUNT(DISTINCT unit.id) AS unit_count,
      COUNT(DISTINCT unit.id) FILTER (WHERE unit.status = 'occupied') AS occupied_unit_count,
      COUNT(DISTINCT tenant.id) FILTER (WHERE tenant.status = 'active') AS active_tenant_count,
      COUNT(DISTINCT request.id) FILTER (WHERE request.status NOT IN ('completed', 'cancelled')) AS open_maintenance_count
    FROM scoped_properties scoped_property
    LEFT JOIN public.units unit ON unit.property_id = scoped_property.id
    LEFT JOIN public.tenants tenant ON tenant.property_id = scoped_property.id
    LEFT JOIN public.maintenance_requests request ON request.property_id = scoped_property.id
    WHERE scoped_property.company_id = company.id
  ) portfolio ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE member.status = 'approved') AS team_member_count
    FROM public.company_members member
    WHERE member.company_id = company.id
  ) team ON true
  LEFT JOIN LATERAL (
    SELECT
      COALESCE((
        SELECT SUM(payment.amount)
        FROM public.payments payment
        JOIN public.invoices invoice ON invoice.id = payment.invoice_id
        JOIN scoped_properties property ON property.id = invoice.property_id
        WHERE property.company_id = company.id AND payment.status = 'completed'
      ), 0) AS total_collected,
      COALESCE((
        SELECT SUM(GREATEST(invoice.amount - COALESCE(invoice.paid_amount, 0), 0))
        FROM public.invoices invoice
        JOIN scoped_properties property ON property.id = invoice.property_id
        WHERE property.company_id = company.id AND invoice.status NOT IN ('paid', 'cancelled')
      ), 0) AS outstanding_balance
  ) financial ON true
  LEFT JOIN LATERAL (
    SELECT SUM(counter.used_value)::bigint AS ai_credits_used
    FROM public.saas_usage_counters counter
    JOIN public.saas_quota_dimensions dimension ON dimension.id = counter.quota_dimension_id
    WHERE counter.company_id = company.id
      AND dimension.code = 'ai_credits_monthly'
      AND CURRENT_DATE BETWEEN counter.period_start AND counter.period_end
  ) usage ON true
  ORDER BY company.name;
$$;

REVOKE ALL ON FUNCTION public.get_accessible_company_executive_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accessible_company_executive_report() TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_get_company_admin_snapshot(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_company public.companies%ROWTYPE;
  v_property_count integer := 0;
  v_unit_count integer := 0;
  v_tenant_count integer := 0;
  v_member_count integer := 0;
  v_open_alert_count integer := 0;
  v_abuse_signal_count integer := 0;
  v_risk_decision_count integer := 0;
  v_active_subscription_count integer := 0;
  v_active_addon_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  IF v_company.id IS NULL THEN RAISE EXCEPTION 'COMPANY_NOT_FOUND'; END IF;

  SELECT COUNT(*)::integer INTO v_property_count FROM public.properties property WHERE property.company_id = p_company_id;
  SELECT COUNT(*)::integer INTO v_unit_count FROM public.units unit JOIN public.properties property ON property.id = unit.property_id WHERE property.company_id = p_company_id;
  SELECT COUNT(*)::integer INTO v_tenant_count
  FROM public.tenants tenant
  LEFT JOIN public.properties property ON property.id = tenant.property_id
  LEFT JOIN public.units unit ON unit.id = tenant.unit_id
  LEFT JOIN public.properties unit_property ON unit_property.id = unit.property_id
  WHERE COALESCE(property.company_id, unit_property.company_id) = p_company_id;
  SELECT COUNT(*)::integer INTO v_member_count FROM public.company_members member WHERE member.company_id = p_company_id AND member.status = 'active';
  SELECT COUNT(*)::integer INTO v_open_alert_count FROM public.governance_alerts alert WHERE alert.company_id = p_company_id AND alert.status = 'open';

  IF to_regclass('public.abuse_signals') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*)::integer FROM public.abuse_signals WHERE company_id = $1' INTO v_abuse_signal_count USING p_company_id;
  END IF;
  IF to_regclass('public.risk_decisions') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*)::integer FROM public.risk_decisions WHERE company_id = $1' INTO v_risk_decision_count USING p_company_id;
  END IF;

  SELECT COUNT(*)::integer INTO v_active_subscription_count FROM public.saas_company_plan_subscriptions subscription WHERE subscription.company_id = p_company_id AND subscription.status IN ('active', 'trialing', 'grace_period');
  SELECT COUNT(*)::integer INTO v_active_addon_count FROM public.saas_company_addon_subscriptions subscription WHERE subscription.company_id = p_company_id AND subscription.status IN ('active', 'trialing', 'grace_period');

  RETURN jsonb_build_object(
    'company', jsonb_build_object(
      'id', v_company.id,
      'name', v_company.name,
      'email', v_company.email,
      'phone', v_company.phone,
      'owner_id', v_company.owner_id,
      'created_at', v_company.created_at,
      'updated_at', v_company.updated_at
    ),
    'portfolio', jsonb_build_object('property_count', v_property_count, 'unit_count', v_unit_count, 'tenant_count', v_tenant_count, 'active_member_count', v_member_count),
    'operations', jsonb_build_object('open_alert_count', v_open_alert_count, 'abuse_signal_count', v_abuse_signal_count, 'risk_decision_count', v_risk_decision_count),
    'billing', jsonb_build_object('active_subscription_count', v_active_subscription_count, 'active_addon_count', v_active_addon_count)
  );
END;
$$;

ALTER TABLE public.companies DROP COLUMN IF EXISTS is_verified;

COMMIT;
