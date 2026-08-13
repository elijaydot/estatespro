import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260812130000_fishgate_api_marketplace_crm_read_rpcs.sql'), 'utf8');

describe('FishGate Marketplace and CRM read RPCs', () => {
  it('hard-walls dynamic reads to a fixed resource allow-list', () => {
    expect(migration).toContain("ELSE RAISE EXCEPTION 'API_RESOURCE_NOT_ALLOWED'");
    for (const resource of ['marketplace_listings', 'marketplace_inquiries', 'crm_leads', 'crm_accounts', 'crm_documents', 'crm_trust_flags', 'vendors', 'property_manager_assignments']) expect(migration).toContain(`WHEN '${resource}'`);
  });

  it('derives company, scope, and tier from the key for every path', () => {
    expect(migration).toContain('api_authorized_company_id(p_api_key_id, v_scope, v_tier)');
    expect(migration).toContain("v_tier := 'full'");
    expect(migration).toContain("v_scope := 'marketplace:read'");
    expect(migration).toContain("v_scope := 'crm:read'");
  });

  it('strips internal metadata, actor, storage, and ownership fields', () => {
    for (const field of ['company_id', 'created_by', 'source_ip', 'metadata', 'storage_path', 'payload_json', 'result_json']) expect(migration).toContain(`'${field}'`);
  });

  it('provides custom tenant-safe aggregate endpoints', () => {
    for (const rpc of ['api_get_crm_activity', 'api_get_crm_automation_log', 'api_get_marketplace_verification_status', 'api_get_company', 'api_get_subscription', 'api_get_lease_inventory']) expect(migration).toContain(`FUNCTION public.${rpc}`);
    expect(migration).toContain('property.company_id=v_company');
  });

  it('reads the authoritative lead stage for CRM deals after the stage cutover', () => {
    expect(migration).toContain('FROM public.crm_deals deal JOIN public.leads lead');
    expect(migration).toContain('lead.stage=p_status');
    expect(migration).not.toContain("v_table := 'crm_deals'");
  });
});