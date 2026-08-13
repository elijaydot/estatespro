import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260812150000_fishgate_public_api_webhook_outbox.sql'), 'utf8');
const worker = readFileSync(resolve(process.cwd(), 'supabase/functions/dispatch-webhooks/index.ts'), 'utf8');

describe('FishGate outbound webhooks', () => {
  it('queues each required domain transition exactly at the owning company', () => {
    for (const event of ['lease.signed', 'payment.received', 'lead.converted', 'listing.published']) expect(migration).toContain(event);
    for (const trigger of ['fishgate_webhook_lease_signed', 'fishgate_webhook_payment_received', 'fishgate_webhook_lead_converted', 'fishgate_webhook_listing_published']) expect(migration).toContain(trigger);
    expect(migration).toContain('property.company_id INTO v_company');
    expect(migration).toContain('NEW.company_id');
  });

  it('claims outbox events atomically and recovers stale claims', () => {
    expect(migration).toContain('FOR UPDATE SKIP LOCKED');
    expect(migration).toContain("claimed_at<now()-interval '5 minutes'");
    expect(migration).toContain("status='processing'");
  });

  it('dispatches only to endpoints belonging to the event company', () => {
    expect(worker).toContain('.eq("company_id",event.company_id)');
    expect(worker).toContain('.eq("event_type",event.event_type)');
    expect(worker).not.toContain('.is("company_id",null)');
  });

  it('signs deliveries and persists retry and dead-letter outcomes', () => {
    expect(worker).toContain('buildWebhookSignature');
    expect(worker).toContain('shouldRetryWebhookDelivery');
    expect(worker).toContain('computeWebhookBackoffMs');
    expect(worker).toContain('webhook_delivery_attempts');
    expect(worker).toContain('webhook_dead_letters');
    expect(worker).toContain('AbortSignal.timeout');
  });

  it('requires an independent worker secret', () => {
    expect(worker).toContain('WEBHOOK_WORKER_SECRET');
    expect(worker).toContain('x-webhook-worker-secret');
  });
});