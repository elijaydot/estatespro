import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRevenueData } from '@/hooks/useDashboardStats';
import { useSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';

export function RevenueChart() {
  const { data: chartData = [], isLoading } = useRevenueData();
  const { formatCurrency } = useSettings();

  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);

  if (isLoading) {
    return <Skeleton className="h-[400px] rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl p-6 card-shadow-md animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-sm text-muted-foreground">Last 6 months</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-muted-foreground">Total revenue</p>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
