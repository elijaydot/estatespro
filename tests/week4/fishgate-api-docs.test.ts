import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const spec = JSON.parse(readFileSync(resolve(process.cwd(), 'public/openapi.json'), 'utf8'));
const page = readFileSync(resolve(process.cwd(), 'src/pages/ApiDocs.tsx'), 'utf8');
const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

describe('FishGate API documentation', () => {
  it('publishes a valid OpenAPI 3.1 document for every implemented route', () => {
    expect(spec.openapi).toBe('3.1.0');
    for (const path of ['/v1/properties', '/v1/units', '/v1/leases', '/v1/tenants', '/v1/payments', '/v1/invoices', '/v1/maintenance-requests', '/v1/vendors', '/v1/property-manager-assignments', '/v1/marketplace/listings', '/v1/marketplace/inquiries', '/v1/crm/leads', '/v1/crm/deals', '/v1/crm/accounts', '/v1/crm/activity', '/v1/crm/documents', '/v1/crm/automation-log', '/v1/crm/trust-flags', '/v1/company', '/v1/subscription']) expect(spec.paths[path]?.get).toBeTruthy();
    for (const path of ['/v1/properties', '/v1/units', '/v1/leases', '/v1/tenants', '/v1/maintenance-requests', '/v1/marketplace/listings', '/v1/marketplace/inquiries', '/v1/crm/leads', '/v1/crm/deals']) expect(spec.paths[path]?.post).toBeTruthy();
    for (const path of ['/v1/properties/{id}', '/v1/units/{id}', '/v1/leases/{id}', '/v1/tenants/{id}', '/v1/marketplace/listings/{id}', '/v1/crm/leads/{id}', '/v1/crm/deals/{id}']) expect(spec.paths[path]?.patch).toBeTruthy();
    for (const event of ['lease.signed', 'payment.received', 'lead.converted', 'listing.published']) expect(spec.webhooks[event]?.post).toBeTruthy();
  });

  it('documents auth, tier/rate requirements, errors, and code samples', () => {
    expect(spec.components.securitySchemes.bearerAuth).toBeTruthy();
    const operations = Object.values(spec.paths).flatMap((path) => Object.values(path as Record<string, unknown>)) as Array<Record<string, unknown>>;
    for (const operation of operations) {
      expect(operation.description).toContain('Requires');
      expect(operation['x-codeSamples']).toHaveLength(2);
    }
    expect(Object.keys(spec.components.responses)).toEqual(expect.arrayContaining(['BadRequest', 'Unauthorized', 'Forbidden', 'NotFound', 'Conflict', 'RateLimited', 'InternalError']));
  });

  it('serves public Swagger UI with all narrative guides', () => {
    expect(app).toContain('path="/api/docs"');
    expect(page).toContain('url="/openapi.json"');
    for (const guide of ['Getting started', 'Authentication', 'Rate limits and tiers', 'Pagination, filtering, and sorting', 'Errors', 'Webhooks', 'Changelog']) expect(page).toContain(guide);
  });
});