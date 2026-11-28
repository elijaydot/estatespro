// src/pages/Analytics.tsx
// FishGate Design Constitution v1.0 - Insights Module: Analytics Workspace ("Why Did It Happen?")
// Strict Decision Support: Revenue Drivers, Cost Drivers, Turnover Drivers, Operational Team Execution + Risks, Opportunities, Recommendations & Observations

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
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Building,
  Wrench,
  Download,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';

import {
  InsightRiskItem,
  InsightOpportunityItem,
  InsightRecommendationItem,
  InsightObservationItem,
} from '@/components/insights/types';
import { AnalyticsRevenueDrivers } from '@/components/insights/AnalyticsRevenueDrivers';
import { AnalyticsCostDrivers } from '@/components/insights/AnalyticsCostDrivers';
import { AnalyticsTurnoverDrivers } from '@/components/insights/AnalyticsTurnoverDrivers';
import { AnalyticsTeamExecution } from '@/components/insights/AnalyticsTeamExecution';
import { InsightsGovernanceSection } from '@/components/insights/InsightsGovernanceSection';

export default function AnalyticsPage() {
  const { data: properties = [] } = useProperties();
  const [activeTab, setActiveTab] = useState<'revenue' | 'costs' | 'turnover' | 'execution'>('revenue');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [timeHorizon, setTimeHorizon] = useState<string>('month');

  // Governance Items for Analytics ("Why Did It Happen?")
  const analyticsRisks: InsightRiskItem[] = [
    {
      id: 'risk-an-1',
      title: 'Unbudgeted Mechanical CAPEX Overrun',
      severity: 'critical',
      category: 'expense',
      impactStatement: 'Elevator hoist failure required RWF 1,950,000 unbudgeted outlay at Kigali Heights.',
      rootCause: 'Deferred preventative motor inverter replacement exceeded statutory safety tolerance.',
      affectedPremises: 'Kigali Heights Residences',
      potentialExposure: 'RWF 1,950,000',
      suggestedMitigation: 'Execute comprehensive quarterly maintenance contract with Schindler.',
      actionUrl: '/approvals',
      actionLabel: 'Review Approval',
    },
    {
      id: 'risk-an-2',
      title: 'Arrears Debt Concentration (Unit A-201)',
      severity: 'high',
      category: 'revenue',
      impactStatement: 'RWF 650,000 balance is 45+ days past due.',
      rootCause: 'Tenant medical emergency interrupted payroll cashflow.',
      affectedPremises: 'Riverside Luxury Suites',
      potentialExposure: 'RWF 650,000',
      suggestedMitigation: 'Execute 6-installment restructuring with guarantor promissory backing.',
      actionUrl: '/collections',
      actionLabel: 'Open Collections',
    },
    {
      id: 'risk-an-3',
      title: 'Seasonal Peak Chiller Electric Consumption',
      severity: 'medium',
      category: 'expense',
      impactStatement: 'Utility charges exceeded monthly projection by +12.0% (RWF 180,000).',
      rootCause: 'Common area HVAC chillers running during peak utility tariff hours.',
      affectedPremises: 'Vision City Commercial Hub',
      potentialExposure: 'RWF 180,000/mo',
      suggestedMitigation: 'Recalibrate automated thermostat setpoints to 23.5°C during peak tariff windows.',
      actionUrl: '/expenses',
      actionLabel: 'Inspect Expenses',
    },
  ];

  const analyticsOpportunities: InsightOpportunityItem[] = [
    {
      id: 'opp-an-1',
      title: 'Commercial Rent Indexation Realization',
      priority: 'high',
      category: 'yield',
      upsideStatement: 'Achieved +8.0% rent escalation across commercial lease renewals.',
      enabler: 'High commercial demand and reliable power/fiber infrastructure at Vision City.',
      affectedPremises: 'Vision City Commercial Hub',
      estimatedGain: 'RWF 2,400,000/yr',
      actionUrl: '/leases',
      actionLabel: 'Review Leases',
    },
    {
      id: 'opp-an-2',
      title: 'Security Vendor SLA Renegotiation',
      priority: 'quick_win',
      category: 'cost_reduction',
      upsideStatement: 'Saved RWF 30,000 monthly on perimeter surveillance service agreement.',
      enabler: 'Consolidated security contract across multiple commercial properties with Intersec.',
      affectedPremises: 'Portfolio-wide',
      estimatedGain: 'RWF 360,000/yr',
      actionUrl: '/maintenance?tab=vendors',
      actionLabel: 'View Vendors',
    },
    {
      id: 'opp-an-3',
      title: 'Accelerated 14-Day Residential Turnover',
      priority: 'medium',
      category: 'process',
      upsideStatement: 'Re-leasing velocity outperformed market standard by 7 days.',
      enabler: 'Mandatory move-out inspection checklists eliminated post-departure repair delays.',
      affectedPremises: 'Kigali Heights Residences',
      estimatedGain: 'RWF 450,000 saved downtime',
      actionUrl: '/maintenance?tab=inspections',
      actionLabel: 'Audit Inspections',
    },
  ];

  const analyticsRecommendations: InsightRecommendationItem[] = [
    {
      id: 'rec-an-1',
      title: 'Formalize Arrears Restructuring Promissory Note',
      urgency: 'immediate',
      reasoning: 'Guarantor agreed to settle RWF 650,000 arrears across six equal installments starting Dec 5.',
      expectedOutcome: '100% recovery of past-due balance without legal escalation or eviction expenses.',
      ownerDepartment: 'Finance & Accounts',
      actionUrl: '/collections',
      actionLabel: 'Execute Agreement',
    },
    {
      id: 'rec-an-2',
      title: 'Lock In Preventive Lift Maintenance Agreement',
      urgency: 'this_week',
      reasoning: 'Transitioning from reactive spot repairs to a fixed OEM service contract caps annual variance.',
      expectedOutcome: 'Guaranteed 2.5-hour emergency SLA and eliminates sudden CAPEX spikes.',
      ownerDepartment: 'Facilities & Maintenance',
      actionUrl: '/maintenance?tab=work-orders',
      actionLabel: 'Dispatch Contract',
    },
    {
      id: 'rec-an-3',
      title: 'Install Sub-Metered Smart Power Logging on Chillers',
      urgency: 'strategic',
      reasoning: 'Accurately attributing peak cooling electricity to commercial tenants prevents landlord subsidization.',
      expectedOutcome: 'Direct recharge of RWF 180,000 monthly utility variances.',
      ownerDepartment: 'Operations & Engineering',
      actionUrl: '/expenses',
      actionLabel: 'Review Utilities',
    },
  ];

  const analyticsObservations: InsightObservationItem[] = [
    {
      id: 'obs-an-1',
      title: 'Cost Variance Origin',
      finding: 'Most cost variances originate from heavy mechanical repairs rather than routine upkeep.',
      metricReference: '78% of budget delta',
      operationalContext: 'Preventative quarterly cycles eliminate 85% of spot repair spikes.',
    },
    {
      id: 'obs-an-2',
      title: 'Payment Compliance Disparity',
      finding: 'Commercial tenants demonstrate higher on-time collection realization (99.2%) than residential units (92.4%).',
      metricReference: '99.2% vs 92.4%',
      operationalContext: 'Attributed to automated corporate accounts payable scheduling.',
    },
    {
      id: 'obs-an-3',
      title: 'Operational Resolution Velocity',
      finding: 'Tasks resolved within 48 hours rose to 85.7% following direct vendor assignment protocols.',
      metricReference: '1.8 days avg SLA',
      operationalContext: 'Facilities lead dispatch reduces tenant friction significantly.',
    },
  ];

  const handleExport = () => {
    const data = [
      { Metric: 'Collections Realization', Status: '101.0%', Reason: '8% escalation at Vision City' },
      { Metric: 'Operational Outlays', Status: '+6.0% variance', Reason: 'Elevator overhaul at Kigali Heights' },
      { Metric: 'Occupancy Rate', Status: '94.2%', Reason: 'Strong commercial retention' },
      { Metric: 'Task Turnaround', Status: '1.8 days', Reason: 'Direct contractor dispatch' },
    ];
    downloadCsv(`fishgate-analytics-root-cause-${format(new Date(), 'yyyy-MM-dd')}.csv`, data);
    toast({ title: 'Analytics Exported', description: 'Downloaded root-cause analysis report.' });
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
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span>Analytics</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Why did it happen? Understand root causes, operational drivers, and performance variances.
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
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
            >
              <option value="month">Current Month (Nov 2026)</option>
              <option value="quarter">Q4 2026 Trajectory</option>
              <option value="ytd">Year-to-Date Performance</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-semibold gap-1.5 text-slate-700"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Analysis
            </Button>
          </div>
        </div>

        {/* =========================================================================
            PERSPECTIVES WORKSPACE (CLEAN TABS: REVENUE, COSTS, TURNOVER, TEAM EXECUTION)
            ========================================================================= */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="border-b border-slate-200 pb-0">
            <TabsList className="bg-slate-100 p-1 h-auto flex flex-wrap gap-1">
              <TabsTrigger
                value="revenue"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Revenue & Collections Drivers
              </TabsTrigger>
              <TabsTrigger
                value="costs"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Cost & Variance Drivers
              </TabsTrigger>
              <TabsTrigger
                value="turnover"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <Building className="w-3.5 h-3.5 text-indigo-600" /> Occupancy & Turnover Drivers
              </TabsTrigger>
              <TabsTrigger
                value="execution"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" /> Operational & Team Execution
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="pt-4">
            <TabsContent value="revenue" className="m-0 p-0">
              <AnalyticsRevenueDrivers />
            </TabsContent>

            <TabsContent value="costs" className="m-0 p-0">
              <AnalyticsCostDrivers />
            </TabsContent>

            <TabsContent value="turnover" className="m-0 p-0">
              <AnalyticsTurnoverDrivers />
            </TabsContent>

            <TabsContent value="execution" className="m-0 p-0">
              <AnalyticsTeamExecution />
            </TabsContent>
          </div>
        </Tabs>

        {/* =========================================================================
            MANDATORY GOVERNANCE SECTION (RISKS, OPPORTUNITIES, RECOMMENDATIONS, OBSERVATIONS)
            ========================================================================= */}
        <div className="border-t border-slate-200 pt-4">
          <InsightsGovernanceSection
            risks={analyticsRisks}
            opportunities={analyticsOpportunities}
            recommendations={analyticsRecommendations}
            observations={analyticsObservations}
          />
        </div>
      </div>
    </PageContainer>
  );
}
