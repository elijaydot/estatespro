// src/components/analytics/modes/PortfolioAnalyticsMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Workspace Mode: Portfolio Analytics
// Structure: Executive Context, Portfolio Trends, Occupancy Trends, Property Ranking, Revenue Per Property, Property Risks, Property Opportunities, Property Analysis Table

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';

export function PortfolioAnalyticsMode() {
  const navigate = useNavigate();

  const properties = [
    { id: 'p1', name: 'Riverside Luxury Suites', location: 'Kacyiru Diplomatic Quarter', units: 14, occupied: 14, occupancyRate: 100, monthlyRevenue: 14800000, growthQoQ: '+8.4%', yieldCategory: 'Top Performer', healthScore: 96 },
    { id: 'p2', name: 'Kigali Heights Residences', location: 'KG 7 Ave, Kimihurura', units: 20, occupied: 19, occupancyRate: 95, monthlyRevenue: 11200000, growthQoQ: '+4.2%', yieldCategory: 'High Growth', healthScore: 92 },
    { id: 'p3', name: 'Vision City Commercial & Residential', location: 'Boulevard de Gaculiro', units: 14, occupied: 12, occupancyRate: 85.7, monthlyRevenue: 5500000, growthQoQ: '+1.0%', yieldCategory: 'Stable Value', healthScore: 88 },
  ];

  const handleExport = () => {
    const data = properties.map((p) => ({
      Property: p.name,
      Location: p.location,
      'Total Units': p.units,
      Occupied: p.occupied,
      'Occupancy Rate (%)': p.occupancyRate,
      'Monthly Revenue (RWF)': p.monthlyRevenue,
      'Growth QoQ': p.growthQoQ,
      'Health Score': p.healthScore,
    }));
    downloadCsv(data, `FishGate_Portfolio_Analysis_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Portfolio Analysis Exported',
      description: 'Downloaded asset performance and occupancy breakdown CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. EXECUTIVE CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Portfolio Capacity
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">48 Units</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              45 Occupied
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Portfolio occupancy at <strong className="text-slate-900">94.2%</strong> across 3 premier assets.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Monthly Rent Roll
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">RWF 31.5M</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              +4.8% QoQ
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Average revenue yield: <strong className="text-slate-900">RWF 656K / unit</strong>.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Vacancy Exposure
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">3 Units</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
              5.8% Vacancy
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            1 unit in Kigali Heights and 2 units in Vision City.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Top Yield Contributor
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900 truncate">Riverside Suites</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              #1 Yield
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Generates <strong className="text-slate-900">47% of total portfolio rent</strong> at 100% capacity.
          </p>
        </Card>
      </div>

      {/* 2. PORTFOLIO & OCCUPANCY TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <h4 className="font-bold text-xs text-slate-900 mb-1">Occupancy & Capacity Trend (Why It Shifted)</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Explains capacity utilization shifts across the current and preceding operational cycles.
          </p>
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-md space-y-1 mb-3">
            <div className="text-[10px] font-bold text-blue-900 uppercase">Primary Driver:</div>
            <p className="text-xs text-blue-950 font-medium leading-relaxed">
              Occupancy increased from 90% to 94.2% primarily due to the absorption of two 3-bedroom penthouses at Kigali Heights by an international NGO mission.
            </p>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Kigali Heights Residences</span>
              <span className="font-mono font-bold text-emerald-700">+5.0% (90% → 95%)</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Riverside Luxury Suites</span>
              <span className="font-mono font-bold text-blue-700">Stable at 100%</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Vision City Commercial</span>
              <span className="font-mono font-bold text-slate-700">Stable at 85.7%</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">Revenue Per Property & Yield Dispersion</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Distribution of gross rental generation across the portfolio.
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Riverside Luxury Suites</span>
                  <span className="font-mono font-bold text-slate-900">RWF 14.8M (47%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '47%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Kigali Heights Residences</span>
                  <span className="font-mono font-bold text-slate-900">RWF 11.2M (36%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '36%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Vision City Commercial</span>
                  <span className="font-mono font-bold text-slate-900">RWF 5.5M (17%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: '17%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Quarterly revenue realization</span>
            <span className="font-semibold text-emerald-700 font-mono">101% of Budget Target</span>
          </div>
        </Card>
      </div>

      {/* 3. PROPERTY RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-xs text-slate-900">Property Risk: Commercial Lease Cluster</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Vision City has 2 multi-unit commercial leases coming up for contract review within 60 days representing RWF 3.2M/mo.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Mitigation: Early indexation offer</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/leases')}
            >
              <span>View Leases</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">Property Opportunity: Absorption of 3 Vacancies</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            3 vacant units represent RWF 3,500,000 in additional recurring monthly collections upon tenant placement.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: 100% occupancy push</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50/50"
              onClick={() => navigate('/units')}
            >
              <span>Market Units</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. PROPERTY ANALYSIS TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Property Performance & Ranking Matrix</h4>
            <p className="text-[11px] text-slate-500">Complete asset breakdown with capacity, collections, and health scoring.</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Table</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 font-mono">Units</th>
                <th className="py-2.5 px-3">Occupancy</th>
                <th className="py-2.5 px-3">Monthly Revenue</th>
                <th className="py-2.5 px-3">Growth QoQ</th>
                <th className="py-2.5 px-3 text-right">Health Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span>{p.name}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{p.location}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{p.units}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900">{p.occupancyRate}%</span>
                      <span className="text-[10px] text-slate-400 font-mono">({p.occupied}/{p.units})</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    RWF {(p.monthlyRevenue / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-emerald-700 font-mono font-semibold flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" />
                      {p.growthQoQ}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      {p.healthScore}/100
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
