import type { SaasEntitlementKey } from '@/hooks/useSaasAccess';

export type StaffWorkspaceId = 'property-management' | 'marketplace' | 'crm' | 'control-plane';

export type WorkspaceAccess = {
  role?: string | null;
  isSuperAdmin: boolean;
  canReviewMarketplace: boolean;
  entitlements: Record<SaasEntitlementKey, boolean>;
};

export type StaffWorkspace = {
  id: StaffWorkspaceId;
  name: string;
  routePrefixes: string[];
};

export const STAFF_WORKSPACES: StaffWorkspace[] = [
  {
    id: 'property-management',
    name: 'Property Management',
    routePrefixes: [
      '/dashboard',
      '/properties',
      '/units',
      '/tenants',
      '/leases',
      '/maintenance',
      '/alerts',
      '/vendors',
      '/invoices',
      '/payments',
      '/recurring-bills',
      '/reports',
      '/bookings',
      '/guest-booking-portal',
      '/team',
    ],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    routePrefixes: ['/marketplace/manage', '/marketplace/moderation', '/marketplace/verification', '/marketplace/reviewer'],
  },
  {
    id: 'crm',
    name: 'CRM',
    routePrefixes: ['/marketplace/crm'],
  },
  {
    id: 'control-plane',
    name: 'Control Plane',
    routePrefixes: ['/super-admin/control-plane'],
  },
];

export const GLOBAL_STAFF_ROUTES = ['/messages', '/broadcasts', '/notifications', '/support', '/settings'] as const;

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getMostSpecificMatchingRoute(pathname: string, routes: string[]) {
  return routes
    .filter((route) => matchesRoute(pathname, route))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

export function isGlobalStaffRoute(pathname: string) {
  return GLOBAL_STAFF_ROUTES.some((route) => matchesRoute(pathname, route));
}

export function getOwnedWorkspaceId(pathname: string): StaffWorkspaceId | null {
  const workspace = STAFF_WORKSPACES.find((candidate) =>
    candidate.routePrefixes.some((route) => matchesRoute(pathname, route)),
  );

  return workspace?.id ?? null;
}

export function isWorkspaceAvailable(workspaceId: StaffWorkspaceId, access: WorkspaceAccess) {
  switch (workspaceId) {
    case 'property-management':
      return access.role !== 'tenant';
    case 'marketplace':
      return access.entitlements['marketplace.listings.manage']
        || (access.entitlements['marketplace.moderation.view'] && access.canReviewMarketplace);
    case 'crm':
      return access.entitlements['crm.leads.manage']
        || access.entitlements['crm.deals.manage']
        || access.entitlements['crm.calls_meetings.manage']
        || access.entitlements['crm.automation.manage'];
    case 'control-plane':
      return access.isSuperAdmin;
  }
}

export function getAvailableWorkspaceIds(access: WorkspaceAccess) {
  return STAFF_WORKSPACES
    .map((workspace) => workspace.id)
    .filter((workspaceId) => isWorkspaceAvailable(workspaceId, access));
}

export function getWorkspaceLandingPath(workspaceId: StaffWorkspaceId, access: WorkspaceAccess) {
  switch (workspaceId) {
    case 'property-management':
      return '/dashboard';
    case 'marketplace':
      if (access.entitlements['marketplace.listings.manage']) return '/marketplace/manage';
      if (access.entitlements['marketplace.moderation.view'] && access.canReviewMarketplace) return '/marketplace/moderation';
      return null;
    case 'crm':
      if (access.entitlements['crm.leads.manage']) return '/marketplace/crm';
      if (access.entitlements['crm.deals.manage']) return '/marketplace/crm/deals';
      if (access.entitlements['crm.calls_meetings.manage']) return '/marketplace/crm/tasks';
      if (access.entitlements['crm.automation.manage']) return '/marketplace/crm/automation';
      return null;
    case 'control-plane':
      return access.isSuperAdmin ? '/super-admin/control-plane' : null;
  }
}

export function resolveStaffWorkspaceId(
  pathname: string,
  access: WorkspaceAccess,
  lastWorkspaceId?: StaffWorkspaceId | null,
) {
  const ownedWorkspaceId = getOwnedWorkspaceId(pathname);
  if (ownedWorkspaceId) return ownedWorkspaceId;

  if (isGlobalStaffRoute(pathname) && lastWorkspaceId && isWorkspaceAvailable(lastWorkspaceId, access)) {
    return lastWorkspaceId;
  }

  return getAvailableWorkspaceIds(access)[0] ?? 'property-management';
}