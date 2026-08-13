import { writeFileSync } from 'node:fs';

const server = 'https://zuwpvevqijwkkucmpkkr.supabase.co/functions/v1/fishgate-api';
const uuid = '11111111-1111-4111-8111-111111111111';
const tags = {
  Properties: 'Property portfolio records.', Units: 'Property unit records.', Leases: 'Lease records and inventory.', Tenants: 'Tenant records.',
  Financials: 'Read-only invoices and payments.', Maintenance: 'Maintenance operations.', Operations: 'Vendors and property manager assignments.',
  Marketplace: 'Marketplace listings, inquiries, and verification.', CRM: 'Leads, deals, activity, documents, automation, and trust.', Company: 'Company and subscription context.', Webhooks: 'Signed outbound company event notifications.',
};

const collections = [
  ['properties', 'Properties', 'properties', 'pm', true, true], ['units', 'Units', 'units', 'pm', true, true],
  ['leases', 'Leases', 'leases', 'pm', true, true], ['tenants', 'Tenants', 'tenants', 'pm', true, true],
  ['payments', 'Financials', 'payments', 'pm'], ['invoices', 'Financials', 'invoices', 'pm'],
  ['maintenance-requests', 'Maintenance', 'maintenance requests', 'pm', false, true],
  ['vendors', 'Operations', 'vendors', 'pm'], ['property-manager-assignments', 'Operations', 'property manager assignments', 'pm'],
  ['marketplace/listings', 'Marketplace', 'marketplace listings', 'marketplace', true, true],
  ['marketplace/inquiries', 'Marketplace', 'marketplace inquiries', 'marketplace', false, true],
  ['crm/leads', 'CRM', 'CRM leads', 'crm', true, true], ['crm/deals', 'CRM', 'CRM deals', 'crm', true, true],
  ['crm/accounts', 'CRM', 'CRM accounts', 'crm'], ['crm/activity', 'CRM', 'CRM activity', 'crm'],
  ['crm/documents', 'CRM', 'CRM documents', 'crm'], ['crm/automation-log', 'CRM', 'CRM automation log', 'crm'],
  ['crm/trust-flags', 'CRM', 'CRM trust flags', 'crm'],
];

const exampleFor = (tag, singular = false) => {
  const common = { id: uuid, created_at: '2026-08-12T09:30:00Z' };
  const value = tag === 'Properties' ? { ...common, name: 'Harbour View Apartments', address: '12 Independence Avenue', city: 'Accra', country: 'Ghana' }
    : tag === 'Marketplace' ? { ...common, title: 'Two-bedroom apartment in Osu', city: 'Accra', rent_amount: 4500, currency: 'GHS', status: 'draft' }
    : tag === 'CRM' ? { ...common, deal_name: 'Harbour View lease', stage: 'qualified', status: 'open' }
    : { ...common, status: 'active' };
  return singular ? value : [value];
};

const errorResponses = {
  400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' },
  409: { $ref: '#/components/responses/Conflict' }, 429: { $ref: '#/components/responses/RateLimited' }, 500: { $ref: '#/components/responses/InternalError' },
};
const samples = (method, path, body = false) => {
  const url = path.replace('{id}', uuid).replace('{listing_id}', uuid);
  const curlBody = body ? ` -H "Idempotency-Key: docs-${uuid}" -H "Content-Type: application/json" -d '{"name":"Example"}'` : '';
  const fetchBody = body ? `, headers: { Authorization: \`Bearer \${apiKey}\`, 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Example' })` : `, headers: { Authorization: \`Bearer \${apiKey}\` }`;
  return [{ lang: 'curl', source: `curl -X ${method.toUpperCase()} "$BASE_URL${url}" -H "Authorization: Bearer $FISHGATE_API_KEY"${curlBody}` },
    { lang: 'JavaScript', source: `const response = await fetch(\`${'${baseUrl}'}${url}\`, { method: '${method.toUpperCase()}'${fetchBody} });\nconst result = await response.json();` }];
};
const success = (description, tag, list) => ({ description, content: { 'application/json': { schema: { $ref: list ? '#/components/schemas/ListEnvelope' : '#/components/schemas/ItemEnvelope' }, example: { data: exampleFor(tag, !list), meta: { request_id: uuid, ...(list ? { page: 1, per_page: 20, total: 1, has_more: false } : {}) }, error: null } } } });
const singularize = (label) => label.endsWith('ies') ? `${label.slice(0, -3)}y` : label.replace(/s$/, '');
const operation = (method, path, tag, label, scope, list = false) => {
  const write = method !== 'get';
  const operationId = `${method}${label.replace(/[^a-zA-Z0-9]/g, ' ').replace(/(?:^|\s)(\w)/g, (_, letter) => letter.toUpperCase()).replace(/\s/g, '')}`;
  const parameters = list ? [{ $ref: '#/components/parameters/Page' }, { $ref: '#/components/parameters/PerPage' }, { $ref: '#/components/parameters/Status' }, { $ref: '#/components/parameters/Sort' }]
    : path.includes('{') ? [{ $ref: path.includes('{listing_id}') ? '#/components/parameters/ListingId' : '#/components/parameters/Id' }] : [];
  if (write) parameters.push({ $ref: '#/components/parameters/IdempotencyKey' });
  return {
    operationId, tags: [tag], summary: `${write ? (method === 'post' ? 'Create' : 'Update') : list ? 'List' : 'Get'} ${label}`,
    description: `Requires ${write || ['Operations', 'Company'].includes(tag) || label.includes('inquiries') || label.includes('deals') ? 'Full' : 'Limited'} tier and \`${scope}:${write ? 'write' : 'read'}\` scope. Rate limits are enforced per API key per minute.`,
    parameters,
    ...(write ? { requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WriteInput' }, example: tag === 'Marketplace' ? { title: 'Two-bedroom apartment in Osu', city: 'Accra', rent_amount: 4500, currency: 'GHS' } : tag === 'CRM' ? { deal_name: 'Harbour View lease', lead_id: uuid, stage: 'qualified' } : { name: 'Example' } } } } } : {}),
    responses: { [method === 'post' ? 201 : 200]: success(`${write ? 'The persisted' : list ? 'A bounded page of' : 'The requested'} ${label}.`, tag, list), ...errorResponses },
    'x-codeSamples': samples(method, path, write),
  };
};

const paths = {};
for (const [route, tag, label, scope, hasItem = false, writable = false] of collections) {
  const path = `/v1/${route}`;
  const singularLabel = singularize(label);
  paths[path] = { get: operation('get', path, tag, label, scope, true), ...(writable ? { post: operation('post', path, tag, singularLabel, scope) } : {}) };
  if (hasItem) paths[`${path}/{id}`] = { get: operation('get', `${path}/{id}`, tag, singularLabel, scope), ...(writable ? { patch: operation('patch', `${path}/{id}`, tag, singularLabel, scope) } : {}) };
}

const singles = [
  ['/v1/leases/{id}/inventory', 'Leases', 'lease inventory', 'pm'],
  ['/v1/marketplace/verification-status/{listing_id}', 'Marketplace', 'marketplace verification status', 'marketplace'],
  ['/v1/company', 'Company', 'company', 'pm'], ['/v1/subscription', 'Company', 'subscription', 'pm'],
];
for (const [path, tag, label, scope] of singles) paths[path] = { get: operation('get', path, tag, label, scope) };

const errorSchema = { type: 'object', required: ['data', 'meta', 'error'], properties: { data: { type: 'null' }, meta: { $ref: '#/components/schemas/Meta' }, error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, field: { type: 'string' } } } } };
const errorResponse = (description, code) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' }, example: { data: null, meta: { request_id: uuid }, error: { code, message: description } } } } });
const spec = {
  openapi: '3.1.0', info: { title: 'FishGate Public API', version: '1.0.0', description: 'Company-scoped Property Management, Marketplace, and CRM API. API keys are disclosed once; breaking deprecations receive at least 90 days notice.', license: { name: 'Proprietary', identifier: 'LicenseRef-Proprietary' } },
  servers: [{ url: server, description: 'Supabase production gateway' }], security: [{ bearerAuth: [] }],
  tags: Object.entries(tags).map(([name, description]) => ({ name, description })), paths,
  webhooks: Object.fromEntries(['lease.signed','payment.received','lead.converted','listing.published'].map((eventType) => [eventType, { post: {
    operationId: `receive${eventType.split('.').map((part) => part[0].toUpperCase()+part.slice(1)).join('')}`,
    tags: ['Webhooks'], summary: `Receive ${eventType}`, description: 'FishGate signs the raw request body with HMAC-SHA256. Return any 2xx response within the configured timeout; 408, 429, 5xx, and network failures are retried with exponential backoff.',
    parameters: [{ name: 'x-webhook-signature', in: 'header', required: true, schema: { type: 'string' } }, { name: 'x-webhook-timestamp', in: 'header', required: true, schema: { type: 'string' } }, { name: 'x-webhook-event', in: 'header', required: true, schema: { type: 'string', const: eventType } }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookEvent' } } } },
    responses: { 200: { description: 'The receiver accepted the event.' } },
  } } ])),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'FishGate API key', description: 'A key beginning with fg_live_ or fg_test_.' } },
    parameters: {
      Id: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, example: uuid },
      ListingId: { name: 'listing_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, example: uuid },
      Page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }, PerPage: { name: 'per_page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      Status: { name: 'filter[status]', in: 'query', schema: { type: 'string' } }, Sort: { name: 'sort', in: 'query', schema: { type: 'string', default: '-created_at' } },
      IdempotencyKey: { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 255 }, example: `request-${uuid}` },
    },
    responses: {
      BadRequest: errorResponse('The request contains invalid values.', 'validation_failed'), Unauthorized: errorResponse('The bearer API key is missing, invalid, or revoked.', 'invalid_api_key'),
      Forbidden: errorResponse('The API key lacks the required scope or tier.', 'scope_denied'), NotFound: errorResponse('The resource was not found in the authenticated company.', 'not_found'),
      Conflict: errorResponse('The request conflicts with resource state, uniqueness, idempotency, or plan quota.', 'conflict'), RateLimited: { ...errorResponse('The per-key minute limit was exceeded.', 'rate_limit_exceeded'), headers: { 'Retry-After': { schema: { type: 'integer' } } } },
      InternalError: errorResponse('The request could not be completed. Provide meta.request_id to support.', 'internal_error'),
    },
    schemas: {
      Meta: { type: 'object', required: ['request_id'], properties: { request_id: { type: 'string', format: 'uuid' }, page: { type: 'integer' }, per_page: { type: 'integer' }, total: { type: 'integer' }, has_more: { type: 'boolean' } } },
      Resource: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' }, stage: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } }, additionalProperties: true },
      WriteInput: { type: 'object', minProperties: 1, additionalProperties: true },
      WebhookEvent: { type: 'object', required: ['version','event_id','event_type','emitted_at','company_id','payload'], properties: { version: { type: 'string', const: 'v1.0' }, event_id: { type: 'string' }, event_type: { type: 'string', enum: ['lease.signed','payment.received','lead.converted','listing.published'] }, emitted_at: { type: 'string', format: 'date-time' }, correlation_id: { type: 'string' }, company_id: { type: 'string', format: 'uuid' }, payload: { type: 'object', additionalProperties: true } } },
      ErrorEnvelope: errorSchema,
      ListEnvelope: { type: 'object', required: ['data', 'meta', 'error'], properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Resource' } }, meta: { $ref: '#/components/schemas/Meta' }, error: { type: 'null' } } },
      ItemEnvelope: { type: 'object', required: ['data', 'meta', 'error'], properties: { data: { $ref: '#/components/schemas/Resource' }, meta: { $ref: '#/components/schemas/Meta' }, error: { type: 'null' } } },
    },
  },
};

writeFileSync(new URL('../public/openapi.json', import.meta.url), `${JSON.stringify(spec, null, 2)}\n`);