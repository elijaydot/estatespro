import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260724150000_crm_lead_scoring_engine_and_triggers.sql',
);

describe('crm lead scoring engine migration', () => {
  it('defines scoring function, recompute triggers, and backfill update', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_compute_lead_score');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_refresh_lead_score');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_recompute_lead_score_on_activity');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crm_recompute_lead_score_on_lead_update');
    expect(sql).toContain('AFTER INSERT OR UPDATE OR DELETE ON public.lead_activities');
    expect(sql).toContain('AFTER INSERT OR UPDATE OR DELETE ON public.lead_contacts');
    expect(sql).toContain('AFTER UPDATE OF stage, priority, source, listing_id, status, last_activity_at ON public.leads');
    expect(sql).toContain('UPDATE public.leads');
    expect(sql).toContain('SET score = public.crm_compute_lead_score(id)');
    expect(sql).toContain('RETURN greatest(0, least(100, v_score));');
  });
});
