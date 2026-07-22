export type TimeRange = '24h' | '7d' | '30d' | 'all';

export function isInTimeRange(value: string, timeRange: TimeRange) {
  if (timeRange === 'all') return true;

  const now = Date.now();
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return false;

  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 24 * 7 : 24 * 30;
  return now - createdAt <= hours * 60 * 60 * 1000;
}

export function matchesSearch(haystack: Array<string | null | undefined>, needle: string) {
  const search = needle.trim().toLowerCase();
  if (!search) return true;
  return haystack.some((value) => String(value || '').toLowerCase().includes(search));
}

function csvEscape(value: unknown) {
  const raw = String(value ?? '');
  if (!/[",\n]/.test(raw)) {
    return raw;
  }
  return `"${raw.replace(/"/g, '""')}"`;
}

export function rowsToCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  });

  return lines.join('\n');
}

export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
