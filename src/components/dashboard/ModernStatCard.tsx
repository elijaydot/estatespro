import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  percentage?: number;
  label?: string;
}

interface ModernStatCardProps {
  title: string;
  value: string | number;
  trend?: TrendData;
  icon: LucideIcon;
  iconBg?: string;
  sparklineData?: number[];
  actionLabel?: string;
  onAction?: () => void;
}

export function ModernStatCard({
  title,
  value,
  trend,
  icon: Icon,
  iconBg = 'bg-primary/10',
  sparklineData,
  actionLabel,
  onAction,
}: ModernStatCardProps) {
  const maxValue = sparklineData ? Math.max(...sparklineData) : 1;
  const normalizedData = sparklineData?.map(v => (v / maxValue) * 100) || [];

  return (
    <div className="group bg-card rounded-xl p-6 card-shadow-md hover:card-shadow-lg transition-all duration-300 animate-fade-in border border-border/50 hover:border-primary/30 relative overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground transition-transform duration-200 group-hover:scale-105">
                {value}
              </p>
              {trend && (
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full',
                  trend.direction === 'up' && 'bg-success/10 text-success',
                  trend.direction === 'down' && 'bg-destructive/10 text-destructive',
                  trend.direction === 'neutral' && 'bg-muted text-muted-foreground'
                )}>
                  {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                  {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                  {trend.direction === 'neutral' && <Minus className="h-3 w-3" />}
                  {trend.percentage && <span>{trend.percentage}%</span>}
                </div>
              )}
            </div>
            {trend?.label && (
              <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
            )}
          </div>
          
          <div className={cn(
            'p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
            iconBg
          )}>
            <Icon className="h-6 w-6 text-primary transition-transform duration-300" />
          </div>
        </div>

        {/* Sparkline visualization */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="flex items-end gap-0.5 h-12 mt-4">
            {normalizedData.map((height, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-t transition-all duration-300 hover:opacity-70',
                  trend?.direction === 'up' && 'bg-success/40',
                  trend?.direction === 'down' && 'bg-destructive/40',
                  (!trend || trend.direction === 'neutral') && 'bg-primary/40'
                )}
                style={{ 
                  height: `${Math.max(height, 5)}%`,
                  transform: `scaleY(${1 + (i === normalizedData.length - 1 ? 0.1 : 0)})`,
                }}
              />
            ))}
          </div>
        )}

        {/* Action button */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-4 text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200 hover:underline"
          >
            {actionLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
