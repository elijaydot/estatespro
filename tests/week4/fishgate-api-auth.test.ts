import { describe, expect, it } from 'vitest';
import {
  authenticateApiRequest,
  authorizeApiAccess,
  generateApiKey,
  hashApiKey,
  parseBearerKey,
  type ApiAuthClient,
  type ApiKeyRecord,
} from '../../supabase/functions/_shared/api-auth';

const key: ApiKeyRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  company_id: '22222222-2222-4222-8222-222222222222',
  key_prefix: 'fg_live_abcdefgh',
  scopes: ['pm:read'],
  tier: 'full',
  rate_limit_per_min: 60,
};

function clientFor(options: { record?: ApiKeyRecord | null; access?: string; allowed?: boolean } = {}) {
  const record = options.record === undefined ? key : options.record;
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({ maybeSingle: async () => ({ data: record, error: null }) }),
        }),
      }),
    }),
    rpc: async (name: string) => name === 'api_get_access_level'
      ? { data: options.access ?? 'full', error: null }
      : { data: [{ allowed: options.allowed ?? true, remaining: 59, reset_at: new Date(Date.now() + 60_000).toISOString() }], error: null },
  } as unknown as ApiAuthClient;
  return client;
}

describe('FishGate API authentication', () => {
  it('generates a one-time plaintext key and stores only a stable hash/prefix', async () => {
    const generated = await generateApiKey('live');
    expect(generated.plaintext).toMatch(/^fg_live_[A-Za-z0-9_-]{32,}$/);
    expect(generated.prefix).toMatch(/^fg_live_[A-Za-z0-9_-]{8}$/);
    expect(generated.hash).toBe(await hashApiKey(generated.plaintext));
    expect(generated.hash).toHaveLength(64);
  });

  it('accepts only FishGate bearer credentials', async () => {
    const generated = await generateApiKey('test');
    expect(parseBearerKey(new Request('https://example.test', { headers: { authorization: `Bearer ${generated.plaintext}` } }))).toBe(generated.plaintext);
    expect(parseBearerKey(new Request('https://example.test', { headers: { authorization: 'Basic abc' } }))).toBeNull();
  });

  it('caps a full key at the live limited plan entitlement', async () => {
    const generated = await generateApiKey();
    const result = await authenticateApiRequest(
      new Request('https://example.test', { headers: { authorization: `Bearer ${generated.plaintext}` } }),
      clientFor({ access: 'limited' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tier).toBe('limited');
  });

  it('distinguishes missing entitlement, rate limiting, scope, and tier failures', async () => {
    const generated = await generateApiKey();
    const request = new Request('https://example.test', { headers: { authorization: `Bearer ${generated.plaintext}` } });
    expect(await authenticateApiRequest(request, clientFor({ access: 'none' }))).toMatchObject({ status: 403, code: 'api_access_not_entitled' });
    expect(await authenticateApiRequest(request, clientFor({ allowed: false }))).toMatchObject({ status: 429, code: 'rate_limit_exceeded' });

    const valid = await authenticateApiRequest(request, clientFor());
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(authorizeApiAccess(valid, 'crm:read')).toMatchObject({ code: 'scope_denied' });
      expect(authorizeApiAccess({ ...valid, tier: 'limited' }, 'pm:read', 'full')).toMatchObject({ code: 'upgrade_required' });
    }
  });
});