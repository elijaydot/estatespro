import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('control plane operational list pagination', () => {
  it('paginates active entitlement overrides, suspensions, and impersonation sessions', () => {
    expect(page).toContain('filteredEntitlementOverrides.slice((overridePage - 1) * overridePageSize');
    expect(page).toContain('filteredActiveSuspensions.slice((suspensionPage - 1) * suspensionPageSize');
    expect(page).toContain('filteredImpersonationSessions.slice((impersonationPage - 1) * impersonationPageSize');
    expect(page.match(/<TablePagination/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('provides domain filters without coupling them to mutation forms', () => {
    expect(page).toContain('Filter active overrides by decision');
    expect(page).toContain('Filter active suspensions by principal type');
    expect(page).toContain('overrideListDecision');
    expect(page).toContain('suspensionListType');
  });

  it('paginates monitoring, risk, usage, and incident collections', () => {
    for (const collection of [
      'filteredRiskQueue',
      'safetyTimelineRows',
      'filteredAlerts',
      'filteredEvents',
      'filteredDecisions',
      'filteredUsage',
      'incidentTimeline',
    ]) {
      expect(page).toMatch(new RegExp(`${collection}\\.slice\\(\\(`));
    }
    expect(page).not.toContain('filteredAlerts.slice(0, 20)');
    expect(page).not.toContain('filteredEvents.slice(0, 25)');
    expect(page).toContain("triageStatusFilter !== 'all' && item.status !== triageStatusFilter");
  });

  it('paginates every Company 360 billing collection', () => {
    for (const collection of ['companySubscriptions', 'companyAddons', 'companyInvoices']) {
      expect(page).toMatch(new RegExp(`${collection}\\.slice\\(\\(`));
    }
    expect(page).not.toContain('companySubscriptions.slice(0, 12)');
    expect(page).not.toContain('companyAddons.slice(0, 20)');
    expect(page).not.toContain('companyInvoices.slice(0, 12)');
  });

  it('drills from 360 summaries and incidents into scoped operational views', () => {
    expect(page).toContain('setBillingCompanyId(row.company_id)');
    expect(page).toContain('setCompanyFilter(row.company_id)');
    expect(page).toContain('setUserFilter(row.user_id)');
    expect(page).toContain('setCorrelationFilter(row.correlation_id)');
    expect(page).toContain("setActiveTab('events')");
  });
});