import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const data = [
  { name: 'Occupied', value: 85, color: 'hsl(199, 89%, 48%)' },
  { name: 'Vacant', value: 12, color: 'hsl(142, 71%, 45%)' },
  { name: 'Maintenance', value: 3, color: 'hsl(38, 92%, 50%)' },
];

export function OccupancyChart() {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow-md animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-4">Occupancy Overview</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value}%`, '']}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        {data.map((item) => (
          <div key={item.name}>
            <p className="text-2xl font-bold" style={{ color: item.color }}>
              {item.value}%
            </p>
            <p className="text-xs text-muted-foreground">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
