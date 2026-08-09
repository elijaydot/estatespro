import type { StatusPillProps } from '@/components/shared/StatusPill';

export function listingStatusVariant(status: string): StatusPillProps['variant'] {
  switch (status) {
    case 'live': return 'success';
    case 'pending_review': return 'info';
    case 'pending_removal': return 'warning';
    case 'archived':
    case 'blocked': return 'destructive';
    case 'draft':
    case 'paused':
    default: return 'neutral';
  }
}
