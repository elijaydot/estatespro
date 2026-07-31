export const OPERATOR_ROLE_LABELS = {
  security_auditor: 'Security Auditor',
  support_operator: 'Support Operator',
  billing_operator: 'Billing Operator',
  marketplace_reviewer: 'Marketplace Reviewer',
} as const;

export function formatControlPlaneLabel(value: string | null | undefined): string {
  if (!value) return 'Not available';

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function shortReference(value: string | null | undefined): string {
  if (!value) return 'No reference';
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}