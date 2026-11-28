// src/components/insights/AnalyticsTurnoverDrivers.tsx
// FishGate Design Constitution v1.0 - Analytics: Occupancy & Turnover Drivers ("Why Did It Happen?")

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Users, Home, ArrowRight, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function AnalyticsTurnoverDrivers() {
  const exitDrivers = [
    { reason: 'Corporate Relocation', percentage: 42, count: 5, impact: 'Non-controllable (Regional corporate transfer)' },
    { reason: 'Space Sizing Needs', percentage: 28, count: 3, impact: 'Upgraded to 3-bedroom unit off-site' },
    { reason: 'Rate Sensitivity', percentage: 18, count: 2, impact: 'Declined 8% commercial escalation' },
    { reason: 'Commute / Personal', percentage: 12, count: 1, impact: 'Relocated near family school district' },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            Occupancy Stability & Turnover Analysis (Trailing 12 Months)
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Portfolio occupancy currently stands at <strong>94.2%</strong>. Of the 11 exits recorded over the trailing 12 months, <strong>70%</strong> were driven by external factors (corporate relocation and company growth expansions), with only <strong>18%</strong> attributed to rent rate sensitivity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Exit Causes Bar Chart */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="mb-3">
            <h4 className="font-bold text-xs text-slate-900">Exit Causes Breakdown (% of Departures)</h4>
            <p className="text-[11px] text-slate-500">Why did residents vacate? Validated through mandatory exit audits.</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exitDrivers} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                <YAxis dataKey="reason" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={120} />
                <Tooltip
                  formatter={(value: any) => [`${value}% of total exits`, 'Proportion']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="percentage" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Average tenancy duration across portfolio: 2.4 years</span>
            <span className="font-semibold text-emerald-700">Healthy Tenant Loyalty</span>
          </div>
        </Card>

        {/* Actionable Turnover Insights */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-3">
              <h4 className="font-bold text-xs text-slate-900">Turnover Impact by Asset Type</h4>
              <p className="text-[11px] text-slate-500">Duration and vacancy turnaround performance.</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">Commercial Spaces (Vision City)</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">98% Occupied</Badge>
                </div>
                <p className="text-[11px] text-slate-600">
                  Zero voluntary turnover in 18 months. Average lease tenure is 3.8 years. Strong tenant retention attributed to stable fiber redundancy and power backup.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">Residential Suites (Riverside & Kigali Heights)</span>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">92% Occupied</Badge>
                </div>
                <p className="text-[11px] text-slate-600">
                  Average re-leasing velocity is <strong>14 days</strong> between key return and new lease inception. Move-in inventory inspections prevent protracted unit downtimes.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Zero exits caused by facility maintenance failure</span>
            <span className="font-semibold text-blue-700">Operations Aligned</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
