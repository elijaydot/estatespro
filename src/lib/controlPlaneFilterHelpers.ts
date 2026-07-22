export type CompanyDirectoryEntry = {
  id: string;
  name: string | null;
  email: string | null;
};

export type UserDirectoryEntry = {
  user_id: string;
  name: string | null;
  email: string | null;
};

export type CorrelationOptionRow = {
  value: string;
  label: string;
  description: string;
};

function normalize(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

export function matchesCompanyFilter(
  companyId: string | null,
  query: string,
  directory: Map<string, CompanyDirectoryEntry>,
): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const resolvedCompanyId = companyId || 'unscoped';
  const entry = companyId ? directory.get(companyId) : null;

  const candidates = [
    resolvedCompanyId,
    entry?.name || '',
    entry?.email || '',
    companyId ? '' : 'unscoped',
  ].map(normalize);

  return candidates.some((candidate) => candidate.includes(normalizedQuery));
}

export function matchesUserFilter(
  userId: string | null,
  query: string,
  directory: Map<string, UserDirectoryEntry>,
): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const resolvedUserId = userId || 'unknown';
  const entry = userId ? directory.get(userId) : null;

  const candidates = [
    resolvedUserId,
    entry?.name || '',
    entry?.email || '',
    userId ? '' : 'unknown',
  ].map(normalize);

  return candidates.some((candidate) => candidate.includes(normalizedQuery));
}

export function buildCorrelationFilterOptions(
  events: Array<{ correlation_id: string; created_at: string }>,
  limit = 200,
): CorrelationOptionRow[] {
  const summary = new Map<string, { count: number; latestAt: string }>();

  events.forEach((event) => {
    const key = event.correlation_id;
    const current = summary.get(key);
    if (!current) {
      summary.set(key, { count: 1, latestAt: event.created_at });
      return;
    }

    current.count += 1;
    if (new Date(event.created_at).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = event.created_at;
    }
  });

  const rows = Array.from(summary.entries())
    .sort((a, b) => {
      const countDiff = b[1].count - a[1].count;
      if (countDiff !== 0) return countDiff;
      return new Date(b[1].latestAt).getTime() - new Date(a[1].latestAt).getTime();
    })
    .slice(0, limit)
    .map(([correlationId, meta]) => ({
      value: correlationId,
      label: correlationId,
      description: `${meta.count} events • latest ${new Date(meta.latestAt).toLocaleString()}`,
    }));

  return [
    {
      value: '',
      label: 'All correlations',
      description: 'Clear correlation filter',
    },
    ...rows,
  ];
}
