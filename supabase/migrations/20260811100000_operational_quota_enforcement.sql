-- Authoritative operational quota enforcement for unified plans and pooled groups.

DO $$
BEGIN
  IF to_regprocedure('public.saas_get_effective_quota_limits(uuid,text,text)') IS NULL
     OR to_regprocedure('public.saas_quota_is_unlimited(uuid,text)') IS NULL
     OR to_regclass('public.owner_billing_group_members') IS NULL THEN
    RAISE EXCEPTION 'OPERATIONAL_QUOTA_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_lock_operational_quota_scope(
  p_company_id uuid,
  p_quota_code text
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_scope_key text;
  v_company_ids uuid[];
BEGIN
  SELECT member.group_id
  INTO v_group_id
  FROM public.owner_billing_group_members member
  JOIN public.owner_billing_groups billing_group
    ON billing_group.id = member.group_id
   AND billing_group.status = 'active'
  JOIN public.saas_owner_group_plan_subscriptions subscription
    ON subscription.group_id = member.group_id
   AND subscription.status IN ('active', 'grace_period')
  WHERE member.company_id = p_company_id
  LIMIT 1;

  v_scope_key := CASE
    WHEN v_group_id IS NULL THEN 'company:' || p_company_id::text
    ELSE 'group:' || v_group_id::text
  END;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(concat_ws(':', 'operational_quota', v_scope_key, p_quota_code), 0)
  );

  IF v_group_id IS NULL THEN
    RETURN ARRAY[p_company_id];
  END IF;

  SELECT array_agg(member.company_id ORDER BY member.company_id)
  INTO v_company_ids
  FROM public.owner_billing_group_members member
  WHERE member.group_id = v_group_id;

  RETURN coalesce(v_company_ids, ARRAY[p_company_id]);
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_assert_operational_quota(
  p_company_id uuid,
  p_quota_code text,
  p_current_usage bigint,
  p_delta integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_hard_limit integer;
  v_is_unlimited boolean;
BEGIN
  SELECT limits.plan_id, limits.hard_limit
  INTO v_plan_id, v_hard_limit
  FROM public.saas_get_effective_quota_limits(
    p_company_id,
    p_quota_code,
    'core_property'
  ) limits;

  v_is_unlimited := public.saas_quota_is_unlimited(v_plan_id, p_quota_code);

  IF NOT coalesce(v_is_unlimited, false)
     AND coalesce(p_current_usage, 0) + p_delta > v_hard_limit THEN
    RAISE EXCEPTION 'SAAS_QUOTA_EXCEEDED:%', p_quota_code
      USING DETAIL = format(
        'Current usage %s plus %s exceeds hard limit %s.',
        coalesce(p_current_usage, 0),
        p_delta,
        v_hard_limit
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_get_operational_quota_usage(
  p_company_id uuid,
  p_quota_code text
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_company_ids uuid[];
  v_usage integer;
BEGIN
  SELECT member.group_id INTO v_group_id
  FROM public.owner_billing_group_members member
  JOIN public.owner_billing_groups billing_group
    ON billing_group.id = member.group_id
   AND billing_group.status = 'active'
  JOIN public.saas_owner_group_plan_subscriptions subscription
    ON subscription.group_id = member.group_id
   AND subscription.status IN ('active', 'grace_period')
  WHERE member.company_id = p_company_id
  LIMIT 1;

  IF v_group_id IS NULL THEN
    v_company_ids := ARRAY[p_company_id];
  ELSE
    SELECT array_agg(member.company_id) INTO v_company_ids
    FROM public.owner_billing_group_members member
    WHERE member.group_id = v_group_id;
  END IF;

  CASE p_quota_code
    WHEN 'marketplace_listings_active' THEN
      SELECT count(*)::integer INTO v_usage
      FROM public.marketplace_listings listing
      WHERE listing.company_id = ANY(v_company_ids)
        AND listing.status IN ('pending_review', 'live');
    WHEN 'crm_contacts' THEN
      SELECT count(*)::integer INTO v_usage
      FROM public.leads lead
      WHERE lead.company_id = ANY(v_company_ids);
    WHEN 'guest_bookings_active' THEN
      SELECT count(*)::integer INTO v_usage
      FROM public.bookings booking
      JOIN public.properties property ON property.id = booking.property_id
      WHERE property.company_id = ANY(v_company_ids)
        AND booking.status IN ('confirmed', 'checked_in');
    WHEN 'maintenance_tickets_monthly' THEN
      SELECT count(*)::integer INTO v_usage
      FROM public.maintenance_requests request
      LEFT JOIN public.properties property ON property.id = request.property_id
      LEFT JOIN public.units unit ON unit.id = request.unit_id
      LEFT JOIN public.properties unit_property ON unit_property.id = unit.property_id
      WHERE coalesce(property.company_id, unit_property.company_id) = ANY(v_company_ids)
        AND request.created_at >= date_trunc('month', now())
        AND request.created_at < date_trunc('month', now()) + interval '1 month';
    ELSE
      RETURN NULL;
  END CASE;

  RETURN coalesce(v_usage, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_enforce_marketplace_listing_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_ids uuid[];
  v_current_usage bigint;
  v_was_active boolean := TG_OP = 'UPDATE'
    AND OLD.status IN ('pending_review', 'live')
    AND OLD.company_id = NEW.company_id;
  v_is_active boolean := NEW.status IN ('pending_review', 'live');
BEGIN
  IF NOT v_is_active OR v_was_active THEN
    RETURN NEW;
  END IF;

  v_company_ids := public.saas_lock_operational_quota_scope(NEW.company_id, 'marketplace_listings_active');
  SELECT count(*) INTO v_current_usage
  FROM public.marketplace_listings listing
  WHERE listing.company_id = ANY(v_company_ids)
    AND listing.status IN ('pending_review', 'live');

  PERFORM public.saas_assert_operational_quota(
    NEW.company_id,
    'marketplace_listings_active',
    v_current_usage
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_enforce_crm_contact_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_ids uuid[];
  v_current_usage bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.company_id IS NOT DISTINCT FROM NEW.company_id THEN
    RETURN NEW;
  END IF;

  v_company_ids := public.saas_lock_operational_quota_scope(NEW.company_id, 'crm_contacts');
  SELECT count(*) INTO v_current_usage
  FROM public.leads lead
  WHERE lead.company_id = ANY(v_company_ids);

  PERFORM public.saas_assert_operational_quota(NEW.company_id, 'crm_contacts', v_current_usage);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_enforce_guest_booking_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_company_ids uuid[];
  v_current_usage bigint;
  v_was_active boolean := TG_OP = 'UPDATE'
    AND OLD.status IN ('confirmed', 'checked_in')
    AND OLD.property_id = NEW.property_id;
  v_is_active boolean := NEW.status IN ('confirmed', 'checked_in');
BEGIN
  IF NOT v_is_active OR v_was_active THEN
    RETURN NEW;
  END IF;

  SELECT property.company_id INTO v_company_id
  FROM public.properties property
  WHERE property.id = NEW.property_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_COMPANY_NOT_FOUND';
  END IF;

  v_company_ids := public.saas_lock_operational_quota_scope(v_company_id, 'guest_bookings_active');
  SELECT count(*) INTO v_current_usage
  FROM public.bookings booking
  JOIN public.properties property ON property.id = booking.property_id
  WHERE property.company_id = ANY(v_company_ids)
    AND booking.status IN ('confirmed', 'checked_in');

  PERFORM public.saas_assert_operational_quota(v_company_id, 'guest_bookings_active', v_current_usage);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_enforce_maintenance_ticket_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_company_ids uuid[];
  v_current_usage bigint;
BEGIN
  SELECT property.company_id INTO v_company_id
  FROM public.properties property
  WHERE property.id = NEW.property_id;

  IF v_company_id IS NULL THEN
    SELECT property.company_id INTO v_company_id
    FROM public.units unit
    JOIN public.properties property ON property.id = unit.property_id
    WHERE unit.id = NEW.unit_id;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'MAINTENANCE_COMPANY_NOT_FOUND';
  END IF;

  v_company_ids := public.saas_lock_operational_quota_scope(v_company_id, 'maintenance_tickets_monthly');
  SELECT count(*) INTO v_current_usage
  FROM public.maintenance_requests request
  LEFT JOIN public.properties property ON property.id = request.property_id
  LEFT JOIN public.units unit ON unit.id = request.unit_id
  LEFT JOIN public.properties unit_property ON unit_property.id = unit.property_id
  WHERE coalesce(property.company_id, unit_property.company_id) = ANY(v_company_ids)
    AND request.created_at >= date_trunc('month', now())
    AND request.created_at < date_trunc('month', now()) + interval '1 month';

  PERFORM public.saas_assert_operational_quota(
    v_company_id,
    'maintenance_tickets_monthly',
    v_current_usage
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saas_enforce_marketplace_listing_quota_trigger ON public.marketplace_listings;
CREATE TRIGGER saas_enforce_marketplace_listing_quota_trigger
BEFORE INSERT OR UPDATE OF status, company_id ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.saas_enforce_marketplace_listing_quota();

DROP TRIGGER IF EXISTS saas_enforce_crm_contact_quota_trigger ON public.leads;
CREATE TRIGGER saas_enforce_crm_contact_quota_trigger
BEFORE INSERT OR UPDATE OF company_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.saas_enforce_crm_contact_quota();

DROP TRIGGER IF EXISTS saas_enforce_guest_booking_quota_trigger ON public.bookings;
CREATE TRIGGER saas_enforce_guest_booking_quota_trigger
BEFORE INSERT OR UPDATE OF status, property_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.saas_enforce_guest_booking_quota();

DROP TRIGGER IF EXISTS saas_enforce_maintenance_ticket_quota_trigger ON public.maintenance_requests;
CREATE TRIGGER saas_enforce_maintenance_ticket_quota_trigger
BEFORE INSERT ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.saas_enforce_maintenance_ticket_quota();

CREATE OR REPLACE FUNCTION public.saas_get_quota_snapshot(
  p_company_id uuid,
  p_product_code text DEFAULT 'core_property'
)
RETURNS TABLE(
  quota_code text,
  soft_limit integer,
  hard_limit integer,
  used_value integer,
  remaining integer,
  limit_state text,
  usage_percent integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  v_plan_id := public.saas_get_effective_plan_id(p_company_id, p_product_code);
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'NO_EFFECTIVE_PLAN_FOUND';
  END IF;

  RETURN QUERY
  WITH codes AS (
    SELECT dimension.code
    FROM public.saas_plan_quotas plan_quota
    JOIN public.saas_quota_dimensions dimension
      ON dimension.id = plan_quota.quota_dimension_id
    WHERE plan_quota.plan_id = v_plan_id
  ), limits AS (
    SELECT codes.code, quota.soft_limit, quota.hard_limit,
      coalesce(public.saas_get_operational_quota_usage(p_company_id, codes.code), quota.used_value) AS used_value,
      public.saas_quota_is_unlimited(v_plan_id, codes.code) AS is_unlimited
    FROM codes
    JOIN LATERAL public.saas_get_effective_quota_limits(
      p_company_id,
      codes.code,
      p_product_code
    ) quota ON true
  )
  SELECT limits.code, limits.soft_limit, limits.hard_limit, limits.used_value,
    CASE WHEN limits.is_unlimited THEN NULL
      ELSE greatest(limits.hard_limit - limits.used_value, 0)
    END,
    CASE WHEN limits.is_unlimited THEN 'ok'
      WHEN limits.used_value >= limits.hard_limit THEN 'hard_exceeded'
      WHEN limits.used_value >= limits.soft_limit THEN 'soft_exceeded'
      ELSE 'ok'
    END,
    CASE WHEN limits.hard_limit <= 0 THEN 0
      ELSE least(100, greatest(0, floor(
        (limits.used_value::numeric / limits.hard_limit::numeric) * 100
      )::integer))
    END
  FROM limits
  ORDER BY limits.code;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_lock_operational_quota_scope(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_assert_operational_quota(uuid,text,bigint,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_get_operational_quota_usage(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_get_quota_snapshot(uuid,text) TO authenticated;
