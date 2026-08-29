import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Home,
  Users,
  FileText,
  Wrench,
  Receipt,
  CreditCard,
  RefreshCw,
  BarChart3,
  CalendarCheck,
  Link2,
  Store,
  ShieldCheck,
  Radar,
  LayoutGrid,
  LayoutDashboard,
  UserCog,
  BriefcaseBusiness,
  MessageSquare,
  Megaphone,
  Bell,
  Sparkles,
  PhoneCall,
  Calendar,
  Layers,
  Activity,
  DollarSign,
  TrendingUp,
  FolderLock,
  Flame,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import type { StaffWorkspaceId } from '@/lib/workspaceNavigation';
import type { SaasEntitlementKey } from '@/hooks/useSaasAccess';

export interface ModuleNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
  entitlementKey?: SaasEntitlementKey;
  reviewerOnly?: boolean;
  tags: string[];
}

export interface ModuleNavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  items: ModuleNavItem[];
}

export interface WorkspaceModuleConfig {
  id: StaffWorkspaceId;
  name: string;
  shortName: string;
  icon: LucideIcon;
  description: string;
  groups: ModuleNavGroup[];
}

export const WORKSPACE_MODULE_CONFIGS: Record<StaffWorkspaceId, WorkspaceModuleConfig> = {
  'property-management': {
    id: 'property-management',
    name: 'Property Management',
    shortName: 'PM Operations',
    icon: Building2,
    description: 'Portfolio real estate operations, leasing lifecycle, tenant relations, and billing.',
    groups: [
      {
        id: 'pm-overview',
        title: 'Overview & Analytics',
        icon: LayoutDashboard,
        description: 'Executive dashboard KPIs and portfolio financial reports.',
        items: [
          {
            id: 'pm-dashboard',
            label: 'Executive Dashboard',
            shortLabel: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
            description: 'Portfolio health, occupancy rate, collection velocity, and alerts.',
            tags: ['dashboard', 'home', 'kpi', 'overview'],
          },
          {
            id: 'pm-reports',
            label: 'Rent Roll & Financial Reports',
            shortLabel: 'Reports Hub',
            href: '/reports',
            icon: BarChart3,
            description: 'Rent roll tables, aging invoices, occupancy trends, and maintenance cost analysis.',
            tags: ['reports', 'rent roll', 'aging', 'financials', 'occupancy'],
          },
        ],
      },
      {
        id: 'pm-portfolio',
        title: 'Portfolio & Inventory',
        icon: Building2,
        description: 'Physical property buildings, units inventory, and owner portfolios.',
        items: [
          {
            id: 'pm-properties',
            label: 'Properties Directory',
            shortLabel: 'Properties',
            href: '/properties',
            icon: Building2,
            description: 'Manage property buildings, locations, amenities, and media galleries.',
            tags: ['properties', 'buildings', 'estates', 'locations'],
          },
          {
            id: 'pm-units',
            label: 'Units & Spaces',
            shortLabel: 'Units',
            href: '/units',
            icon: Home,
            description: 'Individual residential & commercial units, occupancy status, and floor plans.',
            tags: ['units', 'spaces', 'apartments', 'rooms'],
          },
          {
            id: 'pm-owner-portal',
            label: 'Owner Portfolio 360',
            shortLabel: 'Owner Portfolio',
            href: '/owner-portal',
            icon: BriefcaseBusiness,
            description: 'Landlord and investor asset visibility, statement downloads, and net yield.',
            entitlementKey: 'portal.owner.enabled',
            tags: ['owners', 'investors', 'portfolio', 'landlords'],
          },
        ],
      },
      {
        id: 'pm-tenancy',
        title: 'Tenancy & Leases',
        icon: Users,
        description: 'Resident management, lease contracts, and digital signing.',
        items: [
          {
            id: 'pm-tenants',
            label: 'Tenants Roster',
            shortLabel: 'Tenants',
            href: '/tenants',
            icon: Users,
            description: 'Resident profiles, emergency contacts, portal access, and rent accounts.',
            tags: ['tenants', 'residents', 'occupants', 'clients'],
          },
          {
            id: 'pm-leases',
            label: 'Leases & Agreements',
            shortLabel: 'Leases',
            href: '/leases',
            icon: FileText,
            description: 'Active leases, contract renewals, draft proposals, and digital signatures.',
            tags: ['leases', 'contracts', 'agreements', 'terms'],
          },
        ],
      },
      {
        id: 'pm-finance',
        title: 'Billing & Financials',
        icon: Receipt,
        description: 'Rent demand invoices, payment processing, and recurring utility schedules.',
        items: [
          {
            id: 'pm-invoices',
            label: 'Invoices & Rent Demands',
            shortLabel: 'Invoices',
            href: '/invoices',
            icon: Receipt,
            description: 'Automated rent invoices, custom fee items, PDF generation, and aging tracking.',
            tags: ['invoices', 'bills', 'rent demands', 'statements'],
          },
          {
            id: 'pm-payments',
            label: 'Payments & Transactions',
            shortLabel: 'Payments',
            href: '/payments',
            icon: CreditCard,
            description: 'Payment reconciliation, bank transfers, mobile money, and transaction history.',
            tags: ['payments', 'transactions', 'receipts', 'momo', 'bank'],
          },
          {
            id: 'pm-recurring-bills',
            label: 'Recurring Billing Schedules',
            shortLabel: 'Recurring Bills',
            href: '/recurring-bills',
            icon: RefreshCw,
            description: 'Automated recurring subscriptions, maintenance retainers, and utility fees.',
            tags: ['recurring', 'subscriptions', 'schedules', 'automation'],
          },
          {
            id: 'pm-account-billing',
            label: 'Account & SaaS Plan',
            shortLabel: 'Account Billing',
            href: '/account/billing',
            icon: CreditCard,
            description: 'Company subscription plan, unit limits, add-on features, and invoices.',
            tags: ['subscription', 'plan', 'saas', 'billing', 'pricing'],
          },
        ],
      },
      {
        id: 'pm-operations',
        title: 'Operations & Maintenance',
        icon: Wrench,
        description: 'Work order tracking, vendor dispatch, and operational alert triggers.',
        items: [
          {
            id: 'pm-maintenance',
            label: 'Maintenance Work Orders',
            shortLabel: 'Maintenance',
            href: '/maintenance',
            icon: Wrench,
            description: 'Tenant maintenance tickets, repair status, contractor assignments, and costs.',
            tags: ['maintenance', 'repairs', 'work orders', 'tickets'],
          },
          {
            id: 'pm-vendors',
            label: 'Vendors & Contractors',
            shortLabel: 'Vendors',
            href: '/vendors',
            icon: BriefcaseBusiness,
            description: 'External service suppliers, trade specialties, vendor contracts, and payouts.',
            tags: ['vendors', 'contractors', 'suppliers', 'electricians', 'plumbers'],
          },
          {
            id: 'pm-alerts',
            label: 'Operational Alerts',
            shortLabel: 'Alerts',
            href: '/alerts',
            icon: Bell,
            description: 'Overdue rent notices, lease expiration warnings, and pending actions.',
            tags: ['alerts', 'notifications', 'warnings', 'deadlines'],
          },
        ],
      },
      {
        id: 'pm-hospitality',
        title: 'Guest & Short-Stay Operations',
        icon: CalendarCheck,
        description: 'Short-let bookings, check-in reservations, and public booking portals.',
        items: [
          {
            id: 'pm-bookings',
            label: 'Guest Reservations',
            shortLabel: 'Bookings',
            href: '/bookings',
            icon: CalendarCheck,
            description: 'Calendar view of guest check-ins, departures, and reservation status.',
            tags: ['bookings', 'reservations', 'short-let', 'airbnb', 'guests'],
          },
          {
            id: 'pm-booking-portal',
            label: 'Guest Booking Links',
            shortLabel: 'Booking Links',
            href: '/guest-booking-portal',
            icon: Link2,
            description: 'Shareable direct booking links and reservation portal management.',
            tags: ['guest portal', 'booking links', 'share', 'direct'],
          },
        ],
      },
      {
        id: 'pm-team',
        title: 'Team & Organization',
        icon: UserCog,
        description: 'Company staff members, role-based access, and permission management.',
        items: [
          {
            id: 'pm-team-mgmt',
            label: 'Team & Permissions',
            shortLabel: 'Team',
            href: '/team',
            icon: UserCog,
            description: 'Property managers, accountants, leasing agents, and permission controls.',
            tags: ['team', 'staff', 'users', 'roles', 'permissions'],
          },
        ],
      },
    ],
  },

  'marketplace': {
    id: 'marketplace',
    name: 'Marketplace',
    shortName: 'Marketplace',
    icon: Store,
    description: 'Public property marketplace, publisher verification, and moderation console.',
    groups: [
      {
        id: 'marketplace-inventory',
        title: 'Listings & Catalog',
        icon: Store,
        description: 'Manage published properties, pricing, and media packages.',
        items: [
          {
            id: 'marketplace-manage',
            label: 'Managed Listings',
            shortLabel: 'Listings',
            href: '/marketplace/manage',
            icon: Store,
            description: 'Create and edit marketplace listings, manage photos, and toggle visibility.',
            entitlementKey: 'marketplace.listings.manage',
            tags: ['listings', 'marketplace', 'publish', 'catalog', 'real estate'],
          },
          {
            id: 'marketplace-public',
            label: 'Public Marketplace',
            shortLabel: 'Public Explorer',
            href: '/marketplace',
            icon: Store,
            description: 'Public buyer & tenant search portal with map views and filters.',
            tags: ['public', 'search', 'buy', 'rent', 'map'],
          },
        ],
      },
      {
        id: 'marketplace-trust',
        title: 'Trust, Safety & Verification',
        icon: ShieldCheck,
        description: 'Publisher identity audits, land registry checks, and reviewer moderation.',
        items: [
          {
            id: 'marketplace-verification',
            label: 'Publisher Verification',
            shortLabel: 'Verification',
            href: '/marketplace/verification',
            icon: ShieldCheck,
            description: 'Publisher KYC submission, land registry proof, and badge status.',
            entitlementKey: 'marketplace.verification.manage',
            tags: ['verification', 'kyc', 'trust', 'publisher', 'badge'],
          },
          {
            id: 'marketplace-reviewer',
            label: 'Reviewer & Moderation Queue',
            shortLabel: 'Reviewer Queue',
            href: '/marketplace/reviewer',
            icon: ShieldCheck,
            description: 'Internal reviewer desk to approve, reject, or flag listings and publishers.',
            entitlementKey: 'marketplace.moderation.view',
            reviewerOnly: true,
            tags: ['reviewer', 'moderation', 'audit', 'queue', 'safety'],
          },
        ],
      },
      {
        id: 'marketplace-developments',
        title: 'Developments & Master Plans',
        icon: Building2,
        description: 'Real estate developer master plans and off-plan project phases.',
        items: [
          {
            id: 'marketplace-projects',
            label: 'Development Projects',
            shortLabel: 'Projects',
            href: '/projects',
            icon: Building2,
            description: 'Master planned estate developments, unit inventory, and phase completion.',
            tags: ['projects', 'developments', 'off-plan', 'master plan'],
          },
        ],
      },
    ],
  },

  'crm': {
    id: 'crm',
    name: 'Marketplace CRM',
    shortName: 'Sales CRM',
    icon: Flame,
    description: 'Inquiry conversion, deal velocity, communication logs, and sales intelligence.',
    groups: [
      {
        id: 'crm-pipeline',
        title: 'Lead & Deal Pipeline',
        icon: Flame,
        description: 'Lead qualification, opportunity stages, and deal closings.',
        items: [
          {
            id: 'crm-overview',
            label: 'CRM Overview',
            shortLabel: 'Overview',
            href: '/marketplace/crm/overview',
            icon: Activity,
            description: 'High-level CRM pipeline velocity, conversion rates, and sales leaderboard.',
            tags: ['crm', 'overview', 'pipeline', 'funnel'],
          },
          {
            id: 'crm-leads',
            label: 'Leads & Inquiries',
            shortLabel: 'Leads',
            href: '/marketplace/crm/leads',
            icon: Users,
            description: 'Inquiry qualification, intent scoring, stage movements, and agent routing.',
            tags: ['leads', 'inquiries', 'prospects', 'qualification'],
          },
          {
            id: 'crm-deals',
            label: 'Deals & Closings',
            shortLabel: 'Deals',
            href: '/marketplace/crm/deals',
            icon: DollarSign,
            description: 'Opportunity value tracking, probability forecasts, and closed-won leases.',
            tags: ['deals', 'opportunities', 'revenue', 'closings'],
          },
        ],
      },
      {
        id: 'crm-activities',
        title: 'Activities & Engagement',
        icon: PhoneCall,
        description: 'Outreach calls, viewing appointments, tasks, and client visits.',
        items: [
          {
            id: 'crm-tasks',
            label: 'Follow-Up Tasks',
            shortLabel: 'Tasks',
            href: '/marketplace/crm/tasks',
            icon: CheckCircle2,
            description: 'Action items, follow-up deadlines, and SLA reminders.',
            tags: ['tasks', 'follow-ups', 'todos', 'action items'],
          },
          {
            id: 'crm-calls',
            label: 'Call Log & Outreach',
            shortLabel: 'Calls',
            href: '/marketplace/crm/calls',
            icon: PhoneCall,
            description: 'Outreach call logs, discussion notes, and outcome tagging.',
            tags: ['calls', 'outreach', 'phone', 'discussions'],
          },
          {
            id: 'crm-meetings',
            label: 'Meetings & Viewings',
            shortLabel: 'Meetings',
            href: '/marketplace/crm/meetings',
            icon: Calendar,
            description: 'Scheduled on-site viewing appointments and client consultations.',
            tags: ['meetings', 'viewings', 'appointments', 'calendar'],
          },
          {
            id: 'crm-visits',
            label: 'Property Visits',
            shortLabel: 'Visits',
            href: '/marketplace/crm/visits',
            icon: Building2,
            description: 'On-site property inspection visits and visitor check-in logs.',
            tags: ['visits', 'check-ins', 'on-site', 'properties'],
          },
        ],
      },
      {
        id: 'crm-contacts',
        title: 'Directory & Accounts',
        icon: FolderLock,
        description: 'Customer contact roster and corporate client accounts.',
        items: [
          {
            id: 'crm-contacts-dir',
            label: 'Contact Directory',
            shortLabel: 'Contacts',
            href: '/marketplace/crm/contacts',
            icon: Users,
            description: 'Verified buyer & tenant contacts with preferred communication channels.',
            tags: ['contacts', 'directory', 'phonebook', 'emails'],
          },
          {
            id: 'crm-accounts-dir',
            label: 'Corporate & Investor Accounts',
            shortLabel: 'Accounts',
            href: '/marketplace/crm/accounts',
            icon: BriefcaseBusiness,
            description: 'Corporate client accounts, investor institutions, and tenant organizations.',
            tags: ['accounts', 'companies', 'corporate', 'investors'],
          },
        ],
      },
      {
        id: 'crm-marketing',
        title: 'Marketing & Automation',
        icon: Sparkles,
        description: 'Marketing campaigns and automated stage transition triggers.',
        items: [
          {
            id: 'crm-campaigns',
            label: 'Email & SMS Campaigns',
            shortLabel: 'Campaigns',
            href: '/marketplace/crm/campaigns',
            icon: Megaphone,
            description: 'Broadcast email campaigns, newsletters, and open/click analytics.',
            tags: ['campaigns', 'marketing', 'email', 'broadcasts'],
          },
          {
            id: 'crm-automation',
            label: 'Workflow Automation Builder',
            shortLabel: 'Automation',
            href: '/marketplace/crm/automation',
            icon: Sparkles,
            description: 'No-code visual trigger rules for automated follow-ups and stage changes.',
            tags: ['automation', 'workflows', 'triggers', 'rules', 'bots'],
          },
        ],
      },
      {
        id: 'crm-reports-group',
        title: 'Reports & Intelligence',
        icon: BarChart3,
        description: 'Interactive visual dashboards, velocity metrics, and AI executive summaries.',
        items: [
          {
            id: 'crm-reports-hub',
            label: 'Reports & Analytics Hub',
            shortLabel: 'Reports',
            href: '/marketplace/crm/reports',
            icon: BarChart3,
            description: 'Hierarchical reporting suite, SLA compliance, agent benchmarks, and AI summaries.',
            tags: ['reports', 'analytics', 'charts', 'kpi', 'intelligence'],
          },
        ],
      },
    ],
  },

  'control-plane': {
    id: 'control-plane',
    name: 'Control Plane',
    shortName: 'Super Admin',
    icon: Radar,
    description: 'Multi-tenant platform control plane, catalog packaging, and pooled billing groups.',
    groups: [
      {
        id: 'cp-operations',
        title: 'Platform Operations',
        icon: Radar,
        description: 'Global system health, tenant company directory, and security audit logs.',
        items: [
          {
            id: 'cp-dashboard',
            label: 'Control Plane Overview',
            shortLabel: 'Control Plane',
            href: '/super-admin/control-plane',
            icon: Radar,
            description: 'Cross-company metrics, active tenant companies, user sessions, and quotas.',
            tags: ['control plane', 'super admin', 'overview', 'health'],
          },
        ],
      },
      {
        id: 'cp-packaging',
        title: 'Catalog & Entitlements',
        icon: LayoutGrid,
        description: 'SaaS plan definitions, feature tiers, and add-on catalog packaging.',
        items: [
          {
            id: 'cp-catalog',
            label: 'Catalog Management',
            shortLabel: 'Catalog',
            href: '/super-admin/catalog',
            icon: LayoutGrid,
            description: 'Feature flags, pricing tiers, quota ceilings, and add-on capabilities.',
            tags: ['catalog', 'pricing', 'features', 'entitlements', 'tiers'],
          },
        ],
      },
      {
        id: 'cp-billing',
        title: 'Multi-Tenant Billing Groups',
        icon: Users,
        description: 'Cross-company pooled billing groups and automated quota metering.',
        items: [
          {
            id: 'cp-billing-groups',
            label: 'Billing Groups & Metering',
            shortLabel: 'Billing Groups',
            href: '/super-admin/billing-groups',
            icon: Users,
            description: 'Consolidated invoice groups, unit count aggregation, and grace policies.',
            tags: ['billing groups', 'metering', 'aggregation', 'invoicing'],
          },
        ],
      },
    ],
  },
};

// Flat list of all items across all modules
export const ALL_MODULE_NAV_ITEMS: ModuleNavItem[] = Object.values(WORKSPACE_MODULE_CONFIGS).flatMap((c) =>
  c.groups.flatMap((g) => g.items)
);

// Helper to look up an item by path or ID
export function getModuleNavItemByHref(href: string): ModuleNavItem | undefined {
  return ALL_MODULE_NAV_ITEMS.find((item) => item.href === href || href.startsWith(`${item.href}/`));
}
