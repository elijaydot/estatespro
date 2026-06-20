-- Tighten CRM management policies by separating insert/update/delete permissions.
-- Managers (property_manager, landlord) can insert/update; only landlords can delete.

CREATE OR REPLACE FUNCTION public.can_manage_crm_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    target_company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = target_company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role IN ('property_manager', 'landlord')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_delete_crm_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    target_company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = target_company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role = 'landlord'
    )
  );
$$;

-- crm_accounts
DROP POLICY IF EXISTS "Company managers can manage crm accounts" ON public.crm_accounts;
DROP POLICY IF EXISTS "Company managers can insert crm accounts" ON public.crm_accounts;
DROP POLICY IF EXISTS "Company managers can update crm accounts" ON public.crm_accounts;
DROP POLICY IF EXISTS "Company landlords can delete crm accounts" ON public.crm_accounts;

CREATE POLICY "Company managers can insert crm accounts" ON public.crm_accounts
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm accounts" ON public.crm_accounts
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm accounts" ON public.crm_accounts
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));

-- crm_deals
DROP POLICY IF EXISTS "Company managers can manage crm deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Company managers can insert crm deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Company managers can update crm deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Company landlords can delete crm deals" ON public.crm_deals;

CREATE POLICY "Company managers can insert crm deals" ON public.crm_deals
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm deals" ON public.crm_deals
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm deals" ON public.crm_deals
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));

-- crm_meetings
DROP POLICY IF EXISTS "Company managers can manage crm meetings" ON public.crm_meetings;
DROP POLICY IF EXISTS "Company managers can insert crm meetings" ON public.crm_meetings;
DROP POLICY IF EXISTS "Company managers can update crm meetings" ON public.crm_meetings;
DROP POLICY IF EXISTS "Company landlords can delete crm meetings" ON public.crm_meetings;

CREATE POLICY "Company managers can insert crm meetings" ON public.crm_meetings
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm meetings" ON public.crm_meetings
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm meetings" ON public.crm_meetings
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));

-- crm_calls
DROP POLICY IF EXISTS "Company managers can manage crm calls" ON public.crm_calls;
DROP POLICY IF EXISTS "Company managers can insert crm calls" ON public.crm_calls;
DROP POLICY IF EXISTS "Company managers can update crm calls" ON public.crm_calls;
DROP POLICY IF EXISTS "Company landlords can delete crm calls" ON public.crm_calls;

CREATE POLICY "Company managers can insert crm calls" ON public.crm_calls
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm calls" ON public.crm_calls
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm calls" ON public.crm_calls
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));

-- crm_campaigns
DROP POLICY IF EXISTS "Company managers can manage crm campaigns" ON public.crm_campaigns;
DROP POLICY IF EXISTS "Company managers can insert crm campaigns" ON public.crm_campaigns;
DROP POLICY IF EXISTS "Company managers can update crm campaigns" ON public.crm_campaigns;
DROP POLICY IF EXISTS "Company landlords can delete crm campaigns" ON public.crm_campaigns;

CREATE POLICY "Company managers can insert crm campaigns" ON public.crm_campaigns
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm campaigns" ON public.crm_campaigns
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm campaigns" ON public.crm_campaigns
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));

-- crm_documents
DROP POLICY IF EXISTS "Company managers can manage crm documents" ON public.crm_documents;
DROP POLICY IF EXISTS "Company managers can insert crm documents" ON public.crm_documents;
DROP POLICY IF EXISTS "Company managers can update crm documents" ON public.crm_documents;
DROP POLICY IF EXISTS "Company landlords can delete crm documents" ON public.crm_documents;

CREATE POLICY "Company managers can insert crm documents" ON public.crm_documents
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm documents" ON public.crm_documents
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm documents" ON public.crm_documents
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));

-- crm_visits
DROP POLICY IF EXISTS "Company managers can manage crm visits" ON public.crm_visits;
DROP POLICY IF EXISTS "Company managers can insert crm visits" ON public.crm_visits;
DROP POLICY IF EXISTS "Company managers can update crm visits" ON public.crm_visits;
DROP POLICY IF EXISTS "Company landlords can delete crm visits" ON public.crm_visits;

CREATE POLICY "Company managers can insert crm visits" ON public.crm_visits
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm visits" ON public.crm_visits
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm visits" ON public.crm_visits
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));

-- crm_projects
DROP POLICY IF EXISTS "Company managers can manage crm projects" ON public.crm_projects;
DROP POLICY IF EXISTS "Company managers can insert crm projects" ON public.crm_projects;
DROP POLICY IF EXISTS "Company managers can update crm projects" ON public.crm_projects;
DROP POLICY IF EXISTS "Company landlords can delete crm projects" ON public.crm_projects;

CREATE POLICY "Company managers can insert crm projects" ON public.crm_projects
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company managers can update crm projects" ON public.crm_projects
FOR UPDATE TO authenticated
USING (public.can_manage_crm_company(company_id))
WITH CHECK (public.can_manage_crm_company(company_id));

CREATE POLICY "Company landlords can delete crm projects" ON public.crm_projects
FOR DELETE TO authenticated
USING (public.can_delete_crm_company(company_id));
