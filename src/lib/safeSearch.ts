/**
 * Null-safe string normalization for search filtering.
 * Prevents runtime errors when searching through records with missing/optional data.
 */
export function safeSearch(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
}

/**
 * Check if a value matches a search query (null-safe).
 */
export function matchesSearch(value: unknown, query: string): boolean {
  return safeSearch(value).includes(query.toLowerCase());
}
