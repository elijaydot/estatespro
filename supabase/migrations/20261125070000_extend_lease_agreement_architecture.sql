-- Migration: Extend leases table with FishGate Design Constitution v1.0 schema
-- Supports 7-step wizard, 11-stage lease status framework, financial terms, and compliance

ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS lease_type TEXT DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS lease_category TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS lease_description TEXT,
  ADD COLUMN IF NOT EXISTS move_in_date DATE,
  ADD COLUMN IF NOT EXISTS expected_move_out_date DATE,
  ADD COLUMN IF NOT EXISTS renewal_date DATE,
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS occupancy_start_date DATE,
  ADD COLUMN IF NOT EXISTS occupancy_end_date DATE,
  ADD COLUMN IF NOT EXISTS advance_rent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utility_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS annual_escalation_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS is_renewable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS renewal_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS renewal_period_months INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS renewal_reminder_days INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS renewal_notes TEXT,
  ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subletting_allowed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_policy TEXT,
  ADD COLUMN IF NOT EXISTS parking_allocation TEXT,
  ADD COLUMN IF NOT EXISTS property_restrictions TEXT,
  ADD COLUMN IF NOT EXISTS custom_clauses TEXT,
  ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Ensure indexes for fast expiration, status, and renewal queries
CREATE INDEX IF NOT EXISTS idx_leases_status_end_date ON public.leases(status, end_date);
CREATE INDEX IF NOT EXISTS idx_leases_renewal_status ON public.leases(renewal_status);
CREATE INDEX IF NOT EXISTS idx_leases_property_unit ON public.leases(property_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);

COMMENT ON COLUMN public.leases.health_score IS 'Calculated completeness & compliance health score (0-100)';
COMMENT ON COLUMN public.leases.documents IS 'JSON array of attached documents, compliance certificates, and signed addenda';
