-- Marketplace and CRM foundation (Day 1)
-- Safe, additive migration only.

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  city text NOT NULL,
  area text,
  address_hash text,
  rent_amount numeric(12,2) NOT NULL CHECK (rent_amount >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  bedrooms int CHECK (bedrooms >= 0),
  bathrooms int CHECK (bathrooms >= 0),
  available_from date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'live', 'paused', 'archived', 'blocked')),
  verification_state text NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified', 'pending', 'verified', 'rejected')),
  created_by uuid NOT NULL,
  published_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_company_status
  ON public.marketplace_listings(company_id, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_city_area
  ON public.marketplace_listings(city, area);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_property_unit
  ON public.marketplace_listings(property_id, unit_id);

CREATE TABLE IF NOT EXISTS public.listing_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'virtual_tour')),
  storage_path text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  moderation_state text NOT NULL DEFAULT 'pending' CHECK (moderation_state IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_media_listing_sort
  ON public.listing_media(listing_id, sort_order ASC);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'marketplace_public' CHECK (source IN ('marketplace_public', 'manual', 'referral', 'other')),
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'attempted_contact', 'contacted', 'qualified', 'viewing_scheduled', 'offer_made', 'lease_in_progress', 'converted', 'lost')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  score int NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  assigned_to uuid,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz,
  converted_at timestamptz,
  lost_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_company_stage
  ON public.leads(company_id, stage, priority, last_activity_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_e164 text NOT NULL,
  email text,
  preferred_channel text DEFAULT 'phone' CHECK (preferred_channel IN ('phone', 'email', 'whatsapp', 'sms')),
  consent_marketing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('inquiry', 'call', 'sms', 'whatsapp', 'email', 'note', 'viewing', 'status_change')),
  channel text,
  actor_user_id uuid,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_occurred
  ON public.lead_activities(lead_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  owner_user_id uuid NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'canceled')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_owner_due
  ON public.lead_tasks(owner_user_id, status, due_at ASC);

CREATE TABLE IF NOT EXISTS public.lead_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  actor_user_id uuid,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('listing', 'inquiry', 'publisher', 'lead')),
  entity_id uuid NOT NULL,
  reason_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'in_review', 'resolved', 'dismissed')),
  queue text NOT NULL DEFAULT 'default',
  assigned_moderator uuid,
  resolution_notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_cases_state_severity
  ON public.moderation_cases(state, severity, opened_at ASC);

-- Keep updated_at values consistent.
DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON public.marketplace_listings;
CREATE TRIGGER update_marketplace_listings_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_moderation_cases_updated_at ON public.moderation_cases;
CREATE TRIGGER update_moderation_cases_updated_at
BEFORE UPDATE ON public.moderation_cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;

-- Listings RLS
DROP POLICY IF EXISTS "Company users can read listings" ON public.marketplace_listings;
CREATE POLICY "Company users can read listings" ON public.marketplace_listings
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = marketplace_listings.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company users can create listings" ON public.marketplace_listings;
CREATE POLICY "Company users can create listings" ON public.marketplace_listings
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = marketplace_listings.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role IN ('property_manager', 'landlord')
    )
  )
);

DROP POLICY IF EXISTS "Company users can update listings" ON public.marketplace_listings;
CREATE POLICY "Company users can update listings" ON public.marketplace_listings
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = marketplace_listings.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = marketplace_listings.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

-- Listing media follows listing access.
DROP POLICY IF EXISTS "Company users can read listing media" ON public.listing_media;
CREATE POLICY "Company users can read listing media" ON public.listing_media
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings ml
    WHERE ml.id = listing_media.listing_id
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can manage listing media" ON public.listing_media;
CREATE POLICY "Company users can manage listing media" ON public.listing_media
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings ml
    WHERE ml.id = listing_media.listing_id
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings ml
    WHERE ml.id = listing_media.listing_id
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
);

-- Leads RLS
DROP POLICY IF EXISTS "Company users can read leads" ON public.leads;
CREATE POLICY "Company users can read leads" ON public.leads
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = leads.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company users can create leads" ON public.leads;
CREATE POLICY "Company users can create leads" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = leads.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role IN ('property_manager', 'landlord')
    )
  )
);

DROP POLICY IF EXISTS "Company users can update leads" ON public.leads;
CREATE POLICY "Company users can update leads" ON public.leads
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = leads.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = leads.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

-- Child lead tables inherit lead access checks.
DROP POLICY IF EXISTS "Company users can read lead contacts" ON public.lead_contacts;
CREATE POLICY "Company users can read lead contacts" ON public.lead_contacts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_contacts.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can manage lead contacts" ON public.lead_contacts;
CREATE POLICY "Company users can manage lead contacts" ON public.lead_contacts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_contacts.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_contacts.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can read lead activities" ON public.lead_activities;
CREATE POLICY "Company users can read lead activities" ON public.lead_activities
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can manage lead activities" ON public.lead_activities;
CREATE POLICY "Company users can manage lead activities" ON public.lead_activities
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can read lead tasks" ON public.lead_tasks;
CREATE POLICY "Company users can read lead tasks" ON public.lead_tasks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_tasks.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can manage lead tasks" ON public.lead_tasks;
CREATE POLICY "Company users can manage lead tasks" ON public.lead_tasks
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_tasks.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_tasks.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can read lead stage history" ON public.lead_stage_history;
CREATE POLICY "Company users can read lead stage history" ON public.lead_stage_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_stage_history.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can manage lead stage history" ON public.lead_stage_history;
CREATE POLICY "Company users can manage lead stage history" ON public.lead_stage_history
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_stage_history.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_stage_history.lead_id
      AND (
        l.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = l.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
);

-- Moderation cases are internal for company operators and owners.
DROP POLICY IF EXISTS "Company users can read moderation cases" ON public.moderation_cases;
CREATE POLICY "Company users can read moderation cases" ON public.moderation_cases
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.marketplace_listings ml
    WHERE ml.id = moderation_cases.entity_id
      AND moderation_cases.entity_type = 'listing'
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
        )
      )
  )
);

DROP POLICY IF EXISTS "Company users can manage moderation cases" ON public.moderation_cases;
CREATE POLICY "Company users can manage moderation cases" ON public.moderation_cases
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.marketplace_listings ml
    WHERE ml.id = moderation_cases.entity_id
      AND moderation_cases.entity_type = 'listing'
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.marketplace_listings ml
    WHERE ml.id = moderation_cases.entity_id
      AND moderation_cases.entity_type = 'listing'
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
);
