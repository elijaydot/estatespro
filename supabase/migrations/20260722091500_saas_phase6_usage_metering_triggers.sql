-- SaaS Phase 6.2: enforce usage metering atomically at write time.

DO $$
BEGIN
  IF to_regclass('public.properties') IS NULL
     OR to_regclass('public.units') IS NULL
     OR to_regclass('public.tenants') IS NULL
     OR to_regprocedure('public.saas_record_usage(uuid,text,integer,text,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'SAAS_PHASE62_PREREQUISITES_MISSING: Run Phase 1 through Phase 6 migrations first.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_property_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    PERFORM public.saas_record_usage(
      NEW.company_id,
      'properties_managed',
      1,
      'core_property',
      'property.create',
      jsonb_build_object('property_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_unit_insert()
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
  WHERE p.id = NEW.property_id
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    PERFORM public.saas_record_usage(
      v_company_id,
      'units_managed',
      1,
      'core_property',
      'unit.create',
      jsonb_build_object('unit_id', NEW.id, 'property_id', NEW.property_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_meter_tenant_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT p.company_id
    INTO v_company_id
    FROM public.properties p
    WHERE p.id = NEW.property_id
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      PERFORM public.saas_record_usage(
        v_company_id,
        'active_tenants',
        1,
        'core_property',
        'tenant.create',
        jsonb_build_object('tenant_id', NEW.id, 'property_id', NEW.property_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saas_meter_property_insert ON public.properties;
CREATE TRIGGER trg_saas_meter_property_insert
AFTER INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_property_insert();

DROP TRIGGER IF EXISTS trg_saas_meter_unit_insert ON public.units;
CREATE TRIGGER trg_saas_meter_unit_insert
AFTER INSERT ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_unit_insert();

DROP TRIGGER IF EXISTS trg_saas_meter_tenant_insert ON public.tenants;
CREATE TRIGGER trg_saas_meter_tenant_insert
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.saas_meter_tenant_insert();
