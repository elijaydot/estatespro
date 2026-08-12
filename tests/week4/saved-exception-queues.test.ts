import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811160000_platform_saved_exception_queues.sql'), 'utf8');

describe('saved exception queues', () => {
  it('stores definitions rather than materialized queue items', () => {
    expect(migration).toContain('platform_saved_exception_queues');
    expect(migration).not.toContain('platform_saved_queue_items');
    expect(migration).toContain("queue_type text NOT NULL DEFAULT 'triage_history'");
  });

  it('validates supported indexed filters and bounded visibility', () => {
    expect(migration).toContain("'company_id', 'actor_user_id', 'triage_status', 'time_range'");
    expect(migration).toContain("visibility IN ('private', 'team')");
    expect(migration).toContain("NOT IN ('24h', '7d', '30d', 'all')");
  });

  it('limits reads to owner or team queues and deletes by owner only', () => {
    expect(migration).toContain("owner_user_id = v_actor OR visibility = 'team'");
    expect(migration).toContain('v_queue.owner_user_id <> v_actor');
    expect(migration).toContain('FOR UPDATE');
  });

  it('authorizes risk operators, audits lifecycle changes, and blocks direct table access', () => {
    expect(migration.match(/RISK_OPERATOR_REQUIRED/g)?.length).toBe(2);
    expect(migration).toContain('risk.saved_queue.created');
    expect(migration).toContain('risk.saved_queue.deleted');
    expect(migration).toContain('REVOKE ALL ON TABLE public.platform_saved_exception_queues FROM PUBLIC, authenticated');
  });
});