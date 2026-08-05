import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  href?: string;
  className?: string;
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
}

const accentClasses = {
  primary: 'before:bg-primary',
  success: 'before:bg-success',
  warning: 'before:bg-warning',
  destructive: 'before:bg-destructive',
  info: 'before:bg-info',
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'bg-primary/10 text-primary',
  trend = 'neutral',
  href,
  className,
  accent,
}: MetricCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors',
        accent && 'before:absolute before:inset-x-0 before:top-0 before:h-[3px]',
        accent && accentClasses[accent],
        href && 'cursor-pointer hover:border-primary/25',
        className,
      )}
      onClick={() => href && navigate(href)}
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={(event) => {
        if (href && (event.key === 'Enter' || event.key === ' ')) navigate(href);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className={cn(
              'mt-1 flex items-center gap-1 text-xs font-medium',
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-destructive',
              trend === 'neutral' && 'text-muted-foreground',
            )}>
              {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
              {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconColor)}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
      {href && <ArrowUpRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
    </div>
  );
}