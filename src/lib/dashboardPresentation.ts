export function parseMetricNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = value.replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatPredictiveCurrency(
  value: string | number | null | undefined,
  formatCurrency: (amount: number) => string,
) {
  return formatCurrency(parseMetricNumber(value));
}