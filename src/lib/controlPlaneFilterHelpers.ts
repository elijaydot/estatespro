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
