// src/lib/tenantProfileCompleteness.ts
// FishGate Design Constitution v1.0 - Resident Relationship & Profile Completeness Engine

import type { Tenant } from '@/hooks/useTenants';

export const TENANT_STATUSES = [
  { value: 'prospective', label: 'Prospective', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { value: 'pending_approval', label: 'Pending Approval', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'approved', label: 'Approved', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 'active', label: 'Active', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'notice_given', label: 'Notice Given', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'moving_out', label: 'Moving Out', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { value: 'former', label: 'Former Resident', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  { value: 'blacklisted', label: 'Blacklisted', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'archived', label: 'Archived', color: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
] as const;

export type TenantStatusValue = typeof TENANT_STATUSES[number]['value'];

export const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: 'text-emerald-600' },
  { value: 'medium', label: 'Medium Risk', color: 'text-amber-600' },
  { value: 'high', label: 'High Risk', color: 'text-rose-600' },
] as const;

export const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS Text' },
] as const;

export const EMPLOYMENT_STATUSES = [
  { value: 'employed', label: 'Employed (Full-Time)' },
  { value: 'part_time', label: 'Employed (Part-Time)' },
  { value: 'self_employed', label: 'Self-Employed / Business Owner' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' },
  { value: 'unemployed', label: 'Unemployed' },
] as const;

export interface TenantCompletenessResult {
  score: number;
  missingFields: string[];
}

export function calculateTenantCompleteness(t: Partial<Tenant>): TenantCompletenessResult {
  let score = 0;
  const missing: string[] = [];

  // 1. Identity (20% total)
  if (t.name || (t.first_name && t.last_name)) {
    score += 8;
  } else {
    missing.push('Full Name');
  }

  if (t.date_of_birth) {
    score += 3;
  } else {
    missing.push('Date of Birth');
  }

  if (t.national_id || t.passport_number || t.id_document) {
    score += 5;
  } else {
    missing.push('National ID / Passport');
  }

  if (t.avatar_url) {
    score += 4;
  } else {
    missing.push('Resident Photo');
  }

  // 2. Contact Information (20% total)
  if (t.phone) {
    score += 8;
  } else {
    missing.push('Primary Phone');
  }

  if (t.email) {
    score += 6;
  } else {
    missing.push('Email Address');
  }

  if (t.emergency_contact && (t.emergency_phone || t.emergency_contact_relationship)) {
    score += 6;
  } else {
    missing.push('Emergency Contact');
  }

  // 3. Address Information (10% total)
  if (t.current_address || t.previous_address) {
    score += 10;
  } else {
    missing.push('Residential Address');
  }

  // 4. Employment & Financial Profile (15% total)
  if (t.employer || t.occupation) {
    score += 8;
  } else {
    missing.push('Employer / Occupation');
  }

  if (t.monthly_income && Number(t.monthly_income) > 0) {
    score += 7;
  } else {
    missing.push('Monthly Income');
  }

  // 5. Lease & Unit Space (20% total)
  if (t.property_id) {
    score += 5;
  } else {
    missing.push('Assigned Property');
  }

  if (t.unit_id) {
    score += 5;
  } else {
    missing.push('Assigned Unit');
  }

  if (t.move_in_date || t.lease_start_date) {
    score += 5;
  } else {
    missing.push('Move-In Date');
  }

  if (t.lease_end_date) {
    score += 5;
  } else {
    missing.push('Lease End Date');
  }

  // 6. Documents & Signed Agreements (10% total)
  const hasDocs = (Array.isArray(t.documents) && t.documents.length > 0) || Boolean(t.id_document);
  if (hasDocs) {
    score += 10;
  } else {
    missing.push('Verified Documents');
  }

  // 7. Preferences & Notes (5% total)
  if (t.preferred_contact_method || t.notes || t.special_requirements) {
    score += 5;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    missingFields: missing,
  };
}
