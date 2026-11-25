// src/lib/leaseHealthModel.ts
// FishGate Design Constitution v1.0 - Lease Health, Completeness & 11-Stage Status Framework

import { differenceInDays, parseISO, isValid } from 'date-fns';
import type { Lease } from '@/hooks/useLeases';

export const LEASE_STATUSES = [
  {
    value: 'draft',
    label: 'Draft',
    color: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    description: 'Agreement being drafted before review',
  },
  {
    value: 'pending_approval',
    label: 'Pending Approval',
    color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
    description: 'Awaiting management or owner sign-off',
  },
  {
    value: 'pending_signature',
    label: 'Pending Signature',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    description: 'Sent to tenant/landlord for digital execution',
  },
  {
    value: 'active',
    label: 'Active',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    description: 'Current binding lease driving active occupancy',
  },
  {
    value: 'renewal_in_progress',
    label: 'Renewal In Progress',
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
    description: 'Terms under negotiation for term extension',
  },
  {
    value: 'notice_given',
    label: 'Notice Given',
    color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
    description: 'Departure or non-renewal notice lodged',
  },
  {
    value: 'expiring_soon',
    label: 'Expiring Soon',
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    description: 'Expiring within 30 to 60 days',
  },
  {
    value: 'expired',
    label: 'Expired',
    color: 'bg-rose-600/15 text-rose-700 dark:text-rose-400 border-rose-600/30',
    description: 'Past end date without active renewal extension',
  },
  {
    value: 'terminated',
    label: 'Terminated',
    color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
    description: 'Early contract termination or breach',
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20',
    description: 'Full term fulfilled and moved out in good order',
  },
  {
    value: 'archived',
    label: 'Archived',
    color: 'bg-zinc-600/15 text-zinc-700 dark:text-zinc-400 border-zinc-600/20',
    description: 'Historic agreement preserved for record retention',
  },
] as const;

export type LeaseStatusValue = typeof LEASE_STATUSES[number]['value'];

export const RENEWAL_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-500/15 text-slate-600 border-slate-500/20' },
  { value: 'pending_renewal', label: 'Pending Discussion', color: 'bg-amber-500/15 text-amber-600 border-amber-500/20' },
  { value: 'in_negotiation', label: 'In Negotiation', color: 'bg-blue-500/15 text-blue-600 border-blue-500/20' },
  { value: 'renewed', label: 'Renewed', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
  { value: 'declined', label: 'Declined / Moving Out', color: 'bg-rose-500/15 text-rose-600 border-rose-500/20' },
  { value: 'not_renewed', label: 'Not Renewed', color: 'bg-zinc-500/15 text-zinc-600 border-zinc-500/20' },
] as const;

export const LEASE_TYPES = [
  { value: 'residential', label: 'Residential Lease' },
  { value: 'commercial', label: 'Commercial Lease' },
  { value: 'retail', label: 'Retail Space' },
  { value: 'industrial', label: 'Industrial / Warehouse' },
  { value: 'short_term', label: 'Short-Term / Serviced' },
] as const;

export const BILLING_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (Every 3 months)' },
  { value: 'semi_annually', label: 'Semi-Annually (Every 6 months)' },
  { value: 'annually', label: 'Annually (Once a year)' },
] as const;

export interface LeaseHealthResult {
  score: number;
  grade: 'Optimal' | 'Good' | 'Attention' | 'At Risk';
  missingItems: string[];
  daysRemaining: number | null;
  renewalUrgency: 'urgent' | 'upcoming' | 'settled' | 'none';
  signatureStatus: 'fully_signed' | 'landlord_only' | 'tenant_only' | 'unsigned';
  complianceComplete: boolean;
}

export function calculateLeaseHealth(lease: Partial<Lease> & Record<string, any>): LeaseHealthResult {
  let score = 0;
  const missingItems: string[] = [];

  // 1. Core Identification & Spaces (20 points)
  if (lease.lease_number) score += 5;
  else missingItems.push('Lease Reference Number');

  if (lease.property_id) score += 5;
  else missingItems.push('Property Assignment');

  if (lease.unit_id) score += 5;
  else missingItems.push('Unit Allocation');

  if (lease.tenant_id) score += 5;
  else missingItems.push('Resident Assignment');

  // 2. Dates & Tenancy Horizon (25 points)
  let daysRemaining: number | null = null;
  if (lease.start_date) score += 5;
  else missingItems.push('Start Date');

  if (lease.end_date) {
    score += 10;
    try {
      const end = parseISO(lease.end_date);
      if (isValid(end)) {
        daysRemaining = differenceInDays(end, new Date());
      }
    } catch {
      // ignore
    }
  } else {
    missingItems.push('End Date');
  }

  if (lease.move_in_date || lease.occupancy_start_date) score += 5;
  else missingItems.push('Move-in / Occupancy Date');

  if (lease.notice_period_days !== undefined && lease.notice_period_days !== null) score += 5;
  else missingItems.push('Notice Period Configuration');

  // 3. Financial Terms & Security (25 points)
  if (lease.monthly_rent && Number(lease.monthly_rent) > 0) score += 10;
  else missingItems.push('Monthly Rent Amount');

  if (lease.security_deposit !== undefined && Number(lease.security_deposit) > 0) score += 10;
  else missingItems.push('Security Deposit Record');

  if (lease.billing_frequency) score += 5;

  // 4. Execution & Signatures (20 points)
  const hasLandlordSig = Boolean(lease.landlord_signature_url || lease.landlord_signed_at);
  const hasTenantSig = Boolean(lease.tenant_signature_url || lease.tenant_signed_at);

  if (hasLandlordSig) score += 10;
  else missingItems.push('Landlord Signature');

  if (hasTenantSig) score += 10;
  else missingItems.push('Tenant Signature');

  // 5. Documentation & Compliance (10 points)
  const hasDoc = Boolean(
    lease.document_url ||
    (Array.isArray(lease.documents) && lease.documents.length > 0) ||
    lease.terms
  );
  if (hasDoc) score += 10;
  else missingItems.push('Signed Lease Document');

  // Determine Grade
  let grade: LeaseHealthResult['grade'] = 'Optimal';
  if (score < 50) grade = 'At Risk';
  else if (score < 75) grade = 'Attention';
  else if (score < 90) grade = 'Good';

  // Determine Renewal Urgency
  let renewalUrgency: LeaseHealthResult['renewalUrgency'] = 'none';
  if (lease.status === 'active' && daysRemaining !== null) {
    if (daysRemaining < 0) renewalUrgency = 'urgent';
    else if (daysRemaining <= 30) renewalUrgency = 'urgent';
    else if (daysRemaining <= 60) renewalUrgency = 'upcoming';
    else renewalUrgency = 'settled';
  }

  // Determine Signature Status
  let signatureStatus: LeaseHealthResult['signatureStatus'] = 'unsigned';
  if (hasLandlordSig && hasTenantSig) signatureStatus = 'fully_signed';
  else if (hasLandlordSig) signatureStatus = 'landlord_only';
  else if (hasTenantSig) signatureStatus = 'tenant_only';

  return {
    score: Math.min(100, Math.max(0, score)),
    grade,
    missingItems,
    daysRemaining,
    renewalUrgency,
    signatureStatus,
    complianceComplete: hasLandlordSig && hasTenantSig && hasDoc,
  };
}
