-- Migration: 20260920100000_crm_estateflow_pipeline_and_atomic_booking.sql
-- Rewires CRM logic to EstateFlow (Arumuga-Raja-p/real_estate_crm) standard:
-- 1) Canonical 7-stage real estate sales pipeline (New, Contacted, Site Visit, Interested, Negotiation, Booked, Lost)
-- 2) Atomic concurrency-safe unit booking stored procedure (book_unit_atomic) with pessimistic row locking (SELECT ... FOR UPDATE)
-- 3) Database-level engine safeguard: partial unique index preventing duplicate confirmed bookings
-- 4) Inventory linking: projects -> properties -> units associated with leads
-- 5) Follow-up scheduling and lead notes audit trail

-- 1. Extend lead stages to support the canonical 7 stages with backward compatibility
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_stage_check CHECK (
  stage IN (
    'new',
    'contacted',
    'site_visit',
    'interested',
    'negotiation',
    'booked',
    'lost',
    -- backward-compatible aliases
    'attempted_contact',
    'qualified',
    'viewing_scheduled',
    'offer_made',
    'lease_in_progress',
    'converted'
  )
);

-- 2. Add EstateFlow inventory and follow-up columns to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interested_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interested_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_min NUMERIC DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_max NUMERIC DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_unit_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_next_followup 
  ON public.leads(company_id, next_followup_at);
CREATE INDEX IF NOT EXISTS idx_leads_interested_unit 
  ON public.leads(interested_unit_id);

-- 3. Dedicated real estate unit bookings table
CREATE TABLE IF NOT EXISTS public.crm_unit_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Cancelled', 'Refunded')),
  payment_method TEXT DEFAULT 'bank_transfer',
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Engine-Level Safeguard: Partial Unique Index to physically prevent double-bookings
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_unit_booking 
  ON public.crm_unit_bookings (unit_id) 
  WHERE status = 'Confirmed';

CREATE INDEX IF NOT EXISTS idx_crm_unit_bookings_company_lead 
  ON public.crm_unit_bookings (company_id, lead_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.crm_unit_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view unit bookings" ON public.crm_unit_bookings;
CREATE POLICY "Company members can view unit bookings" ON public.crm_unit_bookings
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = crm_unit_bookings.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Company managers can manage unit bookings" ON public.crm_unit_bookings;
CREATE POLICY "Company managers can manage unit bookings" ON public.crm_unit_bookings
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = crm_unit_bookings.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role IN ('property_manager', 'landlord', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = crm_unit_bookings.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role IN ('property_manager', 'landlord', 'admin')
    )
  );

-- 5. Atomic Concurrency-Safe Booking Stored Procedure (book_unit_atomic)
-- Employs pessimistic row-locking (SELECT ... FOR UPDATE) to ensure zero race conditions
CREATE OR REPLACE FUNCTION public.book_unit_atomic(
  p_company_id UUID,
  p_unit_id UUID,
  p_lead_id UUID,
  p_booking_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'bank_transfer',
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit public.units%ROWTYPE;
  v_lead public.leads%ROWTYPE;
  v_booking_id UUID;
  v_actor UUID := coalesce(p_user_id, auth.uid());
BEGIN
  -- 1. Pessimistic Locking: Lock the target unit row until the current transaction commits
  SELECT * INTO v_unit
  FROM public.units
  WHERE id = p_unit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unit not found'
    );
  END IF;

  -- 2. Validate unit availability
  IF v_unit.status IN ('booked', 'occupied', 'sold') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Concurrency Collision: This unit is already ' || v_unit.status || ' by another party.'
    );
  END IF;

  -- 3. Check for any existing confirmed booking on this unit (defense in depth)
  IF EXISTS (
    SELECT 1 FROM public.crm_unit_bookings
    WHERE unit_id = p_unit_id AND status = 'Confirmed'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Concurrency Collision: A confirmed reservation already exists for this unit.'
    );
  END IF;

  -- 4. Verify lead exists and belongs to company
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead not found or does not belong to the specified company.'
    );
  END IF;

  -- 5. Update unit status to 'booked' atomically
  UPDATE public.units
  SET status = 'booked',
      status_changed_at = now(),
      updated_at = now()
  WHERE id = p_unit_id;

  -- 6. Insert audit trail in crm_unit_bookings table
  INSERT INTO public.crm_unit_bookings (
    company_id,
    unit_id,
    lead_id,
    property_id,
    booking_amount,
    status,
    payment_method,
    notes,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    p_unit_id,
    p_lead_id,
    v_unit.property_id,
    coalesce(p_booking_amount, v_unit.rent_amount, 0),
    'Confirmed',
    p_payment_method,
    p_notes,
    v_actor,
    now(),
    now()
  ) RETURNING id INTO v_booking_id;

  -- 7. Atomically transition lead to 'booked' stage and 'won' status
  UPDATE public.leads
  SET stage = 'booked',
      status = 'won',
      interested_unit_id = p_unit_id,
      interested_property_id = v_unit.property_id,
      converted_at = now(),
      last_activity_at = now(),
      updated_at = now()
  WHERE id = p_lead_id;

  -- 8. Record audit activity
  INSERT INTO public.lead_activities (
    lead_id,
    activity_type,
    channel,
    actor_user_id,
    payload_json,
    occurred_at
  ) VALUES (
    p_lead_id,
    'unit_booked_atomic',
    'internal',
    v_actor,
    jsonb_build_object(
      'booking_id', v_booking_id,
      'unit_id', p_unit_id,
      'unit_number', v_unit.unit_number,
      'property_id', v_unit.property_id,
      'booking_amount', coalesce(p_booking_amount, v_unit.rent_amount, 0),
      'notes', p_notes
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'unit_id', p_unit_id,
    'lead_id', p_lead_id,
    'unit_number', v_unit.unit_number,
    'message', 'Unit successfully booked with atomic concurrency protection.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 6. Helper RPC to list available units for a company's CRM inventory
CREATE OR REPLACE FUNCTION public.get_crm_available_units(p_company_id UUID)
RETURNS TABLE (
  unit_id UUID,
  property_id UUID,
  property_name TEXT,
  unit_number TEXT,
  floor INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  sqft INTEGER,
  rent_amount NUMERIC,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id AS unit_id,
    u.property_id,
    p.name AS property_name,
    u.unit_number,
    u.floor,
    u.bedrooms,
    u.bathrooms,
    u.sqft,
    u.rent_amount,
    u.status
  FROM public.units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE (p.company_id = p_company_id OR p.company_id IN (SELECT public.get_user_company_ids(auth.uid())))
    AND u.status IN ('vacant', 'available')
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_unit_bookings b
      WHERE b.unit_id = u.id AND b.status = 'Confirmed'
    )
  ORDER BY p.name ASC, u.unit_number ASC;
$$;
