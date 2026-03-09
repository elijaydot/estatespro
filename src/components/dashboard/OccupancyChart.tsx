import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useOccupancyData } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Home } from 'lucide-react';

export function OccupancyChart() {
  const { data: chartData = [], isLoading } = useOccupancyData();
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const occupiedPct = total > 0 ? Math.round((chartData.find(d => d.name === 'Occupied')?.value || 0) / total * 100) : 0;

  if (isLoading) {
    return <Skeleton className="h-full min-h-[380px] rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl border border-border/60 p-5 h-full flex flex-col animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Home className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Occupancy</h3>
      </div>

      <div className="flex-1 flex items-center justify-center relative min-h-[180px]">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number) => [`${value} units`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{occupiedPct}%</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Occupied</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-auto pt-4 border-t border-border/60 grid grid-cols-3 gap-2">
        {chartData.map((item) => (
          <div key={item.name} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
              <span className="text-[10px] text-muted-foreground font-medium">{item.name}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
