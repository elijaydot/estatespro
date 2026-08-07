import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pipelineMigration = readFileSync(
  resolve('supabase/migrations/20260804100000_fishgate_crm_pipeline_kind.sql'),
  'utf8',
);
const stageCutoverMigration = readFileSync(
  resolve('supabase/migrations/20260804110000_fishgate_crm_lead_stage_cutover.sql'),
  'utf8',
);
const contactIdentityMigration = readFileSync(
  resolve('supabase/migrations/20260804120000_fishgate_crm_contact_tenant_identity.sql'),
  'utf8',
);
const provisioningMigration = readFileSync(
  resolve('supabase/migrations/20260804130000_fishgate_crm_idempotent_tenant_provisioning.sql'),
  'utf8',
);
const accountMigration = readFileSync(
  resolve('supabase/migrations/20260804140000_fishgate_crm_account_specialization.sql'),
  'utf8',
);
const alertLeadMigration = readFileSync(
  resolve('supabase/migrations/20260804150000_fishgate_crm_operational_alert_leads.sql'),
  'utf8',
);
const provisionActionMigration = readFileSync(
  resolve('supabase/migrations/20260804160000_fishgate_crm_provision_tenant_automation_action.sql'),
  'utf8',
);
const marketplaceHooks = readFileSync(resolve('src/hooks/useMarketplace.ts'), 'utf8');
const crmHooks = readFileSync(resolve('src/hooks/useMarketplaceCrm.ts'), 'utf8');
const automation = readFileSync(resolve('src/pages/marketplace-crm/Automation.tsx'), 'utf8');
const deals = readFileSync(resolve('src/pages/marketplace-crm/Deals.tsx'), 'utf8');
const contacts = readFileSync(resolve('src/pages/marketplace-crm/Contacts.tsx'), 'utf8');
const accounts = readFileSync(resolve('src/pages/marketplace-crm/Accounts.tsx'), 'utf8');
const tasks = readFileSync(resolve('src/pages/marketplace-crm/Tasks.tsx'), 'utf8');
const reports = readFileSync(resolve('src/pages/marketplace-crm/Reports.tsx'), 'utf8');

describe('FishGate CRM redesign contracts', () => {
  it('adds a constrained and indexed lead pipeline discriminator', () => {
    expect(pipelineMigration).toContain("ADD COLUMN IF NOT EXISTS pipeline_kind text NOT NULL DEFAULT 'leasing'");
    expect(pipelineMigration).toContain("CHECK (pipeline_kind IN ('leasing', 'renewal', 'collections'))");
    expect(pipelineMigration).toContain('ON public.leads(company_id, pipeline_kind, stage, last_activity_at DESC NULLS LAST)');
    expect(pipelineMigration).not.toContain('DROP COLUMN stage');
  });

  it('preserves orphan deals before removing the generic deal stage', () => {
    expect(stageCutoverMigration).toContain('WHERE lead_id IS NULL FOR UPDATE');
    expect(stageCutoverMigration).toContain("WHEN 'needs_analysis' THEN 'qualified'");
    expect(stageCutoverMigration).toContain("'deal.orphan_lead_backfilled'");
    expect(stageCutoverMigration).toContain('ALTER COLUMN lead_id SET NOT NULL');
    expect(stageCutoverMigration).toContain('ALTER TABLE public.crm_deals DROP COLUMN stage');
    expect(stageCutoverMigration).toContain('CREATE OR REPLACE FUNCTION public.crm_update_deal_and_lead_stage');
    expect(stageCutoverMigration).toContain('SECURITY INVOKER');
  });

  it('moves handoff, automation, and funnel behavior to lead stages', () => {
    expect(stageCutoverMigration).toContain('AFTER UPDATE OF stage ON public.leads');
    expect(stageCutoverMigration).toContain("IF NEW.stage = 'converted'");
    expect(stageCutoverMigration).toContain("HANDOFF_REQUIRES_CONVERTED_LEAD");
    expect(stageCutoverMigration).toContain("stage NOT IN ('converted', 'lost')");
    expect(stageCutoverMigration).toContain('DROP TRIGGER IF EXISTS crm_trigger_automation_deal_stage_changed_trigger ON public.crm_deals');
    expect(stageCutoverMigration).toContain("conditions_json #>> '{equals,to_stage}' = 'closed_won'");
    expect(deals).toContain("const LEAD_STAGES = ['new'");
    expect(deals).toContain("deal.stage === 'converted'");
    expect(deals).toContain('lead_id: createLeadId');
  });

  it('links contacts to tenants without permitting cross-company identity links', () => {
    expect(contactIdentityMigration).toContain('ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL');
    expect(contactIdentityMigration).toContain('CREATE INDEX IF NOT EXISTS idx_lead_contacts_tenant_id');
    expect(contactIdentityMigration).toContain('LEAD_CONTACT_TENANT_COMPANY_MISMATCH');
    expect(contactIdentityMigration).toContain("USING ERRCODE = '42501'");
    expect(crmHooks).toContain("throw new Error('Contacts linked to different tenants cannot be merged')");
    expect(crmHooks).toContain('tenant_id: primary.tenant_id || duplicate.tenant_id');
    expect(contacts).toContain('Tenant since');
    expect(contacts).toContain('to={`/tenants/${row.tenant_id}`}');
  });

  it('provisions tenant identity from contacts idempotently', () => {
    expect(provisioningMigration).toContain("source_type IN ('call', 'meeting', 'deal_stage', 'provision_tenant')");
    expect(provisioningMigration).toContain('v_tenant_id := v_contact.tenant_id');
    expect(provisioningMigration).toContain('UPDATE public.lead_contacts SET tenant_id = v_tenant_id');
    expect(provisioningMigration).toContain('IF v_handoff.lease_id IS NOT NULL');
    expect(provisioningMigration).toContain("readiness_notes = 'Contact name, email, and phone are required for tenant provisioning.'");
    expect(provisioningMigration).toContain('RETURN NULL;');
    expect(crmHooks).toContain("if (!data) throw new Error('Tenant provisioning requires a contact name, email, and phone.')");
    expect(deals).not.toContain('Tenant full name');
  });

  it('sources report pipeline stages from leads and exposes pipeline filtering', () => {
    expect(marketplaceHooks).toContain('listing_id, pipeline_kind, stage, status');
    expect(reports).toContain('useCrmLeads(activeCompanyId)');
    expect(reports).toContain('lead.pipeline_kind === pipelineKind');
    expect(reports).toContain('aria-label="Pipeline"');
  });

  it('specializes accounts and validates tenant and property links without widening RLS', () => {
    expect(accountMigration).toContain("CHECK (account_kind IN ('corporate_tenant', 'owner_investor'))");
    expect(accountMigration).toContain('DROP COLUMN IF EXISTS annual_revenue');
    expect(accountMigration).toContain('ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.crm_accounts(id)');
    expect(accountMigration).toContain('ADD COLUMN IF NOT EXISTS owner_account_id uuid REFERENCES public.crm_accounts(id)');
    expect(accountMigration).toContain('TENANT_CRM_ACCOUNT_SCOPE_MISMATCH');
    expect(accountMigration).toContain('PROPERTY_OWNER_ACCOUNT_SCOPE_MISMATCH');
    expect(accountMigration).toContain('Existing table RLS remains authoritative');
    expect(accounts).toContain('aria-label="Account kind"');
    expect(accounts).toContain('linked_tenant_count');
    expect(accounts).toContain('linked_property_count');
  });

  it('keeps CRM workspaces operational during the account schema rollout', () => {
    expect(crmHooks).toContain("currentSchemaResult.error?.code === '42703'");
    expect(crmHooks).toContain(".select('id, company_id, name, phone, website, owner_user_id, account_type, created_at')");
    expect(crmHooks).toContain("account_type: accountKind === 'owner_investor' ? 'Owner / Investor' : 'Corporate Tenant'");
  });

  it('updates preferred channels without requiring the tenant identity migration', () => {
    expect(crmHooks).toContain(".select('id, lead_id, full_name, email, phone_e164, preferred_channel, created_at')");
    expect(contacts).toContain('{ onSuccess: () => setActiveEditId(null) }');
  });

  it('uses a table-first task workspace with focused operational views', () => {
    expect(tasks).toContain("useState<'open' | 'closed' | 'all'>('open')");
    expect(tasks).toContain('<DialogTitle>Create task</DialogTitle>');
    expect(tasks).toContain('action={<Button onClick={() => setCreateOpen(true)}>');
    expect(tasks).not.toContain('title="Create Task"');
  });

  it('persists threshold event rules through the existing automation mutation', () => {
    expect(automation).toContain('CRM_AUTOMATION_EVENT_DEFINITIONS.map');
    expect(automation).toContain('eventType,');
    expect(crmHooks).toContain('event_type: eventType');
    expect(crmHooks).toContain("queryKey: ['marketplace-crm', 'automation-rules', companyId]");
  });

  it('executes tenant provisioning inside the existing automation retry boundary', () => {
    expect(provisionActionMigration).toContain("v_action->>'type' = 'provision_tenant'");
    expect(provisionActionMigration).toContain('public.crm_complete_handoff(');
    expect(provisionActionMigration).toContain('v_error_count := v_error_count + 1');
    expect(provisionActionMigration).toContain('CRM_AUTOMATION_EXECUTOR_ACTION_BOUNDARY_NOT_FOUND');
    expect(automation).toContain('<option value="provision_tenant">provision_tenant</option>');
  });

  it('creates idempotent renewal and collections leads from the existing alert evaluator', () => {
    expect(alertLeadMigration).toContain("'system_alert'");
    expect(alertLeadMigration).toContain("v_pipeline_kind := 'renewal'");
    expect(alertLeadMigration).toContain("v_pipeline_kind := 'collections'");
    expect(alertLeadMigration).toContain("v_event_type := 'lease.expiry_threshold_crossed'");
    expect(alertLeadMigration).toContain("v_event_type := 'payment.overdue_threshold_crossed'");
    expect(alertLeadMigration).toContain('idx_leads_system_alert_source');
    expect(alertLeadMigration).toContain('PERFORM public.crm_run_automation_for_event');
    expect(alertLeadMigration).toContain('AFTER INSERT OR UPDATE OF status ON public.operational_alerts');
    expect(alertLeadMigration).not.toContain('cron.schedule');
  });
});