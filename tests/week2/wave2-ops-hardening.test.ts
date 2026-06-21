import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const opsMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260621160000_wave2_documents_lifecycle_and_automation_replay.sql',
);

describe('Wave 2 operations hardening migration', () => {
  it('adds governed document lifecycle fields and constraints', () => {
    const sql = readFileSync(opsMigrationPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT \'draft\'');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS compliance_state text NOT NULL DEFAULT \'pending\'');
    expect(sql).toContain('crm_documents_status_check');
    expect(sql).toContain('crm_documents_compliance_state_check');
    expect(sql).toContain('update_crm_documents_updated_at');
  });

  it('adds manual automation replay function with audit trace', () => {
    const sql = readFileSync(opsMigrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_replay_automation_run');
    expect(sql).toContain('INSUFFICIENT_PERMISSIONS_TO_REPLAY_AUTOMATION_RUN');
    expect(sql).toContain('crm.automation.manual_replay');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.crm_replay_automation_run(uuid) TO authenticated;');
  });
});
