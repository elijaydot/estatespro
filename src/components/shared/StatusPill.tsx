import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type StatusPillVariant = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

const variants: Record<StatusPillVariant, string> = {
  success: 'bg-[hsl(var(--pill-success-bg))] text-success',
  warning: 'bg-[hsl(var(--pill-warning-bg))] text-warning',
  destructive: 'bg-[hsl(var(--pill-destructive-bg))] text-destructive',
  info: 'bg-[hsl(var(--pill-info-bg))] text-info',
  neutral: 'bg-[hsl(var(--pill-neutral-bg))] text-muted-foreground',
};

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: StatusPillVariant;
}

export function StatusPill({ variant = 'neutral', className, ...props }: StatusPillProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none', variants[variant], className)}
      {...props}
    />
  );
}