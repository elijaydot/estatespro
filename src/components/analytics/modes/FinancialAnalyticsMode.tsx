// src/components/analytics/modes/FinancialAnalyticsMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Workspace Mode: Financial Analytics
// Structure: Executive Context, Revenue Performance, Collection Performance, Expense Performance, Profitability Analysis, Financial Risks, Financial Opportunities, Financial Analysis Table

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';

export function FinancialAnalyticsMode() {
  const navigate = useNavigate();

  const financialTable = [
    { property: 'Riverside Luxury Suites', billed: 14800000, collected: 14800000, collectionRate: 100, opex: 1850000, noi: 12950000, netMargin: 87.5, status: 'Top Yield' },
    { property: 'Kigali Heights Residences', billed: 11200000, collected: 11100000, collectionRate: 99.1, opex: 2200000, noi: 8900000, netMargin: 80.2, status: 'Solid Yield' },
    { property: 'Vision City Commercial & Residential', billed: 5500000, collected: 5450000, collectionRate: 99.1, opex: 950000, noi: 4500000, netMargin: 82.6, status: 'Controlled OPEX' },
  ];

  const handleExport = () => {
    const data = financialTable.map((f) => ({
      Property: f.property,
      'Invoiced (RWF)': f.billed,
      'Collected (RWF)': f.collected,
      'Collection Rate (%)': f.collectionRate,
      'OPEX (RWF)': f.opex,
      'NOI (RWF)': f.noi,
      'Net Margin (%)': f.netMargin,
      Status: f.status,
    }));
    downloadCsv(data, `FishGate_Financial_Analytics_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Financial Analysis Exported',
      description: 'Downloaded revenue, collections, and profitability matrix CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. EXECUTIVE CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Collection Realization
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">99.4%</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              +0.6% vs Plan
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            RWF 31.35M collected against RWF 31.5M total invoiced rent.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Net Operating Margin (NOI)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">84.1%</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              RWF 26.5M Net
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Total operating expenditure (OPEX) contained at 15.9% of revenues.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Overdue Arrears
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">RWF 150K</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              Zero &gt; 30 Days
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Only 1 pending balance under 5-day grace period at Vision City.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Collection Velocity
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">3.2 Days</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              -3.4d vs Q3
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Mobile money and direct debit integrations reduced clearing lags.
          </p>
        </Card>
      </div>

      {/* 2. REVENUE, COLLECTION & EXPENSE PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <h4 className="font-bold text-xs text-slate-900 mb-1">Why Revenue & Collections Shifted</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Primary drivers behind top-line and collection realization improvements.
          </p>
          <div className="space-y-2.5">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded text-xs space-y-1">
              <span className="font-bold text-emerald-950 uppercase text-[10px] block">Top-Line Expansion Driver:</span>
              <p className="text-emerald-900 leading-relaxed">
                Occupancy gains at Kigali Heights (+2 units) and scheduled 8% commercial indexation at Vision City added +RWF 1,450,000 monthly recurring revenue.
              </p>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded text-xs space-y-1">
              <span className="font-bold text-blue-950 uppercase text-[10px] block">Collection Velocity Driver:</span>
              <p className="text-blue-900 leading-relaxed">
                Automated SMS invoices sent 7 days in advance combined with instant mobile money payment links cleared 94% of rents by Day 3.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">Operating Expense & Margin Distribution</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Breakdown of total monthly operational disbursements (RWF 5.0M total OPEX).
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700">Contracted Facilities & Security</span>
                <span className="font-mono font-bold text-slate-900">RWF 2,250,000 (45%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700">Preventative Mechanical & HVAC</span>
                <span className="font-mono font-bold text-slate-900">RWF 1,450,000 (29%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700">Common Area Electricity & Water</span>
                <span className="font-mono font-bold text-slate-900">RWF 850,000 (17%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700">Administrative & Statutory Audits</span>
                <span className="font-mono font-bold text-slate-900">RWF 450,000 (9%)</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Overall Portfolio Operating Efficiency</span>
            <span className="font-semibold text-emerald-700 font-mono">84.1% Net Profit Margin</span>
          </div>
        </Card>
      </div>

      {/* 3. FINANCIAL RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h4 className="font-bold text-xs text-slate-900">Financial Risk: Unbudgeted Elevator Overhaul</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Kigali Heights elevator hoist failure incurred RWF 1,950,000 unbudgeted outlay. Transitioning to a locked-rate Schindler contract prevents future spikes.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Mitigation: Pre-approved quarterly contract</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/approvals')}
            >
              <span>Review Contract</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">Financial Opportunity: Solar Generator Offset</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Solar hybrid retrofitting reduces daytime generator diesel runtime by 22%, capturing RWF 1,200,000 monthly OPEX savings.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Save RWF 14.4M/yr</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50/50"
              onClick={() => navigate('/approvals')}
            >
              <span>Review Proposal</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. FINANCIAL ANALYSIS TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Property Profitability & Net Yield Matrix</h4>
            <p className="text-[11px] text-slate-500">Invoiced rent, actual cash realization, operational expenditure, and net margins.</p>
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
                <th className="py-2.5 px-3">Property</th>
                <th className="py-2.5 px-3">Invoiced Rent</th>
                <th className="py-2.5 px-3">Collected</th>
                <th className="py-2.5 px-3">Collection %</th>
                <th className="py-2.5 px-3">Operating OPEX</th>
                <th className="py-2.5 px-3">Net NOI</th>
                <th className="py-2.5 px-3 text-right">Net Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {financialTable.map((f) => (
                <tr key={f.property} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">{f.property}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">RWF {(f.billed / 1000000).toFixed(1)}M</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">RWF {(f.collected / 1000000).toFixed(1)}M</td>
                  <td className="py-3 px-3 font-mono text-emerald-700 font-bold">{f.collectionRate}%</td>
                  <td className="py-3 px-3 font-mono text-slate-600">RWF {(f.opex / 1000000).toFixed(2)}M</td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">RWF {(f.noi / 1000000).toFixed(2)}M</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      {f.netMargin}%
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
