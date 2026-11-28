// src/components/analytics/modes/ResidentAnalyticsMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Workspace Mode: Resident Analytics
// Structure: Executive Context, Retention Trends, Move-In & Move-Out Trends, Lease Renewal Trends, Communication Performance, Resident Risks, Resident Opportunities, Resident Analysis Table

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';

export function ResidentAnalyticsMode() {
  const navigate = useNavigate();

  const residentTenures = [
    { resident: 'Afreximbank Regional Mission', unit: 'Unit PH-02', property: 'Riverside Suites', tenureMonths: 36, status: 'Diplomatic Tenancy', renewalState: 'Multi-Year Extension', riskLevel: 'Low' },
    { resident: 'Dr. Claire Mukamana', unit: 'Apt A-402', property: 'Kigali Heights Residences', tenureMonths: 24, status: 'Executive Resident', renewalState: 'Confirmed Renewal', riskLevel: 'Low' },
    { resident: 'Kigali Tech Innovations Ltd', unit: 'Suite B-101', property: 'Vision City Commercial', tenureMonths: 18, status: 'Commercial Tenant', renewalState: 'Terms Under Review', riskLevel: 'Medium' },
    { resident: 'Marc & Diane Ndagijimana', unit: 'Apt B-201', property: 'Kigali Heights Residences', tenureMonths: 12, status: 'Private Resident', renewalState: 'Approaching Expiry', riskLevel: 'Medium' },
  ];

  const exitReasons = [
    { reason: 'Corporate Relocation', count: 5, share: 42, note: 'Diplomatic transfers outside Rwanda' },
    { reason: 'Space Upsizing / Growth', count: 3, share: 28, note: 'Family size increase requiring larger suites' },
    { reason: 'Pricing Indexation Sensitivity', count: 2, share: 18, note: 'Negotiated move upon annual 8% indexation' },
    { reason: 'Personal / Lifestyle', count: 1, share: 12, note: 'Home purchase or personal relocation' },
  ];

  const handleExport = () => {
    const data = residentTenures.map((r) => ({
      Resident: r.resident,
      Unit: r.unit,
      Property: r.property,
      'Tenure (Months)': r.tenureMonths,
      Status: r.status,
      'Renewal State': r.renewalState,
      'Risk Level': r.riskLevel,
    }));
    downloadCsv(data, `FishGate_Resident_Analytics_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Resident Analytics Exported',
      description: 'Downloaded resident retention and tenure matrix CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. EXECUTIVE CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Lease Renewal Rate
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">88.5%</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              Target &gt; 85%
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            23 of 26 leases successfully renewed over the past 180 days.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Resident Retention
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">92.4%</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              22.4 Mo Avg
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Average tenant stay exceeds 22 months with minimal mid-term churn.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Move-In / Move-Out Ratio
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">+8 Net</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              12 In / 4 Out
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Net positive household intake maintained throughout Q3 and Q4.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Communication SLA
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">42 Min</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              &lt; 60m SLA
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Median staff response speed across mobile and web resident inquiries.
          </p>
        </Card>
      </div>

      {/* 2. RETENTION, MOVE-IN/OUT & ENGAGEMENT TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <h4 className="font-bold text-xs text-slate-900 mb-1">Departure Drivers (Exit Interview Analysis)</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Why vacating residents chose not to renew contracts.
          </p>
          <div className="space-y-3">
            {exitReasons.map((ex) => (
              <div key={ex.reason} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{ex.reason}</span>
                  <span className="font-mono font-bold text-slate-900">{ex.share}% ({ex.count} departures)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${ex.share}%` }} />
                </div>
                <p className="text-[10px] text-slate-500">{ex.note}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">Move-In & Turnover Velocity</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Operational velocity between lease departure and new resident move-in.
            </p>
            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">Unit Make-Ready Speed</span>
                  <span className="font-mono font-bold text-slate-900">4.2 Days</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Average turnaround from exit inspection to cleaning and key release for incoming tenants.
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">Advance Renewal Notification</span>
                  <span className="font-mono font-bold text-slate-900">60 Days Prior</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Standardized protocol ensures 94% of expiring tenants signal intentions 2 months ahead.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Overall Resident Satisfaction Score</span>
            <span className="font-semibold text-emerald-700 font-mono">94% Positive Index</span>
          </div>
        </Card>
      </div>

      {/* 3. RESIDENT RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-xs text-slate-900">Resident Risk: December Expirations</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            8 leases terminate across December and January. Two commercial accounts have requested review of annual indexation caps.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Action: Dispatch renewal riders</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/leases')}
            >
              <span>Manage Renewals</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">Resident Opportunity: Multi-Year Extension Incentives</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Offering a 3% rate discount for 24-month commitments on diplomatic units locks in zero-churn revenue through late 2028.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Lock RWF 7.2M/mo</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50/50"
              onClick={() => navigate('/leases')}
            >
              <span>Review Incentives</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. RESIDENT ANALYSIS TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Resident Tenure & Contract Stability Roster</h4>
            <p className="text-[11px] text-slate-500">Tenure longevity, status, and forward renewal risk profile.</p>
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
                <th className="py-2.5 px-3">Resident / Organization</th>
                <th className="py-2.5 px-3">Assigned Space</th>
                <th className="py-2.5 px-3">Tenure</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Renewal State</th>
                <th className="py-2.5 px-3 text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {residentTenures.map((r) => (
                <tr key={r.resident} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">{r.resident}</td>
                  <td className="py-3 px-3 text-slate-600">{r.property} ({r.unit})</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{r.tenureMonths} mos</td>
                  <td className="py-3 px-3">
                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">{r.renewalState}</td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className={`text-[10px] font-semibold ${
                      r.riskLevel === 'Low' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {r.riskLevel} Risk
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
