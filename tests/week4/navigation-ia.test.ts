import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sidebar = readFileSync(resolve('src/components/layout/AppSidebar.tsx'), 'utf8');
const appLayout = readFileSync(resolve('src/components/layout/AppLayout.tsx'), 'utf8');
const crmWorkspace = readFileSync(resolve('src/components/marketplace-crm/CrmWorkspace.tsx'), 'utf8');
const crmNavigation = readFileSync(resolve('src/components/marketplace-crm/crmNavigation.ts'), 'utf8');
const crmHooks = readFileSync(resolve('src/hooks/useMarketplaceCrm.ts'), 'utf8');
const crmCampaigns = readFileSync(resolve('src/pages/marketplace-crm/Campaigns.tsx'), 'utf8');
const app = readFileSync(resolve('src/App.tsx'), 'utf8');
const tenantLayout = readFileSync(resolve('src/pages/tenant-portal/TenantPortalLayout.tsx'), 'utf8');
const settings = readFileSync(resolve('src/pages/Settings.tsx'), 'utf8');
const controlPlane = readFileSync(resolve('src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('navigation information architecture', () => {
  it('preserves every staff destination while grouping the primary sidebar', () => {
    const destinations = [
      '/dashboard',
      '/properties',
      '/units',
      '/tenants',
      '/leases',
      '/maintenance',
      '/invoices',
      '/payments',
      '/recurring-bills',
      '/reports',
      '/bookings',
      '/guest-booking-portal',
      '/marketplace/manage',
      '/marketplace/moderation',
      '/marketplace/verification',
      '/marketplace/reviewer',
      '/marketplace/crm',
      '/messages',
      '/broadcasts',
      '/notifications',
      '/team',
      '/support',
      '/settings',
      '/super-admin/control-plane',
    ];

    for (const destination of destinations) {
      expect(sidebar).toContain(`href: '${destination}'`);
    }

    expect(sidebar).toContain("label: 'Listings'");
    expect(sidebar).toContain("label: 'Booking Links'");
    expect(sidebar).toContain("entitlementKey: 'marketplace.listings.manage'");
    expect(sidebar).toContain("entitlementKey: 'marketplace.moderation.view'");
    expect(sidebar).toContain("entitlementKey: 'crm.leads.manage'");
  });

  it('keeps routed content aligned with the collapsible desktop sidebar', () => {
    expect(sidebar).toContain('onCollapsedChange?.(!collapsed)');
    expect(appLayout).toContain("sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'");
    expect(appLayout).toContain('transition-[margin]');
  });

  it('keeps all CRM destinations in workflow-based groups', () => {
    const destinations = [
      '/marketplace/crm',
      '/marketplace/crm/reports',
      '/marketplace/crm/leads',
      '/marketplace/crm/contacts',
      '/marketplace/crm/accounts',
      '/marketplace/crm/deals',
      '/marketplace/crm/tasks',
      '/marketplace/crm/meetings',
      '/marketplace/crm/calls',
      '/marketplace/crm/visits',
      '/marketplace/crm/automation',
      '/marketplace/crm/documents',
      '/marketplace/crm/projects',
      '/marketplace/crm/modules',
    ];

    for (const destination of destinations) {
      expect(crmNavigation).toContain(`href: '${destination}'`);
    }

    for (const group of ['Workspace', 'Pipeline', 'Activities', 'Growth', 'Delivery', 'Configuration']) {
      expect(crmNavigation).toContain(`title: '${group}'`);
    }

    expect(crmWorkspace).toContain('CRM_NAV_GROUPS.map');
  });

  it('gates future messaging surfaces without deleting their implementation', () => {
    expect(crmNavigation).not.toContain("href: '/marketplace/crm/campaigns'");
    expect(crmHooks).not.toContain("folder: 'Email Reports'");
    expect(app).toContain('path="/marketplace/crm/campaigns"');
    expect(crmCampaigns).toContain('FUTURE_FEATURE_MULTI_CHANNEL_MESSAGING.md');
    expect(crmHooks).toContain('useCrmCampaigns');
  });

  it('groups tenant and Settings navigation without hiding existing access', () => {
    expect(tenantLayout).toContain("href: '/tenant/settings'");
    expect(tenantLayout).toContain("href: '/tenant/support'");

    for (const group of ['Home', 'Money', 'Tenancy', 'Communication', 'Account']) {
      expect(tenantLayout).toContain(`title: '${group}'`);
    }

    for (const tabId of ['profile', 'security', 'general', 'company', 'appearance', 'lease', 'payments', 'billing', 'notifications', 'inspections']) {
      expect(settings).toContain(`id: "${tabId}"`);
    }
  });

  it('preserves all Control Plane views in labeled tab groups', () => {
    const tabValues = [
      'overview',
      'alerts',
      'incidents',
      'directory',
      'company360',
      'user360',
      'safety',
      'events',
      'decisions',
      'operators',
      'monetization',
      'usage',
      'analytics',
    ];

    for (const tabValue of tabValues) {
      expect(controlPlane).toContain(`value: '${tabValue}'`);
    }

    for (const group of ['Monitor', 'Directory', 'Governance', 'Business']) {
      expect(controlPlane).toContain(`title: '${group}'`);
    }
  });
});