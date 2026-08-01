import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260801090000_operational_alerts_and_vendor_management.sql'),
  'utf8',
);
const evaluator = readFileSync(
  resolve('supabase/functions/evaluate-operational-alerts/index.ts'),
  'utf8',
);
const functionConfig = readFileSync(resolve('supabase/config.toml'), 'utf8');
const app = readFileSync(resolve('src/App.tsx'), 'utf8');
const sidebar = readFileSync(resolve('src/components/layout/AppSidebar.tsx'), 'utf8');
const alerts = readFileSync(resolve('src/pages/Alerts.tsx'), 'utf8');
const alertHooks = readFileSync(resolve('src/hooks/useOperationalAlerts.ts'), 'utf8');
const vendors = readFileSync(resolve('src/pages/Vendors.tsx'), 'utf8');
const vendorHooks = readFileSync(resolve('src/hooks/useVendors.ts'), 'utf8');
const vendorDetail = readFileSync(resolve('src/pages/VendorDetail.tsx'), 'utf8');
const maintenance = readFileSync(resolve('src/pages/Maintenance.tsx'), 'utf8');
const settings = readFileSync(resolve('src/pages/Settings.tsx'), 'utf8');

describe('operational alerts and vendor management foundation', () => {
  it('creates all company-scoped tables with RLS', () => {
    for (const table of ['operational_alerts', 'alert_thresholds', 'vendors', 'vendor_documents', 'vendor_payments']) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain('company_id IN (SELECT public.get_user_company_ids(auth.uid()))');
    }
  });

  it('keeps maintenance assignment additive and company-safe', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS estimated_cost numeric(12,2)');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS actual_cost numeric(12,2)');
    expect(migration).toContain('MAINTENANCE_VENDOR_COMPANY_MISMATCH');
    expect(migration).not.toContain('DROP COLUMN assigned_to');
  });

  it('evaluates all four conditions idempotently and resolves cleared conditions', () => {
    for (const type of ['lease_expiry', 'vacant_unit', 'overdue_payment', 'vendor_document_expiring']) {
      expect(migration).toContain(`'${type}'`);
    }
    expect(migration).toContain('UNIQUE (company_id, alert_type, reference_table, reference_id)');
    expect(migration).toContain('ON CONFLICT (company_id, alert_type, reference_table, reference_id) DO UPDATE SET');
    expect(migration).toContain("WHERE operational_alerts.status = 'resolved'");
    expect(migration).toContain("SET status = 'resolved', resolved_at = now()");
    expect(migration).toContain("status IN ('open', 'acknowledged')");
    expect(migration).toContain("'/alerts'");
  });

  it('protects manual evaluation and schedules the same evaluator daily', () => {
    expect(migration).toContain("RAISE EXCEPTION 'COMPANY_ACCESS_DENIED' USING ERRCODE = '42501'");
    expect(migration).toContain("cron.schedule('operational_alerts_daily', '0 6 * * *', 'SELECT public.evaluate_operational_alerts(NULL);')");
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.evaluate_operational_alerts(uuid) TO authenticated, service_role');
  });

  it('tracks vacancy age and protects private vendor documents by company path', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS status_changed_at timestamptz');
    expect(migration).toContain('CREATE TRIGGER track_unit_status_change');
    expect(migration).toContain("VALUES ('vendor-documents', 'vendor-documents', false)");
    expect(migration).toContain("(storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids(auth.uid()))");
  });

  it('exposes a rate-limited authenticated manual evaluator without service-role bypass', () => {
    expect(evaluator).toContain("keyPrefix: 'evaluate-operational-alerts'");
    expect(evaluator).toContain("authHeader?.startsWith('Bearer ')");
    expect(evaluator).toContain("createClient(supabaseUrl, anonKey");
    expect(evaluator).toContain("rpc('evaluate_operational_alerts'");
    expect(evaluator).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(functionConfig).toContain('[functions.evaluate-operational-alerts]');
    expect(functionConfig).toMatch(/\[functions\.evaluate-operational-alerts\]\r?\nverify_jwt = true/);
  });

  it('wires ungated alert and vendor operations through the application', () => {
    expect(app).toContain('path="/alerts" element={<PrivateRoute>');
    expect(app).toContain('path="/vendors" element={<PrivateRoute>');
    expect(app).toContain('path="/vendors/:id" element={<PrivateRoute>');
    expect(sidebar).toContain("label: 'Alerts', href: '/alerts'");
    expect(sidebar).toContain('useOpenOperationalAlertCount');
    expect(settings).toContain('<AlertSettings />');
  });

  it('uses company storage paths, configured currency, and additive vendor assignment', () => {
    expect(vendorDetail).toContain('pathPrefix={`${activeCompanyId}/${id}`}');
    expect(vendorDetail).toContain('currency: settings.currencyCode');
    expect(maintenance).toContain("useVendors('active')");
    expect(maintenance).toContain('vendor_id: formData.vendor_id || null');
    expect(maintenance).toContain('Free-text fallback');
  });

  it('supports complete vendor profile, payment, and document workflows', () => {
    expect(vendorDetail).toContain('Edit vendor');
    expect(vendorDetail).toContain("changePaymentStatus(payment.id, 'paid')");
    expect(vendorDetail).toContain("changePaymentStatus(payment.id, 'cancelled')");
    expect(vendorDetail).toContain('confirmAction({');
    expect(vendorDetail).toContain('Expiry dates generate operational alerts.');
    expect(vendorHooks).toContain("storage.from('vendor-documents').remove([input.storage_path])");
    expect(vendorHooks).toContain("throw new Error('Rating must be between 0 and 5')");
  });

  it('makes the vendor directory measurable, filterable, and deep-linkable', () => {
    expect(vendors).toContain("searchParams.get('add') === 'true'");
    expect(vendors).toContain('All vendors');
    expect(vendors).toContain('Needs review');
    expect(vendors).toContain('Initial rating (0-5)');
    expect(vendors).toContain('ratingInvalid');
    expect(vendors).toContain("status === 'all' || vendor.status === status");
  });

  it('provides a filterable alert queue with tenant-scoped bulk acknowledgement', () => {
    expect(alerts).toContain('Acknowledge visible');
    expect(alerts).toContain('to="/settings?tab=alerts"');
    expect(alerts).toContain('setType');
    expect(alerts).toContain('setSeverity');
    expect(alertHooks).toContain(".eq('company_id', activeCompanyId)");
    expect(alertHooks).toContain(".in('id', ids)");
  });
});