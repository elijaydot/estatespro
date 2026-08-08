ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_default_company_id
  ON public.profiles(default_company_id)
  WHERE default_company_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_profile_default_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.default_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.companies company
    WHERE company.id = NEW.default_company_id
      AND (
        company.owner_id = NEW.user_id
        OR public.get_profile_role(NEW.user_id) = 'super_admin'
        OR EXISTS (
          SELECT 1
          FROM public.company_members member
          WHERE member.company_id = company.id
            AND member.user_id = NEW.user_id
            AND member.status = 'approved'
        )
        OR EXISTS (
          SELECT 1
          FROM public.tenants tenant
          JOIN public.properties property ON property.id = tenant.property_id
          WHERE tenant.tenant_user_id = NEW.user_id
            AND property.company_id = company.id
        )
      )
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'DEFAULT_COMPANY_ACCESS_DENIED'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_default_company_trigger ON public.profiles;
CREATE TRIGGER validate_profile_default_company_trigger
  BEFORE INSERT OR UPDATE OF default_company_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_default_company();

COMMENT ON COLUMN public.profiles.default_company_id IS
  'User-selected company loaded when a new FishGate session starts.';
