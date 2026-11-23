import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRevenueData } from '@/hooks/useDashboardStats';
import { useSettings } from '@/contexts/useSettings';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceTrendsProps {
  occupancyTrend: Array<{ month: string; occupancyRate: number }>;
}

export function PerformanceTrends({ occupancyTrend }: PerformanceTrendsProps) {
  const { data: revenueData = [], isLoading } = useRevenueData();
  const { formatCurrency } = useSettings();

  // Generate 6-month collection rate data
  const collectionData = useMemo(() => {
    return revenueData.map((d) => {
      const rate = d.invoiced > 0 ? Math.min(100, Math.round((d.revenue / d.invoiced) * 100)) : 100;
      return {
        month: d.month,
        rate,
      };
    });
  }, [revenueData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[280px] rounded-2xl" />
        <Skeleton className="h-[280px] rounded-2xl" />
        <Skeleton className="h-[280px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Revenue Trend */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Revenue Trend</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monthly collected rental receipts</p>
        </div>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="perfRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: number) => [formatCurrency(val), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#perfRevenueGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Occupancy Trend */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Occupancy Trend</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Physical portfolio unit occupancy %</p>
        </div>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={occupancyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} dy={6} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: number) => [`${val}%`, 'Occupancy']}
              />
              <Line type="monotone" dataKey="occupancyRate" stroke="#16A34A" strokeWidth={2} dot={{ r: 3, fill: '#16A34A' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Collection Rate */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Collection Rate</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Percentage of scheduled rent collected</p>
        </div>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={collectionData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} dy={6} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: number) => [`${val}%`, 'Collection Rate']}
              />
              <Bar dataKey="rate" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
