/**
 * FishGate Enterprise Information Architecture (IA)
 * Version 2.0 - Linear + Fluent Design Language
 *
 * NAVIGATION RULES:
 * - Reduced by 50% for maximum cognitive clarity.
 * - Maximum hierarchy depth: 2 Levels.
 * - Clean modern outline icons.
 * - Exactly 8 primary navigation domains:
 *   1. Dashboard
 *   2. Properties
 *   3. Residents
 *   4. Finance
 *   5. Operations
 *   6. Growth
 *   7. Insights
 *   8. Administration
 */

import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Building2,
  Building,
  Home,
  Users,
  FileText,
  MessageSquare,
  CreditCard,
  RotateCcw,
  Receipt,
  Wrench,
  CheckSquare,
  ClipboardList,
  ListTodo,
  UserCheck,
  Users2,
  Megaphone,
  TrendingUp,
  LineChart,
  UserCog,
  Shield,
  Settings,
  Sliders,
  type LucideIcon,
} from 'lucide-react';
import type { SaasEntitlementKey } from '@/hooks/useSaasAccess';

export interface IANavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
  entitlementKey?: SaasEntitlementKey;
  roles?: ('super_admin' | 'landlord' | 'property_manager' | 'tenant')[];
  description?: string;
}

export interface IANavGroup {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  items: IANavItem[];
}

export const FISHGATE_IA_GROUPS: IANavGroup[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Executive overview and operational pulse',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Portfolio health, urgent tasks, and executive summary',
      },
      {
        id: 'activity',
        label: 'Activity',
        href: '/dashboard?view=activity',
        icon: Activity,
        description: 'Real-time operational stream and audit timeline',
      },
      {
        id: 'reports',
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        description: 'Audited financial statements and rent rolls',
      },
    ],
  },
  {
    id: 'properties',
    name: 'Properties',
    icon: Building2,
    description: 'Real estate portfolio and physical spaces',
    items: [
      {
        id: 'portfolio',
        label: 'Portfolio',
        href: '/properties',
        icon: Building2,
        description: 'All estate properties, yield efficiency, and cards',
      },
      {
        id: 'properties-list',
        label: 'Properties',
        href: '/properties?view=list',
        icon: Building,
        description: 'Searchable directory of managed estates',
      },
      {
        id: 'units',
        label: 'Units',
        href: '/units',
        icon: Home,
        description: 'Rentable units, floor plans, and status',
      },
      {
        id: 'occupancy',
        label: 'Occupancy',
        href: '/reports?domain=portfolio',
        icon: TrendingUp,
        description: 'Capacity and physical occupancy trends',
      },
    ],
  },
  {
    id: 'residents',
    name: 'Residents',
    icon: Users,
    description: 'Tenants, lease agreements, and communications',
    items: [
      {
        id: 'tenants',
        label: 'Tenants',
        href: '/tenants',
        icon: Users,
        description: 'Resident directory and customer profiles',
      },
      {
        id: 'leases',
        label: 'Leases',
        href: '/leases',
        icon: FileText,
        description: 'Active agreements, renewals, and contracts',
      },
      {
        id: 'communications',
        label: 'Communications',
        href: '/messages',
        icon: MessageSquare,
        description: 'Direct messages and real-time chat with residents',
      },
      {
        id: 'broadcasts',
        label: 'Broadcasts',
        href: '/broadcasts',
        icon: Megaphone,
        description: 'Broadcast SMS and email announcements to tenants',
      },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: CreditCard,
    description: 'Rental collections, payouts, and ledger',
    items: [
      {
        id: 'rent-collection',
        label: 'Rent Collection',
        href: '/payments?view=collections',
        icon: CreditCard,
        description: 'Arrears tracking and MoMo/Card collections',
      },
      {
        id: 'payments',
        label: 'Payments',
        href: '/payments',
        icon: RotateCcw,
        description: 'Settled receipts and official RRA EBM compliance',
      },
      {
        id: 'expenses',
        label: 'Expenses',
        href: '/recurring-bills',
        icon: Receipt,
        description: 'Recurring utility bills and operating expenses',
      },
      {
        id: 'transactions',
        label: 'Transactions',
        href: '/invoices',
        icon: FileText,
        description: 'Invoices, credit notes, and statement history',
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: Wrench,
    description: 'Maintenance triage, contractor orders, and checklists',
    items: [
      {
        id: 'maintenance',
        label: 'Maintenance',
        href: '/maintenance',
        icon: Wrench,
        description: 'Resident tickets, triage pipeline, and logs',
      },
      {
        id: 'work-orders',
        label: 'Work Orders',
        href: '/maintenance?tab=work-orders',
        icon: CheckSquare,
        description: 'Field dispatches, purchase orders, and quotes',
      },
      {
        id: 'inspections',
        label: 'Inspections',
        href: '/maintenance?tab=inspections',
        icon: ClipboardList,
        description: 'Move-in/out condition checklists and audits',
      },
      {
        id: 'tasks',
        label: 'Tasks',
        href: '/marketplace/crm/tasks',
        icon: ListTodo,
        entitlementKey: 'crm.leads.manage',
        description: 'Operational team to-do items and deadlines',
      },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: Users2,
    description: 'Leads, sales CRM, and market exposure',
    items: [
      {
        id: 'leads',
        label: 'Leads',
        href: '/marketplace/crm/leads',
        icon: UserCheck,
        entitlementKey: 'crm.leads.manage',
        description: 'Inbound prospective resident inquiries',
      },
      {
        id: 'crm',
        label: 'CRM',
        href: '/marketplace/crm',
        icon: Users2,
        entitlementKey: 'crm.leads.manage',
        description: 'Deal pipeline, staging, and conversion',
      },
      {
        id: 'marketing',
        label: 'Marketing',
        href: '/marketplace',
        icon: Megaphone,
        description: 'Public property listings and vacancy marketing',
      },
    ],
  },
  {
    id: 'insights',
    name: 'Insights',
    icon: LineChart,
    description: 'Portfolio analytics, revenue trends, and forecasts',
    items: [
      {
        id: 'revenue-insights',
        label: 'Revenue Insights',
        href: '/reports?domain=financial',
        icon: TrendingUp,
        description: 'Income realization and cashflow analysis',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        href: '/reports?domain=portfolio',
        icon: BarChart3,
        description: 'Asset utilization and yield benchmark',
      },
      {
        id: 'forecasts',
        label: 'Forecasts',
        href: '/reports?domain=forecasting',
        icon: LineChart,
        description: 'Forward cashflow projections and vacancy risks',
      },
    ],
  },
  {
    id: 'administration',
    name: 'Administration',
    icon: Settings,
    description: 'Team permissions, billing, and settings',
    items: [
      {
        id: 'users',
        label: 'Users',
        href: '/team',
        icon: UserCog,
        roles: ['super_admin', 'landlord'],
        description: 'Team accounts, property managers, and roles',
      },
      {
        id: 'billing',
        label: 'Billing',
        href: '/account/billing',
        icon: CreditCard,
        roles: ['super_admin', 'landlord'],
        description: 'SaaS plan subscriptions and payment methods',
      },
      {
        id: 'roles',
        label: 'Roles',
        href: '/super-admin/control-plane',
        icon: Shield,
        roles: ['super_admin'],
        description: 'Multi-tenant controls and permission governance',
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'Company profile, currency, and preferences',
      },
    ],
  },
];

export const MOBILE_PRIMARY_NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'properties', label: 'Properties', href: '/properties', icon: Building2 },
  { id: 'residents', label: 'Residents', href: '/tenants', icon: Users },
  { id: 'finance', label: 'Finance', href: '/payments?view=collections', icon: CreditCard },
  { id: 'more', label: 'More', href: '#menu', icon: Sliders },
] as const;
