import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Wrench,
  UserX,
  CreditCard,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  id: string;
  category: 'payment' | 'vacancy' | 'lease' | 'maintenance' | 'approval' | 'communication';
  title: string;
  detail: string;
  metric?: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  actionLabel: string;
  actionHref: string;
}

export interface AttentionCenterProps {
  items: AttentionItem[];
  className?: string;
  title?: string;
  subtitle?: string;
}

export function AttentionCenter({
  items,
  className,
  title = 'Attention Center',
  subtitle = 'Prioritized items requiring immediate executive action',
}: AttentionCenterProps) {
  const navigate = useNavigate();

  const getIcon = (category: AttentionItem['category'], severity: AttentionItem['severity']) => {
    switch (category) {
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'vacancy':
        return <UserX className="h-4 w-4" />;
      case 'lease':
        return <Clock className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'approval':
        return <ShieldAlert className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityStyle = (severity: AttentionItem['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
          iconWrapper: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
          border: 'border-l-4 border-l-rose-500',
        };
      case 'high':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
          iconWrapper: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
          border: 'border-l-4 border-l-amber-500',
        };
      case 'warning':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
          iconWrapper: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
          border: 'border-l-4 border-l-amber-400',
        };
      default:
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
          iconWrapper: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
          border: 'border-l-4 border-l-blue-500',
        };
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className={cn('rounded-xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900', className)}>
        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
              Zero Critical Exceptions
            </h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">
              All collections, leases, and maintenance workflows are within SLA targets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Attention Center"
      className={cn(
        'rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {items.length} {items.length === 1 ? 'action item' : 'action items'}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const style = getSeverityStyle(item.severity);
          return (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 flex flex-col justify-between gap-3',
                style.border
              )}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', style.iconWrapper)}>
                      {getIcon(item.category, item.severity)}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  {item.metric && (
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                      {item.metric}
                    </span>
                  )}
                </div>

                <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {item.detail}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(item.actionHref)}
                  className="h-8 gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 p-0 px-2"
                >
                  {item.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
