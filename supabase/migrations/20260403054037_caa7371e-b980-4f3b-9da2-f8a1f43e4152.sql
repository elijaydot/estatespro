CREATE TABLE IF NOT EXISTS public.landlord_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  preferred_method TEXT DEFAULT 'bank',
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  momo_provider TEXT,
  momo_number TEXT,
  momo_name TEXT,
  flutterwave_enabled BOOLEAN DEFAULT false,
  flutterwave_public_key TEXT,
  flutterwave_secret_key TEXT,
  flutterwave_merchant_id TEXT,
  paystack_enabled BOOLEAN DEFAULT false,
  paystack_public_key TEXT,
  paystack_secret_key TEXT,
  payment_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.landlord_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlords manage company payment settings" ON public.landlord_payment_settings;
CREATE POLICY "Landlords manage company payment settings"
ON public.landlord_payment_settings
FOR ALL
TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Landlords manage property payment settings" ON public.landlord_payment_settings;
CREATE POLICY "Landlords manage property payment settings"
ON public.landlord_payment_settings
FOR ALL
TO authenticated
USING (
  property_id IN (SELECT public.get_company_property_ids(auth.uid()))
)
WITH CHECK (
  property_id IN (SELECT public.get_company_property_ids(auth.uid()))
);

DROP POLICY IF EXISTS "PMs view assigned payment settings" ON public.landlord_payment_settings;
CREATE POLICY "PMs view assigned payment settings"
ON public.landlord_payment_settings
FOR SELECT
TO authenticated
USING (
  property_id IS NOT NULL AND public.is_approved_pm(auth.uid(), property_id)
);

DROP POLICY IF EXISTS "Read valid PM invites" ON public.pm_invites;
CREATE POLICY "Read valid PM invites"
ON public.pm_invites
FOR SELECT
TO authenticated
USING (
  expires_at > now()
  AND used_at IS NULL
  AND (
    invited_by = auth.uid()
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own property images" ON storage.objects;
CREATE POLICY "Users can update their own property images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;
CREATE POLICY "Users can delete their own property images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE OR REPLACE FUNCTION public.enforce_tenant_maintenance_request_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_unit RECORD;
BEGIN
  IF auth.uid() IS NULL OR NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, tenant_user_id, unit_id, property_id
  INTO v_tenant
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_tenant.tenant_user_id = auth.uid() THEN
    IF NEW.unit_id IS NULL THEN
      RAISE EXCEPTION 'Unit is required';
    END IF;

    SELECT u.id, u.property_id, p.user_id AS owner_user_id
    INTO v_unit
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE u.id = NEW.unit_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid unit';
    END IF;

    IF v_tenant.unit_id IS NOT NULL AND v_tenant.unit_id <> NEW.unit_id THEN
      RAISE EXCEPTION 'Unauthorized maintenance request';
    END IF;

    IF v_tenant.property_id IS NOT NULL AND v_tenant.property_id <> v_unit.property_id THEN
      RAISE EXCEPTION 'Unauthorized maintenance request';
    END IF;

    NEW.property_id := v_unit.property_id;
    NEW.user_id := v_unit.owner_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_maintenance_request_ownership ON public.maintenance_requests;
CREATE TRIGGER enforce_tenant_maintenance_request_ownership
BEFORE INSERT OR UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tenant_maintenance_request_ownership();

ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;