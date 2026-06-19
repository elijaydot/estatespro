import { describe, expect, it } from 'vitest';

import { buildWebhookEventEnvelope } from '../../supabase/functions/_shared/webhook-events';

describe('Week 2 - webhook event envelope', () => {
  it('builds v1 envelope with required metadata and payload', () => {
    const envelope = buildWebhookEventEnvelope({
      eventType: 'payment.verified',
      payload: { invoiceId: 'inv_1', amount: 500 },
      correlationId: 'corr_1',
      actorUserId: 'user_1',
      companyId: 'company_1',
      eventId: 'evt_1',
      emittedAt: '2026-06-18T12:00:00.000Z',
    });

    expect(envelope.version).toBe('v1.0');
    expect(envelope.event_id).toBe('evt_1');
    expect(envelope.event_type).toBe('payment.verified');
    expect(envelope.correlation_id).toBe('corr_1');
    expect(envelope.actor_user_id).toBe('user_1');
    expect(envelope.company_id).toBe('company_1');
    expect(envelope.payload).toEqual({ invoiceId: 'inv_1', amount: 500 });
  });

  it('generates defaults for event_id and emitted_at', () => {
    const envelope = buildWebhookEventEnvelope({
      eventType: 'invite.accepted',
      payload: { inviteId: 'inv_2' },
    });

    expect(envelope.event_id).toBeTruthy();
    expect(envelope.emitted_at).toBeTruthy();
  });
});
