import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/AccountBilling.tsx'), 'utf8');
const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const sidebar = readFileSync(resolve(process.cwd(), 'src/components/layout/AppSidebar.tsx'), 'utf8');

describe('owner account billing UI', () => {
  it('registers a discoverable owner billing route', () => {
    expect(app).toContain('path="/account/billing"');
    expect(sidebar).toContain("label: 'Account Billing', href: '/account/billing'");
  });

  it('reads the parallel group billing ledgers', () => {
    expect(page).toContain("from('owner_billing_groups')");
    expect(page).toContain("from('saas_owner_group_subscription_invoices')");
    expect(page).toContain("from('saas_owner_group_subscription_payment_attempts')");
    expect(page).toContain("from('saas_owner_group_subscription_events')");
  });

  it('uses validated lifecycle RPCs for every mutation', () => {
    for (const operation of [
      'owner_billing_group_create',
      'owner_billing_group_add_company',
      'owner_billing_group_remove_company',
      'owner_billing_group_change_plan',
      'owner_billing_group_set_addon_status',
      'owner_billing_group_rename',
      'owner_billing_group_dissolve',
    ]) expect(page).toContain(operation);
    expect(page).not.toContain(".from('owner_billing_groups').insert");
    expect(page).not.toContain(".from('owner_billing_group_members').insert");
  });
});