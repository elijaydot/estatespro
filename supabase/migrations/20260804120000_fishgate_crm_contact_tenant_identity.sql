-- Preserve the CRM contact identity after tenant provisioning without widening tenant access.

ALTER TABLE public.lead_contacts
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_contacts_tenant_id
  ON public.lead_contacts(tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_lead_contact_tenant_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_company_id uuid;
  v_tenant_company_id uuid;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_lead_company_id
  FROM public.leads
  WHERE id = NEW.lead_id;

  SELECT p.company_id INTO v_tenant_company_id
  FROM public.tenants t
  JOIN public.properties p ON p.id = t.property_id
  WHERE t.id = NEW.tenant_id;

  IF v_lead_company_id IS NULL
     OR v_tenant_company_id IS NULL
     OR v_lead_company_id IS DISTINCT FROM v_tenant_company_id THEN
    RAISE EXCEPTION 'LEAD_CONTACT_TENANT_COMPANY_MISMATCH' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_lead_contact_tenant_company_trigger ON public.lead_contacts;
CREATE TRIGGER validate_lead_contact_tenant_company_trigger
BEFORE INSERT OR UPDATE OF lead_id, tenant_id ON public.lead_contacts
FOR EACH ROW
EXECUTE FUNCTION public.validate_lead_contact_tenant_company();