
-- Tenant exits workflow table
CREATE TABLE public.tenant_exits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  unit_id UUID NOT NULL REFERENCES public.units(id),
  initiated_by UUID NOT NULL,
  exit_reason TEXT NOT NULL DEFAULT 'lease_expiry',
  status TEXT NOT NULL DEFAULT 'inspection_pending',
  inspection_date TIMESTAMP WITH TIME ZONE,
  inspection_notes TEXT,
  inspection_completed_by UUID,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  deduction_amount NUMERIC NOT NULL DEFAULT 0,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  deduction_reason TEXT,
  deposit_decision TEXT DEFAULT 'pending',
  landlord_approved_by UUID,
  landlord_approved_at TIMESTAMP WITH TIME ZONE,
  refund_method TEXT,
  refund_reference TEXT,
  refund_processed_at TIMESTAMP WITH TIME ZONE,
  exit_date DATE,
  portal_access_until TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exit inspection items (the per-exit checklist results)
CREATE TABLE public.exit_inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exit_id UUID NOT NULL REFERENCES public.tenant_exits(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL DEFAULT 'general',
  condition TEXT NOT NULL DEFAULT 'not_checked',
  damage_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  photo_url TEXT,
  checked_by UUID,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Default inspection checklist (configurable per property, with global defaults)
CREATE TABLE public.default_inspection_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL DEFAULT 'general',
  is_global BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_inspection_checklist ENABLE ROW LEVEL SECURITY;

-- RLS for tenant_exits
CREATE POLICY "Landlords manage company exits"
  ON public.tenant_exits FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned exits"
  ON public.tenant_exits FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own exit"
  ON public.tenant_exits FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

-- RLS for exit_inspection_items
CREATE POLICY "Landlords manage exit inspections"
  ON public.exit_inspection_items FOR ALL TO authenticated
  USING (exit_id IN (SELECT id FROM public.tenant_exits WHERE property_id IN (SELECT get_company_property_ids(auth.uid()))));

CREATE POLICY "PMs manage assigned exit inspections"
  ON public.exit_inspection_items FOR ALL TO authenticated
  USING (exit_id IN (SELECT id FROM public.tenant_exits WHERE is_approved_pm(auth.uid(), property_id)));

CREATE POLICY "Tenants view own exit inspections"
  ON public.exit_inspection_items FOR SELECT TO authenticated
  USING (exit_id IN (SELECT te.id FROM public.tenant_exits te WHERE te.tenant_id IN (SELECT get_tenant_id_by_user(auth.uid()))));

-- RLS for default_inspection_checklist
CREATE POLICY "Landlords manage company checklists"
  ON public.default_inspection_checklist FOR ALL TO authenticated
  USING (
    property_id IN (SELECT get_company_property_ids(auth.uid()))
    OR (is_global = true AND user_id = auth.uid())
  )
  WITH CHECK (
    property_id IN (SELECT get_company_property_ids(auth.uid()))
    OR (is_global = true AND user_id = auth.uid())
  );

CREATE POLICY "PMs manage assigned checklists"
  ON public.default_inspection_checklist FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Read global checklist items"
  ON public.default_inspection_checklist FOR SELECT TO authenticated
  USING (is_global = true);

-- Insert default global checklist items
INSERT INTO public.default_inspection_checklist (item_name, item_category, is_global, user_id) VALUES
  ('Walls - condition & paint', 'structure', true, '00000000-0000-0000-0000-000000000000'),
  ('Floors - condition & cleanliness', 'structure', true, '00000000-0000-0000-0000-000000000000'),
  ('Ceiling - condition', 'structure', true, '00000000-0000-0000-0000-000000000000'),
  ('Windows - glass & frames', 'structure', true, '00000000-0000-0000-0000-000000000000'),
  ('Doors - condition & locks', 'structure', true, '00000000-0000-0000-0000-000000000000'),
  ('Light fixtures & switches', 'electrical', true, '00000000-0000-0000-0000-000000000000'),
  ('Power outlets', 'electrical', true, '00000000-0000-0000-0000-000000000000'),
  ('Water taps & faucets', 'plumbing', true, '00000000-0000-0000-0000-000000000000'),
  ('Toilet & flush system', 'plumbing', true, '00000000-0000-0000-0000-000000000000'),
  ('Shower / bathtub', 'plumbing', true, '00000000-0000-0000-0000-000000000000'),
  ('Kitchen sink & drainage', 'plumbing', true, '00000000-0000-0000-0000-000000000000'),
  ('Stove / cooktop', 'appliances', true, '00000000-0000-0000-0000-000000000000'),
  ('Refrigerator', 'appliances', true, '00000000-0000-0000-0000-000000000000'),
  ('Air conditioning unit', 'appliances', true, '00000000-0000-0000-0000-000000000000'),
  ('Water heater', 'appliances', true, '00000000-0000-0000-0000-000000000000'),
  ('Keys - all copies returned', 'general', true, '00000000-0000-0000-0000-000000000000'),
  ('Parking space / garage', 'general', true, '00000000-0000-0000-0000-000000000000'),
  ('General cleanliness', 'general', true, '00000000-0000-0000-0000-000000000000'),
  ('Pest / insect damage', 'general', true, '00000000-0000-0000-0000-000000000000'),
  ('Storage areas / closets', 'general', true, '00000000-0000-0000-0000-000000000000');
