-- Specialize generic CRM accounts without widening core tenant or property access.

ALTER TABLE public.crm_accounts
  ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'corporate_tenant',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.crm_accounts
  DROP CONSTRAINT IF EXISTS crm_accounts_account_kind_check;

ALTER TABLE public.crm_accounts
  ADD CONSTRAINT crm_accounts_account_kind_check
  CHECK (account_kind IN ('corporate_tenant', 'owner_investor'));

ALTER TABLE public.crm_accounts
  DROP COLUMN IF EXISTS annual_revenue,
  DROP COLUMN IF EXISTS account_type;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS owner_account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_account_id
  ON public.tenants(account_id) WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_owner_account_id
  ON public.properties(owner_account_id) WHERE owner_account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_tenant_crm_account_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_company_id uuid;
  v_account_company_id uuid;
  v_account_kind text;
BEGIN
  IF NEW.account_id IS NULL THEN RETURN NEW; END IF;

  SELECT company_id INTO v_property_company_id
  FROM public.properties WHERE id = NEW.property_id;

  SELECT company_id, account_kind INTO v_account_company_id, v_account_kind
  FROM public.crm_accounts WHERE id = NEW.account_id;

  IF v_property_company_id IS NULL
     OR v_account_company_id IS DISTINCT FROM v_property_company_id
     OR v_account_kind <> 'corporate_tenant' THEN
    RAISE EXCEPTION 'TENANT_CRM_ACCOUNT_SCOPE_MISMATCH' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_property_owner_account_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_company_id uuid;
  v_account_kind text;
BEGIN
  IF NEW.owner_account_id IS NULL THEN RETURN NEW; END IF;

  SELECT company_id, account_kind INTO v_account_company_id, v_account_kind
  FROM public.crm_accounts WHERE id = NEW.owner_account_id;

  IF NEW.company_id IS NULL
     OR v_account_company_id IS DISTINCT FROM NEW.company_id
     OR v_account_kind <> 'owner_investor' THEN
    RAISE EXCEPTION 'PROPERTY_OWNER_ACCOUNT_SCOPE_MISMATCH' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tenant_crm_account_link_trigger ON public.tenants;
CREATE TRIGGER validate_tenant_crm_account_link_trigger
BEFORE INSERT OR UPDATE OF property_id, account_id ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_crm_account_link();

DROP TRIGGER IF EXISTS validate_property_owner_account_link_trigger ON public.properties;
CREATE TRIGGER validate_property_owner_account_link_trigger
BEFORE INSERT OR UPDATE OF company_id, owner_account_id ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.validate_property_owner_account_link();

-- Existing table RLS remains authoritative: account visibility never grants tenant or property access.