-- Remove client-readable payment secret columns and tighten tenant lease update controls.

-- 1) Remove plaintext provider secret columns from app-facing table.
ALTER TABLE public.landlord_payment_settings
  DROP COLUMN IF EXISTS paystack_secret_key,
  DROP COLUMN IF EXISTS flutterwave_secret_key;

-- 2) Ensure tenant lease update policy includes WITH CHECK.
DROP POLICY IF EXISTS "Tenants sign own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can sign their own leases" ON public.leases;

CREATE POLICY "Tenants sign own leases"
ON public.leases
FOR UPDATE
TO authenticated
USING (tenant_id IN (SELECT public.get_tenant_id_by_user(auth.uid())))
WITH CHECK (tenant_id IN (SELECT public.get_tenant_id_by_user(auth.uid())));

-- 3) Enforce column-level restrictions for tenant-side lease signing updates.
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
    -- Tenant can only modify signing-related fields and updated_at.
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_lease_update_restrictions ON public.leases;
CREATE TRIGGER enforce_tenant_lease_update_restrictions
BEFORE UPDATE ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.validate_tenant_lease_update();
