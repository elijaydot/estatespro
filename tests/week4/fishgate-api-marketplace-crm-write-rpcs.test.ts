import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260812140000_fishgate_api_marketplace_crm_write_rpcs.sql'), 'utf8');

describe('FishGate Marketplace and CRM write RPCs', () => {
  it('derives the company and requires Full write scopes', () => {
    expect(sql.match(/api_authorized_company_id\(p_api_key_id,'marketplace:write','full'\)/g)).toHaveLength(3);
    expect(sql.match(/api_authorized_company_id\(p_api_key_id,'crm:write','full'\)/g)).toHaveLength(4);
    expect(sql).not.toMatch(/p_company_id|p_user_id/);
  });

  it('keeps listing lifecycle fields server-controlled', () => {
    expect(sql).toContain("'draft','unverified',v_actor");
    expect(sql).not.toContain('UPDATE public.marketplace_listings listing SET\n    status=');
    expect(sql).not.toContain('UPDATE public.marketplace_listings listing SET\n    verification_state=');
    expect(sql).not.toContain('UPDATE public.marketplace_listings listing SET\n    slug=');
  });

  it('wraps inquiry creation and validates all cross-resource parents', () => {
    expect(sql).toContain('public.create_marketplace_inquiry');
    expect(sql).toContain("p_api_key_id::text||':'||(p_payload->>'_idempotency_key')");
    expect(sql.match(/API_PARENT_NOT_FOUND/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('uses the authoritative lead stage and never references a deal stage column', () => {
    expect(sql).toContain('public.crm_update_deal_and_lead_stage');
    expect(sql).toContain('SELECT stage INTO v_stage FROM public.leads');
    expect(sql).not.toMatch(/crm_deals[^;]*\bstage\b/i);
  });

  it('exposes no delete RPC and restricts every function to service role', () => {
    expect(sql).not.toMatch(/api_delete_/);
    expect(sql).toContain('REVOKE ALL ON FUNCTION');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION %s TO service_role');
  });
});