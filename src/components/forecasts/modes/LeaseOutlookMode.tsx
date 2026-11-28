// src/components/forecasts/modes/LeaseOutlookMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Outlook Mode: Lease Outlook
// Structure: Future Outlook Context, Renewal Pipeline, Expirations, Move-Out Risk, Future Revenue Impact, Lease Risks, Lease Opportunities, Scenario Planning

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';
import { ForecastsScenarioModeling } from '../ForecastsScenarioModeling';

export function LeaseOutlookMode() {
  const navigate = useNavigate();

  const renewalPipeline = [
    { tenant: 'Afreximbank Regional Mission', unit: 'Unit PH-02', property: 'Riverside Suites', rent: 'RWF 2,400,000', expiryDate: 'Dec 31, 2026', renewalStatus: 'In Negotiation', probability: 'High (95%)' },
    { tenant: 'Kigali Tech Innovations Ltd', unit: 'Suite B-101', property: 'Vision City Commercial', rent: 'RWF 1,600,000', expiryDate: 'Jan 15, 2027', renewalStatus: 'Terms Dispatched', probability: 'Medium (75%)' },
    { tenant: 'Dr. Claire Mukamana', unit: 'Apt A-402', property: 'Kigali Heights Residences', rent: 'RWF 1,200,000', expiryDate: 'Jan 31, 2027', renewalStatus: 'Confirmed Renewal', probability: 'Confirmed (100%)' },
    { tenant: 'Marc & Diane Ndagijimana', unit: 'Apt B-201', property: 'Kigali Heights Residences', rent: 'RWF 950,000', expiryDate: 'Feb 15, 2027', renewalStatus: 'Advance Notice Sent', probability: 'High (90%)' },
  ];

  const handleExport = () => {
    const data = renewalPipeline.map((l) => ({
      Resident: l.tenant,
      Space: `${l.property} (${l.unit})`,
      'Monthly Rent': l.rent,
      'Expiry Date': l.expiryDate,
      Status: l.renewalStatus,
      Probability: l.probability,
    }));
    downloadCsv(data, `FishGate_Lease_Pipeline_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Lease Pipeline Exported',
      description: 'Downloaded renewal pipeline and contract maturity schedule CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. FUTURE OUTLOOK CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Upcoming Maturities
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">8 Leases</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              Next 90 Days
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Total monthly rent value of RWF 5,200,000 up for renewal.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Target Retention
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">87.5%</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              7 of 8 Target
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Historical renewal rate benchmarks indicate 7 expected renewals.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Confirmed Extensions
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">2 Accounts</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              Signed
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Dr. Claire Mukamana and Afreximbank terms agreed.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Move-Out Exposure
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">1 Unit</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
              Diplomatic Exit
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Planned corporate relocation confirmed for late January.
          </p>
        </Card>
      </div>

      {/* 2. RENEWAL PIPELINE TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Contract Maturity & Renewal Pipeline</h4>
            <p className="text-[11px] text-slate-500">Upcoming lease expiration timeline, current negotiation status, and renewal likelihood.</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Pipeline</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Resident / Organization</th>
                <th className="py-2.5 px-3">Space & Premises</th>
                <th className="py-2.5 px-3">Monthly Rent</th>
                <th className="py-2.5 px-3">Maturity Date</th>
                <th className="py-2.5 px-3">Renewal Status</th>
                <th className="py-2.5 px-3 text-right">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {renewalPipeline.map((l) => (
                <tr key={l.tenant} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">{l.tenant}</td>
                  <td className="py-3 px-3 text-slate-600">{l.property} ({l.unit})</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{l.rent}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{l.expiryDate}</td>
                  <td className="py-3 px-3">
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      {l.renewalStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                    {l.probability}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. LEASE RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-xs text-slate-900">Lease Risk: Delayed Corporate Sign-Off</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Kigali Tech Innovations renewal is delayed awaiting headquarters sign-off. Risk of sudden vacancy if terms are rejected.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Action: Offer 24-month rate lock</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/leases')}
            >
              <span>Review Lease</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h4 className="font-bold text-xs text-slate-900">Lease Opportunity: Multi-Year Rate Lock Riders</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Executing 2-year extensions on Riverside diplomatic penthouses secures RWF 4.8M monthly cashflow through late 2028.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Eliminate 2027 renewal churn</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-purple-700 hover:text-purple-900 border-purple-200 bg-purple-50/50"
              onClick={() => navigate('/leases')}
            >
              <span>Dispatch Riders</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. COLLAPSIBLE SCENARIO PLANNING */}
      <ForecastsScenarioModeling />

      {/* 5. PLANNING OBSERVATIONS */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
          Lease Planning Observation
        </span>
        <p className="text-slate-700 leading-relaxed font-medium">
          Renewing five strategic leases across Riverside and Vision City will maintain portfolio occupancy safely above 95% through Q2 2027.
        </p>
      </div>
    </div>
  );
}
