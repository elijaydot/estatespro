-- Add missing foreign key constraints for maintenance_requests table
-- Note: These may already exist based on the types.ts file, but we'll use IF NOT EXISTS approach

DO $$ 
BEGIN
  -- Check and add invoices foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_tenant_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_property_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_property_id_fkey 
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_unit_id_fkey') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;

  -- Check and add maintenance_requests foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_requests_tenant_id_fkey') THEN
    ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_requests_property_id_fkey') THEN
    ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_property_id_fkey 
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_requests_unit_id_fkey') THEN
    ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;
  END IF;

  -- Check and add payments foreign keys
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_tenant_id_fkey') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_invoice_id_fkey') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
  END IF;
END $$;