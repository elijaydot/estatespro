-- Follow-up hardening: secure storage for tenant-exit inventory photos + deterministic checkout snapshot upsert.

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-exit-inventory', 'tenant-exit-inventory', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_access_tenant_exit_inventory(tenant_id_text text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_property_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_platform_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  BEGIN
    v_tenant_id := tenant_id_text::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN false;
  END;

  SELECT property_id
  INTO v_property_id
  FROM public.tenants
  WHERE id = v_tenant_id;

  IF v_property_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_property_id IN (SELECT get_company_property_ids(auth.uid())) THEN
    RETURN true;
  END IF;

  IF is_approved_pm(auth.uid(), v_property_id) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = v_tenant_id
      AND t.tenant_user_id = auth.uid()
  );
END;
$$;

DROP POLICY IF EXISTS "Authorized users can view tenant exit inventory photos" ON storage.objects;
CREATE POLICY "Authorized users can view tenant exit inventory photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-exit-inventory'
  AND public.can_access_tenant_exit_inventory(split_part(name, '/', 1))
);

DROP POLICY IF EXISTS "Authorized managers can upload tenant exit inventory photos" ON storage.objects;
CREATE POLICY "Authorized managers can upload tenant exit inventory photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-exit-inventory'
  AND public.can_access_tenant_exit_inventory(split_part(name, '/', 1))
  AND NOT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id::text = split_part(name, '/', 1)
      AND t.tenant_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized managers can update tenant exit inventory photos" ON storage.objects;
CREATE POLICY "Authorized managers can update tenant exit inventory photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-exit-inventory'
  AND public.can_access_tenant_exit_inventory(split_part(name, '/', 1))
)
WITH CHECK (
  bucket_id = 'tenant-exit-inventory'
  AND public.can_access_tenant_exit_inventory(split_part(name, '/', 1))
  AND NOT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id::text = split_part(name, '/', 1)
      AND t.tenant_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized managers can delete tenant exit inventory photos" ON storage.objects;
CREATE POLICY "Authorized managers can delete tenant exit inventory photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-exit-inventory'
  AND public.can_access_tenant_exit_inventory(split_part(name, '/', 1))
  AND NOT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id::text = split_part(name, '/', 1)
      AND t.tenant_user_id = auth.uid()
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lease_inventory_snapshots_exit_phase
  ON public.lease_inventory_snapshots (exit_id, phase);

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
  ON CONFLICT (exit_id, phase)
  DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = now(),
    captured_by = COALESCE(public.lease_inventory_snapshots.captured_by, auth.uid()),
    captured_at = COALESCE(public.lease_inventory_snapshots.captured_at, now())
  RETURNING id INTO v_snapshot_id;

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

  RETURN v_snapshot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_tenant_exit_inventory(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_exit_sync_checkout_snapshot(uuid) TO authenticated;
