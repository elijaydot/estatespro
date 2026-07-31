import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('maintenance AI triage behavior', () => {
  it('keeps AI priority suggestions advisory until the parent form is submitted', () => {
    const source = readFileSync(resolve('src/components/ai/MaintenanceTriageBadge.tsx'), 'utf8');

    expect(source).toContain('Advisory only: the parent updates form state');
    expect(source).toContain('onPrioritySelect(result.triage.suggested_priority)');
    expect(source).not.toContain('.from(\'maintenance_requests\')');
  });
});

describe('scheduled-message invocation boundary', () => {
  it('fails closed unless the internal scheduler supplies the configured secret', () => {
    const source = readFileSync(resolve('supabase/functions/process-scheduled-messages/index.ts'), 'utf8');
    const authorizationCheck = source.indexOf('if (!cronSecret || incomingSecret !== cronSecret)');
    const serviceClient = source.indexOf("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");

    expect(source).toContain("req.headers.get('x-messages-cron-secret')");
    expect(source).toContain("JSON.stringify({ error: 'Unauthorized' })");
    expect(authorizationCheck).toBeGreaterThan(-1);
    expect(serviceClient).toBeGreaterThan(authorizationCheck);
  });
});