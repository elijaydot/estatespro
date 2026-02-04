-- Add missing foreign key constraints for leases table
ALTER TABLE public.leases 
ADD CONSTRAINT leases_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.leases 
ADD CONSTRAINT leases_property_id_fkey 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.leases 
ADD CONSTRAINT leases_unit_id_fkey 
FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;