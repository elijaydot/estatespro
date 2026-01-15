import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useOccupancyData } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function OccupancyChart() {
  const { data: chartData = [], isLoading } = useOccupancyData();
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (isLoading) {
    return <Skeleton className="h-[350px] rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl p-6 card-shadow-md animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-4">Occupancy Overview</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${value} units`, '']} />
            <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        {chartData.map((item) => (
          <div key={item.name}>
            <p className="text-2xl font-bold" style={{ color: item.fill }}>{total > 0 ? Math.round((item.value / total) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
