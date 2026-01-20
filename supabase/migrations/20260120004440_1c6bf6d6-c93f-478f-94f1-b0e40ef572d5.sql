-- Add renewal_status column to leases table
ALTER TABLE public.leases 
ADD COLUMN renewal_status TEXT DEFAULT 'not_renewed' 
CHECK (renewal_status IN ('pending_renewal', 'renewed', 'not_renewed'));

-- Add comment for clarity
COMMENT ON COLUMN public.leases.renewal_status IS 'Tracks renewal status: pending_renewal, renewed, or not_renewed';