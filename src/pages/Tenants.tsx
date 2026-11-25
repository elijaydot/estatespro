// src/pages/Tenants.tsx
// FishGate Design Constitution v1.0 - Resident Relationship Management Workspace

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Home,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Loader2,
  Send,
  Copy,
  LogOut,
  ClipboardCheck,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Upload,
  Download,
  AlertTriangle,
  Clock,
  Building2,
  LayoutGrid,
  Table as TableIcon,
  History,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ShieldAlert,
  FileText,
  UserCheck,
  UserPlus,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useTenants, useDeleteTenant, type Tenant } from '@/hooks/useTenants';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useUnits, type Unit } from '@/hooks/useUnits';
import { useTenantInvites, type TenantInvite } from '@/hooks/useTenantInvites';
import { useTenantExits, type TenantExit } from '@/hooks/useTenantExits';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useSettings } from '@/contexts/useSettings';
import { useI18n } from '@/contexts/useI18n';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, isPast, isFuture, parseISO } from 'date-fns';
import { PortalStatusBadge } from '@/components/tenants/PortalStatusBadge';
import { InvitesManagement } from '@/components/invites/InvitesManagement';
import { AddTenantWizard } from '@/components/tenants/AddTenantWizard';
import { EditTenantModal } from '@/components/tenants/EditTenantModal';
import { ImportTenantsModal } from '@/components/tenants/ImportTenantsModal';
import {
  calculateTenantCompleteness,
  TENANT_STATUSES,
  type TenantStatusValue,
} from '@/lib/tenantProfileCompleteness';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import {
  PageContainer,
  PageHeader,
  PageActions,
} from '@/design-system/LayoutFramework';

type ViewMode = 'cards' | 'table' | 'timeline';
type SavedView = 'all' | 'active' | 'overdue' | 'renewals' | 'pending';

const getInitials = (name?: string | null) => {
  if (!name) return 'TN';
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

export default function Tenants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();
  const { t } = useI18n();
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { activeCompanyId } = useActiveCompany();
  const { data: rawCompaniesList = [] } = useMyCompanies();
  const companiesList = Array.isArray(rawCompaniesList) ? rawCompaniesList : [];
  const confirmAction = useConfirmAction();

  // Primary Queries
  const { data: tenants = [], isLoading, refetch: refetchTenants } = useTenants();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: invites = [] } = useTenantInvites();
  const { data: tenantExits = [], isLoading: loadingExits } = useTenantExits();
  const { data: maintenanceRequests = [] } = useMaintenanceRequests();
  const deleteTenant = useDeleteTenant();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('tenants');
  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('fishgate-tenants-view');
    return (saved as ViewMode) || 'cards';
  });
  const [savedView, setSavedView] = useState<SavedView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedBalanceFilter, setSelectedBalanceFilter] = useState('all');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals & Action States
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitingTenant, setInvitingTenant] = useState<Tenant | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  // Sync view preference
  useEffect(() => {
    localStorage.setItem('fishgate-tenants-view', view);
  }, [view]);

  // Handle ?add=true query parameter from Quick Add
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddWizardOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Check if tenant has a pending portal invite
  const hasPendingInvite = (tenantId: string) => {
    return invites.some(
      (inv) =>
        inv.tenant_id === tenantId &&
        !inv.used_at &&
        !isPast(new Date(inv.expires_at))
    );
  };

  // 1. Attention Required Triage Items
  const attentionItems = useMemo(() => {
    const items: {
      tenantId: string;
      tenantName: string;
      propertyName: string;
      unitNumber: string;
      issue: string;
      impact: string;
      actionLabel: string;
      severity: 'critical' | 'warning' | 'info';
      onAction: () => void;
    }[] = [];

    const now = new Date();

    tenants.forEach((tenant) => {
      const propName = tenant.properties?.name || 'Assigned Property';
      const unitNum = tenant.units?.unit_number ? `Unit ${tenant.units.unit_number}` : 'No Unit';
      const balance = Number(tenant.balance) || 0;

      // Overdue Balance (Critical)
      if (balance > 0) {
        items.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          propertyName: propName,
          unitNumber: unitNum,
          issue: `Overdue rent balance of ${formatCurrency(balance)}`,
          impact: 'Unsettled accounts receivable • Payment reminder required',
          actionLabel: 'Contact Resident',
          severity: 'critical',
          onAction: () => navigate(`/tenants/${tenant.id}?tab=messages`),
        });
      }

      // Approaching Lease Expiry (<60 days)
      if (tenant.lease_end_date) {
        const leaseEnd = new Date(tenant.lease_end_date);
        const daysToExpiry = differenceInDays(leaseEnd, now);
        if (daysToExpiry >= 0 && daysToExpiry <= 60) {
          items.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            propertyName: propName,
            unitNumber: unitNum,
            issue: `Lease expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'} (${format(leaseEnd, 'MMM d, yyyy')})`,
            impact: 'Renewal negotiation or transition notice pending',
            actionLabel: 'Review Renewal',
            severity: 'warning',
            onAction: () => navigate(`/tenants/${tenant.id}`),
          });
        }
      }

      // Notice Given / Moving Out
      if (tenant.status === 'notice_given' || tenant.status === 'moving_out') {
        items.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          propertyName: propName,
          unitNumber: unitNum,
          issue: `Departure transition active (${tenant.status.replace('_', ' ')})`,
          impact: 'Move-out inspection and security deposit settlement required',
          actionLabel: 'Manage Exit',
          severity: 'warning',
          onAction: () => setActiveTab('exits'),
        });
      }

      // Missing KYC / Incomplete Profile (<50% completeness or missing ID doc)
      const completeness = calculateTenantCompleteness(tenant);
      if (completeness.score < 50 || (!tenant.id_document && !tenant.id_number)) {
        items.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          propertyName: propName,
          unitNumber: unitNum,
          issue: `Incomplete resident profile (${completeness.score}% complete)`,
          impact: 'Missing essential KYC identification, emergency contact, or employer details',
          actionLabel: 'Complete Profile',
          severity: 'info',
          onAction: () => setEditingTenant(tenant),
        });
      }

      // Maintenance Escalations on Tenant Unit
      if (tenant.unit_id) {
        const tenantTickets = maintenanceRequests.filter(
          (m) =>
            m.unit_id === tenant.unit_id &&
            m.status !== 'completed' &&
            m.status !== 'cancelled' &&
            (m.priority === 'urgent' || m.priority === 'high')
        );
        if (tenantTickets.length > 0) {
          items.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            propertyName: propName,
            unitNumber: unitNum,
            issue: `Urgent maintenance request logged for ${unitNum}`,
            impact: `${tenantTickets.length} active ticket${tenantTickets.length > 1 ? 's' : ''} impacting resident satisfaction`,
            actionLabel: 'View Ticket',
            severity: 'warning',
            onAction: () => navigate('/operations/maintenance'),
          });
        }
      }
    });

    return items;
  }, [tenants, maintenanceRequests, formatCurrency, navigate]);

  // 2. Resident Summary KPIs (Max 4 Cards)
  const residentSummary = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.status === 'active').length;
    const now = new Date();

    // Move-ins within last 30 days
    const moveInsThisMonth = tenants.filter((t) => {
      if (!t.move_in_date) return false;
      try {
        const moveDate = parseISO(t.move_in_date);
        const days = differenceInDays(now, moveDate);
        return days >= 0 && days <= 30;
      } catch {
        return false;
      }
    }).length;

    // Lease Renewals Due within next 60 days
    const renewalsDue = tenants.filter((t) => {
      if (!t.lease_end_date) return false;
      try {
        const end = parseISO(t.lease_end_date);
        const days = differenceInDays(end, now);
        return days >= 0 && days <= 60;
      } catch {
        return false;
      }
    }).length;

    // Residents needing attention (unique tenant count)
    const uniqueAttentionTenants = new Set(attentionItems.map((a) => a.tenantId)).size;

    return {
      activeCount: active,
      totalCount: total,
      moveInsThisMonth,
      renewalsDue,
      attentionCount: uniqueAttentionTenants,
    };
  }, [tenants, attentionItems]);

  // 3. Filtered Tenants for Primary Workspace
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // Organization Filter (Super Admin)
      const tenantCompanyId =
        tenant.company_id ||
        tenant.properties?.company_id ||
        (tenant.properties as { companies?: { id?: string } | null })?.companies?.id;
      if (selectedOrgFilter !== 'all' && tenantCompanyId && tenantCompanyId !== selectedOrgFilter) {
        return false;
      }

      // Saved View Pills
      if (savedView === 'active') {
        if (tenant.status !== 'active') return false;
      } else if (savedView === 'overdue') {
        if ((Number(tenant.balance) || 0) <= 0) return false;
      } else if (savedView === 'renewals') {
        if (!tenant.lease_end_date) return false;
        const days = differenceInDays(new Date(tenant.lease_end_date), new Date());
        if (days < 0 || days > 60) return false;
      } else if (savedView === 'pending') {
        if (!['prospective', 'pending_approval', 'approved', 'notice_given', 'moving_out'].includes(tenant.status)) {
          return false;
        }
      }

      // Property Filter
      if (selectedPropertyFilter !== 'all' && tenant.property_id !== selectedPropertyFilter) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all' && tenant.status !== selectedStatusFilter) {
        return false;
      }

      // Balance Filter
      if (selectedBalanceFilter === 'overdue' && (Number(tenant.balance) || 0) <= 0) return false;
      if (selectedBalanceFilter === 'settled' && (Number(tenant.balance) || 0) > 0) return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = tenant.name?.toLowerCase().includes(q);
        const matchesEmail = tenant.email?.toLowerCase().includes(q);
        const matchesPhone = tenant.phone?.toLowerCase().includes(q);
        const matchesProperty = tenant.properties?.name?.toLowerCase().includes(q);
        const matchesUnit = tenant.units?.unit_number?.toLowerCase().includes(q);
        const matchesOrg = (tenant.properties as { companies?: { name?: string } | null })?.companies?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesProperty && !matchesUnit && !matchesOrg) {
          return false;
        }
      }

      return true;
    });
  }, [
    tenants,
    selectedOrgFilter,
    savedView,
    selectedPropertyFilter,
    selectedStatusFilter,
    selectedBalanceFilter,
    searchQuery,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedPropertyFilter, selectedStatusFilter, selectedBalanceFilter, selectedOrgFilter, savedView, pageSize]);

  const paginatedTenants = useMemo(() => {
    return filteredTenants.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredTenants, page, pageSize]);

  // 4. Lifecycle Framework Counts for Interactive Tracker
  const lifecycleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TENANT_STATUSES.forEach((s) => {
      counts[s.value] = 0;
    });
    tenants.forEach((t) => {
      const st = t.status || 'active';
      if (counts[st] !== undefined) {
        counts[st] += 1;
      } else {
        counts[st] = 1;
      }
    });
    return counts;
  }, [tenants]);

  // 5. Relationship Timeline Events Stream
  const relationshipTimeline = useMemo(() => {
    const events: {
      id: string;
      date: Date;
      displayDate: string;
      tenant: Tenant;
      type: 'move_in' | 'lease_end' | 'notice' | 'onboarded';
      title: string;
      badgeText: string;
      badgeVariant: 'success' | 'warning' | 'destructive' | 'neutral';
      description: string;
    }[] = [];

    tenants.forEach((t) => {
      // Move-in milestone
      if (t.move_in_date) {
        try {
          const moveDate = parseISO(t.move_in_date);
          events.push({
            id: `${t.id}-movein`,
            date: moveDate,
            displayDate: format(moveDate, 'MMM d, yyyy'),
            tenant: t,
            type: 'move_in',
            title: `${t.name} moved in`,
            badgeText: 'Occupancy Milestone',
            badgeVariant: 'success',
            description: `Occupied ${t.units ? `Unit ${t.units.unit_number}` : 'assigned unit'} at ${t.properties?.name || 'property'}.`,
          });
        } catch {
          // ignore date parse errors
        }
      }

      // Lease expiry milestone
      if (t.lease_end_date) {
        try {
          const endDate = parseISO(t.lease_end_date);
          const daysLeft = differenceInDays(endDate, new Date());
          events.push({
            id: `${t.id}-leaseend`,
            date: endDate,
            displayDate: format(endDate, 'MMM d, yyyy'),
            tenant: t,
            type: 'lease_end',
            title: `Lease renewal deadline for ${t.name}`,
            badgeText: daysLeft < 0 ? 'Lease Expired' : daysLeft <= 30 ? 'Expiring Imminent' : 'Upcoming Expiry',
            badgeVariant: daysLeft < 0 ? 'destructive' : daysLeft <= 30 ? 'warning' : 'neutral',
            description: `Scheduled end of term for lease agreement. Current monthly rate: ${formatCurrency(t.monthly_rent || 0)}.`,
          });
        } catch {
          // ignore
        }
      }

      // Exit notice
      if (t.status === 'notice_given' || t.status === 'moving_out') {
        const now = new Date();
        events.push({
          id: `${t.id}-notice`,
          date: now,
          displayDate: 'Current Active Transition',
          tenant: t,
          type: 'notice',
          title: `Exit notice lodged: ${t.name}`,
          badgeText: 'Notice Given',
          badgeVariant: 'warning',
          description: `Resident scheduled for departure inspection and security deposit review.`,
        });
      }
    });

    // Sort descending by event date
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [tenants, formatCurrency]);

  // 6. Calm Operational Observations (FishGate Constitution Rule: ZERO mentions of AI)
  const observations = useMemo(() => {
    const list: { title: string; detail: string; variant: 'neutral' | 'success' | 'warning' }[] = [];
    const total = tenants.length;
    if (total === 0) return list;

    const activeCount = tenants.filter((t) => t.status === 'active').length;
    const activePct = Math.round((activeCount / total) * 100);

    list.push({
      title: 'Occupancy & Resident Retention',
      detail: `${activePct}% of enrolled residents (${activeCount} of ${total}) are actively occupying leased spaces in good standing across the portfolio.`,
      variant: activePct >= 80 ? 'success' : 'neutral',
    });

    const overdueCount = tenants.filter((t) => (Number(t.balance) || 0) > 0).length;
    if (overdueCount > 0) {
      const totalOverdue = tenants.reduce((acc, t) => acc + (Number(t.balance) || 0), 0);
      list.push({
        title: 'Payment Settlement Horizon',
        detail: `${overdueCount} resident account${overdueCount > 1 ? 's' : ''} have open balances totaling ${formatCurrency(totalOverdue)}. Follow-up communication is recommended prior to month-end.`,
        variant: 'warning',
      });
    } else {
      list.push({
        title: 'Arrears & Payment Health',
        detail: 'All resident accounts are completely settled with zero overdue balances across the portfolio.',
        variant: 'success',
      });
    }

    const avgCompleteness = Math.round(
      tenants.reduce((acc, t) => acc + calculateTenantCompleteness(t).score, 0) / total
    );
    list.push({
      title: 'Data Quality & KYC Records',
      detail: `Resident profiles average ${avgCompleteness}% data completeness. Complete identification and emergency contacts facilitate streamlined operations.`,
      variant: 'neutral',
    });

    return list;
  }, [tenants, formatCurrency]);

  // CSV Export Handler
  const handleExportCsv = () => {
    if (filteredTenants.length === 0) {
      toast({ title: 'No data to export', description: 'Filter returned zero residents to export.' });
      return;
    }

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Property',
      'Unit',
      'Status',
      'Move In Date',
      'Lease End Date',
      'Monthly Rent',
      'Balance',
      'Completeness Score',
    ];

    const rows = filteredTenants.map((t) => [
      `"${t.name || ''}"`,
      `"${t.email || ''}"`,
      `"${t.phone || ''}"`,
      `"${t.properties?.name || ''}"`,
      `"${t.units?.unit_number || ''}"`,
      `"${t.status || 'active'}"`,
      `"${t.move_in_date || ''}"`,
      `"${t.lease_end_date || ''}"`,
      t.monthly_rent || 0,
      t.balance || 0,
      `"${calculateTenantCompleteness(t).score}%"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `residents-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Residents Exported',
      description: `Successfully exported ${filteredTenants.length} resident records to CSV.`,
    });
  };

  // Delete Action
  const handleDelete = async (tenant: Tenant) => {
    const confirmed = await confirmAction({
      title: 'Remove resident record?',
      description: `Remove ${tenant.name} from the active resident registry? This will dissociate linked agreements and unit assignments.`,
      confirmLabel: 'Remove Resident',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTenant.mutateAsync(tenant.id);
      toast({ title: 'Resident Removed', description: `${tenant.name} has been removed.` });
    } catch (err) {
      toast({ title: 'Error removing resident', description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  // Portal Invite Actions
  const handleSendInvite = async () => {
    if (!invitingTenant) return;
    setIsSendingInvite(true);
    try {
      if (!user) throw new Error('Not authenticated');

      const property = properties.find((p) => p.id === invitingTenant.property_id);

      const { data, error } = await supabase.functions.invoke('send-tenant-invite', {
        body: {
          tenantId: invitingTenant.id,
          email: invitingTenant.email,
          landlordName: user?.email || 'Property Manager',
          propertyName: property?.name || 'Your Property',
          origin: window.location.origin,
          companyId: activeCompanyId,
        },
      });

      if (error) throw new Error(error.message || 'Failed to send invite');

      if (data?.emailSent === false && data?.inviteLink) {
        await navigator.clipboard.writeText(data.inviteLink);
        toast({
          title: 'Invite Link Copied',
          description: 'Email service requires domain verification. The invitation link has been copied to your clipboard.',
        });
      } else {
        toast({ title: 'Invitation Sent', description: `Portal invite delivered to ${invitingTenant.email}` });
      }

      setIsInviteDialogOpen(false);
      setInvitingTenant(null);
    } catch (error: unknown) {
      toast({ title: 'Invitation Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyInviteLink = async (tenant: Tenant) => {
    setIsCopyingLink(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const token = crypto.randomUUID() + '-' + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('tenant_invites').insert({
        tenant_id: tenant.id,
        email: tenant.email,
        token,
        expires_at: expiresAt.toISOString(),
        user_id: currentUser.id,
      });

      if (error) throw error;

      const inviteLink = `${window.location.origin}/tenant/signup?invite=${token}`;
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Invite Link Copied',
        description: 'Resident registration link copied to clipboard. Share via SMS or WhatsApp.',
      });
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsCopyingLink(false);
    }
  };

  const getLeaseBadge = (leaseEnd: string | null | undefined) => {
    if (!leaseEnd) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
          No Lease
        </span>
      );
    }
    const days = differenceInDays(new Date(leaseEnd), new Date());
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          Expired
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Expires in {days}d
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        Current Lease
      </span>
    );
  };

  const getStatusBadge = (statusValue: string | null | undefined) => {
    const found = TENANT_STATUSES.find((s) => s.value === statusValue) || {
      label: statusValue ? statusValue.replace('_', ' ') : 'Active',
      color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
    };
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', found.color)}>
        {found.label}
      </span>
    );
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* ====================================================
          SECTION 1: HEADER
      ==================================================== */}
      <PageHeader
        title={t('tenants', 'Tenants')}
        description={t(
          'page_tenants_subtitle',
          'Manage resident relationships, leasing agreements, payment health, and lifecycle stages across the portfolio.'
        )}
        actions={
          <PageActions>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 text-xs font-medium"
              onClick={handleExportCsv}
            >
              <Download className="h-3.5 w-3.5" />
              {t('action_export_residents', 'Export Residents')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 text-xs font-medium"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {t('action_import_residents', 'Import Residents')}
            </Button>

            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 text-xs shadow-xs"
              onClick={() => setIsAddWizardOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('action_add_tenant', 'Add Tenant')}
            </Button>
          </PageActions>
        }
      />

      {/* Tabs: Workspace / Portal Invites / Exits */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 space-y-6">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="tenants" className="gap-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            {t('tab_residents', 'All Residents')}
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
              {tenants.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2 text-xs">
            <Mail className="h-3.5 w-3.5" />
            {t('tab_portal_invites', 'Portal Invites')}
            {invites.filter((i) => !i.used_at).length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {invites.filter((i) => !i.used_at).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="exits" className="gap-2 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            {t('tab_tenant_exits', 'Tenant Exits')}
            {tenantExits.filter((e) => e.status !== 'completed').length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {tenantExits.filter((e) => e.status !== 'completed').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RESIDENTS WORKSPACE */}
        <TabsContent value="tenants" className="space-y-6 mt-0">
          {/* ====================================================
              SECTION 2: RESIDENT SUMMARY (MAX 4 CARDS)
          ==================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Active Tenants */}
            <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Tenants
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {residentSummary.activeCount}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      of {residentSummary.totalCount} enrolled
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {residentSummary.totalCount > 0
                      ? `${Math.round((residentSummary.activeCount / residentSummary.totalCount) * 100)}% active occupancy`
                      : '0% occupancy'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <UserCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Move-ins This Month */}
            <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Move-ins This Month
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {residentSummary.moveInsThisMonth}
                    </span>
                    <span className="text-xs text-muted-foreground">in last 30 days</span>
                  </div>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    New resident transitions
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Lease Renewals Due */}
            <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Lease Renewals Due
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {residentSummary.renewalsDue}
                    </span>
                    <span className="text-xs text-muted-foreground">within 60 days</span>
                  </div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    Upcoming renewal discussions
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Residents Requiring Attention */}
            <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Needing Attention
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={cn(
                        'text-2xl font-bold',
                        residentSummary.attentionCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                      )}
                    >
                      {residentSummary.attentionCount}
                    </span>
                    <span className="text-xs text-muted-foreground">resident alerts</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {residentSummary.attentionCount > 0
                      ? 'Arrears, renewals, or incomplete KYC'
                      : 'All resident accounts optimal'}
                  </p>
                </div>
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                    residentSummary.attentionCount > 0
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ====================================================
              SECTION 3: ATTENTION REQUIRED (TRIAGE LIST)
          ==================================================== */}
          {attentionItems.length > 0 ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Attention Required ({attentionItems.length} Action Items)
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  Proactive relationship triage
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {attentionItems.slice(0, 6).map((item, idx) => (
                  <div
                    key={`${item.tenantId}-${idx}`}
                    className="p-3 bg-card rounded-lg border border-border shadow-2xs flex flex-col justify-between gap-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {item.tenantName}
                        </span>
                        <Badge
                          variant={item.severity === 'critical' ? 'destructive' : 'secondary'}
                          className="text-[10px] uppercase h-4 px-1"
                        >
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {item.unitNumber} • {item.propertyName}
                      </p>
                      <p className="text-xs font-medium text-foreground mt-1.5 line-clamp-1">
                        {item.issue}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {item.impact}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-[11px] font-medium justify-between mt-1 hover:bg-muted"
                      onClick={item.onAction}
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>All resident accounts are in good standing • No immediate relationship interventions required.</span>
              </div>
            </div>
          )}

          {/* ====================================================
              SECTION 4: TENANT EXPLORER (PRIMARY WORKSPACE)
          ==================================================== */}
          <div className="space-y-4">
            {/* Saved View Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant={savedView === 'all' ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs font-medium gap-1.5 rounded-full',
                    savedView === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => setSavedView('all')}
                >
                  All Residents
                  <span className="opacity-70">({tenants.length})</span>
                </Button>

                <Button
                  size="sm"
                  variant={savedView === 'active' ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs font-medium gap-1.5 rounded-full',
                    savedView === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => setSavedView('active')}
                >
                  Active & Leased
                  <span className="opacity-70">
                    ({tenants.filter((t) => t.status === 'active').length})
                  </span>
                </Button>

                <Button
                  size="sm"
                  variant={savedView === 'overdue' ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs font-medium gap-1.5 rounded-full',
                    savedView === 'overdue' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => setSavedView('overdue')}
                >
                  Overdue Balance
                  <span className="opacity-70">
                    ({tenants.filter((t) => (Number(t.balance) || 0) > 0).length})
                  </span>
                </Button>

                <Button
                  size="sm"
                  variant={savedView === 'renewals' ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs font-medium gap-1.5 rounded-full',
                    savedView === 'renewals' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => setSavedView('renewals')}
                >
                  Renewal Horizon (60d)
                  <span className="opacity-70">
                    ({
                      tenants.filter((t) => {
                        if (!t.lease_end_date) return false;
                        const days = differenceInDays(new Date(t.lease_end_date), new Date());
                        return days >= 0 && days <= 60;
                      }).length
                    })
                  </span>
                </Button>

                <Button
                  size="sm"
                  variant={savedView === 'pending' ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs font-medium gap-1.5 rounded-full',
                    savedView === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => setSavedView('pending')}
                >
                  Pending & Notice
                  <span className="opacity-70">
                    ({
                      tenants.filter((t) =>
                        ['prospective', 'pending_approval', 'approved', 'notice_given', 'moving_out'].includes(t.status)
                      ).length
                    })
                  </span>
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 px-2.5 text-xs font-medium gap-1.5',
                    view === 'cards' && 'bg-background text-foreground shadow-2xs'
                  )}
                  onClick={() => setView('cards')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 px-2.5 text-xs font-medium gap-1.5',
                    view === 'table' && 'bg-background text-foreground shadow-2xs'
                  )}
                  onClick={() => setView('table')}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Table
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 px-2.5 text-xs font-medium gap-1.5',
                    view === 'timeline' && 'bg-background text-foreground shadow-2xs'
                  )}
                  onClick={() => setView('timeline')}
                >
                  <History className="h-3.5 w-3.5" />
                  Timeline
                </Button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search residents by name, email, phone, property, or unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Property Filter */}
              <div className="w-full md:w-48">
                <Select value={selectedPropertyFilter} onValueChange={setSelectedPropertyFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏢 All Properties</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-44">
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {TENANT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Balance Filter */}
              <div className="w-full md:w-36">
                <Select value={selectedBalanceFilter} onValueChange={setSelectedBalanceFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Balances" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Balances</SelectItem>
                    <SelectItem value="overdue">Overdue Arrears</SelectItem>
                    <SelectItem value="settled">Settled ($0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Organization Filter (SuperAdmin) */}
              {isSuperAdmin && companiesList.length > 0 && (
                <div className="w-full md:w-48">
                  <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Organizations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🏢 All Organizations</SelectItem>
                      {companiesList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredTenants.length === 0 && (
              <EmptyState
                icon={Users}
                title="No residents found"
                description={
                  searchQuery || selectedPropertyFilter !== 'all' || selectedStatusFilter !== 'all'
                    ? 'No residents match your active search filters. Try clearing your filters.'
                    : 'Get started by adding your first resident or importing your roster.'
                }
                action={
                  searchQuery || selectedPropertyFilter !== 'all' || selectedStatusFilter !== 'all' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedPropertyFilter('all');
                        setSelectedStatusFilter('all');
                        setSelectedBalanceFilter('all');
                        setSavedView('all');
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset Filters
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setIsAddWizardOpen(true)}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add First Tenant
                    </Button>
                  )
                }
              />
            )}

            {/* 1. CARDS VIEW (STORYTELLING RESIDENT CARDS) */}
            {!isLoading && view === 'cards' && paginatedTenants.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedTenants.map((tenant) => {
                    const completeness = calculateTenantCompleteness(tenant);
                    const balance = Number(tenant.balance) || 0;
                    const monthlyRent = Number(tenant.monthly_rent) || 0;

                    return (
                      <Card
                        key={tenant.id}
                        className="p-4 border border-border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Top: Avatar, Name, Unit, Menu */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-11 w-11 shrink-0 border border-border">
                                {tenant.avatar_url && (
                                  <AvatarImage src={tenant.avatar_url} alt={tenant.name} />
                                )}
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                  {getInitials(tenant.name)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <h4
                                  className="font-semibold text-foreground truncate cursor-pointer hover:underline text-sm"
                                  onClick={() => navigate(`/tenants/${tenant.id}`)}
                                >
                                  {tenant.name}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {tenant.units ? `Unit ${tenant.units.unit_number}` : 'No Unit'} •{' '}
                                  {tenant.properties?.name || 'Unassigned'}
                                </p>
                                {(tenant.properties as { companies?: { name?: string } | null })?.companies?.name && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary font-medium mt-0.5">
                                    🏢 {(tenant.properties as { companies?: { name?: string } | null }).companies?.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onSelect={() => navigate(`/tenants/${tenant.id}`)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" /> View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setEditingTenant(tenant)}>
                                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => navigate(`/tenants/${tenant.id}?tab=messages`)}>
                                  <Mail className="h-3.5 w-3.5 mr-2" /> Send Message
                                </DropdownMenuItem>
                                {!tenant.tenant_user_id && (
                                  <>
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setInvitingTenant(tenant);
                                        setIsInviteDialogOpen(true);
                                      }}
                                    >
                                      <Send className="h-3.5 w-3.5 mr-2" /> Send Portal Invite
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => handleCopyInviteLink(tenant)}
                                      disabled={isCopyingLink}
                                    >
                                      <Copy className="h-3.5 w-3.5 mr-2" /> Copy Invite Link
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => handleDelete(tenant)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Status Badges Row */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-3">
                            {getStatusBadge(tenant.status)}
                            {getLeaseBadge(tenant.lease_end_date)}
                            <PortalStatusBadge
                              tenantUserId={tenant.tenant_user_id}
                              hasPendingInvite={hasPendingInvite(tenant.id)}
                            />
                          </div>

                          {/* Completeness Meter */}
                          <div className="mt-3 bg-muted/40 p-2 rounded-md">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-muted-foreground">Profile Completeness</span>
                              <span className="font-semibold text-foreground">{completeness.score}%</span>
                            </div>
                            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-300',
                                  completeness.score >= 80
                                    ? 'bg-emerald-500'
                                    : completeness.score >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                )}
                                style={{ width: `${completeness.score}%` }}
                              />
                            </div>
                            {completeness.missingFields.length > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                Missing: {completeness.missingFields.slice(0, 2).join(', ')}
                                {completeness.missingFields.length > 2 && ` +${completeness.missingFields.length - 2} more`}
                              </p>
                            )}
                          </div>

                          {/* Contact & Agreement Info */}
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2 truncate">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{tenant.email || 'No email provided'}</span>
                            </div>
                            <div className="flex items-center gap-2 truncate">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{tenant.phone || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center gap-2 truncate">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {tenant.move_in_date
                                  ? `Moved in ${format(new Date(tenant.move_in_date), 'MMM d, yyyy')}`
                                  : 'No move-in date'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom: Financials & Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Balance</p>
                            <p
                              className={cn(
                                'text-sm font-semibold',
                                balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              )}
                            >
                              {formatCurrency(balance)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5 font-medium"
                              onClick={() => setEditingTenant(tenant)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs px-2.5 font-medium"
                              onClick={() => navigate(`/tenants/${tenant.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={filteredTenants.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}

            {/* 2. TABLE VIEW */}
            {!isLoading && view === 'table' && paginatedTenants.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Resident Profile</TableHead>
                        <TableHead>Unit & Property</TableHead>
                        <TableHead>Lifecycle Status</TableHead>
                        <TableHead>Lease Duration</TableHead>
                        <TableHead>Financials</TableHead>
                        <TableHead>Contact & Access</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTenants.map((tenant) => {
                        const completeness = calculateTenantCompleteness(tenant);
                        const balance = Number(tenant.balance) || 0;

                        return (
                          <TableRow key={tenant.id} className="hover:bg-muted/30">
                            {/* Resident Profile */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 border border-border">
                                  {tenant.avatar_url && (
                                    <AvatarImage src={tenant.avatar_url} alt={tenant.name} />
                                  )}
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                    {getInitials(tenant.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <span
                                    className="font-medium text-foreground cursor-pointer hover:underline text-sm block truncate"
                                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                                  >
                                    {tenant.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {completeness.score}% KYC
                                    </span>
                                    <div className="w-12 bg-border h-1 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          'h-full',
                                          completeness.score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                                        )}
                                        style={{ width: `${completeness.score}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Unit & Property */}
                            <TableCell>
                              <div>
                                <p className="font-medium text-xs text-foreground">
                                  {tenant.units ? `Unit ${tenant.units.unit_number}` : 'Unassigned'}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {tenant.properties?.name || 'No property'}
                                </p>
                                {(tenant.properties as { companies?: { name?: string } | null })?.companies?.name && (
                                  <span className="text-[10px] text-primary">
                                    🏢 {(tenant.properties as { companies?: { name?: string } | null }).companies?.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Lifecycle Status */}
                            <TableCell>
                              {getStatusBadge(tenant.status)}
                            </TableCell>

                            {/* Lease Duration */}
                            <TableCell>
                              <div className="space-y-1">
                                {getLeaseBadge(tenant.lease_end_date)}
                                {tenant.lease_end_date && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Expires {format(new Date(tenant.lease_end_date), 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            {/* Financials */}
                            <TableCell>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Rent: <span className="text-foreground font-medium">{formatCurrency(tenant.monthly_rent || 0)}</span>
                                </p>
                                <p
                                  className={cn(
                                    'text-xs font-semibold',
                                    balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                  )}
                                >
                                  {balance > 0 ? `Arrears: ${formatCurrency(balance)}` : 'Settled ($0)'}
                                </p>
                              </div>
                            </TableCell>

                            {/* Contact & Access */}
                            <TableCell>
                              <div className="space-y-0.5 text-xs text-muted-foreground">
                                <p className="truncate max-w-[150px]">{tenant.email}</p>
                                <p>{tenant.phone}</p>
                                <div className="mt-1">
                                  <PortalStatusBadge
                                    tenantUserId={tenant.tenant_user_id}
                                    hasPendingInvite={hasPendingInvite(tenant.id)}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={() => setEditingTenant(tenant)}
                                  title="Edit Resident"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={() => navigate(`/tenants/${tenant.id}`)}
                                  title="View Profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem onSelect={() => navigate(`/tenants/${tenant.id}?tab=messages`)}>
                                      <Mail className="h-3.5 w-3.5 mr-2" /> Message
                                    </DropdownMenuItem>
                                    {!tenant.tenant_user_id && (
                                      <>
                                        <DropdownMenuItem
                                          onSelect={() => {
                                            setInvitingTenant(tenant);
                                            setIsInviteDialogOpen(true);
                                          }}
                                        >
                                          <Send className="h-3.5 w-3.5 mr-2" /> Send Portal Invite
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={() => handleCopyInviteLink(tenant)}
                                          disabled={isCopyingLink}
                                        >
                                          <Copy className="h-3.5 w-3.5 mr-2" /> Copy Link
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={() => handleDelete(tenant)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={filteredTenants.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}

            {/* 3. TIMELINE VIEW */}
            {!isLoading && view === 'timeline' && (
              <div className="space-y-4">
                {relationshipTimeline.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="No timeline events recorded"
                    description="Move-in milestones and lease renewal horizons will populate as leases are assigned."
                  />
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {relationshipTimeline.slice(0, 20).map((event) => (
                      <div key={event.id} className="relative flex items-start gap-4">
                        {/* Dot indicator */}
                        <div
                          className={cn(
                            'absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-background',
                            event.badgeVariant === 'success' && 'bg-emerald-500',
                            event.badgeVariant === 'warning' && 'bg-amber-500',
                            event.badgeVariant === 'destructive' && 'bg-rose-500',
                            event.badgeVariant === 'neutral' && 'bg-blue-500'
                          )}
                        />

                        {/* Event Card */}
                        <Card className="flex-1 p-3 border border-border shadow-2xs hover:shadow-xs transition-shadow">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground">
                                {event.title}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] h-4 px-1.5 font-medium',
                                  event.badgeVariant === 'success' && 'bg-emerald-500/10 text-emerald-600',
                                  event.badgeVariant === 'warning' && 'bg-amber-500/10 text-amber-600',
                                  event.badgeVariant === 'destructive' && 'bg-rose-500/10 text-rose-600'
                                )}
                              >
                                {event.badgeText}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {event.displayDate}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1">
                            {event.description}
                          </p>

                          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {event.tenant.avatar_url && (
                                  <AvatarImage src={event.tenant.avatar_url} />
                                )}
                                <AvatarFallback className="text-[9px]">
                                  {getInitials(event.tenant.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground text-[11px]">
                                {event.tenant.name}
                              </span>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2"
                              onClick={() => navigate(`/tenants/${event.tenant.id}`)}
                            >
                              View Resident Profile
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ====================================================
              SECTION 5: RESIDENT LIFECYCLE TRACKER (9-STAGE FRAMEWORK)
          ==================================================== */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resident Lifecycle Framework (9 Stages)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Portfolio resident distribution across the relationship lifecycle. Click any stage to filter.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setSelectedStatusFilter('all')}
              >
                Clear Stage Filter
              </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
              {TENANT_STATUSES.map((status) => {
                const count = lifecycleCounts[status.value] || 0;
                const isSelected = selectedStatusFilter === status.value;

                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() =>
                      setSelectedStatusFilter(isSelected ? 'all' : status.value)
                    }
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-border/80 bg-muted/20 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-bold text-foreground">
                        {count}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <p className="text-[11px] font-medium text-foreground truncate">
                      {status.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ====================================================
              SECTION 6: RELATIONSHIP OBSERVATIONS (CALM, STRICTLY NO AI)
          ==================================================== */}
          {observations.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Operational Observations
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-card rounded-lg border border-border/80 text-xs space-y-1"
                  >
                    <p className="font-semibold text-foreground">{obs.title}</p>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {obs.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PORTAL INVITES MANAGEMENT */}
        <TabsContent value="invites" className="mt-0 space-y-4">
          <InvitesManagement />
        </TabsContent>

        {/* TAB 3: TENANT EXITS MANAGEMENT */}
        <TabsContent value="exits" className="mt-0 space-y-4">
          {loadingExits ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tenantExits.length === 0 ? (
            <EmptyState
              icon={LogOut}
              title="No exit processes active"
              description="Departure and deposit settlement workflows will appear here when initiated from a resident's profile."
            />
          ) : (
            <div className="space-y-3">
              {tenantExits.map((exit) => {
                const statusConfig: Record<
                  string,
                  { label: string; variant: 'success' | 'warning' | 'info' | 'neutral'; icon: typeof ClipboardCheck }
                > = {
                  inspection_pending: { label: 'Inspection Pending', variant: 'warning', icon: ClipboardCheck },
                  inspection_complete: { label: 'Inspection Complete', variant: 'info', icon: ClipboardCheck },
                  deposit_decided: { label: 'Deposit Decided', variant: 'info', icon: DollarSign },
                  approved: { label: 'Refund Approved', variant: 'success', icon: CheckCircle2 },
                  completed: { label: 'Completed', variant: 'neutral', icon: CheckCircle2 },
                };
                const config = statusConfig[exit.status] || statusConfig.inspection_pending;
                const StatusIcon = config.icon;

                return (
                  <Card
                    key={exit.id}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tenant-exit/${exit.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'p-2 rounded-lg',
                              exit.status === 'completed' ? 'bg-muted' : 'bg-primary/10'
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                'h-5 w-5',
                                exit.status === 'completed' ? 'text-muted-foreground' : 'text-primary'
                              )}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {exit.tenants?.name || 'Unknown Tenant'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {exit.units?.unit_number ? `Unit ${exit.units.unit_number}` : 'N/A'} •{' '}
                              {exit.properties?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {exit.exit_reason.replace(/_/g, ' ')} • Started{' '}
                              {format(new Date(exit.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {exit.refund_amount > 0 && (
                              <p className="text-sm font-medium text-foreground">
                                Refund: {formatCurrency(exit.refund_amount)}
                              </p>
                            )}
                            <StatusPill variant={config.variant}>{config.label}</StatusPill>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ====================================================
          MODALS & WIZARDS
      ==================================================== */}
      {/* 8-Step Resident Onboarding Wizard */}
      <AddTenantWizard
        open={isAddWizardOpen}
        onOpenChange={(isOpen) => {
          setIsAddWizardOpen(isOpen);
          if (!isOpen) refetchTenants();
        }}
      />

      {/* Section-Based Resident Profile Editor */}
      <EditTenantModal
        open={!!editingTenant}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTenant(null);
        }}
        tenant={editingTenant}
        onSuccess={() => {
          setEditingTenant(null);
          refetchTenants();
        }}
      />

      {/* Batch CSV Resident Importer */}
      <ImportTenantsModal
        open={isImportModalOpen}
        onOpenChange={(isOpen) => {
          setIsImportModalOpen(isOpen);
          if (!isOpen) refetchTenants();
        }}
        onSuccess={() => {
          setIsImportModalOpen(false);
          refetchTenants();
        }}
      />

      {/* Portal Invite Send Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Send Resident Portal Invite</DialogTitle>
            <DialogDescription>
              Deliver an email invitation for {invitingTenant?.name} to activate their resident portal account.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-xs truncate">{invitingTenant?.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  Invitation link will be delivered to this email
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendInvite}
              disabled={isSendingInvite}
              className="gap-2"
            >
              {isSendingInvite ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
