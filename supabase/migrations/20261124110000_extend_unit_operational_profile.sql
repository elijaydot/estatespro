-- Migration: 20261124110000_extend_unit_operational_profile.sql
-- Comprehensive Unit Operational Profile, Expanded Status Framework & Multi-Step Onboarding Extension

-- 1. Relax unit status constraint to support FishGate 11-status operational framework
ALTER TABLE public.units
  DROP CONSTRAINT IF EXISTS units_status_check;

ALTER TABLE public.units
  ADD CONSTRAINT units_status_check
  CHECK (status IN (
    'draft',
    'available',
    'listed',
    'reserved',
    'occupied',
    'notice_given',
    'pending_move_out',
    'vacant',
    'maintenance_hold',
    'maintenance',
    'inactive',
    'retired'
  ));

-- 2. Extend units table with all operational profile columns
ALTER TABLE public.units
  -- Step 1: Basic Unit Information
  ADD COLUMN IF NOT EXISTS unit_code TEXT,
  ADD COLUMN IF NOT EXISTS building_name TEXT,
  ADD COLUMN IF NOT EXISTS wing TEXT,
  ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT '2 Bedroom',
  ADD COLUMN IF NOT EXISTS unit_category TEXT DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,

  -- Step 2: Unit Specifications
  ADD COLUMN IF NOT EXISTS toilets INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS floor_area_sqm NUMERIC,
  ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_spaces INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS furnishing_status TEXT DEFAULT 'unfurnished',
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS utilities_included TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS view_type TEXT DEFAULT 'City View',

  -- Step 3: Rental Information
  ADD COLUMN IF NOT EXISTS market_rent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS late_fee_rules JSONB DEFAULT '{"grace_period_days": 5, "late_fee_percentage": 5}'::jsonb,
  ADD COLUMN IF NOT EXISTS revenue_target NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_notes TEXT,

  -- Step 4: Occupancy Settings
  ADD COLUMN IF NOT EXISTS available_from DATE,
  ADD COLUMN IF NOT EXISTS max_occupants INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS occupancy_type TEXT DEFAULT 'long_term',
  ADD COLUMN IF NOT EXISTS preferred_tenant_type TEXT DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS move_in_rules TEXT,

  -- Step 5: Lease Defaults
  ADD COLUMN IF NOT EXISTS default_lease_term_months INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS renewal_rules JSONB DEFAULT '{"auto_renewal": false, "renewal_notice_days": 60}'::jsonb,
  ADD COLUMN IF NOT EXISTS lease_category TEXT DEFAULT 'standard_residential',
  ADD COLUMN IF NOT EXISTS lease_templates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_documents TEXT[] DEFAULT '{}',

  -- Step 6: Operations
  ADD COLUMN IF NOT EXISTS maintenance_responsibility TEXT DEFAULT 'landlord_standard',
  ADD COLUMN IF NOT EXISTS inspection_frequency TEXT DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS cleaning_schedule TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS risk_rating TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS operational_notes TEXT,

  -- Step 7 & Data Quality
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Indexes for operational filtering and fast lookup
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);
CREATE INDEX IF NOT EXISTS idx_units_unit_code ON public.units(unit_code);
CREATE INDEX IF NOT EXISTS idx_units_unit_type ON public.units(unit_type);
CREATE INDEX IF NOT EXISTS idx_units_property_status ON public.units(property_id, status);
CREATE INDEX IF NOT EXISTS idx_units_risk_rating ON public.units(risk_rating);
