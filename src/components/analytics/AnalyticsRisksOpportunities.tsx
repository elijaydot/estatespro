// src/components/analytics/AnalyticsRisksOpportunities.tsx
// FishGate Design Constitution v1.0 - Section 5: Risks & Opportunities (Decision Support)
// Displays: Financial Risks, Occupancy Risks, Operational Risks, Growth Opportunities, Cost Reduction Opportunities

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Building,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsRiskItem, AnalyticsOpportunityItem } from './types';

interface AnalyticsRisksOpportunitiesProps {
  risks?: AnalyticsRiskItem[];
  opportunities?: AnalyticsOpportunityItem[];
}

export function AnalyticsRisksOpportunities({
  risks,
  opportunities,
}: AnalyticsRisksOpportunitiesProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'risks' | 'opportunities'>('risks');

  const defaultRisks: AnalyticsRiskItem[] = [
    {
      id: 'risk-1',
      title: 'Upcoming Lease Expirations (8 Leases Expiring Within 60 Days)',
      category: 'occupancy',
      exposure: 'RWF 5,200,000 / mo rent roll',
      rootCause: 'Concurrent annual expat tenancy cycles terminating in December and January.',
      consequence: 'Potential vacancy drag if lease renewal negotiations are delayed past 30-day notice window.',
      mitigation: 'Dispatch standardized renewal incentives and multi-year rate lock proposals immediately.',
      actionUrl: '/leases',
      actionLabel: 'Review Expiring Leases',
    },
    {
      id: 'risk-2',
      title: 'Maintenance Spending Spike (Unbudgeted 14.2% Variance)',
      category: 'financial',
      exposure: 'RWF 1,950,000 cash outlay',
      rootCause: 'Simultaneous failure of aged elevator hoist motor at Kigali Heights and HVAC condenser coils at Vision City.',
      consequence: 'Reduces Q4 Net Operating Margin from 86% to 84.1% without preventative supplier agreements.',
      mitigation: 'Execute locked-rate quarterly preventative contract with Schindler and Otis engineering.',
      actionUrl: '/approvals',
      actionLabel: 'Review Service Contract',
    },
    {
      id: 'risk-3',
      title: 'Vendor Concentration Risk on Electrical Infrastructure',
      category: 'operational',
      exposure: 'Single contractor handles 100% of backup generator maintenance',
      rootCause: 'ElectroPower Rwanda is sole certified provider on-call for emergency generator failures.',
      consequence: 'Risk of tenant disruption during power outages if primary contractor experiences SLA bottleneck.',
      mitigation: 'Qualify and onboard secondary electrical engineering vendor under pre-negotiated SLA terms.',
      actionUrl: '/maintenance',
      actionLabel: 'Manage Contractors',
    },
  ];

  const defaultOpportunities: AnalyticsOpportunityItem[] = [
    {
      id: 'opp-1',
      title: 'Vacant Unit Absorption (3 Vacant Units in Prime Locations)',
      category: 'growth',
      estimatedGain: 'RWF 3,500,000 / mo recurring',
      enabler: 'High seasonal diplomatic intake and corporate relocation demand in Kacyiru & Kimihurura.',
      operationalAction: 'Complete final make-ready cleaning and activate featured listings on premium expat portals.',
      actionUrl: '/units',
      actionLabel: 'View Vacant Units',
    },
    {
      id: 'opp-2',
      title: 'Solar Hybrid Inverter Installation (Diesel Generator Offset)',
      category: 'cost_reduction',
      estimatedGain: 'RWF 1,200,000 / mo OPEX savings',
      enabler: 'Peak daylight solar production offsets daytime common-area chiller and lift pumping energy.',
      operationalAction: 'Approve capital expenditure proposal for solar PV retrofitting across Kigali Heights and Vision City.',
      actionUrl: '/approvals',
      actionLabel: 'Approve Solar Proposal',
    },
    {
      id: 'opp-3',
      title: 'Commercial Parking Space Unbundling at Vision City',
      category: 'growth',
      estimatedGain: 'RWF 450,000 / mo ancillary revenue',
      enabler: 'Surplus daytime parking bays during retail operating hours with high external neighborhood demand.',
      operationalAction: 'Monetize 15 underutilized commercial parking stalls on monthly subscription basis.',
      actionUrl: '/units',
      actionLabel: 'Configure Parking Bays',
    },
  ];

  const riskList = risks || defaultRisks;
  const oppList = opportunities || defaultOpportunities;

  const getRiskCategoryBadge = (category: string) => {
    switch (category) {
      case 'financial':
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-[10px]">Financial Risk</Badge>;
      case 'occupancy':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Occupancy Risk</Badge>;
      case 'operational':
      default:
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">Operational Risk</Badge>;
    }
  };

  const getOppCategoryBadge = (category: string) => {
    switch (category) {
      case 'growth':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">Growth Opportunity</Badge>;
      case 'cost_reduction':
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">Cost Reduction</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>Risks & Opportunities (Executive Decision Support)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Actionable intelligence identifying material exposures and upside capture across properties.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'risks' | 'opportunities')}>
          <TabsList className="bg-slate-100 p-0.5 border border-slate-200 h-8">
            <TabsTrigger
              value="risks"
              className="text-xs px-3 py-1 font-semibold data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-2xs gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Material Risks ({riskList.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="opportunities"
              className="text-xs px-3 py-1 font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-2xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Opportunities ({oppList.length})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'risks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {riskList.map((risk) => (
            <Card
              key={risk.id}
              className="p-4 border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    {getRiskCategoryBadge(risk.category)}
                    <span className="text-[10px] font-mono text-red-700 font-bold">
                      {risk.exposure}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 leading-snug">{risk.title}</h3>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Cause & Impact:</div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {risk.rootCause} {risk.consequence}
                  </p>
                </div>

                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mitigation:</span>
                  <p className="text-[11px] text-slate-800 font-medium leading-relaxed">
                    {risk.mitigation}
                  </p>
                </div>
              </div>

              {risk.actionUrl && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold gap-1 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
                    onClick={() => navigate(risk.actionUrl!)}
                  >
                    <span>{risk.actionLabel || 'Take Action'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {oppList.map((opp) => (
            <Card
              key={opp.id}
              className="p-4 border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    {getOppCategoryBadge(opp.category)}
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">
                      {opp.estimatedGain}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 leading-snug">{opp.title}</h3>
                </div>

                <div className="p-2 bg-emerald-50/60 border border-emerald-200/80 rounded text-xs space-y-1">
                  <div className="text-[10px] font-bold text-emerald-900 uppercase">Market Enabler:</div>
                  <p className="text-emerald-950 text-[11px] leading-relaxed">
                    {opp.enabler}
                  </p>
                </div>

                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Operational Action:</span>
                  <p className="text-[11px] text-slate-800 font-medium leading-relaxed">
                    {opp.operationalAction}
                  </p>
                </div>
              </div>

              {opp.actionUrl && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold gap-1 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
                    onClick={() => navigate(opp.actionUrl!)}
                  >
                    <span>{opp.actionLabel || 'Execute Action'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
