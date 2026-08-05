import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  BarChart3,
  Bot,
  Grid3X3,
  UserRound,
  Users,
  Building2,
  HandCoins,
  CheckSquare,
  Calendar,
  Phone,
  FileText,
  MapPin,
} from 'lucide-react';
import type { SaasEntitlementKey } from '@/hooks/useSaasAccess';

export type CrmNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  entitlementKey: SaasEntitlementKey;
};

export type CrmNavGroup = {
  title: string;
  items: CrmNavItem[];
};

export const CRM_NAV_GROUPS: CrmNavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Overview', href: '/marketplace/crm', icon: LayoutGrid, entitlementKey: 'crm.leads.manage' },
      { label: 'Reports', href: '/marketplace/crm/reports', icon: BarChart3, entitlementKey: 'crm.leads.manage' },
      { label: 'Module Directory', href: '/marketplace/crm/modules', icon: Grid3X3, entitlementKey: 'crm.automation.manage' },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { label: 'Leads', href: '/marketplace/crm/leads', icon: UserRound, entitlementKey: 'crm.leads.manage' },
      { label: 'Contacts', href: '/marketplace/crm/contacts', icon: Users, entitlementKey: 'crm.leads.manage' },
      { label: 'Accounts', href: '/marketplace/crm/accounts', icon: Building2, entitlementKey: 'crm.leads.manage' },
      { label: 'Deals', href: '/marketplace/crm/deals', icon: HandCoins, entitlementKey: 'crm.deals.manage' },
    ],
  },
  {
    title: 'Activities',
    items: [
      { label: 'Tasks', href: '/marketplace/crm/tasks', icon: CheckSquare, entitlementKey: 'crm.calls_meetings.manage' },
      { label: 'Meetings', href: '/marketplace/crm/meetings', icon: Calendar, entitlementKey: 'crm.calls_meetings.manage' },
      { label: 'Calls', href: '/marketplace/crm/calls', icon: Phone, entitlementKey: 'crm.calls_meetings.manage' },
      { label: 'Visits', href: '/marketplace/crm/visits', icon: MapPin, entitlementKey: 'crm.leads.manage' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Automation', href: '/marketplace/crm/automation', icon: Bot, entitlementKey: 'crm.automation.manage' },
    ],
  },
  {
    title: 'Delivery',
    items: [
      { label: 'Documents', href: '/marketplace/crm/documents', icon: FileText, entitlementKey: 'crm.leads.manage' },
    ],
  },
];

export const CRM_NAV_ITEMS = CRM_NAV_GROUPS.flatMap((group) => group.items);