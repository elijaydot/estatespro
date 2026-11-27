// src/components/maintenance/MaintenancePropertyHealth.tsx
// FishGate Design Constitution v1.0 - Section 5: Property Physical Health Analytics

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertTriangle, TrendingDown, DollarSign, Wrench, ShieldAlert } from 'lucide-react';
import { MaintenanceRequestRecord, WorkOrderRecord } from './types';
import { Property } from '@/hooks/useProperties';

interface MaintenancePropertyHealthProps {
  properties: Property[];
  requests: MaintenanceRequestRecord[];
  workOrders: WorkOrderRecord[];
  currency?: string;
}

export function MaintenancePropertyHealth({
  properties,
  requests,
  workOrders,
  currency = 'RWF',
}: MaintenancePropertyHealthProps) {
  // Aggregate stats by property
  const propertyStats = properties.map((p) => {
    const propRequests = requests.filter((r) => r.propertyId === p.id);
    const propOrders = workOrders.filter((w) => w.propertyId === p.id);
    const emergencyCount = propRequests.filter((r) => r.priority === 'emergency').length;
    const totalCost = propOrders.reduce((sum, w) => sum + (w.actualCost || w.estimatedCost || 0), 0);

    // Calculate recurring categories
    const catCounts = propRequests.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0] || ['General', 0];

    // Health Score (100 minus penalty for open/emergency issues)
    const penalty = propRequests.filter((r) => r.status !== 'closed').length * 4 + emergencyCount * 12;
    const healthScore = Math.max(45, 100 - penalty);

    return {
      property: p,
      requestCount: propRequests.length,
      orderCount: propOrders.length,
      emergencyCount,
      totalCost,
      topCategory: topCategory[0],
      topCategoryCount: topCategory[1],
      healthScore,
    };
  });

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-sm font-bold text-slate-900">
            Premises Physical Health & Degradation Monitor
          </CardTitle>
        </div>
        <span className="text-xs text-slate-400 font-medium">Asset integrity across real estate portfolio</span>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {propertyStats.slice(0, 3).map((item) => (
          <div
            key={item.property.id}
            className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{item.property.name}</h4>
                <p className="text-[11px] text-slate-500">{item.property.address || 'Kigali, Rwanda'}</p>
              </div>
              <Badge
                className={`text-[10px] font-bold ${
                  item.healthScore >= 85
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : item.healthScore >= 70
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {item.healthScore}% Health
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Open Incidents</span>
                <span className="font-bold text-slate-900">{item.requestCount} requests</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Maintenance Spend</span>
                <span className="font-bold text-slate-900 font-mono">
                  {currency} {item.totalCost.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-50 text-[11px] text-slate-700 flex items-center justify-between">
              <span>Frequent Failure Area:</span>
              <span className="font-semibold text-slate-900">{item.topCategory}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
