import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260724134500_crm_automation_action_vocabulary_expansion.sql',
);

describe('crm automation action vocabulary expansion migration', () => {
  it('supports new action handlers with failure isolation', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain("v_action->>'type' = 'send_notification'");
    expect(sql).toContain("v_action->>'type' = 'send_message'");
    expect(sql).toContain("v_action->>'type' = 'update_lead_stage'");
    expect(sql).toContain("v_action->>'type' = 'reassign_lead'");
    expect(sql).toContain('EXCEPTION WHEN OTHERS THEN');
    expect(sql).toContain('v_error_count := v_error_count + 1;');
  });
});
