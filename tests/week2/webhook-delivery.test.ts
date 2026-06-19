import { describe, expect, it } from 'vitest';

import {
  buildWebhookSignature,
  computeWebhookBackoffMs,
  shouldRetryWebhookDelivery,
  verifyWebhookSignature,
} from '../../supabase/functions/_shared/webhook-delivery';

describe('Week 2 - webhook delivery primitives', () => {
  it('retries on transient failures and stops on terminal status', () => {
    expect(shouldRetryWebhookDelivery(null, 1, 5)).toBe(true);
    expect(shouldRetryWebhookDelivery(500, 2, 5)).toBe(true);
    expect(shouldRetryWebhookDelivery(429, 3, 5)).toBe(true);
    expect(shouldRetryWebhookDelivery(400, 1, 5)).toBe(false);
    expect(shouldRetryWebhookDelivery(200, 1, 5)).toBe(false);
  });

  it('caps retries at max attempts', () => {
    expect(shouldRetryWebhookDelivery(500, 5, 5)).toBe(false);
  });

  it('computes exponential backoff with cap', () => {
    expect(computeWebhookBackoffMs(1, 1000, 8000)).toBe(1000);
    expect(computeWebhookBackoffMs(2, 1000, 8000)).toBe(2000);
    expect(computeWebhookBackoffMs(3, 1000, 8000)).toBe(4000);
    expect(computeWebhookBackoffMs(4, 1000, 8000)).toBe(8000);
    expect(computeWebhookBackoffMs(5, 1000, 8000)).toBe(8000);
  });

  it('builds and verifies webhook signature', async () => {
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const payload = JSON.stringify({ event: 'payment.verified', id: 'evt_1' });

    const signature = await buildWebhookSignature({
      secret: 'top-secret',
      payload,
      timestamp,
    });

    const isValid = await verifyWebhookSignature({
      secret: 'top-secret',
      payload,
      timestamp,
      signature,
      toleranceSeconds: 120,
    });

    expect(isValid).toBe(true);
  });

  it('rejects stale or tampered webhook signature', async () => {
    const payload = JSON.stringify({ event: 'payment.failed', id: 'evt_2' });
    const staleTimestamp = `${Math.floor(Date.now() / 1000) - 1000}`;

    const signature = await buildWebhookSignature({
      secret: 'top-secret',
      payload,
      timestamp: staleTimestamp,
    });

    const staleCheck = await verifyWebhookSignature({
      secret: 'top-secret',
      payload,
      timestamp: staleTimestamp,
      signature,
      toleranceSeconds: 120,
    });

    const freshTimestamp = `${Math.floor(Date.now() / 1000)}`;
    const tamperedCheck = await verifyWebhookSignature({
      secret: 'top-secret',
      payload,
      timestamp: freshTimestamp,
      signature: 'bad-signature',
      toleranceSeconds: 120,
    });

    expect(staleCheck).toBe(false);
    expect(tamperedCheck).toBe(false);
  });

  it('marks 5xx as retry-eligible and 4xx as terminal for dead-letter flow', () => {
    const retryEligible = shouldRetryWebhookDelivery(503, 1, 5);
    const terminalFailure = shouldRetryWebhookDelivery(422, 1, 5);

    expect(retryEligible).toBe(true);
    expect(terminalFailure).toBe(false);
  });
});
