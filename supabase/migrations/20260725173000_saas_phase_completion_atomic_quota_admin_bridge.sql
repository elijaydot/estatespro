-- SaaS phase completion: atomic quota enforcement, decrement metering, and admin billing bridge.

DO $$
BEGIN
  IF to_regclass('public.properties') IS NULL
     OR to_regclass('public.units') IS NULL
     OR to_regclass('public.tenants') IS NULL
     OR to_regprocedure('public.saas_record_usage(uuid,text,integer,text,text,jsonb)') IS NULL
     OR to_regprocedure('public.saas_adjust_usage_counter(uuid,text,integer,text,text,text,jsonb)') IS NULL
     OR to_regprocedure('public.saas_change_subscription_plan(uuid,text,text,text,boolean,text,text,jsonb)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'SAAS_PHASE_COMPLETION_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_enforce_property_insert_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_result := public.saas_record_usage(
    NEW.company_id,
    'properties_managed',
    1,
    'core_property',
    concat('property-insert:', NEW.id::text),
    jsonb_build_object('property_id', NEW.id, 'stage', 'before_insert_enforcement')
  );

  IF coalesce((v_result->>'allowed')::boolean, false) IS NOT true THEN
    RAISE EXCEPTION 'QUOTA_HARD_LIMIT_EXCEEDED:properties_managed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_enforce_unit_insert_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_result jsonb;
BEGIN
  SELECT p.company_id
  INTO v_company_id
  FROM public.properties p
  WHERE p.id = NEW.property_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_result := public.saas_record_usage(
    v_company_id,
    'units_managed',
    1,
    'core_property',
    concat('unit-insert:', NEW.id::text),
    jsonb_build_object('unit_id', NEW.id, 'property_id', NEW.property_id, 'stage', 'before_insert_enforcement')
  );

  IF coalesce((v_result->>'allowed')::boolean, false) IS NOT true THEN
    RAISE EXCEPTION 'QUOTA_HARD_LIMIT_EXCEEDED:units_managed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_enforce_tenant_insert_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_result jsonb;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT p.company_id
  INTO v_company_id
  FROM public.properties p
  WHERE p.id = NEW.property_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_result := public.saas_record_usage(
    v_company_id,
    'active_tenants',
    1,
    'core_property',
    concat('tenant-insert:', NEW.id::text),
    jsonb_build_object('tenant_id', NEW.id, 'property_id', NEW.property_id, 'stage', 'before_insert_enforcement')
  );

  IF coalesce((v_result->>'allowed')::boolean, false) IS NOT true THEN
    RAISE EXCEPTION 'QUOTA_HARD_LIMIT_EXCEEDED:active_tenants';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_property_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.company_id IS NOT NULL THEN
    PERFORM public.saas_adjust_usage_counter(
      OLD.company_id,
      'properties_managed',
      -1,
      'core_property',
      'property.delete',
      concat('property-delete:', OLD.id::text),
      jsonb_build_object('property_id', OLD.id)
    );
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_unit_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT p.company_id
  INTO v_company_id
  FROM public.properties p
  WHERE p.id = OLD.property_id
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    PERFORM public.saas_adjust_usage_counter(
      v_company_id,
      'units_managed',
      -1,
      'core_property',
      'unit.delete',
      concat('unit-delete:', OLD.id::text),
      jsonb_build_object('unit_id', OLD.id, 'property_id', OLD.property_id)
    );
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_tenant_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM 'active' THEN
    RETURN OLD;
  END IF;

  SELECT p.company_id
  INTO v_company_id
  FROM public.properties p
  WHERE p.id = OLD.property_id
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    PERFORM public.saas_adjust_usage_counter(
      v_company_id,
      'active_tenants',
      -1,
      'core_property',
      'tenant.delete',
      concat('tenant-delete:', OLD.id::text),
      jsonb_build_object('tenant_id', OLD.id, 'property_id', OLD.property_id)
    );
  END IF;

  RETURN OLD;
END;
$$;

-- Replace AFTER INSERT metering with BEFORE INSERT atomic enforcement + reservation.
DROP TRIGGER IF EXISTS trg_saas_meter_property_insert ON public.properties;
CREATE TRIGGER trg_saas_meter_property_insert
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.saas_enforce_property_insert_quota();

DROP TRIGGER IF EXISTS trg_saas_meter_unit_insert ON public.units;
CREATE TRIGGER trg_saas_meter_unit_insert
BEFORE INSERT ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.saas_enforce_unit_insert_quota();

DROP TRIGGER IF EXISTS trg_saas_meter_tenant_insert ON public.tenants;
CREATE TRIGGER trg_saas_meter_tenant_insert
BEFORE INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.saas_enforce_tenant_insert_quota();

DROP TRIGGER IF EXISTS trg_saas_meter_property_delete ON public.properties;
CREATE TRIGGER trg_saas_meter_property_delete
AFTER DELETE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_property_delete();

DROP TRIGGER IF EXISTS trg_saas_meter_unit_delete ON public.units;
CREATE TRIGGER trg_saas_meter_unit_delete
AFTER DELETE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_unit_delete();

DROP TRIGGER IF EXISTS trg_saas_meter_tenant_delete ON public.tenants;
CREATE TRIGGER trg_saas_meter_tenant_delete
AFTER DELETE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_tenant_delete();

CREATE OR REPLACE FUNCTION public.platform_admin_change_company_plan(
  p_company_id uuid,
  p_product_code text,
  p_new_plan_code text,
  p_currency_code text DEFAULT 'USD',
  p_reason text DEFAULT NULL,
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
  v_result jsonb;
  v_effective_reason text := coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'platform_admin_change_company_plan');
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  SELECT public.saas_change_subscription_plan(
    p_company_id,
    p_product_code,
    p_new_plan_code,
    p_currency_code,
    true,
    v_effective_reason,
    p_correlation_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', 'platform_admin_change_company_plan',
      'operator_user_id', v_actor
    )
  ) INTO v_result;

  INSERT INTO public.audit_events (
    source,
    event_type,
    severity,
    actor_user_id,
    entity_type,
    entity_id,
    details,
    correlation_id
  ) VALUES (
    'platform_control_plane',
    'billing.subscription.plan_change.admin_requested',
    'info',
    v_actor,
    'company',
    p_company_id::text,
    jsonb_build_object(
      'product_code', p_product_code,
      'new_plan_code', p_new_plan_code,
      'currency_code', p_currency_code,
      'reason', v_effective_reason,
      'result', v_result
    ),
    p_correlation_id
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_admin_change_company_plan(uuid, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_admin_change_company_plan(uuid, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_change_company_plan(uuid, text, text, text, text, text, jsonb) TO service_role;
