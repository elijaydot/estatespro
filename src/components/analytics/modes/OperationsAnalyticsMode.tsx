// src/components/analytics/modes/OperationsAnalyticsMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Workspace Mode: Operations Analytics
// Structure: Executive Context, Maintenance Performance, Inspection Completion, Vendor Performance, Resolution Times, Recurring Issues, Operational Risks, Operational Opportunities, Operations Analysis Table

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';

export function OperationsAnalyticsMode() {
  const navigate = useNavigate();

  const vendorPerformance = [
    { vendor: 'ElectroPower Rwanda', trade: 'Generators & High Voltage', activeTickets: 1, avgResolutionDays: 1.4, complianceRate: 98, rating: '4.9 ★', statutoryCertified: true },
    { vendor: 'Schindler & Otis Engineering', trade: 'Elevators & Heavy Lifts', activeTickets: 1, avgResolutionDays: 1.2, complianceRate: 99, rating: '4.9 ★', statutoryCertified: true },
    { vendor: 'Kigali Clean & Green Sanitation', trade: 'Sanitation & Grounds', activeTickets: 2, avgResolutionDays: 2.1, complianceRate: 95, rating: '4.7 ★', statutoryCertified: true },
    { vendor: 'Wasac Certified Plumbing', trade: 'Plumbing & Drainage', activeTickets: 2, avgResolutionDays: 2.4, complianceRate: 94, rating: '4.6 ★', statutoryCertified: true },
  ];

  const handleExport = () => {
    const data = vendorPerformance.map((v) => ({
      Contractor: v.vendor,
      Trade: v.trade,
      'Active Tickets': v.activeTickets,
      'Avg Resolution (Days)': v.avgResolutionDays,
      'SLA Compliance (%)': v.complianceRate,
      Rating: v.rating,
    }));
    downloadCsv(data, `FishGate_Operations_Analytics_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Operations Analytics Exported',
      description: 'Downloaded contractor SLA and maintenance velocity matrix CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. EXECUTIVE CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Resolution Turnaround
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">1.8 Days</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              -47% Faster
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Average ticket closure speed across all 48 premises units.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Inspection Pass Rate
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">100%</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              3 of 3 Audited
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Routine, move-out, and statutory fire safety inspections verified clean.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            First-Time Fix Rate
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">96.2%</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              High Precision
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Work orders resolved on initial contractor visit without re-dispatch.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Recurring Issues
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">1 Item</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
              Unit C-301 Chiller
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Compressor valve serviced twice; preventative rebuild scheduled.
          </p>
        </Card>
      </div>

      {/* 2. MAINTENANCE PERFORMANCE, VENDORS & RECURRING ISSUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <h4 className="font-bold text-xs text-slate-900 mb-1">Why Maintenance Velocity Improved</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Explains the underlying operational changes driving the 47% resolution turnaround.
          </p>
          <div className="space-y-2.5">
            <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded text-xs space-y-1">
              <span className="font-bold text-blue-950 uppercase text-[10px] block">Direct Dispatch Authorization:</span>
              <p className="text-blue-900 leading-relaxed">
                Property managers dispatch certified trade partners directly for repairs under RWF 200,000 without waiting for committee sign-off.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">Contractor SLA Incentives:</span>
              <p className="text-slate-600 leading-relaxed">
                Emergency tickets require initial response within 2 hours; non-urgent tickets resolve within 48 hours with guaranteed parts warranty.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">Premises Physical Health Scores</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Independent audit scores evaluating structural, mechanical, and safety status.
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Vision City Commercial & Residential</span>
                  <span className="font-mono font-bold text-emerald-700">100% Health</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Kigali Heights Residences</span>
                  <span className="font-mono font-bold text-blue-700">92% Health</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Riverside Luxury Suites</span>
                  <span className="font-mono font-bold text-slate-800">88% Health</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Statutory Fire & Safety Certification</span>
            <span className="font-semibold text-emerald-700 font-mono">100% Compliant</span>
          </div>
        </Card>
      </div>

      {/* 3. OPERATIONAL RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <h4 className="font-bold text-xs text-slate-900">Operational Risk: Vendor Concentration</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            ElectroPower Rwanda handles 100% of backup generator maintenance. Qualifying a secondary certified contractor eliminates holiday availability risk.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Action: Onboard secondary trade partner</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/maintenance')}
            >
              <span>Manage Vendors</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">Operational Opportunity: Preventative Parts Bundling</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Annual volume pre-purchasing of HVAC compressor filters and elevator hydraulic seals yields a 15% wholesale discount and eliminates dispatch waiting lags.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Save RWF 800K/yr</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50/50"
              onClick={() => navigate('/approvals')}
            >
              <span>Review Tender</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. OPERATIONS ANALYSIS TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Contractor Partner SLA & Performance Matrix</h4>
            <p className="text-[11px] text-slate-500">Response speed, ticket volume, quality ratings, and statutory certifications.</p>
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
                <th className="py-2.5 px-3">Contractor Partner</th>
                <th className="py-2.5 px-3">Trade Specialization</th>
                <th className="py-2.5 px-3 font-mono">Active Orders</th>
                <th className="py-2.5 px-3">Avg Resolution</th>
                <th className="py-2.5 px-3">SLA Adherence</th>
                <th className="py-2.5 px-3 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendorPerformance.map((v) => (
                <tr key={v.vendor} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">{v.vendor}</td>
                  <td className="py-3 px-3 text-slate-600">{v.trade}</td>
                  <td className="py-3 px-3 font-mono text-slate-800">{v.activeTickets} in-flight</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{v.avgResolutionDays} days</td>
                  <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{v.complianceRate}%</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">{v.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
