// src/pages/Forecasts.tsx
// FishGate Design Constitution v1.0 - Insights Module: Forecasts Workspace ("What is Likely to Happen Next?")
// Strict Decision Support: Cashflow Trajectory, Renewal Pipeline, Capex Outlays, Vacancy Modeling + Risks, Opportunities, Recommendations & Observations

import { useState } from 'react';
import { PageContainer } from '@/design-system/LayoutFramework';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useProperties } from '@/hooks/useProperties';
import { downloadCsv } from '@/lib/download';
import { format } from 'date-fns';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  FileText,
  Wrench,
  Home,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';

import {
  InsightRiskItem,
  InsightOpportunityItem,
  InsightRecommendationItem,
  InsightObservationItem,
} from '@/components/insights/types';
import { ForecastsCashflowTrajectory } from '@/components/insights/ForecastsCashflowTrajectory';
import { ForecastsRenewalPipeline } from '@/components/insights/ForecastsRenewalPipeline';
import { ForecastsCapexOutlays } from '@/components/insights/ForecastsCapexOutlays';
import { ForecastsVacancyRisk } from '@/components/insights/ForecastsVacancyRisk';
import { InsightsGovernanceSection } from '@/components/insights/InsightsGovernanceSection';

export default function ForecastsPage() {
  const { data: properties = [] } = useProperties();
  const [activeTab, setActiveTab] = useState<'cashflow' | 'renewals' | 'capex' | 'vacancy'>('cashflow');
  const [horizon, setHorizon] = useState<string>('6_months');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  // Governance Items for Forecasts ("What is Likely to Happen Next?")
  const forecastsRisks: InsightRiskItem[] = [
    {
      id: 'risk-fc-1',
      title: 'Q1 Commercial Lease Expiration Cluster',
      severity: 'critical',
      category: 'revenue',
      impactStatement: 'Four strategic leases represent RWF 8,500,000 monthly rent expiring in Q1 2027.',
      rootCause: 'Concurrent 2-year lease maturities across Vision City and Kigali Heights.',
      affectedPremises: 'Vision City & Kigali Heights',
      potentialExposure: 'RWF 8.5M/mo gross rent',
      suggestedMitigation: 'Issue statutory 60-day renewal terms with indexation proposals immediately.',
      actionUrl: '/leases',
      actionLabel: 'Open Leases',
    },
    {
      id: 'risk-fc-2',
      title: 'Statutory Heavy Lift Hydraulic Mandate',
      severity: 'high',
      category: 'expense',
      impactStatement: 'Rwanda Housing Authority compliance certification requires RWF 2,200,000 outlay in Q1.',
      rootCause: '5-year mandatory heavy mechanical recertification for elevator hoist and hydraulic ram.',
      affectedPremises: 'Kigali Heights Residences',
      potentialExposure: 'RWF 2,200,000',
      suggestedMitigation: 'Allocate accumulated sinking fund reserves and schedule off-peak servicing.',
      actionUrl: '/maintenance?tab=calendar',
      actionLabel: 'Schedule Maintenance',
    },
    {
      id: 'risk-fc-3',
      title: 'Donor Grant Contingent Residential Renewal',
      severity: 'medium',
      category: 'occupancy',
      impactStatement: 'Unit B-301 (RWF 1.8M/mo) lease renewal is contingent on NGO program donor grant.',
      rootCause: 'Institutional tenant funding grant review scheduled for Q1.',
      affectedPremises: 'Riverside Luxury Suites',
      potentialExposure: 'RWF 600,000 vacancy gap',
      suggestedMitigation: 'Prepare parallel corporate listing draft 30 days before notice expiration.',
      actionUrl: '/tasks',
      actionLabel: 'Create Follow-up',
    },
  ];

  const forecastsOpportunities: InsightOpportunityItem[] = [
    {
      id: 'opp-fc-1',
      title: 'Commercial Escalation Revenue Capture',
      priority: 'high',
      category: 'yield',
      upsideStatement: 'Achieving contractual 8% escalation expands annual collections by RWF 4.8M.',
      enabler: 'High commercial tenant retention and 100% occupancy demand in Vision City.',
      affectedPremises: 'Vision City Commercial Hub',
      estimatedGain: 'RWF 4,800,000/yr',
      actionUrl: '/leases',
      actionLabel: 'Review Contracts',
    },
    {
      id: 'opp-fc-2',
      title: 'Pre-Funded Capital Sinking Fund',
      priority: 'quick_win',
      category: 'cost_reduction',
      upsideStatement: '85% of projected FY2027 CAPEX is pre-funded without cashflow borrowing.',
      enabler: 'Disciplined monthly sinking fund reserve retention of 5% OPEX allocation.',
      affectedPremises: 'Portfolio-wide',
      estimatedGain: 'Zero debt finance cost',
      actionUrl: '/expenses',
      actionLabel: 'Audit Reserves',
    },
    {
      id: 'opp-fc-3',
      title: 'Early Re-Tenancy for Unit A-201',
      priority: 'medium',
      category: 'retention',
      upsideStatement: 'Three qualified viewing applications in pipeline will eliminate December downtime.',
      enabler: 'Immediate dispatch of balcony waterproofing repair following exit audit.',
      affectedPremises: 'Riverside Luxury Suites',
      estimatedGain: 'RWF 320,000 rent preserved',
      actionUrl: '/calendar',
      actionLabel: 'Check Handover',
    },
  ];

  const forecastsRecommendations: InsightRecommendationItem[] = [
    {
      id: 'rec-fc-1',
      title: 'Deliver Formal 60-Day Renewal Addenda to Commercial Tenants',
      urgency: 'immediate',
      reasoning: 'Starting commercial renewal dialogue 60 days in advance locks in indexation before fiscal year-end.',
      expectedOutcome: 'Secures RWF 68M in gross annual revenue across 2027/2028.',
      ownerDepartment: 'Leasing & Residents',
      actionUrl: '/leases',
      actionLabel: 'Deliver Addenda',
    },
    {
      id: 'rec-fc-2',
      title: 'Contract Schindler for Q1 Elevator Recertification Window',
      urgency: 'this_week',
      reasoning: 'Locking in the January maintenance window ensures statutory occupancy compliance before audit inspections.',
      expectedOutcome: 'Prevents municipal non-compliance fines and guarantees priority parts availability.',
      ownerDepartment: 'Facilities & Maintenance',
      actionUrl: '/maintenance?tab=work-orders',
      actionLabel: 'Book Maintenance',
    },
    {
      id: 'rec-fc-3',
      title: 'Draft Contingency Corporate Listing for Unit B-301',
      urgency: 'strategic',
      reasoning: 'Having an active listing ready allows instant market exposure if donor funding is delayed.',
      expectedOutcome: 'Caps maximum vacancy downtime to under 14 days.',
      ownerDepartment: 'Marketing & Leasing',
      actionUrl: '/marketplace',
      actionLabel: 'Draft Listing',
    },
  ];

  const forecastsObservations: InsightObservationItem[] = [
    {
      id: 'obs-fc-1',
      title: 'Contractual Cashflow Resilience',
      finding: 'Projected cashflow demonstrates strong predictability with 92% of forward revenue backed by binding agreements.',
      metricReference: '92% bound revenue',
      operationalContext: 'Low exposure to short-term tenancy volatility.',
    },
    {
      id: 'obs-fc-2',
      title: 'Renewal Probability Distribution',
      finding: 'Expiring commercial leases carry a 78% renewal likelihood based on direct tenant consultations.',
      metricReference: '78% retention target',
      operationalContext: 'High tenant satisfaction with facilities reliability.',
    },
    {
      id: 'obs-fc-3',
      title: 'CAPEX Reserve Coverage',
      finding: 'Capital asset overhaul outlays for FY2027 remain strictly within accumulated reserve allocations.',
      metricReference: '85% funded coverage',
      operationalContext: 'Capital planning ensures zero unplanned owner cash calls.',
    },
  ];

  const handleExport = () => {
    const data = [
      { Metric: '30-Day Forward Revenue', Projection: 'RWF 32.8M', Scenario: 'Expected (+4.1%)' },
      { Metric: '90-Day Forward Revenue', Projection: 'RWF 101.4M', Scenario: 'Expected (Q1 2027)' },
      { Metric: 'Expiring Leases (Q1)', Count: '4 leases', Exposure: 'RWF 8.5M/mo' },
      { Metric: 'CAPEX Allocation (2027)', Projection: 'RWF 7.5M', Status: '85% Reserve Funded' },
    ];
    downloadCsv(`fishgate-forecasts-projections-${format(new Date(), 'yyyy-MM-dd')}.csv`, data);
    toast({ title: 'Forecasts Exported', description: 'Downloaded forward projection schedule.' });
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* =========================================================================
            HEADER
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <LineChartIcon className="w-6 h-6 text-blue-600" />
              <span>Forecasts</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              What is likely to happen next? Forward-looking cashflow projections, renewal pipelines, and capital planning.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
            >
              <option value="all">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
            >
              <option value="90_days">90-Day Horizon (Q1 2027)</option>
              <option value="6_months">6-Month Runway (H1 2027)</option>
              <option value="12_months">12-Month Annual Projection</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-semibold gap-1.5 text-slate-700"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Projections
            </Button>
          </div>
        </div>

        {/* =========================================================================
            PREDICTIVE PERSPECTIVES (TABS: CASHFLOW, RENEWALS, CAPEX, VACANCY)
            ========================================================================= */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="border-b border-slate-200 pb-0">
            <TabsList className="bg-slate-100 p-1 h-auto flex flex-wrap gap-1">
              <TabsTrigger
                value="cashflow"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Cashflow & Revenue Trajectory
              </TabsTrigger>
              <TabsTrigger
                value="renewals"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" /> Lease Expirations & Renewal Pipeline
              </TabsTrigger>
              <TabsTrigger
                value="capex"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Capital Outlay & CAPEX Forecast
              </TabsTrigger>
              <TabsTrigger
                value="vacancy"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <Home className="w-3.5 h-3.5 text-rose-600" /> Occupancy & Vacancy Risk Modeling
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="pt-4">
            <TabsContent value="cashflow" className="m-0 p-0">
              <ForecastsCashflowTrajectory />
            </TabsContent>

            <TabsContent value="renewals" className="m-0 p-0">
              <ForecastsRenewalPipeline />
            </TabsContent>

            <TabsContent value="capex" className="m-0 p-0">
              <ForecastsCapexOutlays />
            </TabsContent>

            <TabsContent value="vacancy" className="m-0 p-0">
              <ForecastsVacancyRisk />
            </TabsContent>
          </div>
        </Tabs>

        {/* =========================================================================
            MANDATORY GOVERNANCE SECTION (RISKS, OPPORTUNITIES, RECOMMENDATIONS, OBSERVATIONS)
            ========================================================================= */}
        <div className="border-t border-slate-200 pt-4">
          <InsightsGovernanceSection
            risks={forecastsRisks}
            opportunities={forecastsOpportunities}
            recommendations={forecastsRecommendations}
            observations={forecastsObservations}
          />
        </div>
      </div>
    </PageContainer>
  );
}
