-- Super Admin Global Seer Platform-Wide Visibility
-- Enables the Super Admin to view and manage data across all modules (Property Management, Marketplace, CRM, Control Plane)
-- while preserving strict cross-tenant isolation between regular customer tenants/landlords.

-- 1. get_user_company_ids: returns user's owned companies, OR all companies if the user is a platform super admin
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.companies 
  WHERE owner_id = _user_id 
     OR public.is_platform_super_admin(_user_id);
$$;

-- 2. get_company_property_ids: returns properties for the user's accessible companies, OR all properties if super admin
CREATE OR REPLACE FUNCTION public.get_company_property_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id FROM public.properties p
  WHERE p.company_id IN (
    SELECT id FROM public.companies WHERE owner_id = _user_id
  ) OR public.is_platform_super_admin(_user_id);
$$;

-- 3. is_company_owner: true if owner of any company, or super admin
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies WHERE owner_id = _user_id
  ) OR public.is_platform_super_admin(_user_id);
$$;

-- 4. is_approved_pm: true if approved PM assignment, or super admin
CREATE OR REPLACE FUNCTION public.is_approved_pm(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_manager_assignments pma
    JOIN public.company_members cm ON cm.company_id = pma.company_id 
      AND cm.user_id = _user_id 
      AND cm.status = 'approved'
    WHERE pma.property_id = _property_id 
      AND pma.manager_id = _user_id
  ) OR public.is_platform_super_admin(_user_id);
$$;

-- 5. get_pm_approved_membership: includes all companies as approved for super admin
CREATE OR REPLACE FUNCTION public.get_pm_approved_membership(_user_id uuid)
RETURNS TABLE(company_id uuid, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.company_id, cm.status FROM public.company_members cm
  WHERE cm.user_id = _user_id AND cm.status = 'approved'
  UNION
  SELECT c.id AS company_id, 'approved' AS status FROM public.companies c
  WHERE public.is_platform_super_admin(_user_id);
$$;

-- 6. Super Admin Profiles Read Policy
DROP POLICY IF EXISTS "Super admins view all profiles" ON public.profiles;
CREATE POLICY "Super admins view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

-- 7. Super Admin Companies Management Policy
DROP POLICY IF EXISTS "Owners can manage their companies" ON public.companies;
CREATE POLICY "Owners can manage their companies"
ON public.companies FOR ALL TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_platform_super_admin(auth.uid())
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_platform_super_admin(auth.uid())
);

-- 8. Super Admin Company Members Management Policy
DROP POLICY IF EXISTS "Company owners can manage members" ON public.company_members;
CREATE POLICY "Company owners can manage members"
ON public.company_members FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.is_platform_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.is_platform_super_admin(auth.uid())
);

-- 9. Super Admin PM Assignments Management Policy
DROP POLICY IF EXISTS "Company owners can manage assignments" ON public.property_manager_assignments;
CREATE POLICY "Company owners can manage assignments"
ON public.property_manager_assignments FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.is_platform_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.is_platform_super_admin(auth.uid())
);

-- 10. Super Admin PM Invites Management Policy
DROP POLICY IF EXISTS "Company owners can manage PM invites" ON public.pm_invites;
CREATE POLICY "Company owners can manage PM invites"
ON public.pm_invites FOR ALL TO authenticated
USING (
  invited_by = auth.uid()
  OR public.is_platform_super_admin(auth.uid())
)
WITH CHECK (
  invited_by = auth.uid()
  OR public.is_platform_super_admin(auth.uid())
);
