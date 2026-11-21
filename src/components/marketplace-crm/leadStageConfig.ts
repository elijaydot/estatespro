// Canonical 7-stage Real Estate CRM Sales Pipeline (matching EstateFlow / real_estate_crm standard)
export const CANONICAL_LEAD_STAGES = [
  'new',
  'contacted',
  'site_visit',
  'interested',
  'negotiation',
  'booked',
  'lost',
] as const;

export type CanonicalLeadStage = (typeof CANONICAL_LEAD_STAGES)[number];

// Active funnel stages (excluding terminal won/lost)
export const ACTIVE_CANONICAL_STAGES = [
  'new',
  'contacted',
  'site_visit',
  'interested',
  'negotiation',
] as const;

// Backward-compatible full list
export const LEAD_STAGE_ORDER = [
  'new',
  'contacted',
  'site_visit',
  'interested',
  'negotiation',
  'booked',
  'lost',
  // legacy aliases for backward compatibility
  'attempted_contact',
  'qualified',
  'viewing_scheduled',
  'offer_made',
  'lease_in_progress',
  'converted',
] as const;

export const LEAD_STAGE_LABEL: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  site_visit: 'Site Visit',
  interested: 'Interested',
  negotiation: 'Negotiation',
  booked: 'Booked',
  lost: 'Lost',
  // Legacy aliases
  attempted_contact: 'Contacted',
  qualified: 'Interested',
  viewing_scheduled: 'Site Visit',
  offer_made: 'Negotiation',
  lease_in_progress: 'Negotiation',
  converted: 'Booked',
};

export const LEAD_STAGE_DESCRIPTION: Record<CanonicalLeadStage, string> = {
  new: 'Initial inquiry via web, walk-in, or campaign ingestion',
  contacted: 'Initial sales rep outreach, qualification & inquiry check',
  site_visit: 'Physical tour or virtual viewing scheduled / conducted',
  interested: 'Buyer selected preferred unit/floorplan and confirmed budget',
  negotiation: 'Reviewing pricing, discounts, token deposit, and lease/sale terms',
  booked: 'Advance deposit paid and unit reserved with concurrency protection',
  lost: 'Buyer opted out, budget mismatch, or unresponsive',
};

export const STAGE_ACCENT: Record<string, string> = {
  new: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  contacted: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  site_visit: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  interested: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  negotiation: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  booked: 'bg-green-500/10 border-green-500/30 text-green-400',
  lost: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  // Legacy
  attempted_contact: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  qualified: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  viewing_scheduled: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  offer_made: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  lease_in_progress: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400',
  converted: 'bg-green-500/10 border-green-500/30 text-green-400',
};

export function normalizeLeadStage(rawStage?: string | null): CanonicalLeadStage {
  if (!rawStage) return 'new';
  const stage = rawStage.toLowerCase().trim();
  switch (stage) {
    case 'attempted_contact':
      return 'contacted';
    case 'viewing_scheduled':
      return 'site_visit';
    case 'qualified':
      return 'interested';
    case 'offer_made':
    case 'lease_in_progress':
      return 'negotiation';
    case 'converted':
      return 'booked';
    case 'new':
    case 'contacted':
    case 'site_visit':
    case 'interested':
    case 'negotiation':
    case 'booked':
    case 'lost':
      return stage as CanonicalLeadStage;
    default:
      return 'new';
  }
}
