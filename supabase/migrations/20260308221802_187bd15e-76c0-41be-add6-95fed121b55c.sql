
-- Create trigger function to restrict tenant lease updates to signature fields only
CREATE OR REPLACE FUNCTION public.validate_tenant_lease_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the caller is a tenant (matched via tenant_user_id), lock down non-signature fields
  IF EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = NEW.tenant_id AND t.tenant_user_id = auth.uid()
  ) THEN
    -- Preserve all non-signature fields from the original row
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
    -- Allow: tenant_signature_url, tenant_signed_at, status, updated_at
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
CREATE TRIGGER enforce_tenant_lease_update_restrictions
BEFORE UPDATE ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.validate_tenant_lease_update();
