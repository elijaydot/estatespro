-- Migration: 20261124150000_occupancy_intelligence_engine.sql
-- FishGate Design Constitution v1.0 - Operational Occupancy Intelligence Data Architecture
-- Adds structured tracking columns on public.units, public.leases, and public.properties

-- 1. Extend public.units with occupancy operations & vacancy tracking
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS vacancy_reason TEXT DEFAULT 'normal_turnaround',
  ADD COLUMN IF NOT EXISTS vacancy_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expected_move_out_date DATE,
  ADD COLUMN IF NOT EXISTS listing_status TEXT DEFAULT 'unlisted',
  ADD COLUMN IF NOT EXISTS marketing_status TEXT DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS unit_readiness_status TEXT DEFAULT 'ready_to_lease',
  ADD COLUMN IF NOT EXISTS inspection_readiness TEXT DEFAULT 'passed',
  ADD COLUMN IF NOT EXISTS reletting_priority TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS occupancy_risk TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS renewal_probability TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS future_occupancy_forecast JSONB DEFAULT '{"projected_occupancy_rate": 95, "confidence": "high"}'::jsonb;

-- 2. Extend public.leases with renewal and expiration intelligence
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS expected_move_out_date DATE,
  ADD COLUMN IF NOT EXISTS renewal_probability TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS renewal_target_rent NUMERIC,
  ADD COLUMN IF NOT EXISTS notice_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS move_out_scheduled_at DATE;

-- 3. Extend public.properties with occupancy target baseline
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS occupancy_target NUMERIC DEFAULT 95;

-- 4. Fast operational indexes for occupancy dashboard & vacancy explorer
CREATE INDEX IF NOT EXISTS idx_units_occupancy_risk ON public.units(occupancy_risk);
CREATE INDEX IF NOT EXISTS idx_units_listing_status ON public.units(listing_status);
CREATE INDEX IF NOT EXISTS idx_units_vacancy_duration ON public.units(vacancy_start_date);
CREATE INDEX IF NOT EXISTS idx_leases_expiration_timeline ON public.leases(end_date, status);
