import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Bell,
  MessageSquare,
  Megaphone,
  Settings,
  CircleHelp,
  BriefcaseBusiness,
  Home,
  Receipt,
  RefreshCw,
  BarChart3,
  CalendarCheck,
  Link2,
  Store,
  ShieldCheck,
  Radar,
  LayoutGrid,
  UserCog,
} from 'lucide-react';
import type { SaasEntitlementKey } from '@/hooks/useSaasAccess';
import type { StaffWorkspaceId } from '@/lib/workspaceNavigation';
import { CRM_NAV_GROUPS } from '@/components/marketplace-crm/crmNavigation';
import { ReportsSidebarNav } from '@/components/marketplace-crm/ReportsSidebarNav';
import { ModuleSidebarNav } from '@/components/layout/ModuleSidebarNav';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  entitlementKey?: SaasEntitlementKey;
  reviewerOnly?: boolean;
};

export type NavSection = {
  title: string;
  icon: typeof LayoutDashboard;
  workspaceId: StaffWorkspaceId;
  items: NavItem[];
};

export const sharedSections: NavSection[] = [
  {
    title: 'Home',
    icon: LayoutDashboard,
    workspaceId: 'property-management',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Portfolio',
    icon: Building2,
    workspaceId: 'property-management',
    items: [
      { icon: Building2, label: 'Properties', href: '/properties' },
      { icon: Home, label: 'Units', href: '/units' },
      { icon: Users, label: 'Tenants', href: '/tenants' },
      { icon: FileText, label: 'Leases', href: '/leases' },
      { icon: Wrench, label: 'Maintenance', href: '/maintenance' },
    ],
  },
  {
    title: 'Operations',
    icon: Wrench,
    workspaceId: 'property-management',
    items: [
      { icon: Bell, label: 'Alerts', href: '/alerts' },
      { icon: BriefcaseBusiness, label: 'Vendors', href: '/vendors' },
    ],
  },
  {
    title: 'Finance',
    icon: CreditCard,
    workspaceId: 'property-management',
    items: [
      { icon: Receipt, label: 'Invoices', href: '/invoices' },
      { icon: CreditCard, label: 'Payments', href: '/payments' },
      { icon: RefreshCw, label: 'Recurring Bills', href: '/recurring-bills' },
      { icon: BarChart3, label: 'Reports', href: '/reports' },
    ],
  },
  {
    title: 'Guest Operations',
    icon: CalendarCheck,
    workspaceId: 'property-management',
    items: [
      { icon: CalendarCheck, label: 'Bookings', href: '/bookings' },
      { icon: Link2, label: 'Booking Links', href: '/guest-booking-portal' },
    ],
  },
  {
    title: 'Marketplace',
    icon: Store,
    workspaceId: 'marketplace',
    items: [
      { icon: Store, label: 'Listings', href: '/marketplace/manage', entitlementKey: 'marketplace.listings.manage' },
      { icon: ShieldCheck, label: 'Verification', href: '/marketplace/verification', entitlementKey: 'marketplace.verification.manage' },
      { icon: ShieldCheck, label: 'Reviewer Console', href: '/marketplace/reviewer', entitlementKey: 'marketplace.moderation.view', reviewerOnly: true },
    ],
  },
];

export const managerCommunicationItem: NavItem = { icon: Megaphone, label: 'Broadcasts', href: '/broadcasts' };

export const globalCommunicationItems: NavItem[] = [
  { icon: MessageSquare, label: 'Messages', href: '/messages' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
];

export const getCommunicationItemsForRole = (role?: string) =>
  role === 'landlord' || role === 'property_manager' || role === 'super_admin'
    ? [globalCommunicationItems[0], managerCommunicationItem, globalCommunicationItems[1]]
    : globalCommunicationItems;

export const crmSections: NavSection[] = CRM_NAV_GROUPS.map((group) => ({
  title: group.title,
  icon: group.items[0].icon,
  workspaceId: 'crm',
  items: group.items,
}));

export const landlordOnlySection: NavSection = {
  title: 'Organization',
  icon: UserCog,
  workspaceId: 'property-management',
  items: [
    { icon: BriefcaseBusiness, label: 'Owner Portfolio', href: '/owner-portal', entitlementKey: 'portal.owner.enabled' },
    { icon: UserCog, label: 'Team', href: '/team' },
    { icon: CreditCard, label: 'Account Billing', href: '/account/billing' },
  ],
};

export const superAdminSection: NavSection = {
  title: 'Platform',
  icon: Radar,
  workspaceId: 'control-plane',
  items: [
    { icon: Radar, label: 'Control Plane', href: '/super-admin/control-plane' },
    { icon: LayoutGrid, label: 'Catalog Management', href: '/super-admin/catalog' },
    { icon: Users, label: 'Billing Groups', href: '/super-admin/billing-groups' },
  ],
};

export const bottomNavItems = [
  { icon: CircleHelp, label: 'Support', href: '/support' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function AppSidebar({
  mobile = false,
  onNavigate,
  collapsed = false,
  onCollapsedChange,
}: AppSidebarProps) {
  const location = useLocation();
  const { availableWorkspaceIds, currentWorkspaceId } = useWorkspaceNavigation();
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: unreadNotificationCount = 0 } = useUnreadNotificationsCount();
  const collapsedView = !mobile && collapsed;

  const isReportsRoute =
    location.pathname.startsWith('/marketplace/crm/reports') || location.pathname === '/reports';

  if (isReportsRoute && !collapsedView) {
    return (
      <aside
        className={cn(
          mobile
            ? 'h-full w-full bg-sidebar text-sidebar-foreground'
            : 'hidden lg:block fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 w-64'
        )}
      >
        <ReportsSidebarNav
          onBackToMainMenu={() => {}}
          onNavigateReport={() => onNavigate?.()}
          collapsed={collapsed}
        />
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        mobile
          ? 'h-full w-full bg-sidebar text-sidebar-foreground'
          : 'hidden lg:block fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300',
        !mobile && (collapsedView ? 'w-20' : 'w-64')
      )}
    >
      <ModuleSidebarNav
        workspaceId={currentWorkspaceId || 'property-management'}
        availableWorkspaces={availableWorkspaceIds}
        onNavigate={() => onNavigate?.()}
        collapsed={collapsedView}
        onCollapsedChange={() => onCollapsedChange?.(!collapsed)}
        mobile={mobile}
      />
    </aside>
  );
}
