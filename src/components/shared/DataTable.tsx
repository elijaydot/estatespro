import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function DataTable({ children, className, ...props }: DataTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]', className)} {...props}>
      {children}
    </div>
  );
}