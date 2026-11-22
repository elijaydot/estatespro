/**
 * FishGate Enterprise Information Architecture (IA)
 * Aligned with Microsoft 365, Atlassian Cloud, Stripe, and Linear.
 *
 * NAVIGATION RULES:
 * - Maximum hierarchy depth: 2 Levels. Never exceed 2 levels.
 * - No nested menu trees.
 * - Exactly 8 primary navigation groups:
 *   1. DASHBOARD
 *   2. PROPERTY
 *   3. FINANCIALS
 *   4. OPERATIONS
 *   5. RELATIONSHIPS
 *   6. ANALYTICS
 *   7. AUTOMATION
 *   8. ADMINISTRATION
 * - Complete retention of all capabilities, entitlements, and roles.
 */

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Wrench,
  Users2,
  BarChart3,
  Zap,
  Settings,
  Home,
  Users,
  FileText,
  Receipt,
  RotateCcw,
  Activity,
  ClipboardList,
  CheckSquare,
  MessageSquare,
  Send,
  UserCheck,
  TrendingUp,
  BrainCircuit,
  Sliders,
  Bell,
  Radio,
  Shield,
  UserCog,
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
    description: 'Executive command center and real-time operational picture',
    items: [
      {
        id: 'command-center',
        label: 'Command Center',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Attention center, business health, and financial pulse',
      },
      {
        id: 'activity-center',
        label: 'Activity Center',
        href: '/dashboard?view=activity',
        icon: Activity,
        description: 'Audit events, recent transactions, and system timeline',
      },
    ],
  },
  {
    id: 'property',
    name: 'Property',
    icon: Building2,
    description: 'Portfolio real estate assets, physical inventory, and resident occupancy',
    items: [
      {
        id: 'properties',
        label: 'Properties',
        href: '/properties',
        icon: Building2,
        description: 'Multi-family, commercial, and residential estates',
      },
      {
        id: 'units',
        label: 'Units',
        href: '/units',
        icon: Home,
        description: 'Individual rentable spaces, floorplans, and availability',
      },
      {
        id: 'tenants',
        label: 'Tenants',
        href: '/tenants',
        icon: Users,
        description: 'Resident directory, contact records, and profiles',
      },
      {
        id: 'leases',
        label: 'Leases',
        href: '/leases',
        icon: FileText,
        description: 'Active agreements, term expirations, and digital signing',
      },
    ],
  },
  {
    id: 'financials',
    name: 'Financials',
    icon: CreditCard,
    description: 'Rent roll collections, payment gateway, invoices, and operating expenses',
    items: [
      {
        id: 'rent-collection',
        label: 'Rent Collection',
        href: '/payments?view=collections',
        icon: CreditCard,
        description: 'Active collections velocity, arrears tracking, and Momo/Card checkout',
      },
      {
        id: 'payments',
        label: 'Payments',
        href: '/payments',
        icon: RotateCcw,
        description: 'Settled payments, Momo verification, and RRA fiscal receipts',
      },
      {
        id: 'transactions',
        label: 'Transactions',
        href: '/invoices',
        icon: Receipt,
        description: 'Invoices, credit notes, and statement ledger entries',
      },
      {
        id: 'expenses',
        label: 'Expenses',
        href: '/recurring-bills',
        icon: Receipt,
        description: 'Utility schedules, vendor payables, and recurring operating bills',
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: Wrench,
    description: 'Property maintenance, technician work orders, inspections, and assigned tasks',
    items: [
      {
        id: 'maintenance',
        label: 'Maintenance',
        href: '/maintenance',
        icon: Wrench,
        description: 'Tenant maintenance tickets, severity triage, and service logs',
      },
      {
        id: 'inspections',
        label: 'Inspections',
        href: '/maintenance?tab=inspections',
        icon: ClipboardList,
        description: 'Move-in/move-out property condition audits and checklists',
      },
      {
        id: 'work-orders',
        label: 'Work Orders',
        href: '/maintenance?tab=work-orders',
        icon: CheckSquare,
        description: 'Technician dispatches, purchase orders, and vendor allocations',
      },
      {
        id: 'tasks',
        label: 'Tasks',
        href: '/marketplace/crm/tasks',
        icon: CheckSquare,
        entitlementKey: 'crm.leads.manage',
        description: 'Action items, operational deadlines, and team assignments',
      },
    ],
  },
  {
    id: 'relationships',
    name: 'Relationships',
    icon: Users2,
    description: 'CRM deal pipeline, tenant communications, broadcasts, and contacts',
    items: [
      {
        id: 'crm',
        label: 'CRM',
        href: '/marketplace/crm',
        icon: Users2,
        entitlementKey: 'crm.leads.manage',
        description: 'Deal pipeline stages, customer lifecycle, and conversion tracking',
      },
      {
        id: 'leads',
        label: 'Leads',
        href: '/marketplace/crm/leads',
        icon: UserCheck,
        entitlementKey: 'crm.leads.manage',
        description: 'Prospective tenant inquiries, staging pipelines, and follow-ups',
      },
      {
        id: 'messages',
        label: 'Messages',
        href: '/messages',
        icon: MessageSquare,
        description: 'Direct messaging channel between management and residents',
      },
      {
        id: 'broadcasts',
        label: 'Broadcasts',
        href: '/broadcasts',
        icon: Send,
        roles: ['super_admin', 'landlord', 'property_manager'],
        description: 'Broadcast SMS, emails, and announcements to all tenants or individuals',
      },
      {
        id: 'contacts',
        label: 'Contacts',
        href: '/marketplace/crm/contacts',
        icon: Users,
        entitlementKey: 'crm.leads.manage',
        description: 'Unified address book across tenants, prospects, and stakeholders',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: BarChart3,
    description: 'Audited financial reports, forward revenue forecasts, and intelligence insights',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        description: 'Rent roll tables, income statements, aging balances, and tax exports',
      },
      {
        id: 'forecasts',
        label: 'Forecasts',
        href: '/reports?tab=forecasts',
        icon: TrendingUp,
        description: 'Revenue trajectory models, cash flow projections, and renewal expectations',
      },
      {
        id: 'portfolio-analytics',
        label: 'Portfolio Analytics',
        href: '/reports?tab=portfolio',
        icon: Building2,
        description: 'Occupancy yield, unit turnover metrics, and cap rate performance',
      },
      {
        id: 'ai-insights',
        label: 'AI Insights',
        href: '/reports?tab=ai',
        icon: BrainCircuit,
        entitlementKey: 'ai.assistant.enabled',
        description: 'Automated trend diagnostics, anomaly detection, and lease intelligence',
      },
    ],
  },
  {
    id: 'automation',
    name: 'Automation',
    icon: Zap,
    description: 'Scheduled workflows, real-time alert triggers, and operational notifications',
    items: [
      {
        id: 'workflows',
        label: 'Workflows',
        href: '/marketplace/crm/automation',
        icon: Sliders,
        entitlementKey: 'crm.automation.manage',
        description: 'Automated rent reminders, late fee application, and lease escalations',
      },
      {
        id: 'triggers',
        label: 'Triggers',
        href: '/alerts',
        icon: Bell,
        description: 'Inbound SLA rules, payment failure monitors, and operational alarms',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: '/notifications',
        icon: Radio,
        description: 'Notification queue, delivery status, and user dispatch logs',
      },
    ],
  },
  {
    id: 'administration',
    name: 'Administration',
    icon: Settings,
    description: 'Organization settings, team access permissions, and subscription billing',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'Organization profile, currency formats, security, and default lease templates',
      },
      {
        id: 'users',
        label: 'Users',
        href: '/team',
        icon: UserCog,
        roles: ['super_admin', 'landlord'],
        description: 'Staff accounts, property manager invitations, and assigned estates',
      },
      {
        id: 'roles',
        label: 'Roles & Control Plane',
        href: '/super-admin/control-plane',
        icon: Shield,
        roles: ['super_admin'],
        description: 'Multi-tenant safety controls, platform governance, and permission matrix',
      },
      {
        id: 'billing',
        label: 'Billing',
        href: '/account/billing',
        icon: CreditCard,
        roles: ['super_admin', 'landlord'],
        description: 'SaaS plan tiers, quota dimensions, usage metering, and invoice receipts',
      },
    ],
  },
];

export const MOBILE_PRIMARY_NAV = [
  { id: 'dashboard', label: 'Command', href: '/dashboard', icon: LayoutDashboard },
  { id: 'financials', label: 'Rent', href: '/payments?view=collections', icon: CreditCard },
  { id: 'operations', label: 'Maintenance', href: '/maintenance', icon: Wrench },
  { id: 'messages', label: 'Messages', href: '/messages', icon: MessageSquare },
  { id: 'more', label: 'Menu', href: '#menu', icon: Sliders },
] as const;
