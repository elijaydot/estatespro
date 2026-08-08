import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const paymentSettings = readFileSync(resolve('src/components/settings/PaymentSettings.tsx'), 'utf8');
const verifyPayment = readFileSync(resolve('supabase/functions/verify-payment/index.ts'), 'utf8');

describe('payment gateway settings', () => {
  it('accepts only Paystack public keys in browser-visible settings', () => {
    expect(paymentSettings).toContain("/^pk_(test|live)_/");
    expect(paymentSettings).toContain('Secret keys belong in Supabase Function Secrets.');
    expect(paymentSettings).toContain("settings.paystack_public_key?.startsWith('pk_')");
    expect(paymentSettings).toContain('PAYSTACK_SECRET_KEY in Supabase Function Secrets');
  });

  it('surfaces the Edge Function error envelope to the operator', () => {
    expect(paymentSettings).toContain('async function gatewayErrorMessage');
    expect(paymentSettings).toContain("'context' in error && error.context instanceof Response");
    expect(paymentSettings).toContain("toast({ title: 'Gateway verification failed', description: message");
  });

  it('returns from credential test mode before normal payment processing', () => {
    const testModeStart = verifyPayment.indexOf('if (payload.test_mode)');
    const testModeReturn = verifyPayment.indexOf('message: `${payload.gateway} credentials verified`', testModeStart);
    const normalFlowStart = verifyPayment.indexOf('const gateway = payload.gateway;', testModeStart);

    expect(testModeStart).toBeGreaterThan(-1);
    expect(testModeReturn).toBeGreaterThan(testModeStart);
    expect(normalFlowStart).toBeGreaterThan(testModeReturn);
    expect(verifyPayment.slice(testModeStart, normalFlowStart)).not.toContain('dispatchPaymentVerifiedWebhooks');
  });
});
