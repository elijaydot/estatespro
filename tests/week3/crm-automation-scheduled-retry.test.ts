import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260724143000_crm_automation_scheduled_retry_worker.sql',
);

describe('crm automation scheduled retry migration', () => {
  it('adds retry worker functions and cron schedule', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_replay_automation_run_system');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_retry_failed_automation_runs');
    expect(sql).toContain("WHERE status = 'failed'");
    expect(sql).toContain('next_retry_at <= now()');
    expect(sql).toContain('attempts < max_attempts');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_schedule_automation_retry_worker');
    expect(sql).toContain("cron.schedule(");
    expect(sql).toContain("'crm_automation_retry_worker_every_5m'");
    expect(sql).toContain("'*/5 * * * *'");
  });
});
