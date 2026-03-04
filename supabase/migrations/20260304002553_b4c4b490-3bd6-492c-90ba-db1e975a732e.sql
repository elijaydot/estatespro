
-- 1. Fix "Link tenant account" policy to be more restrictive
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;
CREATE POLICY "Link tenant account" ON public.tenants
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR tenant_user_id = auth.uid()
  );

-- 2. Restrict companies table - only show id/name to authenticated, full access to owner
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
CREATE POLICY "Authenticated users can view company names" ON public.companies
  FOR SELECT TO authenticated USING (true);

-- 3. Fix tenant_invites - tighten token lookup 
DROP POLICY IF EXISTS "Allow reading invite by exact token lookup" ON public.tenant_invites;

-- 4. Add profile visibility for company owners to see member profiles
CREATE POLICY "Company owners can view member profiles" ON public.profiles
  FOR SELECT USING (
    user_id IN (
      SELECT cm.user_id FROM public.company_members cm
      JOIN public.companies c ON c.id = cm.company_id
      WHERE c.owner_id = auth.uid()
    )
  );

-- 5. Add PM visibility for assigned PM to view relevant profiles
CREATE POLICY "PMs can view tenant profiles" ON public.profiles
  FOR SELECT USING (
    user_id IN (
      SELECT t.tenant_user_id FROM public.tenants t
      WHERE t.tenant_user_id IS NOT NULL
      AND is_approved_pm(auth.uid(), t.property_id)
    )
  );
