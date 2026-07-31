import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateRenewalDates } from '../../src/lib/leaseLifecycle';

describe('leasing and tenant lifecycle', () => {
  it('calculates a contiguous twelve-month renewal term', () => {
    expect(calculateRenewalDates('2026-06-30', 12)).toEqual({
      newStartDate: '2026-07-01',
      newEndDate: '2027-07-01',
    });
  });

  it('keeps the exit UI aligned with the guarded workflow sequence', () => {
    const source = readFileSync(resolve('src/pages/TenantExitWorkflow.tsx'), 'utf8');
    const statuses = ['inspection_complete', 'deposit_decided', 'approved', 'completed'];
    let previousIndex = -1;

    for (const status of statuses) {
      const index = source.indexOf(`status: '${status}'`);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('guards both operational state machines in the database', () => {
    const sql = readFileSync(resolve('supabase/migrations/20260730104500_operational_state_machine_guards.sql'), 'utf8');
    expect(sql).toContain("OLD.status = 'submitted' AND NEW.status IN ('in_progress', 'cancelled')");
    expect(sql).toContain("OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled')");
    expect(sql).toContain("OLD.status = 'approved' AND NEW.status IN ('completed', 'cancelled')");
    expect(sql).toContain("ERRCODE = '23514'");
  });
});