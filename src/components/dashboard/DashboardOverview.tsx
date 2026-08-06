import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Bell, CalendarClock, Store, Wrench, Home } from 'lucide-react';

export type DashboardKpiData = {
  overdueAmount: number;
  overdueCount: number;
  occupiedUnits: number;
  totalUnits: number;
  maintenanceOpen: number;
  maintenanceInProgress: number;
  renewals30d: number;
  activeVendors: number;
  pendingPayables: number;
  alerts: number;
};

type DashboardKpiStripProps = {
  data: DashboardKpiData;
  formatCurrency: (amount: number) => string;
};

type KpiTile = {
  label: string;
  value: string;
  context: string;
  icon: LucideIcon;
  tone?: 'critical' | 'warning';
};

export function DashboardKpiStrip({ data, formatCurrency }: DashboardKpiStripProps) {
  const occupancy = data.totalUnits > 0 ? Math.round((data.occupiedUnits / data.totalUnits) * 100) : 0;
  const tiles: KpiTile[] = [
    {
      label: 'Overdue',
      value: formatCurrency(data.overdueAmount),
      context: `${data.overdueCount} invoice${data.overdueCount === 1 ? '' : 's'}`,
      icon: AlertTriangle,
      tone: data.overdueAmount > 0 ? 'critical' : undefined,
    },
    {
      label: 'Occupancy',
      value: `${occupancy}%`,
      context: `${data.occupiedUnits} of ${data.totalUnits} units`,
      icon: Home,
    },
    {
      label: 'Maintenance',
      value: String(data.maintenanceOpen),
      context: `${data.maintenanceInProgress} in progress`,
      icon: Wrench,
      tone: data.maintenanceOpen > 0 ? 'warning' : undefined,
    },
    {
      label: 'Renewals (30d)',
      value: String(data.renewals30d),
      context: 'leases expiring',
      icon: CalendarClock,
      tone: data.renewals30d > 0 ? 'warning' : undefined,
    },
    {
      label: 'Active vendors',
      value: String(data.activeVendors),
      context: `${formatCurrency(data.pendingPayables)} pending`,
      icon: Store,
    },
    {
      label: 'Alerts',
      value: String(data.alerts),
      context: 'needs attention',
      icon: Bell,
      tone: data.alerts > 0 ? 'critical' : undefined,
    },
  ];

  return (
    <section aria-label="Portfolio key performance indicators" className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="min-w-0 rounded-xl bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
            <tile.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className={`mt-3 flex min-h-12 items-start whitespace-normal break-words text-lg font-bold leading-tight ${tile.tone === 'critical' ? 'text-destructive' : tile.tone === 'warning' ? 'text-warning' : 'text-foreground'}`}>
            {tile.value}
          </p>
          <p className="mt-1 min-h-8 text-xs text-muted-foreground">{tile.context}</p>
        </div>
      ))}
    </section>
  );
}

export function DashboardChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg bg-muted/25 px-6 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}