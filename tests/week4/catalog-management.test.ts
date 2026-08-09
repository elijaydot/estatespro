import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260809100000_unified_saas_catalog_management.sql');
const reminderWorker = read('supabase/functions/check-trial-expirations/index.ts');
const emailFunction = read('supabase/functions/send-trial-expiry-notice/index.ts');
const catalogPage = read('src/pages/CatalogManagement.tsx');
const upgradePage = read('src/pages/Upgrade.tsx');

describe('unified SaaS catalog', () => {
  it('seeds only the approved unified paid ladder at approved USD prices', () => {
    expect(migration).toContain("('fishgate_starter', 900)");
    expect(migration).toContain("('fishgate_growth', 2900)");
    expect(migration).toContain("('fishgate_professional', 6900)");
    expect(migration).toContain("('fishgate_enterprise', 14900)");
    expect(migration).not.toContain("(NULL, 'fishgate_free'");
  });

  it('uses an explicit unlimited flag in preflight and authoritative recording', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS is_unlimited boolean NOT NULL DEFAULT false');
    expect(migration).toContain("'allowed', v_is_unlimited OR v_after <= v_quota.hard_limit");
    expect(migration).toContain('IF NOT v_is_unlimited AND (v_used + p_delta) > v_hard_limit THEN');
    expect(migration).not.toContain('999999');
  });

  it('stores API levels as JSON strings', () => {
    expect(migration).toContain('to_jsonb(g.access_level)');
    expect(migration).toContain("('fishgate_professional', 'limited')");
    expect(migration).toContain("('fishgate_enterprise', 'full')");
  });

  it('stages changes and blocks unresolved paid-subscriber quota decreases', () => {
    expect(catalogPage).toContain("from('saas_catalog_change_sets').insert");
    expect(catalogPage).toContain("rpc('saas_publish_catalog_change_set'");
    expect(migration).toContain('PAID_SUBSCRIBER_QUOTA_DECREASE_POLICY_REQUIRED');
    expect(migration).toContain("'catalog.change.published'");
  });
});

describe('trial reminders and upgrade catalog', () => {
  it('uses exact threshold days and skips duplicate threshold notifications', () => {
    expect(reminderWorker).toContain('const THRESHOLDS = [30, 14, 3, 1, 0]');
    expect(reminderWorker).toContain(".gte('trial_end_at', `${targetDate}T00:00:00.000Z`)");
    expect(reminderWorker).toContain(".lt('trial_end_at', `${targetDate}T23:59:59.999Z`)");
    expect(reminderWorker).toContain("status: 'duplicate_skipped'");
  });

  it('renders upgrade cards and emails from live quota and entitlement rows', () => {
    for (const source of [upgradePage, emailFunction]) {
      expect(source).toContain('saas_plan_quotas');
      expect(source).toContain('saas_plan_entitlements');
      expect(source).toContain('saas_plan_prices');
    }
    expect(upgradePage).toContain("mailto:sales@fishgate.co");
    expect(upgradePage).not.toContain('Save X%');
  });
});
