import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const aiRoutes = [
  'ai-chat',
  'ai-document-intelligence',
  'ai-financial-insights',
  'ai-generate-description',
  'ai-maintenance-triage',
  'ai-predictive-analytics',
  'ai-smart-search',
  'ai-suggest-reply',
  'ai-tenant-chatbot',
];

describe('AI edge-function contracts', () => {
  it.each(aiRoutes)('%s authenticates and rate-limits before invoking the provider', (route) => {
    const source = readFileSync(resolve(`supabase/functions/${route}/index.ts`), 'utf8');
    const limiterAt = source.indexOf('checkRateLimit(req');
    const authAt = Math.max(source.indexOf('getClaims('), source.indexOf('auth.getUser('));
    const providerAt = source.indexOf('ai.gateway.lovable.dev');

    expect(source).toContain('await req.json');
    expect(source).toContain('Unauthorized');
    expect(source).toContain('Rate limit exceeded');
    expect(source).toContain('return jsonResponse(req');
    expect(limiterAt).toBeGreaterThan(-1);
    expect(authAt).toBeGreaterThan(limiterAt);
    expect(providerAt).toBeGreaterThan(authAt);
  });
});