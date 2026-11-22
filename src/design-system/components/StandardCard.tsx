import React from 'react';
import { cn } from '@/lib/utils';

export interface StandardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'borderless';
  children: React.ReactNode;
}

/**
 * StandardCard
 * Reformed Card Component:
 * - 80% clean space, 20% visual styling.
 * - Whitespace replaces heavy borders whenever possible.
 * - Used strictly when semantic physical separation is required.
 */
export function StandardCard({
  variant = 'default',
  className,
  children,
  ...props
}: StandardCardProps) {
  return (
    <div
      className={cn(
        variant === 'default' &&
          'rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs',
        variant === 'subtle' &&
          'rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800/80 dark:bg-slate-900/40',
        variant === 'borderless' &&
          'p-4 sm:p-6 bg-transparent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
