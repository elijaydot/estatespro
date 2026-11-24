-- Migration: 20261124100000_extend_property_asset_profile.sql
-- Comprehensive Property Asset Profile & Multi-Step Onboarding Extension

-- 1. Relax property type constraint to support all enterprise building types
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_type_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_type_check
  CHECK (type IN (
    'apartment',
    'house',
    'commercial',
    'mixed',
    'short_let',
    'industrial',
    'retail',
    'office',
    'villa',
    'land',
    'other'
  ));

-- 2. Extend properties table with all asset profile columns
ALTER TABLE public.properties
  -- Step 1: Basic Property Information
  ADD COLUMN IF NOT EXISTS portfolio_name TEXT,
  ADD COLUMN IF NOT EXISTS property_code TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS opening_date DATE,
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,

  -- Step 2: Location & Address
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS cell TEXT,
  ADD COLUMN IF NOT EXISTS village TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'Africa/Kigali',

  -- Step 3: Property Characteristics
  ADD COLUMN IF NOT EXISTS building_type TEXT DEFAULT 'Single Building',
  ADD COLUMN IF NOT EXISTS property_usage TEXT DEFAULT 'Residential',
  ADD COLUMN IF NOT EXISTS number_of_buildings INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS number_of_floors INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS residential_units INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commercial_units INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_spaces INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS land_area NUMERIC,
  ADD COLUMN IF NOT EXISTS gross_floor_area NUMERIC,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS construction_status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS security_features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS utilities TEXT[] DEFAULT '{}',

  -- Step 4: Ownership & Management
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS management_company TEXT,
  ADD COLUMN IF NOT EXISTS property_manager TEXT,
  ADD COLUMN IF NOT EXISTS management_contacts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ownership_notes TEXT,

  -- Step 5: Financial Profile
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
  ADD COLUMN IF NOT EXISTS revenue_target NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operating_budget NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS insurance_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 15,
  ADD COLUMN IF NOT EXISTS cost_centre TEXT,
  ADD COLUMN IF NOT EXISTS accounting_reference TEXT,
  ADD COLUMN IF NOT EXISTS financial_notes TEXT,

  -- Step 6: Operational Settings
  ADD COLUMN IF NOT EXISTS maintenance_strategy TEXT DEFAULT 'preventive',
  ADD COLUMN IF NOT EXISTS inspection_frequency TEXT DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS lease_rules JSONB DEFAULT '{"default_term_months": 12, "grace_period_days": 5, "late_fee_percentage": 5, "security_deposit_months": 1}'::jsonb,
  ADD COLUMN IF NOT EXISTS target_occupancy_rate NUMERIC DEFAULT 95,
  ADD COLUMN IF NOT EXISTS operational_notes TEXT,
  ADD COLUMN IF NOT EXISTS property_policies JSONB DEFAULT '{"pets_allowed": false, "smoking_allowed": false, "subletting_allowed": false, "quiet_hours": "22:00 - 06:00"}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_classification TEXT DEFAULT 'low',

  -- Step 7 & Data Quality
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_properties_property_code ON public.properties(property_code);
CREATE INDEX IF NOT EXISTS idx_properties_category ON public.properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_district ON public.properties(district);
