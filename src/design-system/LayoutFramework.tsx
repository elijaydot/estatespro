import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Universal PageContainer
 * Aligns strictly to 8pt grid: px-6 py-6 sm:px-8 space-y-6.
 * Replaces arbitrary page paddings and conflicting widths.
 */
export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl';
  children: React.ReactNode;
}

export function PageContainer({
  maxWidth = '7xl',
  className,
  children,
  ...props
}: PageContainerProps) {
  const maxWidthClass = {
    full: 'w-full',
    '7xl': 'max-w-[1400px]',
    '6xl': 'max-w-[1200px]',
    '5xl': 'max-w-[1000px]',
  }[maxWidth];

  return (
    <div
      className={cn(
        'mx-auto w-full px-6 py-6 sm:px-8 space-y-6 animate-fade-in',
        maxWidthClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * PageHeader
 * Strict typography:
 * - Page Title: 32px / 700 (text-[32px] font-bold leading-tight tracking-tight)
 * - Page Description: 14px / 400 (text-[14px] text-slate-500 leading-relaxed)
 * - Breadcrumb / Context: 12px / 500 (text-[12px] text-slate-400)
 */
export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="space-y-1.5 min-w-0">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="text-[12px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            {breadcrumb}
          </nav>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[28px] sm:text-[32px] leading-[36px] sm:leading-[40px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {title}
          </h1>
          {badge && <div className="inline-flex items-center">{badge}</div>}
        </div>
        {description && (
          <p className="text-[14px] leading-[20px] text-slate-500 dark:text-slate-400 max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-1 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </header>
  );
}

/**
 * PageActions Container
 * Standard toolbar container for primary, secondary, and filter actions.
 */
export function PageActions({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2.5 flex-wrap sm:flex-nowrap', className)}>
      {children}
    </div>
  );
}

/**
 * PageInsights
 * Scannable, uncluttered metric strip.
 * Replaces heavy card clusters with clean whitespace and crisp 8pt alignment.
 */
export interface MetricItem {
  id?: string;
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  status?: string;
}

export interface PageInsightsProps {
  metrics?: MetricItem[];
  items?: MetricItem[];
  className?: string;
}

export function PageInsights({ metrics, items, className }: PageInsightsProps) {
  const rawList = metrics || items || [];
  const normalized = rawList.map((m, idx) => {
    let resolvedTone: 'default' | 'success' | 'warning' | 'danger' = 'default';
    const t = m.tone || m.status;
    if (t === 'success' || t === 'info') resolvedTone = 'success';
    else if (t === 'warning') resolvedTone = 'warning';
    else if (t === 'danger' || t === 'critical' || t === 'error') resolvedTone = 'danger';

    return {
      id: m.id || `insight-${idx}-${m.label}`,
      label: m.label,
      value: m.value,
      subtext: m.subtext,
      tone: resolvedTone,
      trend: m.trend,
    };
  });

  if (normalized.length === 0) return null;

  return (
    <section aria-label="Page key metrics" className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4', className)}>
      {normalized.map((m) => (
        <div
          key={m.id}
          className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            {m.label}
          </p>
          <p
            className={cn(
              'mt-1 text-[24px] font-semibold tracking-tight',
              m.tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
              m.tone === 'warning' && 'text-amber-600 dark:text-amber-400',
              m.tone === 'danger' && 'text-rose-600 dark:text-rose-400',
              (!m.tone || m.tone === 'default') && 'text-slate-900 dark:text-slate-100'
            )}
          >
            {m.value}
          </p>
          {m.subtext && (
            <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">
              {m.subtext}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

/**
 * PageSection
 * Strict hierarchy: Section Title is 24px / 600.
 * Whitespace replaces borders whenever possible.
 */
export interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: PageSectionProps) {
  return (
    <section className={cn('space-y-4', className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
          <div>
            {title && (
              <h2 className="text-[20px] sm:text-[24px] leading-[28px] sm:leading-[32px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
