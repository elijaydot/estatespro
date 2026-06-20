export type ReviewerSlaLevel = 'healthy' | 'warning' | 'critical';

export function ageInDays(value: string, nowMs = Date.now()): number {
  const ageMs = nowMs - new Date(value).getTime();
  return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
}

export function getSlaLevel(ageDays: number): ReviewerSlaLevel {
  if (ageDays >= 7) return 'critical';
  if (ageDays >= 3) return 'warning';
  return 'healthy';
}

export function matchesSlaFilter(ageDays: number, filter: 'all' | ReviewerSlaLevel): boolean {
  if (filter === 'all') return true;
  return getSlaLevel(ageDays) === filter;
}

export function matchesDecisionFilter(
  decision: string,
  filter: 'all' | 'verified' | 'needs_review' | 'rejected' | 'approved',
): boolean {
  if (filter === 'all') return true;
  return decision === filter;
}
