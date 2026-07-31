import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '../../supabase/functions/_shared/security';

const mfaRoutes = [
  ['mfa-setup', 10],
  ['mfa-enable', 10],
  ['mfa-verify', 5],
  ['mfa-disable', 10],
  ['mfa-regenerate-codes', 5],
] as const;

describe('MFA edge-function rate limiting', () => {
  it.each(mfaRoutes)('wires %s to the shared limiter with limit %i', (route, limit) => {
    const source = readFileSync(resolve(`supabase/functions/${route}/index.ts`), 'utf8');
    const preflightAt = source.indexOf('req.method === "OPTIONS"');
    const limiterAt = source.indexOf('checkRateLimit(req');
    const authAt = source.indexOf('getUser(req)', limiterAt);

    expect(source).toContain('from "../_shared/security.ts"');
    expect(source).toContain(`keyPrefix: "${route}", limit: ${limit}, windowMs: 60_000`);
    expect(source).toContain('status: 429');
    expect(source).toContain('{ error: "Rate limit exceeded" }');
    expect(limiterAt).toBeGreaterThan(preflightAt);
    expect(authAt).toBeGreaterThan(limiterAt);
  });

  it('rejects the sixth rapid mfa-verify request', () => {
    const request = new Request('https://example.test/functions/v1/mfa-verify', {
      method: 'POST',
      headers: { 'x-forwarded-for': `mfa-verify-test-${Date.now()}` },
    });
    const config = { keyPrefix: 'mfa-verify', limit: 5, windowMs: 60_000 };

    for (let requestNumber = 1; requestNumber <= 5; requestNumber += 1) {
      expect(checkRateLimit(request, config)).toMatchObject({ allowed: true });
    }

    expect(checkRateLimit(request, config)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });
});