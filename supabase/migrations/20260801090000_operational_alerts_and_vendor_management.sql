-- Operational alerts and vendor management.

CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('lease_expiry', 'vacant_unit', 'overdue_payment', 'vendor_document_expiring')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  title text NOT NULL,
  description text,
  reference_table text NOT NULL CHECK (reference_table IN ('leases', 'units', 'invoices', 'vendor_documents')),
  reference_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, alert_type, reference_table, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_company_status
  ON public.operational_alerts (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_reference
  ON public.operational_alerts (reference_table, reference_id);

CREATE TABLE IF NOT EXISTS public.alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('lease_expiry', 'vacant_unit', 'overdue_payment', 'vendor_document_expiring')),
  threshold_days integer NOT NULL CHECK (threshold_days >= 0 AND threshold_days <= 3650),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, alert_type)
);

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  vendor_type text,
  contact_name text,
  phone text,
  email text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes text,
  rating numeric(2,1) CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_company ON public.vendors (company_id, status);

CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('insurance', 'license', 'certification', 'contract', 'other')),
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  expiry_date date,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor ON public.vendor_documents (vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_expiry ON public.vendor_documents (company_id, expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  maintenance_request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'RWF',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method text,
  reference_number text,
  paid_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_company_vendor
  ON public.vendor_payments (company_id, vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_maintenance
  ON public.vendor_payments (maintenance_request_id);

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS actual_cost numeric(12,2);

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

UPDATE public.units
SET status_changed_at = coalesce(updated_at, created_at, now())
WHERE status_changed_at IS NULL;

ALTER TABLE public.units ALTER COLUMN status_changed_at SET DEFAULT now();
ALTER TABLE public.units ALTER COLUMN status_changed_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.track_unit_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_unit_status_change ON public.units;
CREATE TRIGGER track_unit_status_change
BEFORE INSERT OR UPDATE OF status ON public.units
FOR EACH ROW EXECUTE FUNCTION public.track_unit_status_change();

CREATE OR REPLACE FUNCTION public.validate_vendor_company_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_vendor_company uuid;
  v_request_company uuid;
BEGIN
  SELECT company_id INTO v_vendor_company FROM public.vendors WHERE id = NEW.vendor_id;
  IF v_vendor_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'VENDOR_COMPANY_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF TG_TABLE_NAME = 'vendor_documents' THEN
    RETURN NEW;
  END IF;

  IF NEW.maintenance_request_id IS NOT NULL THEN
    SELECT p.company_id INTO v_request_company
    FROM public.maintenance_requests mr
    JOIN public.properties p ON p.id = mr.property_id
    WHERE mr.id = NEW.maintenance_request_id;
    IF v_request_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'MAINTENANCE_COMPANY_MISMATCH' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_vendor_document_company ON public.vendor_documents;
CREATE TRIGGER validate_vendor_document_company
BEFORE INSERT OR UPDATE ON public.vendor_documents
FOR EACH ROW EXECUTE FUNCTION public.validate_vendor_company_scope();

DROP TRIGGER IF EXISTS validate_vendor_payment_company ON public.vendor_payments;
CREATE TRIGGER validate_vendor_payment_company
BEFORE INSERT OR UPDATE ON public.vendor_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_vendor_company_scope();

CREATE OR REPLACE FUNCTION public.validate_maintenance_vendor_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_property_company uuid;
  v_vendor_company uuid;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  SELECT company_id INTO v_property_company FROM public.properties WHERE id = NEW.property_id;
  SELECT company_id INTO v_vendor_company FROM public.vendors WHERE id = NEW.vendor_id;
  IF v_property_company IS DISTINCT FROM v_vendor_company THEN
    RAISE EXCEPTION 'MAINTENANCE_VENDOR_COMPANY_MISMATCH' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_maintenance_vendor_company ON public.maintenance_requests;
CREATE TRIGGER validate_maintenance_vendor_company
BEFORE INSERT OR UPDATE OF vendor_id, property_id ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_maintenance_vendor_scope();

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_operational_alerts_updated_at ON public.operational_alerts;
    CREATE TRIGGER update_operational_alerts_updated_at BEFORE UPDATE ON public.operational_alerts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    DROP TRIGGER IF EXISTS update_alert_thresholds_updated_at ON public.alert_thresholds;
    CREATE TRIGGER update_alert_thresholds_updated_at BEFORE UPDATE ON public.alert_thresholds
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
    CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    DROP TRIGGER IF EXISTS update_vendor_payments_updated_at ON public.vendor_payments;
    CREATE TRIGGER update_vendor_payments_updated_at BEFORE UPDATE ON public.vendor_payments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage operational alerts" ON public.operational_alerts FOR ALL TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())))
WITH CHECK (company_id IN (SELECT public.get_user_company_ids(auth.uid())));
CREATE POLICY "Company members manage alert thresholds" ON public.alert_thresholds FOR ALL TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())))
WITH CHECK (company_id IN (SELECT public.get_user_company_ids(auth.uid())));
CREATE POLICY "Company members manage vendors" ON public.vendors FOR ALL TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())))
WITH CHECK (company_id IN (SELECT public.get_user_company_ids(auth.uid())));
CREATE POLICY "Company members manage vendor documents" ON public.vendor_documents FOR ALL TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())))
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.company_id = vendor_documents.company_id)
);
CREATE POLICY "Company members manage vendor payments" ON public.vendor_payments FOR ALL TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())))
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.company_id = vendor_payments.company_id)
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-documents', 'vendor-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company members view vendor documents" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids(auth.uid()))
);
CREATE POLICY "Company members upload vendor documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids(auth.uid()))
);
CREATE POLICY "Company members update vendor documents" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids(auth.uid()))
)
WITH CHECK (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids(auth.uid()))
);
CREATE POLICY "Company members delete vendor documents" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids(auth.uid()))
);

CREATE OR REPLACE FUNCTION public.evaluate_operational_alerts(p_company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created integer := 0;
  v_resolved integer := 0;
  v_row record;
  v_alert_id uuid;
  v_threshold integer;
  v_enabled boolean;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF p_company_id IS NULL OR p_company_id NOT IN (SELECT public.get_user_company_ids(auth.uid())) THEN
      RAISE EXCEPTION 'COMPANY_ACCESS_DENIED' USING ERRCODE = '42501';
    END IF;
  END IF;

  FOR v_row IN SELECT id, owner_id FROM public.companies WHERE p_company_id IS NULL OR id = p_company_id LOOP
    SELECT coalesce(t.threshold_days, defaults.threshold_days), coalesce(t.enabled, defaults.enabled) INTO v_threshold, v_enabled
    FROM (SELECT 30 AS threshold_days, true AS enabled) defaults
    LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'lease_expiry';
    IF v_enabled THEN
      FOR v_alert_id IN
        WITH candidates AS (
          SELECT l.id, l.end_date, l.lease_number, u.unit_number,
            greatest(0, l.end_date - current_date) AS days_until_expiry
          FROM public.leases l
          JOIN public.properties p ON p.id = l.property_id AND p.company_id = v_row.id
          LEFT JOIN public.units u ON u.id = l.unit_id
          WHERE l.status = 'active'
            AND l.end_date BETWEEN current_date AND current_date + v_threshold
            AND coalesce(l.renewal_status, 'not_renewed') <> 'renewed'
        ), inserted AS (
          INSERT INTO public.operational_alerts (
            company_id, alert_type, severity, title, description, reference_table, reference_id, metadata
          )
          SELECT v_row.id, 'lease_expiry', CASE WHEN days_until_expiry <= 7 THEN 'critical' ELSE 'warning' END,
            'Lease expiring soon',
            format('Lease %s for unit %s expires in %s days.', lease_number, coalesce(unit_number, 'unassigned'), days_until_expiry),
            'leases', id,
            jsonb_build_object('days_until_expiry', days_until_expiry, 'lease_number', lease_number, 'unit_number', unit_number, 'end_date', end_date)
          FROM candidates
          ON CONFLICT (company_id, alert_type, reference_table, reference_id) DO UPDATE SET
            severity = EXCLUDED.severity, title = EXCLUDED.title, description = EXCLUDED.description,
            metadata = EXCLUDED.metadata, status = 'open', resolved_at = NULL, updated_at = now()
          WHERE operational_alerts.status = 'resolved'
          RETURNING id
        ) SELECT id FROM inserted
      LOOP
        v_created := v_created + 1;
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        SELECT member_id, a.title, coalesce(a.description, a.title), CASE WHEN a.severity = 'critical' THEN 'error' ELSE a.severity END, '/alerts', jsonb_build_object('operational_alert_id', a.id)
        FROM public.operational_alerts a
        CROSS JOIN LATERAL (
          SELECT v_row.owner_id AS member_id
          UNION SELECT cm.user_id FROM public.company_members cm WHERE cm.company_id = v_row.id AND cm.status = 'approved'
        ) recipients
        WHERE a.id = v_alert_id AND member_id IS NOT NULL;
      END LOOP;

      UPDATE public.operational_alerts a SET
        severity = CASE WHEN (a.metadata->>'days_until_expiry')::integer <= 7 THEN 'critical' ELSE 'warning' END,
        updated_at = now(),
        status = CASE WHEN a.status = 'resolved' THEN 'open' ELSE a.status END,
        resolved_at = CASE WHEN a.status = 'resolved' THEN NULL ELSE a.resolved_at END
      FROM public.leases l JOIN public.properties p ON p.id = l.property_id
      WHERE a.company_id = v_row.id AND a.alert_type = 'lease_expiry' AND a.reference_id = l.id
        AND p.company_id = v_row.id AND l.status = 'active'
        AND l.end_date BETWEEN current_date AND current_date + v_threshold
        AND coalesce(l.renewal_status, 'not_renewed') <> 'renewed';
    END IF;

    SELECT coalesce(t.threshold_days, defaults.threshold_days), coalesce(t.enabled, defaults.enabled) INTO v_threshold, v_enabled
    FROM (SELECT 14 AS threshold_days, true AS enabled) defaults
    LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'vacant_unit';
    IF v_enabled THEN
      FOR v_alert_id IN
        WITH candidates AS (
          SELECT u.id, u.unit_number, p.name AS property_name,
            floor(extract(epoch FROM (now() - u.status_changed_at)) / 86400)::integer AS vacant_days
          FROM public.units u JOIN public.properties p ON p.id = u.property_id
          WHERE p.company_id = v_row.id AND u.status = 'vacant'
            AND u.status_changed_at < now() - make_interval(days => v_threshold)
        ), inserted AS (
          INSERT INTO public.operational_alerts (company_id, alert_type, severity, title, description, reference_table, reference_id, metadata)
          SELECT v_row.id, 'vacant_unit', CASE WHEN vacant_days >= v_threshold * 2 THEN 'critical' ELSE 'warning' END,
            'Unit vacant beyond target', format('Unit %s at %s has been vacant for %s days.', unit_number, property_name, vacant_days),
            'units', id, jsonb_build_object('vacant_days', vacant_days, 'unit_number', unit_number, 'property_name', property_name)
          FROM candidates ON CONFLICT (company_id, alert_type, reference_table, reference_id) DO UPDATE SET
            severity = EXCLUDED.severity, title = EXCLUDED.title, description = EXCLUDED.description,
            metadata = EXCLUDED.metadata, status = 'open', resolved_at = NULL, updated_at = now()
          WHERE operational_alerts.status = 'resolved' RETURNING id
        ) SELECT id FROM inserted
      LOOP
        v_created := v_created + 1;
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        SELECT member_id, a.title, coalesce(a.description, a.title), CASE WHEN a.severity = 'critical' THEN 'error' ELSE a.severity END, '/alerts', jsonb_build_object('operational_alert_id', a.id)
        FROM public.operational_alerts a CROSS JOIN LATERAL (
          SELECT v_row.owner_id AS member_id UNION SELECT cm.user_id FROM public.company_members cm WHERE cm.company_id = v_row.id AND cm.status = 'approved'
        ) recipients WHERE a.id = v_alert_id AND member_id IS NOT NULL;
      END LOOP;
    END IF;

    SELECT coalesce(t.threshold_days, defaults.threshold_days), coalesce(t.enabled, defaults.enabled) INTO v_threshold, v_enabled
    FROM (SELECT 0 AS threshold_days, true AS enabled) defaults
    LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'overdue_payment';
    IF v_enabled THEN
      FOR v_alert_id IN
        WITH candidates AS (
          SELECT i.id, i.invoice_number, i.due_date, greatest(i.amount - coalesce(i.paid_amount, 0), 0) AS amount_overdue,
            current_date - i.due_date AS overdue_days
          FROM public.invoices i JOIN public.properties p ON p.id = i.property_id
          WHERE p.company_id = v_row.id AND i.status IN ('pending', 'partial')
            AND i.due_date < current_date - v_threshold
        ), inserted AS (
          INSERT INTO public.operational_alerts (company_id, alert_type, severity, title, description, reference_table, reference_id, metadata)
          SELECT v_row.id, 'overdue_payment', CASE WHEN overdue_days >= 30 THEN 'critical' ELSE 'warning' END,
            'Payment overdue', format('Invoice %s is %s days overdue.', invoice_number, overdue_days),
            'invoices', id, jsonb_build_object('overdue_days', overdue_days, 'amount_overdue', amount_overdue, 'invoice_number', invoice_number, 'due_date', due_date)
          FROM candidates ON CONFLICT (company_id, alert_type, reference_table, reference_id) DO UPDATE SET
            severity = EXCLUDED.severity, title = EXCLUDED.title, description = EXCLUDED.description,
            metadata = EXCLUDED.metadata, status = 'open', resolved_at = NULL, updated_at = now()
          WHERE operational_alerts.status = 'resolved' RETURNING id
        ) SELECT id FROM inserted
      LOOP
        v_created := v_created + 1;
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        SELECT member_id, a.title, coalesce(a.description, a.title), CASE WHEN a.severity = 'critical' THEN 'error' ELSE a.severity END, '/alerts', jsonb_build_object('operational_alert_id', a.id)
        FROM public.operational_alerts a CROSS JOIN LATERAL (
          SELECT v_row.owner_id AS member_id UNION SELECT cm.user_id FROM public.company_members cm WHERE cm.company_id = v_row.id AND cm.status = 'approved'
        ) recipients WHERE a.id = v_alert_id AND member_id IS NOT NULL;
      END LOOP;
    END IF;

    SELECT coalesce(t.threshold_days, defaults.threshold_days), coalesce(t.enabled, defaults.enabled) INTO v_threshold, v_enabled
    FROM (SELECT 30 AS threshold_days, true AS enabled) defaults
    LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'vendor_document_expiring';
    IF v_enabled THEN
      FOR v_alert_id IN
        WITH candidates AS (
          SELECT d.id, d.vendor_id, d.document_type, d.expiry_date, v.name AS vendor_name,
            d.expiry_date - current_date AS days_until_expiry
          FROM public.vendor_documents d JOIN public.vendors v ON v.id = d.vendor_id
          WHERE d.company_id = v_row.id AND d.expiry_date BETWEEN current_date AND current_date + v_threshold
        ), inserted AS (
          INSERT INTO public.operational_alerts (company_id, alert_type, severity, title, description, reference_table, reference_id, metadata)
          SELECT v_row.id, 'vendor_document_expiring', CASE WHEN days_until_expiry <= 7 THEN 'critical' ELSE 'warning' END,
            'Vendor document expiring', format('%s document for %s expires in %s days.', initcap(replace(document_type, '_', ' ')), vendor_name, days_until_expiry),
            'vendor_documents', id, jsonb_build_object('days_until_expiry', days_until_expiry, 'vendor_id', vendor_id, 'document_type', document_type, 'vendor_name', vendor_name, 'expiry_date', expiry_date)
          FROM candidates ON CONFLICT (company_id, alert_type, reference_table, reference_id) DO UPDATE SET
            severity = EXCLUDED.severity, title = EXCLUDED.title, description = EXCLUDED.description,
            metadata = EXCLUDED.metadata, status = 'open', resolved_at = NULL, updated_at = now()
          WHERE operational_alerts.status = 'resolved' RETURNING id
        ) SELECT id FROM inserted
      LOOP
        v_created := v_created + 1;
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        SELECT member_id, a.title, coalesce(a.description, a.title), CASE WHEN a.severity = 'critical' THEN 'error' ELSE a.severity END, '/alerts', jsonb_build_object('operational_alert_id', a.id)
        FROM public.operational_alerts a CROSS JOIN LATERAL (
          SELECT v_row.owner_id AS member_id UNION SELECT cm.user_id FROM public.company_members cm WHERE cm.company_id = v_row.id AND cm.status = 'approved'
        ) recipients WHERE a.id = v_alert_id AND member_id IS NOT NULL;
      END LOOP;
    END IF;

    WITH resolved AS (
      UPDATE public.operational_alerts a SET status = 'resolved', resolved_at = now(), updated_at = now()
      WHERE a.company_id = v_row.id AND a.status IN ('open', 'acknowledged') AND (
        (a.alert_type = 'lease_expiry' AND NOT EXISTS (
          SELECT 1 FROM public.leases l JOIN public.properties p ON p.id = l.property_id
          LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'lease_expiry'
          WHERE l.id = a.reference_id AND p.company_id = v_row.id AND coalesce(t.enabled, true)
            AND l.status = 'active' AND l.end_date BETWEEN current_date AND current_date + coalesce(t.threshold_days, 30)
            AND coalesce(l.renewal_status, 'not_renewed') <> 'renewed'
        )) OR
        (a.alert_type = 'vacant_unit' AND NOT EXISTS (
          SELECT 1 FROM public.units u JOIN public.properties p ON p.id = u.property_id
          LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'vacant_unit'
          WHERE u.id = a.reference_id AND p.company_id = v_row.id AND coalesce(t.enabled, true)
            AND u.status = 'vacant' AND u.status_changed_at < now() - make_interval(days => coalesce(t.threshold_days, 14))
        )) OR
        (a.alert_type = 'overdue_payment' AND NOT EXISTS (
          SELECT 1 FROM public.invoices i JOIN public.properties p ON p.id = i.property_id
          LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'overdue_payment'
          WHERE i.id = a.reference_id AND p.company_id = v_row.id AND coalesce(t.enabled, true)
            AND i.status IN ('pending', 'partial') AND i.due_date < current_date - coalesce(t.threshold_days, 0)
        )) OR
        (a.alert_type = 'vendor_document_expiring' AND NOT EXISTS (
          SELECT 1 FROM public.vendor_documents d
          LEFT JOIN public.alert_thresholds t ON t.company_id = v_row.id AND t.alert_type = 'vendor_document_expiring'
          WHERE d.id = a.reference_id AND d.company_id = v_row.id AND coalesce(t.enabled, true)
            AND d.expiry_date BETWEEN current_date AND current_date + coalesce(t.threshold_days, 30)
        ))
      ) RETURNING id
    ) SELECT count(*) INTO v_threshold FROM resolved;
    v_resolved := v_resolved + v_threshold;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'resolved', v_resolved);
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_operational_alerts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_operational_alerts(uuid) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_alerts, public.alert_thresholds, public.vendors, public.vendor_documents, public.vendor_payments TO authenticated;

CREATE OR REPLACE FUNCTION public.schedule_operational_alert_evaluation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN RETURN false; END IF;
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'operational_alerts_daily' LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule('operational_alerts_daily', '0 6 * * *', 'SELECT public.evaluate_operational_alerts(NULL);');
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unable to schedule operational alert evaluation: %', SQLERRM;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_operational_alert_evaluation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_operational_alert_evaluation() TO service_role;

DO $$ BEGIN PERFORM public.schedule_operational_alert_evaluation(); END $$;
