import { describe, expect, it } from 'vitest';
import type { SaasEntitlementKey } from '../../src/hooks/useSaasAccess';
import {
  getMostSpecificMatchingRoute,
  getAvailableWorkspaceIds,
  getOwnedWorkspaceId,
  getWorkspaceLandingPath,
  isGlobalStaffRoute,
  resolveStaffWorkspaceId,
  type WorkspaceAccess,
} from '../../src/lib/workspaceNavigation';

const entitlementKeys: SaasEntitlementKey[] = [
  'marketplace.listings.manage',
  'marketplace.verification.manage',
  'marketplace.moderation.view',
  'crm.leads.manage',
  'crm.deals.manage',
  'crm.calls_meetings.manage',
  'crm.automation.manage',
  'ai.assistant.enabled',
];

function access(overrides: Partial<WorkspaceAccess> = {}): WorkspaceAccess {
  return {
    role: 'landlord',
    isSuperAdmin: false,
    canReviewMarketplace: false,
    entitlements: Object.fromEntries(entitlementKeys.map((key) => [key, false])) as Record<SaasEntitlementKey, boolean>,
    ...overrides,
  };
}

function withEntitlements(...keys: SaasEntitlementKey[]) {
  return access({
    entitlements: Object.fromEntries(entitlementKeys.map((key) => [key, keys.includes(key)])) as Record<SaasEntitlementKey, boolean>,
  });
}

describe('workspace navigation', () => {
  it('selects the most specific active route', () => {
    const routes = ['/marketplace/crm', '/marketplace/crm/deals', '/marketplace/crm/tasks'];

    expect(getMostSpecificMatchingRoute('/marketplace/crm', routes)).toBe('/marketplace/crm');
    expect(getMostSpecificMatchingRoute('/marketplace/crm/deals/123', routes)).toBe('/marketplace/crm/deals');
  });

  it('resolves owned roots and detail routes without stored state', () => {
    expect(getOwnedWorkspaceId('/properties/property-1')).toBe('property-management');
    expect(getOwnedWorkspaceId('/account/billing')).toBe('property-management');
    expect(getOwnedWorkspaceId('/marketplace/manage')).toBe('marketplace');
    expect(getOwnedWorkspaceId('/marketplace/crm/deals')).toBe('crm');
    expect(getOwnedWorkspaceId('/super-admin/control-plane')).toBe('control-plane');
    expect(getOwnedWorkspaceId('/super-admin/catalog')).toBe('control-plane');
    expect(getOwnedWorkspaceId('/super-admin/billing-groups')).toBe('control-plane');
  });

  it('classifies only shared staff utilities as global', () => {
    expect(isGlobalStaffRoute('/messages')).toBe(true);
    expect(isGlobalStaffRoute('/settings')).toBe(true);
    expect(isGlobalStaffRoute('/broadcasts')).toBe(true);
    expect(isGlobalStaffRoute('/alerts')).toBe(false);
  });

  it('preserves an available previous workspace on utility routes', () => {
    const crmAccess = withEntitlements('crm.deals.manage');
    expect(resolveStaffWorkspaceId('/settings', crmAccess, 'crm')).toBe('crm');
    expect(resolveStaffWorkspaceId('/notifications', crmAccess, 'marketplace')).toBe('property-management');
    expect(resolveStaffWorkspaceId('/properties/1', crmAccess, 'crm')).toBe('property-management');
  });

  it('requires reviewer access as well as moderation entitlement for Marketplace', () => {
    const moderationEntitlement = withEntitlements('marketplace.moderation.view');
    expect(getAvailableWorkspaceIds(moderationEntitlement)).toEqual(['property-management']);
    expect(getAvailableWorkspaceIds({ ...moderationEntitlement, canReviewMarketplace: true })).toEqual([
      'property-management',
      'marketplace',
    ]);
  });

  it('chooses an authorized Marketplace landing', () => {
    expect(getWorkspaceLandingPath('marketplace', withEntitlements('marketplace.listings.manage'))).toBe('/marketplace/manage');
    expect(getWorkspaceLandingPath('marketplace', withEntitlements('marketplace.verification.manage'))).toBe('/marketplace/verification');
    expect(getWorkspaceLandingPath('marketplace', { ...withEntitlements('marketplace.moderation.view'), canReviewMarketplace: true })).toBe('/marketplace/reviewer');
    expect(getWorkspaceLandingPath('marketplace', withEntitlements('marketplace.moderation.view'))).toBeNull();
  });

  it('chooses CRM landings in entitlement priority order', () => {
    expect(getWorkspaceLandingPath('crm', withEntitlements('crm.leads.manage', 'crm.deals.manage'))).toBe('/marketplace/crm');
    expect(getWorkspaceLandingPath('crm', withEntitlements('crm.deals.manage'))).toBe('/marketplace/crm/deals');
    expect(getWorkspaceLandingPath('crm', withEntitlements('crm.calls_meetings.manage'))).toBe('/marketplace/crm/tasks');
    expect(getWorkspaceLandingPath('crm', withEntitlements('crm.automation.manage'))).toBe('/marketplace/crm/automation');
  });
});