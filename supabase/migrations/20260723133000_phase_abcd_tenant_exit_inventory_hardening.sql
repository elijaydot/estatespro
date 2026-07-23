-- Phase A/B/C/D: tenant exit inventory baseline, scoped checklist, transition guards, and portal visibility hardening.

ALTER TABLE public.default_inspection_checklist
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE public.exit_inspection_items
  ADD COLUMN IF NOT EXISTS baseline_condition text NOT NULL DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS baseline_notes text,
  ADD COLUMN IF NOT EXISTS baseline_photo_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'default_inspection_checklist_scope_consistency'
  ) THEN
    ALTER TABLE public.default_inspection_checklist
      ADD CONSTRAINT default_inspection_checklist_scope_consistency
      CHECK (
        (is_global = true AND property_id IS NULL AND unit_id IS NULL)
        OR
        (is_global = false AND (property_id IS NOT NULL OR unit_id IS NOT NULL))
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_default_inspection_checklist_scope
  ON public.default_inspection_checklist (is_global, property_id, unit_id, item_category);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_exits_active_per_tenant_unit
  ON public.tenant_exits (tenant_id, unit_id)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.lease_inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  exit_id uuid REFERENCES public.tenant_exits(id) ON DELETE SET NULL,
  phase text NOT NULL CHECK (phase IN ('move_in', 'move_out')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  notes text,
  captured_by uuid,
  captured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lease_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.lease_inventory_snapshots(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_category text NOT NULL DEFAULT 'general',
  condition text NOT NULL DEFAULT 'not_checked',
  notes text,
  photo_url text,
  damage_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_inventory_snapshots_scope
  ON public.lease_inventory_snapshots (tenant_id, property_id, unit_id, phase, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lease_inventory_items_snapshot
  ON public.lease_inventory_items (snapshot_id, item_category, item_name);

ALTER TABLE public.lease_inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_inventory_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'tenant_exits',
    'exit_inspection_items',
    'default_inspection_checklist',
    'lease_inventory_snapshots',
    'lease_inventory_items'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = 'Super admins can manage ' || v_table
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()))',
        'Super admins can manage ' || v_table,
        v_table
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_inventory_snapshots'
      AND policyname = 'Landlords manage lease inventory snapshots'
  ) THEN
    CREATE POLICY "Landlords manage lease inventory snapshots"
      ON public.lease_inventory_snapshots FOR ALL TO authenticated
      USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
      WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_inventory_snapshots'
      AND policyname = 'PMs manage assigned lease inventory snapshots'
  ) THEN
    CREATE POLICY "PMs manage assigned lease inventory snapshots"
      ON public.lease_inventory_snapshots FOR ALL TO authenticated
      USING (is_approved_pm(auth.uid(), property_id))
      WITH CHECK (is_approved_pm(auth.uid(), property_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_inventory_snapshots'
      AND policyname = 'Tenants view own lease inventory snapshots'
  ) THEN
    CREATE POLICY "Tenants view own lease inventory snapshots"
      ON public.lease_inventory_snapshots FOR SELECT TO authenticated
      USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_inventory_items'
      AND policyname = 'Landlords manage lease inventory items'
  ) THEN
    CREATE POLICY "Landlords manage lease inventory items"
      ON public.lease_inventory_items FOR ALL TO authenticated
      USING (snapshot_id IN (
        SELECT id FROM public.lease_inventory_snapshots
        WHERE property_id IN (SELECT get_company_property_ids(auth.uid()))
      ))
      WITH CHECK (snapshot_id IN (
        SELECT id FROM public.lease_inventory_snapshots
        WHERE property_id IN (SELECT get_company_property_ids(auth.uid()))
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_inventory_items'
      AND policyname = 'PMs manage assigned lease inventory items'
  ) THEN
    CREATE POLICY "PMs manage assigned lease inventory items"
      ON public.lease_inventory_items FOR ALL TO authenticated
      USING (snapshot_id IN (
        SELECT id FROM public.lease_inventory_snapshots
        WHERE is_approved_pm(auth.uid(), property_id)
      ))
      WITH CHECK (snapshot_id IN (
        SELECT id FROM public.lease_inventory_snapshots
        WHERE is_approved_pm(auth.uid(), property_id)
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_inventory_items'
      AND policyname = 'Tenants view own lease inventory items'
  ) THEN
    CREATE POLICY "Tenants view own lease inventory items"
      ON public.lease_inventory_items FOR SELECT TO authenticated
      USING (snapshot_id IN (
        SELECT id FROM public.lease_inventory_snapshots
        WHERE tenant_id IN (SELECT get_tenant_id_by_user(auth.uid()))
      ));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_tenant_exit_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'inspection_pending' AND NEW.status = 'inspection_complete' THEN
    IF NEW.inspection_date IS NULL THEN
      RAISE EXCEPTION 'INSPECTION_DATE_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'inspection_complete' AND NEW.status = 'deposit_decided' THEN
    IF NEW.deposit_decision IS NULL OR NEW.deposit_decision = 'pending' THEN
      RAISE EXCEPTION 'DEPOSIT_DECISION_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'deposit_decided' AND NEW.status = 'approved' THEN
    IF NEW.landlord_approved_by IS NULL OR NEW.landlord_approved_at IS NULL THEN
      RAISE EXCEPTION 'LANDLORD_APPROVAL_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'approved' AND NEW.status = 'completed' THEN
    IF NEW.refund_method IS NULL OR NEW.refund_method = '' OR NEW.refund_processed_at IS NULL THEN
      RAISE EXCEPTION 'REFUND_DETAILS_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'INVALID_EXIT_STATUS_TRANSITION: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_exit_status_transition_trigger ON public.tenant_exits;
CREATE TRIGGER enforce_tenant_exit_status_transition_trigger
BEFORE UPDATE ON public.tenant_exits
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tenant_exit_status_transition();

CREATE OR REPLACE FUNCTION public.seed_move_in_inventory_snapshot(
  p_tenant_id uuid,
  p_property_id uuid,
  p_unit_id uuid,
  p_lease_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id uuid;
BEGIN
  INSERT INTO public.lease_inventory_snapshots (
    tenant_id,
    property_id,
    unit_id,
    lease_id,
    phase,
    status,
    captured_by,
    captured_at
  ) VALUES (
    p_tenant_id,
    p_property_id,
    p_unit_id,
    p_lease_id,
    'move_in',
    'draft',
    auth.uid(),
    now()
  )
  RETURNING id INTO v_snapshot_id;

  INSERT INTO public.lease_inventory_items (
    snapshot_id,
    item_name,
    item_category,
    condition
  )
  SELECT
    v_snapshot_id,
    merged.item_name,
    merged.item_category,
    'not_checked'
  FROM (
    SELECT DISTINCT ON (lower(item_name))
      item_name,
      item_category,
      CASE
        WHEN unit_id IS NOT NULL THEN 3
        WHEN property_id IS NOT NULL THEN 2
        ELSE 1
      END AS scope_rank,
      created_at
    FROM public.default_inspection_checklist
    WHERE (is_global = true)
       OR (property_id = p_property_id AND unit_id IS NULL)
       OR (unit_id = p_unit_id)
    ORDER BY lower(item_name),
      CASE
        WHEN unit_id IS NOT NULL THEN 3
        WHEN property_id IS NOT NULL THEN 2
        ELSE 1
      END DESC,
      created_at DESC
  ) merged;

  RETURN v_snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_exit_inspection_items_from_scope(p_exit_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_move_in_snapshot_id uuid;
  v_inserted integer := 0;
BEGIN
  SELECT property_id, unit_id, tenant_id
  INTO v_property_id, v_unit_id, v_tenant_id
  FROM public.tenant_exits
  WHERE id = p_exit_id;

  IF v_property_id IS NULL OR v_unit_id IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'EXIT_NOT_FOUND_OR_SCOPE_INVALID';
  END IF;

  IF EXISTS (SELECT 1 FROM public.exit_inspection_items WHERE exit_id = p_exit_id) THEN
    RETURN 0;
  END IF;

  SELECT id
  INTO v_move_in_snapshot_id
  FROM public.lease_inventory_snapshots
  WHERE tenant_id = v_tenant_id
    AND property_id = v_property_id
    AND unit_id = v_unit_id
    AND phase = 'move_in'
    AND status = 'finalized'
  ORDER BY captured_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  INSERT INTO public.exit_inspection_items (
    exit_id,
    item_name,
    item_category,
    baseline_condition,
    baseline_notes,
    baseline_photo_url,
    condition,
    damage_cost
  )
  SELECT
    p_exit_id,
    merged.item_name,
    merged.item_category,
    COALESCE(base.condition, 'good') AS baseline_condition,
    base.notes,
    base.photo_url,
    'not_checked',
    0
  FROM (
    SELECT DISTINCT ON (lower(item_name))
      item_name,
      item_category,
      CASE
        WHEN unit_id IS NOT NULL THEN 3
        WHEN property_id IS NOT NULL THEN 2
        ELSE 1
      END AS scope_rank,
      created_at
    FROM public.default_inspection_checklist
    WHERE (is_global = true)
       OR (property_id = v_property_id AND unit_id IS NULL)
       OR (unit_id = v_unit_id)
    ORDER BY lower(item_name),
      CASE
        WHEN unit_id IS NOT NULL THEN 3
        WHEN property_id IS NOT NULL THEN 2
        ELSE 1
      END DESC,
      created_at DESC
  ) merged
  LEFT JOIN public.lease_inventory_items base
    ON base.snapshot_id = v_move_in_snapshot_id
   AND lower(base.item_name) = lower(merged.item_name);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_exit_sync_checkout_snapshot(p_exit_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exit public.tenant_exits%ROWTYPE;
  v_snapshot_id uuid;
BEGIN
  SELECT * INTO v_exit FROM public.tenant_exits WHERE id = p_exit_id;
  IF v_exit.id IS NULL THEN
    RAISE EXCEPTION 'EXIT_NOT_FOUND';
  END IF;

  INSERT INTO public.lease_inventory_snapshots (
    tenant_id,
    property_id,
    unit_id,
    exit_id,
    phase,
    status,
    captured_by,
    captured_at
  ) VALUES (
    v_exit.tenant_id,
    v_exit.property_id,
    v_exit.unit_id,
    v_exit.id,
    'move_out',
    CASE WHEN v_exit.status = 'completed' THEN 'finalized' ELSE 'draft' END,
    auth.uid(),
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_snapshot_id;

  IF v_snapshot_id IS NULL THEN
    SELECT id INTO v_snapshot_id
    FROM public.lease_inventory_snapshots
    WHERE exit_id = v_exit.id
      AND phase = 'move_out'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  DELETE FROM public.lease_inventory_items WHERE snapshot_id = v_snapshot_id;

  INSERT INTO public.lease_inventory_items (
    snapshot_id,
    item_name,
    item_category,
    condition,
    notes,
    photo_url,
    damage_cost
  )
  SELECT
    v_snapshot_id,
    item_name,
    item_category,
    condition,
    notes,
    photo_url,
    damage_cost
  FROM public.exit_inspection_items
  WHERE exit_id = v_exit.id;

  UPDATE public.lease_inventory_snapshots
  SET status = CASE WHEN v_exit.status = 'completed' THEN 'finalized' ELSE 'draft' END,
      updated_at = now(),
      captured_by = COALESCE(captured_by, auth.uid()),
      captured_at = COALESCE(captured_at, now())
  WHERE id = v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_inventory_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_inventory_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_move_in_inventory_snapshot(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_exit_inspection_items_from_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_exit_sync_checkout_snapshot(uuid) TO authenticated;
