import React from 'react';
import { cn } from '@/lib/utils';
import { Pagination, type PaginationProps } from '@/components/shared/Pagination';

export interface StandardTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  pagination?: PaginationProps;
  toolbar?: React.ReactNode;
  stickyHeader?: boolean;
}

/**
 * StandardTable Container
 * Stripe / Microsoft Admin Center / Airtable aesthetic:
 * - Minimal borders, subtle slate divider lines
 * - High readability, zero visual clutter
 * - Sticky header support
 * - Integrated pagination footer on 8pt grid
 */
export function StandardTable({
  children,
  pagination,
  toolbar,
  stickyHeader = true,
  className,
  ...props
}: StandardTableProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    >
      {toolbar && (
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          {toolbar}
        </div>
      )}

      <div className="relative w-full overflow-x-auto">
        <div className={cn('min-w-full', stickyHeader && '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10')}>
          {children}
        </div>
      </div>

      {pagination && (
        <div className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}
