import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/OwnerBillingGroup360.tsx'), 'utf8');
const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const sidebar = readFileSync(resolve(process.cwd(), 'src/components/layout/AppSidebar.tsx'), 'utf8');

describe('owner billing group 360 UI', () => {
  it('is discoverable only in the super-admin control plane', () => {
    expect(app).toContain('path="/super-admin/billing-groups"');
    expect(app).toContain('<SuperAdminRoute>{withSuspense(<OwnerBillingGroup360 />)}</SuperAdminRoute>');
    expect(sidebar).toContain("label: 'Billing Groups', href: '/super-admin/billing-groups'");
  });

  it('shows operational group, member, subscription, invoice, and event state', () => {
    expect(page).toContain("from('owner_billing_groups')");
    expect(page).toContain("from('owner_billing_group_members')");
    expect(page).toContain("from('saas_owner_group_plan_subscriptions')");
    expect(page).toContain("from('saas_owner_group_subscription_invoices')");
    expect(page).toContain("from('saas_owner_group_subscription_events')");
  });

  it('uses audited super-admin RPCs for group overrides', () => {
    expect(page).toContain('platform_set_owner_billing_group_quota_override');
    expect(page).toContain('platform_clear_owner_billing_group_quota_override');
    expect(page).toContain('platform_set_owner_billing_group_entitlement_override');
    expect(page).toContain('platform_clear_owner_billing_group_entitlement_override');
  });

  it('persists navigation and paginates the billing group directory', () => {
    expect(page).toContain('useSearchParams');
    expect(page).toContain("next.set('group', groupId)");
    expect(page).toContain("next.set('view', activeTab)");
    expect(page).toContain('Filter billing groups by status');
    expect(page).toContain('<TablePagination');
  });

  it('filters and paginates every group collection with relevant drill-throughs', () => {
    expect(page).toContain('Filter member companies');
    expect(page).toContain('Filter invoices by status');
    expect(page).toContain('Filter overrides by definition or reason');
    expect(page).toContain('Filter billing events by type');
    expect(page).toContain('cp_tab=company360&cp_company=');
    expect(page).toContain('cp_tab=user360&cp_user=');
    expect(page.match(/<TablePagination/g)?.length).toBeGreaterThanOrEqual(6);
  });
});