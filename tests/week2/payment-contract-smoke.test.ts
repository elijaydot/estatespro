import { describe, expect, it } from 'vitest';

import { parseCheckoutPayload, parseVerifyPayload } from '../../supabase/functions/_shared/payment-contract';

describe('Week 2 - payment contract smoke checks', () => {
  it('rejects checkout payload with unknown source', () => {
    const parsed = parseCheckoutPayload({
      source: 'other',
      amount: 100,
      paymentMethod: 'card',
      currency: 'NGN',
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.code).toBe('validation_failed');
      expect(parsed.error.status).toBe(400);
    }
  });

  it('applies checkout defaults for optional fields', () => {
    const parsed = parseCheckoutPayload({
      source: 'tenant_invoice',
      amount: 500,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.paymentMethod).toBe('link');
      expect(parsed.value.currency).toBe('NGN');
      expect(parsed.value.gateway).toBeNull();
    }
  });

  it('rejects verify payload without reference in non-test mode', () => {
    const parsed = parseVerifyPayload({
      gateway: 'paystack',
      invoiceId: 'inv_1',
      test_mode: false,
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.code).toBe('validation_failed');
      expect(parsed.error.message).toContain('reference is required');
    }
  });

  it('allows verify payload in test mode without reference', () => {
    const parsed = parseVerifyPayload({
      gateway: 'flutterwave',
      test_mode: true,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.reference).toBe('');
      expect(parsed.value.test_mode).toBe(true);
    }
  });

  it('rejects verify payload missing bookingToken and invoiceId in non-test mode', () => {
    const parsed = parseVerifyPayload({
      gateway: 'paystack',
      reference: 'abc-123',
      test_mode: false,
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.code).toBe('validation_failed');
      expect(parsed.error.message).toContain('Either bookingToken or invoiceId is required');
    }
  });
});
