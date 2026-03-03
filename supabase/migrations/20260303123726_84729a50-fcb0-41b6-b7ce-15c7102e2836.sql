
-- Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  logo_url text,
  address text,
  email text,
  phone text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their companies" ON public.companies
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can view companies" ON public.companies
  FOR SELECT TO authenticated
  USING (true);

-- Company members table (PMs applying to join companies)
CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'property_manager',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage members" ON public.company_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

CREATE POLICY "Users can view own membership" ON public.company_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can apply to companies" ON public.company_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Property manager assignments
CREATE TABLE public.property_manager_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(property_id, manager_id)
);

ALTER TABLE public.property_manager_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage assignments" ON public.property_manager_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

CREATE POLICY "PMs can view their assignments" ON public.property_manager_assignments
  FOR SELECT TO authenticated
  USING (manager_id = auth.uid());

-- PM invites
CREATE TABLE public.pm_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pm_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage PM invites" ON public.pm_invites
  FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Anyone can read valid PM invite by token" ON public.pm_invites
  FOR SELECT TO authenticated
  USING (expires_at > now() AND used_at IS NULL);

-- Add company_id to properties
ALTER TABLE public.properties ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Security definer functions for checking access
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies WHERE owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_approved_pm(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_manager_assignments pma
    JOIN public.company_members cm ON cm.company_id = pma.company_id 
      AND cm.user_id = _user_id 
      AND cm.status = 'approved'
    WHERE pma.property_id = _property_id 
      AND pma.manager_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.companies WHERE owner_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_pm_approved_membership(_user_id uuid)
RETURNS TABLE(company_id uuid, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id, status FROM public.company_members 
  WHERE user_id = _user_id AND status = 'approved'
$$;

-- RLS: Landlords can view properties in their companies
CREATE POLICY "Landlords can view company properties" ON public.properties
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "Landlords can manage company properties" ON public.properties
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

-- RLS: Assigned PMs can view/manage properties
CREATE POLICY "Assigned PMs can view properties" ON public.properties
  FOR SELECT TO authenticated
  USING (public.is_approved_pm(auth.uid(), id));

CREATE POLICY "Assigned PMs can update properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (public.is_approved_pm(auth.uid(), id));

-- Landlords can view units in their company properties
CREATE POLICY "Landlords can view company units" ON public.units
  FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p WHERE p.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  ));

-- Assigned PMs can view/manage units in assigned properties
CREATE POLICY "Assigned PMs can view units" ON public.units
  FOR SELECT TO authenticated
  USING (public.is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Assigned PMs can manage units" ON public.units
  FOR ALL TO authenticated
  USING (public.is_approved_pm(auth.uid(), property_id))
  WITH CHECK (public.is_approved_pm(auth.uid(), property_id));

-- Landlords can view tenants in their company properties
CREATE POLICY "Landlords can view company tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p WHERE p.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  ));

-- Assigned PMs can view/manage tenants in assigned properties
CREATE POLICY "Assigned PMs can view tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Assigned PMs can manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_approved_pm(auth.uid(), property_id))
  WITH CHECK (public.is_approved_pm(auth.uid(), property_id));

-- Landlords can view leases in their company properties
CREATE POLICY "Landlords can view company leases" ON public.leases
  FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p WHERE p.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  ));

-- Landlords can view invoices for company tenants
CREATE POLICY "Landlords can view company invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p WHERE p.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  ));

-- Landlords can view payments for company tenants
CREATE POLICY "Landlords can view company payments" ON public.payments
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT t.id FROM public.tenants t WHERE t.property_id IN (
      SELECT p.id FROM public.properties p WHERE p.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    )
  ));

-- Landlords can view maintenance requests for company properties
CREATE POLICY "Landlords can view company maintenance" ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT p.id FROM public.properties p WHERE p.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  ));

-- Landlords can view notifications
-- (notifications use user_id = auth.uid() already, so no change needed)

-- Update handle_new_user to support landlord role and company creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
  typed_role app_role;
  company_name_val TEXT;
  selected_company_id UUID;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'property_manager');
  
  IF user_role NOT IN ('tenant', 'property_manager', 'landlord') THEN
    user_role := 'property_manager';
  END IF;
  
  typed_role := user_role::app_role;
  
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    user_role
  );
  
  INSERT INTO public.app_settings (user_id, currency_code, currency_symbol, default_country)
  VALUES (NEW.id, 'RWF', 'RWF', 'Rwanda');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, typed_role);
  
  -- If landlord, create company automatically
  IF user_role = 'landlord' THEN
    company_name_val := NEW.raw_user_meta_data ->> 'company_name';
    IF company_name_val IS NOT NULL AND company_name_val != '' THEN
      INSERT INTO public.companies (name, owner_id)
      VALUES (company_name_val, NEW.id);
    END IF;
  END IF;
  
  -- If property_manager and selected a company, create pending membership + notify landlord
  IF user_role = 'property_manager' THEN
    BEGIN
      selected_company_id := (NEW.raw_user_meta_data ->> 'company_id')::uuid;
      IF selected_company_id IS NOT NULL THEN
        INSERT INTO public.company_members (company_id, user_id, role, status)
        VALUES (selected_company_id, NEW.id, 'property_manager', 'pending');
        
        -- Notify the company owner (landlord)
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT c.owner_id, 
          'New Property Manager Application',
          COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email) || ' has applied to join ' || c.name || ' as a Property Manager.',
          'info',
          '/team'
        FROM public.companies c WHERE c.id = selected_company_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail signup if company linking fails
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Validate PM invite token function
CREATE OR REPLACE FUNCTION public.validate_pm_invite_token(lookup_token text)
RETURNS TABLE(id uuid, company_id uuid, email text, expires_at timestamptz, company_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    pi.id,
    pi.company_id,
    pi.email,
    pi.expires_at,
    c.name as company_name
  FROM public.pm_invites pi
  LEFT JOIN public.companies c ON c.id = pi.company_id
  WHERE pi.token = lookup_token
    AND pi.expires_at > now()
    AND pi.used_at IS NULL;
$$;
