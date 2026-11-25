-- Migration: 20261125060000_extend_tenant_lifecycle_profile.sql
-- FishGate Design Constitution v1.0 - Comprehensive Resident Lifecycle & Profile Architecture

-- 1. Relax / update status constraint on public.tenants to support 9-stage framework
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_status_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_status_check
  CHECK (status IN (
    'prospective',
    'pending_approval',
    'approved',
    'active',
    'notice_given',
    'moving_out',
    'former',
    'blacklisted',
    'archived'
  ));

-- 2. Extend public.tenants with complete resident profile columns
ALTER TABLE public.tenants
  -- Step 1: Identity
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Rwandan',
  ADD COLUMN IF NOT EXISTS national_id TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,

  -- Step 2: Contact Information
  ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
  ADD COLUMN IF NOT EXISTS alternative_email TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'phone',
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,

  -- Step 3: Address Information
  ADD COLUMN IF NOT EXISTS previous_address TEXT,
  ADD COLUMN IF NOT EXISTS current_address TEXT,
  ADD COLUMN IF NOT EXISTS employer_address TEXT,
  ADD COLUMN IF NOT EXISTS mailing_address TEXT,

  -- Step 4: Employment & Financial Profile
  ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'employed',
  ADD COLUMN IF NOT EXISTS monthly_income NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS guarantor_name TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_contact TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_relationship TEXT,
  ADD COLUMN IF NOT EXISTS credit_assessment_notes TEXT,

  -- Step 5: Lease Information
  ADD COLUMN IF NOT EXISTS expected_move_out_date DATE,
  ADD COLUMN IF NOT EXISTS lease_type TEXT DEFAULT 'fixed_term',
  ADD COLUMN IF NOT EXISTS lease_start_date DATE,
  ADD COLUMN IF NOT EXISTS occupancy_type TEXT DEFAULT 'single_family',
  ADD COLUMN IF NOT EXISTS additional_occupants JSONB DEFAULT '[]'::jsonb,

  -- Step 6: Documents
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,

  -- Step 7: Preferences & Notes
  ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"sms": true, "email": true, "whatsapp": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS resident_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS special_requirements TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_requirements TEXT,
  ADD COLUMN IF NOT EXISTS pet_information TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_information TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,

  -- Step 8: Quality & Risk Assessment
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Indexes for fast operational lookup and filtering
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_property_unit ON public.tenants(property_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_balance ON public.tenants(balance);
CREATE INDEX IF NOT EXISTS idx_tenants_national_id ON public.tenants(national_id);
CREATE INDEX IF NOT EXISTS idx_tenants_risk_level ON public.tenants(risk_level);
