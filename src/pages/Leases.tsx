// src/pages/Leases.tsx
// FishGate Design Constitution v1.0 - Lease Agreement Workspace

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Home,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Loader2,
  Send,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  FileSignature,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  History,
  Building2,
  DollarSign,
  ChevronRight,
  Info,
  Check,
  ArrowRight,
  User,
  Shield,
  Layers,
  Sparkles,
  UserCheck,
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
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  useLeases,
  useCreateLease,
  useUpdateLease,
  useDeleteLease,
  useSignLease,
  useUploadSignature,
  type Lease,
} from '@/hooks/useLeases';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useSettings } from '@/contexts/useSettings';
import { useI18n } from '@/contexts/useI18n';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { CreateLeaseWizard } from '@/components/leases/CreateLeaseWizard';
import { LeaseWorkspaceModal } from '@/components/leases/LeaseWorkspaceModal';
import { ImportLeasesModal } from '@/components/leases/ImportLeasesModal';
import { BilingualLeaseModal } from '@/components/leases/BilingualLeaseModal';
import type { BilingualLeaseInput } from '@/lib/bilingualLeaseAgreement';
import { SignaturePad, type SignaturePadRef } from '@/components/ui/signature-pad';
import {
  calculateLeaseHealth,
  LEASE_STATUSES,
  RENEWAL_STATUSES,
  LEASE_TYPES,
  type LeaseStatusValue,
} from '@/lib/leaseHealthModel';
import { calculateRraLeaseFilingDeadline } from '@/lib/rraCompliance';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import {
  PageContainer,
  PageHeader,
  PageActions,
} from '@/design-system/LayoutFramework';

type ViewMode = 'cards' | 'table' | 'timeline';
type SavedView = 'all' | 'active' | 'renewals' | 'expiring' | 'pending';

const getInitials = (name?: string | null) => {
  if (!name) return 'LS';
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export default function Leases() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency, settings } = useSettings();
  const { t } = useI18n();
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { activeCompanyId } = useActiveCompany();
  const { data: rawCompaniesList = [] } = useMyCompanies();
  const companiesList = Array.isArray(rawCompaniesList) ? rawCompaniesList : [];
  const confirmAction = useConfirmAction();

  // Queries
  const { data: leases = [], isLoading, refetch: refetchLeases } = useLeases();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();

  const updateLease = useUpdateLease();
  const deleteLease = useDeleteLease();
  const signLease = useSignLease();
  const uploadSignature = useUploadSignature();

  // Navigation & Filter States
  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('fishgate-leases-view');
    return (saved as ViewMode) || 'cards';
  });
  const [savedView, setSavedView] = useState<SavedView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedRenewalFilter, setSelectedRenewalFilter] = useState('all');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals & Active Drawers
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [workspaceLease, setWorkspaceLease] = useState<Lease | null>(null);
  const [bilingualModalOpen, setBilingualModalOpen] = useState(false);
  const [selectedBilingualData, setSelectedBilingualData] = useState<BilingualLeaseInput | null>(null);

  // Digital Signing Dialog
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [signingLease, setSigningLease] = useState<Lease | null>(null);
  const [uploadedSignatureFile, setUploadedSignatureFile] = useState<File | null>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  // Sync view preference
  useEffect(() => {
    localStorage.setItem('fishgate-leases-view', view);
  }, [view]);

  // Handle ?add=true query parameter
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsWizardOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 1. Attention Required Priority Triage
  const attentionItems = useMemo(() => {
    const items: {
      leaseId: string;
      leaseNumber: string;
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

    leases.forEach((lease) => {
      const propName = lease.properties?.name || 'Assigned Property';
      const unitNum = lease.units?.unit_number ? `Unit ${lease.units.unit_number}` : 'Unit';
      const tenantName = lease.tenants?.name || 'Resident';
      const daysLeft = lease.end_date ? differenceInDays(new Date(lease.end_date), now) : null;

      // 1. Lease Expires Within 30 Days (Critical)
      if (lease.status === 'active' && daysLeft !== null && daysLeft >= 0 && daysLeft <= 30) {
        items.push({
          leaseId: lease.id,
          leaseNumber: lease.lease_number,
          tenantName,
          propertyName: propName,
          unitNumber: unitNum,
          issue: `Lease expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${format(new Date(lease.end_date), 'MMM d, yyyy')})`,
          impact: `${formatCurrency(lease.monthly_rent)}/mo revenue at risk of sudden vacancy`,
          actionLabel: 'Offer Renewal',
          severity: 'critical',
          onAction: () => {
            setWorkspaceLease(lease);
          },
        });
        return;
      }

      // 2. Renewal Awaiting Response
      if (lease.renewal_status === 'pending_renewal' || lease.renewal_status === 'in_negotiation') {
        items.push({
          leaseId: lease.id,
          leaseNumber: lease.lease_number,
          tenantName,
          propertyName: propName,
          unitNumber: unitNum,
          issue: 'Renewal proposal awaiting resident response',
          impact: 'Uncertain forward occupancy commitment for upcoming term',
          actionLabel: 'Review Terms',
          severity: 'warning',
          onAction: () => {
            setWorkspaceLease(lease);
          },
        });
        return;
      }

      // 3. Unsigned Lease Agreement (Pending Signature)
      if (lease.status === 'pending_signature') {
        const missingSig = !lease.landlord_signed_at && !lease.tenant_signed_at
          ? 'both landlord & tenant'
          : !lease.landlord_signed_at
          ? 'landlord sign-off'
          : 'tenant digital signature';
        items.push({
          leaseId: lease.id,
          leaseNumber: lease.lease_number,
          tenantName,
          propertyName: propName,
          unitNumber: unitNum,
          issue: `Agreement execution pending: awaiting ${missingSig}`,
          impact: 'Agreement not legally enforceable until fully executed',
          actionLabel: !lease.landlord_signed_at ? 'Sign as Landlord' : 'View Agreement',
          severity: 'warning',
          onAction: () => {
            if (!lease.landlord_signed_at) {
              setSigningLease(lease);
              setIsSignDialogOpen(true);
            } else {
              setWorkspaceLease(lease);
            }
          },
        });
        return;
      }

      // 4. Move-Out Scheduled / Notice Period Active
      if (lease.status === 'notice_given') {
        items.push({
          leaseId: lease.id,
          leaseNumber: lease.lease_number,
          tenantName,
          propertyName: propName,
          unitNumber: unitNum,
          issue: 'Exit notice lodged • Move-out inspection pending',
          impact: `Turnaround required: stage ${unitNum} for next leasing cycle`,
          actionLabel: 'Manage Exit',
          severity: 'warning',
          onAction: () => navigate('/operations/occupancy'),
        });
        return;
      }

      // 5. Incomplete Agreement Health (<50% completeness or missing ID docs)
      const health = calculateLeaseHealth(lease);
      if (health.score < 50) {
        items.push({
          leaseId: lease.id,
          leaseNumber: lease.lease_number,
          tenantName,
          propertyName: propName,
          unitNumber: unitNum,
          issue: `Low agreement health score (${health.score}% complete)`,
          impact: `Missing essential terms: ${health.missingItems.slice(0, 2).join(', ')}`,
          actionLabel: 'Complete Lease',
          severity: 'info',
          onAction: () => setWorkspaceLease(lease),
        });
      }
    });

    return items;
  }, [leases, formatCurrency, navigate]);

  // 2. Lease Health Summary KPIs (Max 4 Cards, Zero KPI Wall)
  const healthSummary = useMemo(() => {
    const total = leases.length;
    const active = leases.filter((l) => l.status === 'active').length;
    const now = new Date();

    // Expiring soon: active leases with end_date within 60 days
    const expiringSoon = leases.filter((l) => {
      if (l.status !== 'active' || !l.end_date) return false;
      try {
        const end = parseISO(l.end_date);
        const days = differenceInDays(end, now);
        return days >= 0 && days <= 60;
      } catch {
        return false;
      }
    }).length;

    // Pending renewals
    const pendingRenewals = leases.filter(
      (l) => l.renewal_status === 'pending_renewal' || l.renewal_status === 'in_negotiation'
    ).length;

    // Annual Contract Value (ACV) of all active leases
    const annualContractValue = leases
      .filter((l) => l.status === 'active')
      .reduce((acc, curr) => acc + (Number(curr.monthly_rent) || 0) * 12, 0);

    return {
      activeCount: active,
      totalCount: total,
      coveragePct: total > 0 ? Math.round((active / total) * 100) : 0,
      expiringSoon,
      pendingRenewals,
      annualContractValue,
    };
  }, [leases]);

  // 3. Filtered Leases for Primary Workspace
  const filteredLeases = useMemo(() => {
    return leases.filter((lease) => {
      // Organization Filter (Super Admin)
      const leaseCompanyId =
        lease.company_id ||
        lease.properties?.company_id ||
        (lease.properties as { companies?: { id?: string } | null })?.companies?.id;
      if (selectedOrgFilter !== 'all' && leaseCompanyId && leaseCompanyId !== selectedOrgFilter) {
        return false;
      }

      // Saved View Pills
      if (savedView === 'active') {
        if (lease.status !== 'active') return false;
      } else if (savedView === 'renewals') {
        if (!['pending_renewal', 'in_negotiation'].includes(lease.renewal_status || '')) return false;
      } else if (savedView === 'expiring') {
        if (!lease.end_date) return false;
        const days = differenceInDays(new Date(lease.end_date), new Date());
        if (days < 0 || days > 60) return false;
      } else if (savedView === 'pending') {
        if (!['draft', 'pending_approval', 'pending_signature'].includes(lease.status)) return false;
      }

      // Property Filter
      if (selectedPropertyFilter !== 'all' && lease.property_id !== selectedPropertyFilter) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all' && lease.status !== selectedStatusFilter) {
        return false;
      }

      // Lease Type Filter
      if (selectedTypeFilter !== 'all' && lease.lease_type !== selectedTypeFilter) {
        return false;
      }

      // Renewal Status Filter
      if (selectedRenewalFilter !== 'all' && lease.renewal_status !== selectedRenewalFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = lease.lease_number?.toLowerCase().includes(q);
        const matchesTenant = lease.tenants?.name?.toLowerCase().includes(q);
        const matchesEmail = lease.tenants?.email?.toLowerCase().includes(q);
        const matchesProp = lease.properties?.name?.toLowerCase().includes(q);
        const matchesUnit = lease.units?.unit_number?.toLowerCase().includes(q);
        if (!matchesNum && !matchesTenant && !matchesEmail && !matchesProp && !matchesUnit) {
          return false;
        }
      }

      return true;
    });
  }, [
    leases,
    selectedOrgFilter,
    savedView,
    selectedPropertyFilter,
    selectedStatusFilter,
    selectedTypeFilter,
    selectedRenewalFilter,
    searchQuery,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedPropertyFilter, selectedStatusFilter, selectedTypeFilter, selectedRenewalFilter, selectedOrgFilter, savedView, pageSize]);

  const paginatedLeases = useMemo(() => {
    return filteredLeases.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredLeases, page, pageSize]);

  // 4. Lease Pipeline Counters
  const pipelineMetrics = useMemo(() => {
    const now = new Date();
    const pendingSignature = leases.filter((l) => l.status === 'pending_signature' || l.status === 'draft').length;
    const upcomingRenewals = leases.filter((l) => {
      if (l.renewal_status === 'pending_renewal' || l.renewal_status === 'in_negotiation') return true;
      if (!l.end_date) return false;
      const days = differenceInDays(new Date(l.end_date), now);
      return days >= 0 && days <= 60;
    }).length;

    const moveOuts = leases.filter(
      (l) => l.status === 'notice_given' || l.renewal_status === 'declined'
    ).length;

    const upcomingMoveIns = leases.filter((l) => {
      if (!l.move_in_date && !l.start_date) return false;
      const dt = new Date(l.move_in_date || l.start_date);
      const days = differenceInDays(dt, now);
      return days >= 0 && days <= 30;
    }).length;

    return {
      pendingSignature,
      upcomingMoveIns,
      upcomingRenewals,
      moveOuts,
    };
  }, [leases]);

  // 5. Timeline Events Stream
  const leaseTimelineEvents = useMemo(() => {
    const events: {
      id: string;
      date: Date;
      displayDate: string;
      lease: Lease;
      title: string;
      type: 'start' | 'renewal' | 'expiry' | 'signed';
      badgeVariant: 'success' | 'warning' | 'destructive' | 'neutral';
      description: string;
    }[] = [];

    const now = new Date();

    leases.forEach((l) => {
      // Lease Start Event
      if (l.start_date) {
        try {
          const startDate = parseISO(l.start_date);
          events.push({
            id: `${l.id}-start`,
            date: startDate,
            displayDate: format(startDate, 'MMM d, yyyy'),
            lease: l,
            title: `Tenancy Commencement: ${l.lease_number}`,
            type: 'start',
            badgeVariant: 'success',
            description: `${l.tenants?.name || 'Resident'} occupied Unit ${l.units?.unit_number || 'N/A'} at ${l.properties?.name || 'Property'}.`,
          });
        } catch {
          // ignore
        }
      }

      // Lease Expiry Event
      if (l.end_date) {
        try {
          const endDate = parseISO(l.end_date);
          const daysLeft = differenceInDays(endDate, now);
          events.push({
            id: `${l.id}-end`,
            date: endDate,
            displayDate: format(endDate, 'MMM d, yyyy'),
            lease: l,
            title: `Contract Expiration Deadline: ${l.lease_number}`,
            type: 'expiry',
            badgeVariant: daysLeft < 0 ? 'destructive' : daysLeft <= 30 ? 'warning' : 'neutral',
            description: `Scheduled end of term for ${l.tenants?.name || 'Resident'}. Monthly rate: ${formatCurrency(l.monthly_rent)}.`,
          });
        } catch {
          // ignore
        }
      }
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [leases, formatCurrency]);

  // 6. Calm Operational Observations (FishGate Rule: ZERO mentions of AI)
  const observations = useMemo(() => {
    const list: { title: string; detail: string; variant: 'neutral' | 'success' | 'warning' }[] = [];
    const total = leases.length;
    if (total === 0) return list;

    const activeCount = leases.filter((l) => l.status === 'active').length;
    const coverage = Math.round((activeCount / total) * 100);

    list.push({
      title: 'Contracted Tenancy Coverage',
      detail: `${coverage}% of registered leasing records (${activeCount} of ${total}) are actively generating revenue with binding legal terms.`,
      variant: coverage >= 80 ? 'success' : 'neutral',
    });

    // Expiration concentration
    const expiringIn60 = leases.filter((l) => {
      if (l.status !== 'active' || !l.end_date) return false;
      const days = differenceInDays(new Date(l.end_date), new Date());
      return days >= 0 && days <= 60;
    });

    if (expiringIn60.length > 0) {
      const topProp = expiringIn60[0]?.properties?.name || 'the portfolio';
      list.push({
        title: 'Upcoming Renewal Horizon',
        detail: `${expiringIn60.length} lease agreements approach conclusion within sixty days, primarily concentrated at ${topProp}. Early renewal discussions will maintain full occupancy.`,
        variant: 'warning',
      });
    } else {
      list.push({
        title: 'Leasing Stability',
        detail: 'Zero agreements expire within the immediate 60-day window, providing stable occupancy and predictable revenue.',
        variant: 'success',
      });
    }

    // Health score average
    const avgHealth = Math.round(
      leases.reduce((acc, l) => acc + calculateLeaseHealth(l).score, 0) / total
    );
    list.push({
      title: 'Agreement Documentation Health',
      detail: `Portfolio lease records average ${avgHealth}% documentation completeness, ensuring solid bilateral signatures and RRA compliance.`,
      variant: 'neutral',
    });

    return list;
  }, [leases]);

  // CSV Export
  const handleExportCsv = () => {
    if (filteredLeases.length === 0) {
      toast({ title: 'No data to export', description: 'Zero lease records match current filters.' });
      return;
    }

    const headers = [
      'Lease Number',
      'Resident Name',
      'Resident Email',
      'Property',
      'Unit',
      'Start Date',
      'End Date',
      'Monthly Rent',
      'Security Deposit',
      'Status',
      'Renewal Status',
      'Health Score',
    ];

    const rows = filteredLeases.map((l) => [
      `"${l.lease_number}"`,
      `"${l.tenants?.name || ''}"`,
      `"${l.tenants?.email || ''}"`,
      `"${l.properties?.name || ''}"`,
      `"${l.units?.unit_number || ''}"`,
      `"${l.start_date || ''}"`,
      `"${l.end_date || ''}"`,
      l.monthly_rent || 0,
      l.security_deposit || 0,
      `"${l.status || 'draft'}"`,
      `"${l.renewal_status || 'not_started'}"`,
      `"${calculateLeaseHealth(l).score}%"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leases-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Leases Exported',
      description: `Successfully exported ${filteredLeases.length} lease records to CSV.`,
    });
  };

  // PDF Generator Trigger
  const handleDownloadPdf = async (leaseId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-lease-pdf', {
        body: { leaseId, companyId: activeCompanyId },
      });

      if (error) throw new Error(error.message || 'Failed to generate PDF');

      const html = typeof data === 'string' ? data : await new Response(data).text();
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);

      const printWindow = window.open(htmlUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        printWindow.addEventListener(
          'load',
          () => {
            setTimeout(() => {
              printWindow.print();
              URL.revokeObjectURL(htmlUrl);
            }, 500);
          },
          { once: true }
        );
      } else {
        URL.revokeObjectURL(htmlUrl);
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  // Bilingual Contract Modal Trigger
  const handleOpenBilingual = (lease: Lease) => {
    setSelectedBilingualData({
      leaseNumber: lease.lease_number,
      landlordName: lease.properties?.companies?.name || 'FishGate Real Estate Rwanda Ltd',
      landlordTin: '100234567',
      tenantName: lease.tenants?.name || 'Valued Resident',
      tenantNationalId: '1199580012345678',
      tenantPhone: lease.tenants?.phone || '+250 788 123 456',
      propertyName: lease.properties?.name || 'Estate Property',
      propertyUpi: '1/03/05/02/1234',
      district: 'Gasabo',
      sector: 'Remera',
      unitNumber: lease.units?.unit_number || '1',
      monthlyRentRwf: lease.monthly_rent || 350000,
      securityDepositRwf: lease.security_deposit || 350000,
      startDate: lease.start_date || '2026-01-01',
      endDate: lease.end_date || '2026-12-31',
    });
    setBilingualModalOpen(true);
  };

  // Sign Submit Handler
  const handleSignSubmit = async () => {
    if (!signingLease) return;

    try {
      let signatureUrl = '';

      if (uploadedSignatureFile) {
        signatureUrl = await uploadSignature.mutateAsync({
          leaseId: signingLease.id,
          signatureBlob: uploadedSignatureFile,
        });
      } else if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        const signatureBlob = await signaturePadRef.current.toBlob();
        if (signatureBlob) {
          signatureUrl = await uploadSignature.mutateAsync({
            leaseId: signingLease.id,
            signatureBlob,
          });
        }
      }

      if (!signatureUrl) {
        toast({ title: 'Signature Required', description: 'Please draw or upload your signature.', variant: 'destructive' });
        return;
      }

      await signLease.mutateAsync({
        leaseId: signingLease.id,
        signatureUrl,
        signerType: 'landlord',
      });

      setIsSignDialogOpen(false);
      setSigningLease(null);
      setUploadedSignatureFile(null);
      refetchLeases();
    } catch (err: unknown) {
      toast({ title: 'Error Signing', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const getStatusBadge = (statusValue: string | null | undefined) => {
    const found = LEASE_STATUSES.find((s) => s.value === statusValue) || {
      label: statusValue ? statusValue.replace('_', ' ') : 'Active',
      color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
    };
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', found.color)}>
        {found.label}
      </span>
    );
  };

  const getRenewalBadge = (renewalValue: string | null | undefined) => {
    const found = RENEWAL_STATUSES.find((r) => r.value === renewalValue) || {
      label: renewalValue ? renewalValue.replace('_', ' ') : 'Not Started',
      color: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border', found.color)}>
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
        title={t('leases', 'Leases')}
        description={t(
          'page_leases_subtitle',
          'Manage agreements, renewals, expirations and occupancy commitments.'
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
              {t('action_export_leases', 'Export Leases')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 text-xs font-medium"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {t('action_import_leases', 'Import Leases')}
            </Button>

            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 text-xs shadow-xs"
              onClick={() => setIsWizardOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('action_create_lease', 'Create Lease')}
            </Button>
          </PageActions>
        }
      />

      <div className="space-y-6 mt-4">
        {/* ====================================================
            SECTION 2: LEASE HEALTH SUMMARY (MAX 4 CARDS)
        ==================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Leases */}
          <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Leases
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-foreground">
                    {healthSummary.activeCount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of {healthSummary.totalCount} total
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  {healthSummary.coveragePct}% portfolio coverage
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Leases Expiring Soon */}
          <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expiring Soon
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      healthSummary.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                    )}
                  >
                    {healthSummary.expiringSoon}
                  </span>
                  <span className="text-xs text-muted-foreground">within 60 days</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {healthSummary.expiringSoon > 0 ? 'Proactive renewal horizon' : 'Zero immediate expirations'}
                </p>
              </div>
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                  healthSummary.expiringSoon > 0
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Pending Renewals */}
          <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pending Renewals
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-foreground">
                    {healthSummary.pendingRenewals}
                  </span>
                  <span className="text-xs text-muted-foreground">in discussion</span>
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  Awaiting resident agreement
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <RefreshCw className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Annual Contract Value (ACV) */}
          <Card className="border border-border/80 shadow-xs hover:border-border transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Annual Contract Value
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-foreground truncate max-w-[170px]">
                    {formatCurrency(healthSummary.annualContractValue)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Committed annual revenue
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <DollarSign className="h-5 w-5" />
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
                  Attention Required ({attentionItems.length} Immediate Items)
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">Actionable risk mitigation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {attentionItems.slice(0, 6).map((item, idx) => (
                <div
                  key={`${item.leaseId}-${idx}`}
                  className="p-3 bg-card rounded-lg border border-border shadow-2xs flex flex-col justify-between gap-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground font-mono truncate">
                        {item.leaseNumber}
                      </span>
                      <Badge
                        variant={item.severity === 'critical' ? 'destructive' : 'secondary'}
                        className="text-[10px] uppercase h-4 px-1"
                      >
                        {item.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {item.tenantName} • {item.unitNumber} ({item.propertyName})
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
              <span>All active lease agreements are executed, compliant, and in good order.</span>
            </div>
          </div>
        )}

        {/* ====================================================
            SECTION 4: LEASE EXPLORER (PRIMARY WORKSPACE)
        ==================================================== */}
        <div className="space-y-4">
          {/* Saved View Filter Pills & View Mode Toggle */}
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
                All Agreements
                <span className="opacity-70">({leases.length})</span>
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
                Active & Committed
                <span className="opacity-70">
                  ({leases.filter((l) => l.status === 'active').length})
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
                Renewal Horizon
                <span className="opacity-70">
                  ({leases.filter((l) => ['pending_renewal', 'in_negotiation'].includes(l.renewal_status || '')).length})
                </span>
              </Button>

              <Button
                size="sm"
                variant={savedView === 'expiring' ? 'default' : 'outline'}
                className={cn(
                  'h-8 text-xs font-medium gap-1.5 rounded-full',
                  savedView === 'expiring' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
                onClick={() => setSavedView('expiring')}
              >
                Expiring (60d)
                <span className="opacity-70">
                  ({
                    leases.filter((l) => {
                      if (!l.end_date) return false;
                      const days = differenceInDays(new Date(l.end_date), new Date());
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
                Pending & Drafts
                <span className="opacity-70">
                  ({leases.filter((l) => ['draft', 'pending_approval', 'pending_signature'].includes(l.status)).length})
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

          {/* Search & Dynamic Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by lease number, resident, property, or unit..."
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

            {/* Lease Status Filter */}
            <div className="w-full md:w-44">
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {LEASE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lease Type Filter */}
            <div className="w-full md:w-40">
              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Lease Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lease Types</SelectItem>
                  {LEASE_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value}>
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SuperAdmin Org Filter */}
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
          {!isLoading && filteredLeases.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No lease agreements found"
              description={
                searchQuery || selectedPropertyFilter !== 'all' || selectedStatusFilter !== 'all'
                  ? 'No agreements match your search or filter parameters. Try clearing your filters.'
                  : 'Start by creating your first digital lease agreement.'
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
                      setSelectedTypeFilter('all');
                      setSelectedRenewalFilter('all');
                      setSavedView('all');
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset Filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIsWizardOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create First Lease
                  </Button>
                )
              }
            />
          )}

          {/* 1. CARDS VIEW (STORYTELLING LEASE CARDS) */}
          {!isLoading && view === 'cards' && paginatedLeases.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedLeases.map((lease) => {
                  const health = calculateLeaseHealth(lease);
                  const daysRemaining = lease.end_date
                    ? differenceInDays(new Date(lease.end_date), new Date())
                    : null;
                  const rra = calculateRraLeaseFilingDeadline(lease.start_date);

                  return (
                    <Card
                      key={lease.id}
                      className="p-4 border border-border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header: Lease Ref, Property, Menu */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold text-foreground font-mono text-sm cursor-pointer hover:underline"
                                onClick={() => setWorkspaceLease(lease)}
                              >
                                {lease.lease_number}
                              </span>
                              {getStatusBadge(lease.status)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {lease.properties?.name || 'Assigned Property'} • Unit {lease.units?.unit_number || 'N/A'}
                            </p>
                            {(lease.properties as { companies?: { name?: string } | null })?.companies?.name && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary font-medium mt-0.5">
                                🏢 {(lease.properties as { companies?: { name?: string } | null }).companies?.name}
                              </span>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onSelect={() => setWorkspaceLease(lease)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> View Workspace
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleOpenBilingual(lease)}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Bilingual Statutory Contract
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDownloadPdf(lease.id)}>
                                <Download className="h-3.5 w-3.5 mr-2" /> Download PDF
                              </DropdownMenuItem>
                              {(lease.status === 'pending_signature' || lease.status === 'draft') && !lease.landlord_signed_at && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setSigningLease(lease);
                                    setIsSignDialogOpen(true);
                                  }}
                                >
                                  <FileSignature className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Sign as Landlord
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={async () => {
                                  const confirmed = await confirmAction({
                                    title: 'Delete lease agreement?',
                                    description: `Delete agreement ${lease.lease_number}? This cannot be undone.`,
                                    confirmLabel: 'Delete Lease',
                                    destructive: true,
                                  });
                                  if (confirmed) {
                                    await deleteLease.mutateAsync(lease.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Resident Pill & RRA Alert */}
                        <div className="mt-3 p-2.5 rounded-lg bg-secondary/40 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-semibold text-foreground truncate">
                              {lease.tenants?.name || 'Unassigned Resident'}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {formatCurrency(lease.monthly_rent)}/mo
                          </span>
                        </div>

                        {/* Agreement Health & Completeness Bar */}
                        <div className="mt-3 bg-muted/30 p-2 rounded-md">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">Agreement Health</span>
                            <span className="font-semibold text-foreground">{health.score}%</span>
                          </div>
                          <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all duration-300',
                                health.score >= 80 ? 'bg-emerald-500' : health.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              )}
                              style={{ width: `${health.score}%` }}
                            />
                          </div>
                          {health.missingItems.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">
                              Missing: {health.missingItems.slice(0, 2).join(', ')}
                            </p>
                          )}
                        </div>

                        {/* Term & Renewal Info */}
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {lease.start_date ? format(new Date(lease.start_date), 'MMM d, yyyy') : 'N/A'} →{' '}
                              {lease.end_date ? format(new Date(lease.end_date), 'MMM d, yyyy') : 'N/A'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px]">Renewal Status:</span>
                            {getRenewalBadge(lease.renewal_status)}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {daysRemaining !== null && daysRemaining <= 30 && daysRemaining >= 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">
                              {daysRemaining}d left
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-1" title="Signatures">
                            <span className={cn('h-2 w-2 rounded-full', lease.landlord_signed_at ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                            <span>LL</span>
                            <span className={cn('h-2 w-2 rounded-full ml-1', lease.tenant_signed_at ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                            <span>TN</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-medium"
                            onClick={() => setWorkspaceLease(lease)}
                          >
                            Workspace
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
                total={filteredLeases.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}

          {/* 2. TABLE VIEW */}
          {!isLoading && view === 'table' && paginatedLeases.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Lease Reference</TableHead>
                      <TableHead>Resident</TableHead>
                      <TableHead>Property & Space</TableHead>
                      <TableHead>Term Duration</TableHead>
                      <TableHead>Financials</TableHead>
                      <TableHead>Lease Status</TableHead>
                      <TableHead>Renewal</TableHead>
                      <TableHead>Signatures</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeases.map((lease) => {
                      const daysRemaining = lease.end_date
                        ? differenceInDays(new Date(lease.end_date), new Date())
                        : null;

                      return (
                        <TableRow key={lease.id} className="hover:bg-muted/30">
                          {/* Lease Reference */}
                          <TableCell>
                            <div>
                              <span
                                className="font-bold font-mono text-foreground cursor-pointer hover:underline text-xs block"
                                onClick={() => setWorkspaceLease(lease)}
                              >
                                {lease.lease_number}
                              </span>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {lease.lease_type || 'Residential'}
                              </span>
                            </div>
                          </TableCell>

                          {/* Resident */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 border border-border">
                                {lease.tenants?.avatar_url && (
                                  <AvatarImage src={lease.tenants.avatar_url} />
                                )}
                                <AvatarFallback className="text-[10px] font-bold">
                                  {getInitials(lease.tenants?.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-xs text-foreground">
                                  {lease.tenants?.name || 'Unassigned'}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                                  {lease.tenants?.email || ''}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Property & Unit */}
                          <TableCell>
                            <div>
                              <p className="font-medium text-xs text-foreground">
                                Unit {lease.units?.unit_number || 'N/A'}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {lease.properties?.name || 'No property'}
                              </p>
                              {(lease.properties as { companies?: { name?: string } | null })?.companies?.name && (
                                <span className="text-[10px] text-primary">
                                  🏢 {(lease.properties as { companies?: { name?: string } | null }).companies?.name}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Duration */}
                          <TableCell>
                            <div>
                              <p className="text-xs text-foreground">
                                {lease.start_date ? format(new Date(lease.start_date), 'MMM d, yyyy') : 'N/A'}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                to {lease.end_date ? format(new Date(lease.end_date), 'MMM d, yyyy') : 'N/A'}
                              </p>
                              {daysRemaining !== null && daysRemaining <= 30 && daysRemaining >= 0 && (
                                <span className="text-[10px] text-rose-600 font-semibold block">
                                  {daysRemaining}d left
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Monthly Rent */}
                          <TableCell>
                            <div>
                              <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(lease.monthly_rent)}/mo
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Dep: {formatCurrency(lease.security_deposit)}
                              </p>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {getStatusBadge(lease.status)}
                          </TableCell>

                          {/* Renewal Status */}
                          <TableCell>
                            {getRenewalBadge(lease.renewal_status)}
                          </TableCell>

                          {/* Signatures */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div
                                className={cn('h-2.5 w-2.5 rounded-full', lease.landlord_signed_at ? 'bg-emerald-500' : 'bg-muted-foreground')}
                                title={lease.landlord_signed_at ? 'Landlord signed' : 'Landlord pending'}
                              />
                              <div
                                className={cn('h-2.5 w-2.5 rounded-full', lease.tenant_signed_at ? 'bg-emerald-500' : 'bg-muted-foreground')}
                                title={lease.tenant_signed_at ? 'Tenant signed' : 'Tenant pending'}
                              />
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => setWorkspaceLease(lease)}
                              >
                                View
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuItem onSelect={() => setWorkspaceLease(lease)}>
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Workspace
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => handleOpenBilingual(lease)}>
                                    <ShieldCheck className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Bilingual Statutory Contract
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => handleDownloadPdf(lease.id)}>
                                    <Download className="h-3.5 w-3.5 mr-2" /> Download PDF
                                  </DropdownMenuItem>
                                  {(lease.status === 'pending_signature' || lease.status === 'draft') && !lease.landlord_signed_at && (
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setSigningLease(lease);
                                        setIsSignDialogOpen(true);
                                      }}
                                    >
                                      <FileSignature className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Sign as Landlord
                                    </DropdownMenuItem>
                                  )}
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
                total={filteredLeases.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}

          {/* 3. TIMELINE VIEW */}
          {!isLoading && view === 'timeline' && (
            <div className="space-y-4">
              {leaseTimelineEvents.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No timeline events recorded"
                  description="Tenancy milestones and renewal deadlines will appear here as agreements are configured."
                />
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {leaseTimelineEvents.slice(0, 20).map((event) => (
                    <div key={event.id} className="relative flex items-start gap-4">
                      <div
                        className={cn(
                          'absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-background',
                          event.badgeVariant === 'success' && 'bg-emerald-500',
                          event.badgeVariant === 'warning' && 'bg-amber-500',
                          event.badgeVariant === 'destructive' && 'bg-rose-500',
                          event.badgeVariant === 'neutral' && 'bg-blue-500'
                        )}
                      />

                      <Card className="flex-1 p-3 border border-border shadow-2xs hover:shadow-xs transition-shadow">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {event.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                              {event.lease.lease_number}
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
                          <span className="text-[11px] text-muted-foreground">
                            Unit {event.lease.units?.unit_number || 'N/A'} • {event.lease.properties?.name || 'Property'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2 text-primary"
                            onClick={() => setWorkspaceLease(event.lease)}
                          >
                            Open Agreement Workspace
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
            SECTION 5: LEASE PIPELINE
        ==================================================== */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lease Lifecycle Pipeline
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Forward occupancy commitments and turnover timeline across the portfolio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className="p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => setSavedView('pending')}
            >
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Pending Execution</span>
              <p className="text-xl font-bold text-foreground mt-1">{pipelineMetrics.pendingSignature}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Awaiting signatures</p>
            </div>

            <div
              className="p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => setSavedView('active')}
            >
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Move-Ins (30 Days)</span>
              <p className="text-xl font-bold text-foreground mt-1">{pipelineMetrics.upcomingMoveIns}</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Handover scheduled</p>
            </div>

            <div
              className="p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => setSavedView('renewals')}
            >
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Upcoming Renewals</span>
              <p className="text-xl font-bold text-foreground mt-1">{pipelineMetrics.upcomingRenewals}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Term extension window</p>
            </div>

            <div
              className="p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => setSelectedStatusFilter('notice_given')}
            >
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Move-Outs / Exits</span>
              <p className="text-xl font-bold text-foreground mt-1">{pipelineMetrics.moveOuts}</p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">Notice lodged</p>
            </div>
          </div>
        </div>

        {/* ====================================================
            SECTION 6: LEASE PERFORMANCE (MAX 3 VISUALS)
        ==================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border border-border shadow-2xs">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
              Lease Expiration Horizon
            </h4>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Within 30 Days</span>
                <span className="font-bold text-rose-600">
                  {leases.filter((l) => {
                    if (l.status !== 'active' || !l.end_date) return false;
                    const d = differenceInDays(new Date(l.end_date), new Date());
                    return d >= 0 && d <= 30;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">31 to 60 Days</span>
                <span className="font-bold text-amber-600">
                  {leases.filter((l) => {
                    if (l.status !== 'active' || !l.end_date) return false;
                    const d = differenceInDays(new Date(l.end_date), new Date());
                    return d > 30 && d <= 60;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Beyond 60 Days</span>
                <span className="font-bold text-emerald-600">
                  {leases.filter((l) => {
                    if (l.status !== 'active' || !l.end_date) return false;
                    const d = differenceInDays(new Date(l.end_date), new Date());
                    return d > 60;
                  }).length}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border shadow-2xs">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
              Renewal Decision Distribution
            </h4>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Renewed Terms</span>
                <span className="font-bold text-emerald-600">
                  {leases.filter((l) => l.renewal_status === 'renewed').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">In Discussion</span>
                <span className="font-bold text-blue-600">
                  {leases.filter((l) => l.renewal_status === 'pending_renewal' || l.renewal_status === 'in_negotiation').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Declined / Exiting</span>
                <span className="font-bold text-rose-600">
                  {leases.filter((l) => l.renewal_status === 'declined' || l.status === 'notice_given').length}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-border shadow-2xs">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
              Contract Value Health
            </h4>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Monthly Rent</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(
                    leases.filter((l) => l.status === 'active').reduce((acc, l) => acc + (l.monthly_rent || 0), 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Security Deposits Held</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(
                    leases.reduce((acc, l) => acc + (l.security_deposit || 0), 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg Agreement Health</span>
                <span className="font-bold text-primary">
                  {leases.length > 0
                    ? Math.round(
                        leases.reduce((acc, l) => acc + calculateLeaseHealth(l).score, 0) / leases.length
                      )
                    : 100}%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ====================================================
            SECTION 7: LEASE OBSERVATIONS (CALM, STRICTLY NO AI)
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
      </div>

      {/* ====================================================
          MODALS & WORKSPACES
      ==================================================== */}
      {/* 7-Step Lease Creation Wizard */}
      <CreateLeaseWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={() => {
          setIsWizardOpen(false);
          refetchLeases();
        }}
      />

      {/* Comprehensive Lease Agreement Workspace Modal */}
      <LeaseWorkspaceModal
        open={Boolean(workspaceLease)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setWorkspaceLease(null);
        }}
        lease={workspaceLease}
        onEdit={(l) => {
          setWorkspaceLease(null);
          // Could open edit mode or wizard
          setIsWizardOpen(true);
        }}
        onSign={(l) => {
          setSigningLease(l);
          setIsSignDialogOpen(true);
        }}
        onDownloadPdf={handleDownloadPdf}
        onBilingualModal={handleOpenBilingual}
        onDeleteSuccess={() => {
          setWorkspaceLease(null);
          refetchLeases();
        }}
      />

      {/* Batch Lease CSV Importer */}
      <ImportLeasesModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => {
          setIsImportModalOpen(false);
          refetchLeases();
        }}
      />

      {/* Bilingual Statutory Lease Modal (Ikinyarwanda / English) */}
      <BilingualLeaseModal
        open={bilingualModalOpen}
        onOpenChange={setBilingualModalOpen}
        leaseData={selectedBilingualData}
      />

      {/* Digital Signature Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Lease Agreement</DialogTitle>
            <DialogDescription>
              Lease #{signingLease?.lease_number} - Execute Landlord Digital Signature
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Tabs defaultValue="draw" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                <TabsTrigger value="upload">Upload Signature</TabsTrigger>
              </TabsList>
              <TabsContent value="draw" className="mt-4">
                <Label className="mb-2 block text-xs">Draw Your Signature</Label>
                <SignaturePad ref={signaturePadRef} width={400} height={150} />
              </TabsContent>
              <TabsContent value="upload" className="mt-4">
                <Label className="mb-2 block text-xs">Upload Signature Image</Label>
                <p className="text-[11px] text-muted-foreground mb-3">
                  PNG or JPG format, transparent background preferred. Max 2MB.
                </p>
                <Input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        toast({ title: 'Error', description: 'File exceeds 2MB limit.', variant: 'destructive' });
                        return;
                      }
                      setUploadedSignatureFile(file);
                    }
                  }}
                  className="text-xs"
                />
                {uploadedSignatureFile && (
                  <div className="mt-3 p-3 border rounded-lg bg-muted/50">
                    <img
                      src={URL.createObjectURL(uploadedSignatureFile)}
                      alt="Uploaded signature preview"
                      className="max-h-20 mx-auto"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSignDialogOpen(false);
                setUploadedSignatureFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSignSubmit}
              disabled={signLease.isPending || uploadSignature.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {signLease.isPending || uploadSignature.isPending ? 'Applying...' : 'Apply Signature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
