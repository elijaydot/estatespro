-- Strictly constrain tenant lease updates to signature fields only.

-- Recreate tenant UPDATE policy with an explicit field-level WITH CHECK guard.
DROP POLICY IF EXISTS "Tenants sign own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can sign their own leases" ON public.leases;

CREATE OR REPLACE FUNCTION public.tenant_lease_update_guard(
  p_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_property_id uuid,
  p_unit_id uuid,
  p_lease_number text,
  p_start_date date,
  p_end_date date,
  p_monthly_rent numeric,
  p_security_deposit numeric,
  p_terms text,
  p_special_conditions text,
  p_landlord_signature_url text,
  p_landlord_signed_at timestamptz,
  p_document_url text,
  p_created_at timestamptz,
  p_renewal_status text,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_row public.leases%ROWTYPE;
BEGIN
  SELECT *
  INTO existing_row
  FROM public.leases
  WHERE id = p_id;

  IF existing_row.id IS NULL THEN
    RETURN false;
  END IF;

  RETURN (
    existing_row.user_id = p_user_id
    AND existing_row.tenant_id = p_tenant_id
    AND existing_row.property_id = p_property_id
    AND existing_row.unit_id = p_unit_id
    AND existing_row.lease_number = p_lease_number
    AND existing_row.start_date = p_start_date
    AND existing_row.end_date = p_end_date
    AND existing_row.monthly_rent = p_monthly_rent
    AND existing_row.security_deposit = p_security_deposit
    AND existing_row.terms IS NOT DISTINCT FROM p_terms
    AND existing_row.special_conditions IS NOT DISTINCT FROM p_special_conditions
    AND existing_row.landlord_signature_url IS NOT DISTINCT FROM p_landlord_signature_url
    AND existing_row.landlord_signed_at IS NOT DISTINCT FROM p_landlord_signed_at
    AND existing_row.document_url IS NOT DISTINCT FROM p_document_url
    AND existing_row.created_at = p_created_at
    AND existing_row.renewal_status IS NOT DISTINCT FROM p_renewal_status
    AND existing_row.status = p_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tenant_lease_update_guard(
  uuid, uuid, uuid, uuid, uuid, text, date, date, numeric, numeric, text, text, text, timestamptz, text, timestamptz, text, text
) TO authenticated;

CREATE POLICY "Tenants sign own leases"
ON public.leases
FOR UPDATE
TO authenticated
USING (tenant_id IN (SELECT public.get_tenant_id_by_user(auth.uid())))
WITH CHECK (
  tenant_id IN (SELECT public.get_tenant_id_by_user(auth.uid()))
  AND public.tenant_lease_update_guard(
    id,
    user_id,
    tenant_id,
    property_id,
    unit_id,
    lease_number,
    start_date,
    end_date,
    monthly_rent,
    security_deposit,
    terms,
    special_conditions,
    landlord_signature_url,
    landlord_signed_at,
    document_url,
    created_at,
    renewal_status,
    status
  )
);

-- Keep trigger protection in sync: tenants cannot modify status directly.
CREATE OR REPLACE FUNCTION public.validate_tenant_lease_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = NEW.tenant_id
      AND t.tenant_user_id = auth.uid()
  ) THEN
    NEW.user_id := OLD.user_id;
    NEW.tenant_id := OLD.tenant_id;
    NEW.property_id := OLD.property_id;
    NEW.unit_id := OLD.unit_id;
    NEW.lease_number := OLD.lease_number;
    NEW.start_date := OLD.start_date;
    NEW.end_date := OLD.end_date;
    NEW.monthly_rent := OLD.monthly_rent;
    NEW.security_deposit := OLD.security_deposit;
    NEW.terms := OLD.terms;
    NEW.special_conditions := OLD.special_conditions;
    NEW.landlord_signature_url := OLD.landlord_signature_url;
    NEW.landlord_signed_at := OLD.landlord_signed_at;
    NEW.document_url := OLD.document_url;
    NEW.created_at := OLD.created_at;
    NEW.renewal_status := OLD.renewal_status;
    NEW.status := OLD.status;
    -- Tenant may only update tenant_signature_url, tenant_signed_at and updated_at.
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_lease_update_restrictions ON public.leases;
CREATE TRIGGER enforce_tenant_lease_update_restrictions
BEFORE UPDATE ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.validate_tenant_lease_update();
