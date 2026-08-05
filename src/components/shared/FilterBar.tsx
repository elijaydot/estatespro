import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function FilterBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:flex-row sm:flex-wrap sm:items-center', className)} {...props} />
  );
}