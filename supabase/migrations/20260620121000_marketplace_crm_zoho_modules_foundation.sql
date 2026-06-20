-- Marketplace CRM Zoho-order module foundation
-- Adds Accounts, Deals, Meetings, Calls, Campaigns, Documents, Visits, and Projects tables.

CREATE TABLE IF NOT EXISTS public.crm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  website text,
  owner_user_id uuid,
  annual_revenue numeric(14,2),
  account_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.lead_contacts(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  deal_name text NOT NULL,
  amount numeric(14,2),
  currency text NOT NULL DEFAULT 'NGN',
  stage text NOT NULL DEFAULT 'qualification' CHECK (stage IN (
    'qualification',
    'needs_analysis',
    'value_proposition',
    'identify_decision_makers',
    'proposal',
    'negotiation',
    'closed_won',
    'closed_lost'
  )),
  probability int NOT NULL DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  owner_user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  related_type text NOT NULL DEFAULT 'lead',
  related_id uuid,
  host_user_id uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'canceled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject text NOT NULL,
  call_type text NOT NULL CHECK (call_type IN ('inbound', 'outbound')),
  related_type text NOT NULL DEFAULT 'lead',
  related_id uuid,
  contact_name text,
  owner_user_id uuid,
  started_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  result text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'active',
  budget_amount numeric(14,2),
  spend_amount numeric(14,2),
  starts_on date,
  ends_on date,
  open_rate numeric(5,2),
  click_rate numeric(5,2),
  bounce_rate numeric(5,2),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  related_type text NOT NULL,
  related_id uuid,
  title text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  related_type text NOT NULL DEFAULT 'deal',
  related_id uuid,
  locality text,
  address_text text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'canceled')),
  check_in_at timestamptz,
  check_in_lat numeric(10,7),
  check_in_lng numeric(10,7),
  check_out_at timestamptz,
  proof_path text,
  outcome text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_visits_checkin_required CHECK (
    status IN ('planned', 'canceled')
    OR (
      check_in_at IS NOT NULL
      AND check_in_lat IS NOT NULL
      AND check_in_lng IS NOT NULL
    )
  ),
  CONSTRAINT crm_visits_proof_required_on_complete CHECK (
    status <> 'completed'
    OR (check_out_at IS NOT NULL AND proof_path IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.crm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'canceled')),
  owner_user_id uuid,
  due_date date,
  progress_percent int NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_company_created ON public.crm_accounts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_company_stage ON public.crm_deals(company_id, stage, expected_close_date);
CREATE INDEX IF NOT EXISTS idx_crm_meetings_company_start ON public.crm_meetings(company_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_calls_company_started ON public.crm_calls(company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_company_created ON public.crm_campaigns(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_documents_company_created ON public.crm_documents(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_visits_company_status ON public.crm_visits(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_projects_company_status ON public.crm_projects(company_id, status, due_date);

DROP TRIGGER IF EXISTS update_crm_accounts_updated_at ON public.crm_accounts;
CREATE TRIGGER update_crm_accounts_updated_at BEFORE UPDATE ON public.crm_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_crm_deals_updated_at ON public.crm_deals;
CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_crm_meetings_updated_at ON public.crm_meetings;
CREATE TRIGGER update_crm_meetings_updated_at BEFORE UPDATE ON public.crm_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_crm_calls_updated_at ON public.crm_calls;
CREATE TRIGGER update_crm_calls_updated_at BEFORE UPDATE ON public.crm_calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_crm_campaigns_updated_at ON public.crm_campaigns;
CREATE TRIGGER update_crm_campaigns_updated_at BEFORE UPDATE ON public.crm_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_crm_visits_updated_at ON public.crm_visits;
CREATE TRIGGER update_crm_visits_updated_at BEFORE UPDATE ON public.crm_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_crm_projects_updated_at ON public.crm_projects;
CREATE TRIGGER update_crm_projects_updated_at BEFORE UPDATE ON public.crm_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_projects ENABLE ROW LEVEL SECURITY;

-- Shared company-scope policies
DROP POLICY IF EXISTS "Company users can read crm accounts" ON public.crm_accounts;
CREATE POLICY "Company users can read crm accounts" ON public.crm_accounts
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_accounts.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm accounts" ON public.crm_accounts;
CREATE POLICY "Company managers can manage crm accounts" ON public.crm_accounts
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_accounts.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_accounts.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm deals" ON public.crm_deals;
CREATE POLICY "Company users can read crm deals" ON public.crm_deals FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deals.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm deals" ON public.crm_deals;
CREATE POLICY "Company managers can manage crm deals" ON public.crm_deals FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deals.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deals.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm meetings" ON public.crm_meetings;
CREATE POLICY "Company users can read crm meetings" ON public.crm_meetings FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_meetings.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm meetings" ON public.crm_meetings;
CREATE POLICY "Company managers can manage crm meetings" ON public.crm_meetings FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_meetings.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_meetings.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm calls" ON public.crm_calls;
CREATE POLICY "Company users can read crm calls" ON public.crm_calls FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_calls.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm calls" ON public.crm_calls;
CREATE POLICY "Company managers can manage crm calls" ON public.crm_calls FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_calls.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_calls.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm campaigns" ON public.crm_campaigns;
CREATE POLICY "Company users can read crm campaigns" ON public.crm_campaigns FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_campaigns.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm campaigns" ON public.crm_campaigns;
CREATE POLICY "Company managers can manage crm campaigns" ON public.crm_campaigns FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_campaigns.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_campaigns.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm documents" ON public.crm_documents;
CREATE POLICY "Company users can read crm documents" ON public.crm_documents FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_documents.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm documents" ON public.crm_documents;
CREATE POLICY "Company managers can manage crm documents" ON public.crm_documents FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_documents.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_documents.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm visits" ON public.crm_visits;
CREATE POLICY "Company users can read crm visits" ON public.crm_visits FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_visits.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm visits" ON public.crm_visits;
CREATE POLICY "Company managers can manage crm visits" ON public.crm_visits FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_visits.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_visits.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm projects" ON public.crm_projects;
CREATE POLICY "Company users can read crm projects" ON public.crm_projects FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_projects.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm projects" ON public.crm_projects;
CREATE POLICY "Company managers can manage crm projects" ON public.crm_projects FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_projects.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_projects.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);
