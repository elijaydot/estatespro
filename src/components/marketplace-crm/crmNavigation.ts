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

export type CrmNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type CrmNavGroup = {
  title: string;
  items: CrmNavItem[];
};

export const CRM_NAV_GROUPS: CrmNavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Overview', href: '/marketplace/crm', icon: LayoutGrid },
      { label: 'Reports', href: '/marketplace/crm/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { label: 'Leads', href: '/marketplace/crm/leads', icon: UserRound },
      { label: 'Contacts', href: '/marketplace/crm/contacts', icon: Users },
      { label: 'Accounts', href: '/marketplace/crm/accounts', icon: Building2 },
      { label: 'Deals', href: '/marketplace/crm/deals', icon: HandCoins },
    ],
  },
  {
    title: 'Activities',
    items: [
      { label: 'Tasks', href: '/marketplace/crm/tasks', icon: CheckSquare },
      { label: 'Meetings', href: '/marketplace/crm/meetings', icon: Calendar },
      { label: 'Calls', href: '/marketplace/crm/calls', icon: Phone },
      { label: 'Visits', href: '/marketplace/crm/visits', icon: MapPin },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Automation', href: '/marketplace/crm/automation', icon: Bot },
    ],
  },
  {
    title: 'Delivery',
    items: [
      { label: 'Documents', href: '/marketplace/crm/documents', icon: FileText },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Module Directory', href: '/marketplace/crm/modules', icon: Grid3X3 },
    ],
  },
];

export const CRM_NAV_ITEMS = CRM_NAV_GROUPS.flatMap((group) => group.items);