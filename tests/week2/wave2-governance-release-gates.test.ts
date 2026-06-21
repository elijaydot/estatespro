import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const coreMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260621030000_wave2_milestone_1_2_3_core.sql');
const automationMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260621042000_wave2_automation_and_handoff_completion.sql');

describe('Wave 2 governance release gates', () => {
  it('enforces role-matrix policies for automation tables', () => {
    const sql = readFileSync(automationMigrationPath, 'utf8');

    expect(sql).toContain('CREATE POLICY "Company managers can manage crm automation rules"');
    expect(sql).toContain('CREATE POLICY "Company managers can manage crm automation runs"');
    expect(sql).toContain("cm.role IN ('property_manager', 'landlord')");
  });

  it('contains cross-surface audit trace correlation for automation runs', () => {
    const sql = readFileSync(automationMigrationPath, 'utf8');

    expect(sql).toContain('correlation_id text');
    expect(sql).toContain('correlation_id');
    expect(sql).toContain('crm_trigger_automation_deal_stage_changed');
    expect(sql).toContain('crm_trigger_automation_meeting_completed');
    expect(sql).toContain('crm_trigger_automation_visit_completed');
  });

  it('retains trust and handoff core policies in milestone migration', () => {
    const sql = readFileSync(coreMigrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_trust_flags');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_deal_handoffs');
    expect(sql).toContain('CREATE POLICY "Company managers can manage crm trust flags"');
    expect(sql).toContain('CREATE POLICY "Company managers can manage crm deal handoffs"');
  });
});
