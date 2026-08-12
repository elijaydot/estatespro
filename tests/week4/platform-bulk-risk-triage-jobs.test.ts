import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811190000_platform_bulk_risk_triage_jobs.sql'), 'utf8');

describe('platform bulk risk triage jobs', () => {
  it('queues bounded idempotent jobs with normalized item rows', () => {
    expect(migration).toContain('UNIQUE (actor_user_id, idempotency_key)');
    expect(migration).toContain('UNIQUE (job_id, row_id)');
    expect(migration).toContain('BETWEEN 1 AND 500');
    expect(migration).toContain('IDEMPOTENCY_KEY_REUSED');
    expect(migration).toContain('EXCEPT SELECT item.row_id');
  });

  it('claims bounded work safely and records item outcomes', () => {
    expect(migration.match(/FOR UPDATE SKIP LOCKED/g)).toHaveLength(2);
    expect(migration).toContain("SET status = 'completed', error_message = NULL");
    expect(migration).toContain("SET status = 'failed', error_message = left(SQLERRM, 2000)");
    expect(migration).toContain("WHEN v_job.completed_items = 0 THEN 'failed' ELSE 'partial_error'");
  });

  it('reuses audited single-item triage while preserving the requesting actor', () => {
    expect(migration).toContain("set_config('request.jwt.claim.sub', v_job.actor_user_id::text, true)");
    expect(migration).toContain("set_config('request.jwt.claim.role', 'authenticated', true)");
    expect(migration).toContain('public.platform_triage_risk_queue_item(');
    expect(migration).toContain("'bulk_job_id', v_job.id");
  });

  it('runs from a service-only one-minute worker', () => {
    expect(migration).toContain("platform_bulk_risk_triage_every_minute', '* * * * *'");
    expect(migration).toContain('TO service_role');
    expect(migration).toContain('SELECT public.platform_schedule_bulk_risk_triage_worker();');
  });
});