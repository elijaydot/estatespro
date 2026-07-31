ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(12, 2),
  ADD COLUMN IF NOT EXISTS actual_cost numeric(12, 2);

ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_estimated_cost_nonnegative,
  ADD CONSTRAINT maintenance_requests_estimated_cost_nonnegative
    CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  DROP CONSTRAINT IF EXISTS maintenance_requests_actual_cost_nonnegative,
  ADD CONSTRAINT maintenance_requests_actual_cost_nonnegative
    CHECK (actual_cost IS NULL OR actual_cost >= 0);