export const LEAD_STAGE_ORDER = [
  'new',
  'attempted_contact',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'offer_made',
  'lease_in_progress',
  'converted',
  'lost',
] as const;

export const LEAD_STAGE_LABEL: Record<string, string> = {
  new: 'New',
  attempted_contact: 'Attempted',
  contacted: 'Contacted',
  qualified: 'Qualified',
  viewing_scheduled: 'Viewing',
  offer_made: 'Offer',
  lease_in_progress: 'Lease In Progress',
  converted: 'Converted',
  lost: 'Lost',
};