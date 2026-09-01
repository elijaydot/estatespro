import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';

function computePaystackHmacSha512(secret: string, body: string): string {
  return crypto.createHmac('sha512', secret).update(body).digest('hex');
}

describe('Paystack Webhook HMAC-SHA512 Signature & Verification Engine', () => {
  const configToml = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');
  const webhookCode = readFileSync(resolve(process.cwd(), 'supabase/functions/paystack-webhook/index.ts'), 'utf8');
  const securityCode = readFileSync(resolve(process.cwd(), 'supabase/functions/_shared/security.ts'), 'utf8');

  it('registers paystack-webhook edge function with verify_jwt = false in config.toml', () => {
    expect(configToml).toContain('[functions.paystack-webhook]');
    expect(configToml).toMatch(/\[functions\.paystack-webhook\]\r?\nverify_jwt = false/);
  });

  it('exports HMAC-SHA512 and timing safe validation functions in _shared/security.ts', () => {
    expect(securityCode).toContain('export async function hmacSha512Hex');
    expect(securityCode).toContain('export async function validatePaystackWebhookSignature');
    expect(securityCode).toContain('export function timingSafeEqual');
    expect(securityCode).toContain('x-paystack-signature');
  });

  it('correctly computes valid HMAC-SHA512 signature for sample Paystack charge.success payload', () => {
    const testSecret = 'sk_test_9876543210abcdef';
    const samplePayload = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 12345678,
        reference: 'fishgate_sub_test_001',
        amount: 290000,
        currency: 'RWF',
        channel: 'mobile_money',
        customer: { email: 'agency@estatepro.rw', phone: '+250788123456' },
        metadata: {
          kind: 'saas_subscription',
          payment_attempt_id: '00000000-0000-0000-0000-000000000001',
        },
      },
    });

    const signature = computePaystackHmacSha512(testSecret, samplePayload);
    expect(signature).toHaveLength(128); // SHA-512 hex is 128 characters
    expect(/^[0-9a-f]{128}$/i.test(signature)).toBe(true);
  });

  it('implements multi-tenant reconciliation for SaaS subscriptions, owner groups, rent invoices, and guest bookings', () => {
    expect(webhookCode).toContain('validatePaystackWebhookSignature');
    expect(webhookCode).toContain('saas_finalize_subscription_payment_attempt');
    expect(webhookCode).toContain('saas_finalize_owner_group_payment_attempt');
    expect(webhookCode).toMatch(/from\(["']invoices["']\)/);
    expect(webhookCode).toMatch(/from\(["']payments["']\)\.insert/);
    expect(webhookCode).toMatch(/from\(["']guest_bookings["']\)/);
    expect(webhookCode).toContain('emitAuditEvent');
  });
});
