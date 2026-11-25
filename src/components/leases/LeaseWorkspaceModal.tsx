// src/components/leases/LeaseWorkspaceModal.tsx
// FishGate Design Constitution v1.0 - Complete Lease Agreement Workspace (Single Source of Truth)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  User,
  Home,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  ClipboardCheck,
  MessageSquare,
  History,
  FileSignature,
  Download,
  Edit,
  Trash2,
  Send,
  Calendar,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSettings } from '@/contexts/useSettings';
import { useUpdateLease, useDeleteLease, type Lease } from '@/hooks/useLeases';
import {
  calculateLeaseHealth,
  LEASE_STATUSES,
  RENEWAL_STATUSES,
} from '@/lib/leaseHealthModel';
import { calculateRraLeaseFilingDeadline } from '@/lib/rraCompliance';
import { LeaseAttachments } from '@/components/leases/LeaseAttachments';
import { downloadLeasePdf } from '@/lib/pdfService';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface LeaseWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: Lease | null;
  onEdit?: (lease: Lease) => void;
  onSign?: (lease: Lease) => void;
  onDownloadPdf?: (leaseId: string, lease?: Lease) => void;
  onBilingualModal?: (lease: Lease) => void;
  onDeleteSuccess?: () => void;
}

export function LeaseWorkspaceModal({
  open,
  onOpenChange,
  lease,
  onEdit,
  onSign,
  onDownloadPdf,
  onBilingualModal,
  onDeleteSuccess,
}: LeaseWorkspaceModalProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const updateLease = useUpdateLease();
  const deleteLease = useDeleteLease();
  const [activeTab, setActiveTab] = useState('overview');

  if (!lease) return null;

  const health = calculateLeaseHealth(lease);
  const daysLeft = lease.end_date ? differenceInDays(new Date(lease.end_date), new Date()) : null;
  const rra = calculateRraLeaseFilingDeadline(lease.start_date);

  const statusConfig = LEASE_STATUSES.find((s) => s.value === lease.status) || {
    label: lease.status,
    color: 'bg-muted text-muted-foreground',
  };

  const renewalConfig = RENEWAL_STATUSES.find((r) => r.value === lease.renewal_status) || {
    label: lease.renewal_status || 'Not Started',
    color: 'bg-muted text-muted-foreground',
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete Lease ${lease.lease_number}?`)) {
      return;
    }
    try {
      await deleteLease.mutateAsync(lease.id);
      onOpenChange(false);
      onDeleteSuccess?.();
    } catch {
      // handled in hook
    }
  };

  const handleSendForSignature = async () => {
    try {
      await updateLease.mutateAsync({ id: lease.id, status: 'pending_signature' });
      toast({
        title: 'Sent for Digital Signature',
        description: `Lease ${lease.lease_number} is now marked as pending signature.`,
      });
    } catch {
      // handled
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[92vh] overflow-y-auto p-0 flex flex-col gap-0 border-border shadow-2xl">
        {/* Workspace Top Banner */}
        <div className="p-6 pb-4 border-b border-border bg-card sticky top-0 z-10 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-foreground font-mono">
                      {lease.lease_number}
                    </DialogTitle>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold border', statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold border', renewalConfig.color)}>
                      {renewalConfig.label}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {lease.properties?.name || 'Assigned Property'} • Unit {lease.units?.unit_number || 'N/A'} • Resident: {lease.tenants?.name || 'Unassigned'}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {onBilingualModal && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => onBilingualModal(lease)}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Bilingual Statutory (RW/EN)
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium gap-1"
                onClick={() => {
                  if (onDownloadPdf) {
                    onDownloadPdf(lease.id, lease);
                  } else {
                    downloadLeasePdf({ leaseId: lease.id, leaseData: lease });
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>

              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium gap-1"
                  onClick={() => onEdit(lease)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}

              {lease.status === 'draft' && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSendForSignature}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send for Signature
                </Button>
              )}

              {onSign && (lease.status === 'pending_signature' || lease.status === 'draft') && !lease.landlord_signed_at && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onSign(lease)}
                >
                  <FileSignature className="h-3.5 w-3.5" />
                  Sign Contract
                </Button>
              )}
            </div>
          </div>

          {/* Metric Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 bg-muted/40 rounded-lg border border-border/80">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Monthly Rent</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(lease.monthly_rent)}/mo
              </p>
            </div>

            <div className="p-2.5 bg-muted/40 rounded-lg border border-border/80">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Agreement Health</span>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {health.score}% <span className="text-xs font-normal text-muted-foreground">({health.grade})</span>
              </p>
            </div>

            <div className="p-2.5 bg-muted/40 rounded-lg border border-border/80">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Days Remaining</span>
              <p
                className={cn(
                  'text-sm font-bold mt-0.5',
                  daysLeft !== null && daysLeft <= 30
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-foreground'
                )}
              >
                {daysLeft !== null ? (daysLeft < 0 ? 'Expired' : `${daysLeft} Days`) : 'N/A'}
              </p>
            </div>

            <div className="p-2.5 bg-muted/40 rounded-lg border border-border/80">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Execution Status</span>
              <p className="text-xs font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', lease.landlord_signed_at ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                Landlord
                <span className={cn('h-2 w-2 rounded-full ml-1.5', lease.tenant_signed_at ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                Tenant
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6 pt-2 flex-1">
          <TabsList className="bg-muted/60 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tenant" className="text-xs gap-1.5">
              <User className="h-3.5 w-3.5" />
              Tenant & Space
            </TabsTrigger>
            <TabsTrigger value="financials" className="text-xs gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Financial Terms
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Documents & Addenda
            </TabsTrigger>
            <TabsTrigger value="renewals" className="text-xs gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Renewals
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1.5">
              <History className="h-3.5 w-3.5" />
              Timeline & Signatures
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Health & Missing Items Alert */}
            {health.missingItems.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Incomplete Compliance Record:</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Missing: {health.missingItems.join(', ')}. Complete these fields to achieve 100% agreement health.
                  </p>
                </div>
              </div>
            )}

            {/* RRA Filing Status */}
            {(rra.isUrgent || rra.isOverdue) && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between text-xs text-rose-900 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-rose-600" />
                  <span>{rra.description}</span>
                </div>
                <Badge variant="destructive" className="text-[10px]">
                  {rra.badgeLabel}
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-card rounded-lg border border-border space-y-2 text-xs">
                <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Contract Term Duration
                </h5>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Start Date</span>
                    <span className="font-semibold text-foreground">
                      {lease.start_date ? format(new Date(lease.start_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">End Date</span>
                    <span className="font-semibold text-foreground">
                      {lease.end_date ? format(new Date(lease.end_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Move-In Date</span>
                    <span className="font-medium text-foreground">
                      {lease.move_in_date ? format(new Date(lease.move_in_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Notice Window</span>
                    <span className="font-medium text-foreground">
                      {lease.notice_period_days || 30} Days
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-card rounded-lg border border-border space-y-2 text-xs">
                <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Financial Structure
                </h5>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Monthly Rent</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(lease.monthly_rent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Security Deposit</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(lease.security_deposit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Billing Frequency</span>
                    <span className="font-medium text-foreground capitalize">
                      {lease.billing_frequency || 'Monthly'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Annual Escalation</span>
                    <span className="font-medium text-foreground">
                      {lease.annual_escalation_pct ? `${lease.annual_escalation_pct}%` : 'Fixed / 0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Conditions & Terms Excerpt */}
            <div className="p-4 bg-card rounded-lg border border-border space-y-2 text-xs">
              <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                Terms & Covenants Summary
              </h5>
              <div className="p-3 bg-muted/40 rounded border border-border/80 whitespace-pre-wrap font-mono text-[11px] max-h-36 overflow-y-auto leading-relaxed">
                {lease.terms || 'No terms documented.'}
              </div>
              {lease.special_conditions && (
                <div className="pt-2">
                  <span className="font-semibold text-foreground text-[11px] block">Special Stipulations:</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{lease.special_conditions}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: TENANT & SPACE */}
          <TabsContent value="tenant" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tenant Profile Card */}
              <div className="p-4 bg-card rounded-lg border border-border space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-foreground uppercase tracking-wider text-muted-foreground text-xs">
                    Resident Information
                  </h5>
                  {lease.tenant_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-primary"
                      onClick={() => navigate(`/tenants/${lease.tenant_id}`)}
                    >
                      View Profile <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    {lease.tenants?.avatar_url && <AvatarImage src={lease.tenants.avatar_url} />}
                    <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
                      {lease.tenants?.name?.slice(0, 2).toUpperCase() || 'TN'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{lease.tenants?.name || 'Unassigned'}</p>
                    <p className="text-muted-foreground">{lease.tenants?.email || 'No email'}</p>
                    <p className="text-muted-foreground">{lease.tenants?.phone || 'No phone'}</p>
                  </div>
                </div>
              </div>

              {/* Space & Property Card */}
              <div className="p-4 bg-card rounded-lg border border-border space-y-3 text-xs">
                <h5 className="font-semibold text-foreground uppercase tracking-wider text-muted-foreground text-xs">
                  Assigned Space
                </h5>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Home className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      Unit {lease.units?.unit_number || 'N/A'}
                    </p>
                    <p className="text-muted-foreground">
                      {lease.properties?.name || 'No Property Assigned'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lease.properties?.city || ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: FINANCIAL TERMS */}
          <TabsContent value="financials" className="space-y-4 mt-4">
            <div className="p-4 bg-card rounded-lg border border-border space-y-4 text-xs">
              <h5 className="font-semibold text-foreground uppercase tracking-wider text-muted-foreground text-xs">
                Complete Billing & Fee Structure
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Monthly Rent</span>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(lease.monthly_rent)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Security Deposit</span>
                  <p className="text-base font-semibold text-foreground">
                    {formatCurrency(lease.security_deposit)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Advance Rent</span>
                  <p className="text-base font-semibold text-foreground">
                    {formatCurrency(lease.advance_rent || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Utility Charges</span>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(lease.utility_charges || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Parking Fee</span>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(lease.parking_charges || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Late Fee Amount</span>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(lease.late_fee_amount || 0)}
                  </p>
                </div>
              </div>

              {lease.payment_terms && (
                <div className="pt-3 border-t border-border">
                  <span className="text-[11px] font-semibold text-foreground block">Payment Terms & Instructions:</span>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{lease.payment_terms}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: DOCUMENTS & ADDENDA */}
          <TabsContent value="documents" className="space-y-4 mt-4">
            <LeaseAttachments leaseId={lease.id} />
          </TabsContent>

          {/* TAB 5: RENEWALS */}
          <TabsContent value="renewals" className="space-y-4 mt-4">
            <div className="p-4 bg-card rounded-lg border border-border space-y-3 text-xs">
              <h5 className="font-semibold text-foreground uppercase tracking-wider text-muted-foreground text-xs">
                Renewal Rules & Extension Policy
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Renewable</span>
                  <p className="font-semibold text-foreground">
                    {lease.is_renewable ?? true ? 'Yes (Permitted)' : 'Non-Renewable Fixed Term'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Extension Term</span>
                  <p className="font-semibold text-foreground">
                    {lease.renewal_period_months || 12} Months
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Auto-Rollover</span>
                  <p className="font-semibold text-foreground">
                    {lease.auto_renewal ? 'Active (Auto-renewing)' : 'Requires Formal Addendum'}
                  </p>
                </div>
              </div>
              {lease.renewal_notes && (
                <div className="pt-2 border-t border-border">
                  <span className="font-semibold text-foreground text-[11px]">Renewal Notes:</span>
                  <p className="text-muted-foreground mt-0.5">{lease.renewal_notes}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 6: TIMELINE & SIGNATURES */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-card text-xs space-y-2">
                <span className="font-semibold text-foreground uppercase tracking-wider text-muted-foreground text-[10px]">
                  Landlord Execution
                </span>
                {lease.landlord_signature_url ? (
                  <div>
                    <img src={lease.landlord_signature_url} alt="Landlord Signature" className="max-h-16 border rounded p-1 bg-white" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Signed: {lease.landlord_signed_at ? format(new Date(lease.landlord_signed_at), 'MMM d, yyyy h:mm a') : 'Yes'}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Landlord has not executed signature yet.</p>
                )}
              </div>

              <div className="p-4 border rounded-lg bg-card text-xs space-y-2">
                <span className="font-semibold text-foreground uppercase tracking-wider text-muted-foreground text-[10px]">
                  Resident Execution
                </span>
                {lease.tenant_signature_url ? (
                  <div>
                    <img src={lease.tenant_signature_url} alt="Resident Signature" className="max-h-16 border rounded p-1 bg-white" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Signed: {lease.tenant_signed_at ? format(new Date(lease.tenant_signed_at), 'MMM d, yyyy h:mm a') : 'Yes'}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Resident has not executed signature yet.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Footer */}
        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between sticky bottom-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete Lease
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => onOpenChange(false)}>
            Close Workspace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
