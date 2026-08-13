import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apiError, apiSuccess, isUuid, parseApiListQuery } from '../../supabase/functions/_shared/api-contract';

const gateway = readFileSync(resolve(process.cwd(), 'supabase/functions/fishgate-api/index.ts'), 'utf8');

describe('FishGate PM read gateway', () => {
  it('maps all Ticket 4 resources to dedicated RPCs', () => {
    for (const name of ['properties', 'units', 'leases', 'tenants', 'payments', 'invoices']) expect(gateway).toContain(`${name}:`);
    expect(gateway).toContain('"maintenance-requests":');
    for (const rpc of ['api_get_properties', 'api_get_units', 'api_get_leases', 'api_get_tenants', 'api_get_payments', 'api_get_invoices', 'api_get_maintenance_requests']) expect(gateway).toContain(rpc);
  });

  it('uses one success and error envelope', () => {
    expect(apiSuccess([{ id: '1' }], 'request-1', { page: 1 })).toEqual({ data: [{ id: '1' }], meta: { request_id: 'request-1', page: 1 }, error: null });
    expect(apiError('request-2', 'validation_failed', 'Invalid.', 'page')).toEqual({ data: null, meta: { request_id: 'request-2' }, error: { code: 'validation_failed', message: 'Invalid.', field: 'page' } });
  });

  it('validates bounded pagination, sorting, and item identifiers', () => {
    expect(parseApiListQuery(new URL('https://example.test/v1/properties?page=0'))).toMatchObject({ ok: false, field: 'page' });
    expect(parseApiListQuery(new URL('https://example.test/v1/properties?per_page=101'))).toMatchObject({ ok: false, field: 'per_page' });
    expect(parseApiListQuery(new URL('https://example.test/v1/properties?sort=name'), ['name'])).toMatchObject({ ok: true });
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('not-an-id')).toBe(false);
  });

  it('records request telemetry and reports rate-limit headers', () => {
    expect(gateway).toContain('api_record_request');
    expect(gateway).toContain('X-RateLimit-Remaining');
    expect(gateway).toContain('X-Request-Id');
  });

  it('enforces Full-tier write scope and durable idempotency for POST/PATCH', () => {
    for (const rpc of ['api_create_property', 'api_update_property', 'api_create_unit', 'api_update_unit', 'api_create_lease', 'api_update_lease', 'api_create_tenant', 'api_update_tenant', 'api_create_maintenance_request']) expect(gateway).toContain(rpc);
    expect(gateway).toContain('api_begin_idempotency');
    expect(gateway).toContain('api_complete_idempotency');
    expect(gateway).toContain('idempotency_conflict');
    expect(gateway).toContain('isWrite ? writeScope(definition.scope)');
    expect(gateway).toContain('return "pm:write"');
  });

  it('routes Marketplace, CRM, company, subscription, and Full PM reads', () => {
    for (const rpc of ['api_get_marketplace_listings', 'api_get_marketplace_inquiries', 'api_get_marketplace_verification_status', 'api_get_crm_leads', 'api_get_crm_deals', 'api_get_crm_accounts', 'api_get_crm_activity', 'api_get_crm_documents', 'api_get_crm_automation_log', 'api_get_crm_trust_flags', 'api_get_company', 'api_get_subscription', 'api_get_vendors', 'api_get_property_manager_assignments', 'api_get_lease_inventory']) expect(gateway).toContain(rpc);
    expect(gateway).toContain('p_listing_id');
    expect(gateway).toContain('p_lease_id');
    expect(gateway).toContain('return "marketplace:write"');
    expect(gateway).toContain('return "crm:write"');
  });

  it('routes Ticket 8 writes with server-owned inquiry context', () => {
    for (const rpc of ['api_create_marketplace_listing', 'api_update_marketplace_listing', 'api_create_marketplace_inquiry', 'api_create_crm_lead', 'api_update_crm_lead', 'api_create_crm_deal', 'api_update_crm_deal']) expect(gateway).toContain(rpc);
    expect(gateway).toContain('_idempotency_key: idempotencyKey');
    expect(gateway).toContain('_source_ip: clientIp(req)');
    expect(gateway).toContain('quota_exceeded');
    expect(gateway).toContain('resource_not_available');
  });
});