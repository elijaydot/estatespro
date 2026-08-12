import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('platform bulk risk triage UI', () => {
  it('queues selected targets with an idempotency key', () => {
    expect(hooks).toContain("supabase.rpc('platform_queue_bulk_risk_triage_job'");
    expect(hooks).toContain('p_idempotency_key: input.idempotencyKey');
    expect(page).toContain('idempotencyKey: crypto.randomUUID()');
  });

  it('limits selection to supported governance alerts and requires a reason', () => {
    expect(page).toContain("disabled={row.row_type !== 'governance_alert'}");
    expect(page).toContain('riskTriageNotes.trim().length < 10');
    expect(page).toContain('Queue selected ({selectedGovernanceAlertIds.length})');
  });

  it('communicates asynchronous queue acceptance with the durable job id', () => {
    expect(page).toContain("title: 'Bulk triage queued'");
    expect(page).toContain('job ${result.job_id}');
    expect(page).toContain('Processing runs asynchronously.');
  });

  it('polls and displays durable job progress and failures', () => {
    expect(hooks).toContain(".from('platform_bulk_risk_triage_jobs' as never)");
    expect(hooks).toContain('refetchInterval: 10_000');
    expect(page).toContain('Recent Bulk Jobs');
    expect(page).toContain('job.completed_items + job.failed_items');
    expect(page).toContain('job.failed_items} failed');
  });
});