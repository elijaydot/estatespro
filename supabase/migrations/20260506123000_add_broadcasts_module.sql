-- Broadcasts module for tenant/PM/landlord announcements
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  target_role text NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'landlord', 'property_manager', 'tenant')),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_company_created_at
  ON public.broadcasts(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcasts_property_unit
  ON public.broadcasts(property_id, unit_id);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read broadcasts in their scope" ON public.broadcasts;
CREATE POLICY "Users can read broadcasts in their scope" ON public.broadcasts
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = broadcasts.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
  OR (
    target_role IN ('all', 'tenant')
    AND EXISTS (
      SELECT 1
      FROM public.tenants t
      JOIN public.properties p ON p.id = t.property_id
      WHERE t.tenant_user_id = auth.uid()
        AND p.company_id = broadcasts.company_id
        AND (broadcasts.property_id IS NULL OR t.property_id = broadcasts.property_id)
        AND (broadcasts.unit_id IS NULL OR t.unit_id = broadcasts.unit_id)
    )
  )
);

DROP POLICY IF EXISTS "Managers can create company broadcasts" ON public.broadcasts;
CREATE POLICY "Managers can create company broadcasts" ON public.broadcasts
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = broadcasts.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role = 'property_manager'
    )
  )
);

DROP POLICY IF EXISTS "Creators can manage own broadcasts" ON public.broadcasts;
CREATE POLICY "Creators can manage own broadcasts" ON public.broadcasts
FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
