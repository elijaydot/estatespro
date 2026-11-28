// src/components/analytics/AnalyticsPerformanceAreas.tsx
// FishGate Design Constitution v1.0 - Section 3: Performance Areas (5 Perspectives)
// Perspectives: Portfolio, Resident, Financial, Operational, Team Performance (moved from Tasks)

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Building,
  Users,
  DollarSign,
  Wrench,
  CheckCircle2,
  TrendingUp,
  Clock,
  Briefcase,
  AlertTriangle,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { AnalyticsPerspective } from './types';

interface AnalyticsPerformanceAreasProps {
  activePerspective?: AnalyticsPerspective;
  onPerspectiveChange?: (perspective: AnalyticsPerspective) => void;
}

export function AnalyticsPerformanceAreas({
  activePerspective: controlledPerspective,
  onPerspectiveChange,
}: AnalyticsPerformanceAreasProps) {
  const [internalPerspective, setInternalPerspective] = useState<AnalyticsPerspective>('portfolio');
  const activeTab = controlledPerspective || internalPerspective;

  const handleTabChange = (val: string) => {
    const p = val as AnalyticsPerspective;
    if (onPerspectiveChange) {
      onPerspectiveChange(p);
    } else {
      setInternalPerspective(p);
    }
  };

  // Perspective 1: Portfolio Performance Data
  const propertyRankings = [
    { name: 'Riverside Luxury Suites', units: 14, occupied: 14, occupancyRate: 100, monthlyRevenue: 'RWF 14.8M', growthQoQ: '+8.4%', ranking: 1, yieldRank: 'Top Performer' },
    { name: 'Kigali Heights Residences', units: 20, occupied: 19, occupancyRate: 95, monthlyRevenue: 'RWF 11.2M', growthQoQ: '+4.2%', ranking: 2, yieldRank: 'High Growth' },
    { name: 'Vision City Commercial & Residential', units: 14, occupied: 12, occupancyRate: 85.7, monthlyRevenue: 'RWF 5.5M', growthQoQ: '+1.0%', ranking: 3, yieldRank: 'Stable Value' },
  ];

  // Perspective 2: Resident Performance Data
  const residentMetrics = [
    { metric: 'Lease Renewal Rate', value: '88.5%', target: 'Target > 85%', status: 'Surpassing', detail: '23 of 26 leases renewed over last 180 days' },
    { metric: 'Resident Retention', value: '92.4%', target: 'Target > 90%', status: 'Optimal', detail: 'Average resident tenure is 22.4 months' },
    { metric: 'Move-Ins vs Move-Outs', value: '+8 Net', target: '12 In / 4 Out', status: 'Expanding', detail: 'Net resident expansion throughout Q4' },
    { metric: 'Communication SLA', value: '42 Min', target: 'Target < 60m', status: 'Healthy', detail: 'Median response speed across mobile & web inquiries' },
  ];

  const exitReasons = [
    { reason: 'Corporate Relocation', share: 42, note: 'Expatriate and diplomatic rotations outside Rwanda' },
    { reason: 'Upgrading / Expansion', share: 28, note: 'Household expansion requesting larger penthouses' },
    { reason: 'Price Sensitivity', share: 18, note: 'Negotiated adjustments upon annual inflation indexation' },
    { reason: 'Other / Personal', share: 12, note: 'Family or lifestyle life changes' },
  ];

  // Perspective 3: Financial Performance Data
  const financialStreams = [
    { property: 'Riverside Suites', billed: 14800000, collected: 14800000, collectionRate: 100, opex: 1850000, netMargin: 87.5 },
    { property: 'Kigali Heights', billed: 11200000, collected: 11100000, collectionRate: 99.1, opex: 2200000, netMargin: 80.2 },
    { property: 'Vision City Hub', billed: 5500000, collected: 5450000, collectionRate: 99.1, opex: 950000, netMargin: 82.6 },
  ];

  // Perspective 4: Operational Performance Data
  const operationalVendors = [
    { vendor: 'ElectroPower Rwanda', trade: 'Generators & Electrical', activeOrders: 1, avgResolution: '1.4d', rating: '4.9 ★', compliance: 98 },
    { vendor: 'Schindler & Otis Engineering', trade: 'Elevators & Heavy Lifts', activeOrders: 1, avgResolution: '1.2d', rating: '4.9 ★', compliance: 99 },
    { vendor: 'Kigali Clean & Green Sanitation', trade: 'Waste & Sanitation', activeOrders: 2, avgResolution: '2.1d', rating: '4.7 ★', compliance: 95 },
    { vendor: 'Wasac Certified Plumbing', trade: 'Plumbing & Drainage', activeOrders: 2, avgResolution: '2.4d', rating: '4.6 ★', compliance: 94 },
  ];

  // Perspective 5: Team Performance Data (Moved from Tasks per Simplification Directive)
  const teamWorkload = [
    { department: 'Facilities & Maintenance', active: 8, completed: 34, completionRate: 81, avgTurnaround: '1.8d', slaRate: '92%' },
    { department: 'Leasing & Residents', active: 5, completed: 28, completionRate: 85, avgTurnaround: '2.1d', slaRate: '96%' },
    { department: 'Finance & Collections', active: 4, completed: 31, completionRate: 89, avgTurnaround: '1.4d', slaRate: '98%' },
    { department: 'Executive & Legal', active: 2, completed: 14, completionRate: 88, avgTurnaround: '2.8d', slaRate: '91%' },
  ];

  const teamLeaderboard = [
    { name: 'Alexandre Nshimiyimana', role: 'Facilities Operations Lead', closedTasks: 24, onTimeRate: '96%', efficiency: 'High' },
    { name: 'Diane Uwase', role: 'Resident Experience Specialist', closedTasks: 19, onTimeRate: '98%', efficiency: 'Superior' },
    { name: 'Eric Habimana', role: 'Property Accountant', closedTasks: 22, onTimeRate: '95%', efficiency: 'High' },
    { name: 'Jean Claude Bizimana', role: 'Senior Property Manager', closedTasks: 16, onTimeRate: '94%', efficiency: 'High' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Performance Areas (5 Analytical Perspectives)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Deep causal understanding across portfolio assets, resident tenure, revenues, operations and execution.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 grid grid-cols-2 md:grid-cols-5 h-auto w-full gap-1">
          <TabsTrigger
            value="portfolio"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Portfolio</span>
          </TabsTrigger>
          <TabsTrigger
            value="resident"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Resident</span>
          </TabsTrigger>
          <TabsTrigger
            value="financial"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Financial</span>
          </TabsTrigger>
          <TabsTrigger
            value="operational"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Operational</span>
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Team & Workload</span>
          </TabsTrigger>
        </TabsList>

        {/* ---------------- PERSPECTIVE 1: PORTFOLIO PERFORMANCE ---------------- */}
        <TabsContent value="portfolio" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Portfolio Units
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">48 Units</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  45 Occupied
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Overall vacancy rate: <strong className="text-slate-900">5.8% (3 units)</strong> across Kigali properties.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Gross Monthly Revenue
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">RWF 31.5M</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                  +4.8% QoQ
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Average yield per unit: <strong className="text-slate-900">RWF 656,250 / mo</strong>.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Growth Driver Leader
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold text-slate-900 truncate">Riverside Suites</span>
                <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
                  #1 Yield
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Generates <strong className="text-slate-900">47% of net rental income</strong> at 100% occupancy.
              </p>
            </Card>
          </div>

          <Card className="p-4 border-slate-200 bg-white shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900">Property Ranking & Revenue Breakdown</h4>
                <p className="text-[11px] text-slate-500">Compares yield, capacity utilization, and quarter-over-quarter expansion.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Rank & Asset</th>
                    <th className="py-2.5 px-3">Capacity</th>
                    <th className="py-2.5 px-3">Occupancy</th>
                    <th className="py-2.5 px-3">Monthly Revenue</th>
                    <th className="py-2.5 px-3">Growth QoQ</th>
                    <th className="py-2.5 px-3 text-right">Yield Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {propertyRankings.map((prop) => (
                    <tr key={prop.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center">
                          #{prop.ranking}
                        </span>
                        <span>{prop.name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">{prop.units} units</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{prop.occupancyRate}%</span>
                          <span className="text-[10px] text-slate-400 font-mono">({prop.occupied}/{prop.units})</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{prop.monthlyRevenue}</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-700 font-mono font-semibold flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" />
                          {prop.growthQoQ}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200">
                          {prop.yieldRank}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- PERSPECTIVE 2: RESIDENT PERFORMANCE ---------------- */}
        <TabsContent value="resident" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {residentMetrics.map((rm) => (
              <Card key={rm.metric} className="p-3.5 border-slate-200 bg-white shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {rm.metric}
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-slate-900">{rm.value}</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                    {rm.status}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600">{rm.detail}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4 border-slate-200 bg-white shadow-2xs">
              <h4 className="font-bold text-xs text-slate-900 mb-1">Departure Drivers (Exit Interview Analysis)</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Identifies why vacating residents chose not to renew contracts.
              </p>
              <div className="space-y-3">
                {exitReasons.map((ex) => (
                  <div key={ex.reason} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{ex.reason}</span>
                      <span className="font-mono font-bold text-slate-900">{ex.share}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${ex.share}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">{ex.note}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-1">Move-In & Move-Out Velocity</h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Underlying turnaround velocity between lease termination and tenant intake.
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800">Unit Make-Ready Velocity</span>
                      <span className="font-mono font-bold text-slate-900">4.2 Days</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Average preparation turnaround from inspection to new resident key handover.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800">Renewal Lead Horizon</span>
                      <span className="font-mono font-bold text-slate-900">60 Days Prior</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Standardized notice protocol allows 94% of expirations to confirm intentions 60 days ahead.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Lease compliance rate</span>
                <span className="font-semibold text-emerald-700 font-mono">100% Statutory Compliant</span>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- PERSPECTIVE 3: FINANCIAL PERFORMANCE ---------------- */}
        <TabsContent value="financial" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                Arrears Breakdown
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">RWF 150K</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  Zero &gt; 30d
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Sole outstanding balance is under 5 days grace period at Vision City.
              </p>
            </Card>
          </div>

          <Card className="p-4 border-slate-200 bg-white shadow-2xs">
            <h4 className="font-bold text-xs text-slate-900 mb-1">Property Financial Profitability Matrix</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Direct comparison of rental collections, operational expenses, and net profit margins.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 px-3">Property</th>
                    <th className="py-2 px-3">Invoiced Rent</th>
                    <th className="py-2 px-3">Collected</th>
                    <th className="py-2 px-3">Collection Rate</th>
                    <th className="py-2 px-3">OPEX</th>
                    <th className="py-2 px-3 text-right">Net Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialStreams.map((fs) => (
                    <tr key={fs.property} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{fs.property}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">RWF {(fs.billed / 1000000).toFixed(1)}M</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">RWF {(fs.collected / 1000000).toFixed(1)}M</td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{fs.collectionRate}%</td>
                      <td className="py-3 px-3 font-mono text-slate-600">RWF {(fs.opex / 1000000).toFixed(2)}M</td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-blue-700">{fs.netMargin}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- PERSPECTIVE 4: OPERATIONAL PERFORMANCE ---------------- */}
        <TabsContent value="operational" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Maintenance Resolution Speed
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">1.8 Days</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  -47% Turnaround
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Emergency tickets dispatched in under 2 hours; standard repairs closed in 1.8 days.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Inspection Pass Rate
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">100%</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                  All Scheduled Audited
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                3 of 3 monthly safety and routine quality inspections conducted without statutory defects.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Recurring Issues
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">1 Item</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                  HVAC Compressor
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Vision City Unit C-301 chiller valve serviced twice; preventative replacement scheduled.
              </p>
            </Card>
          </div>

          <Card className="p-4 border-slate-200 bg-white shadow-2xs">
            <h4 className="font-bold text-xs text-slate-900 mb-1">Contractor & Vendor Operational Performance</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Tracks external partner response times, quality ratings, and statutory SLA adherence.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 px-3">Contractor</th>
                    <th className="py-2 px-3">Trade Category</th>
                    <th className="py-2 px-3">Active Tickets</th>
                    <th className="py-2 px-3">Avg Resolution</th>
                    <th className="py-2 px-3">SLA Compliance</th>
                    <th className="py-2 px-3 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operationalVendors.map((v) => (
                    <tr key={v.vendor} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{v.vendor}</td>
                      <td className="py-3 px-3 text-slate-600">{v.trade}</td>
                      <td className="py-3 px-3 font-mono text-slate-800">{v.activeOrders} active</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{v.avgResolution}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-emerald-700">{v.compliance}%</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">{v.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- PERSPECTIVE 5: TEAM PERFORMANCE (RELOCATED FROM TASKS) ---------------- */}
        <TabsContent value="team" className="mt-3 space-y-3">
          <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-md flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-700 shrink-0" />
              <span className="text-purple-950">
                <strong>Executive Note:</strong> Team performance, productivity reporting, workload analytics, and SLA metrics were unified into this analytical view per the FishGate Design Constitution simplification directive.
              </span>
            </div>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 font-mono text-[10px]">
              85.7% Completion Rate
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Department Performance */}
            <Card className="p-4 border-slate-200 bg-white shadow-2xs">
              <h4 className="font-bold text-xs text-slate-900 mb-1">Department Task Completion & Velocity</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Operational velocity and execution capacity across company departments.
              </p>
              <div className="divide-y divide-slate-100">
                {teamWorkload.map((dept) => (
                  <div key={dept.department} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">{dept.department}</span>
                      <span className="text-[11px] text-slate-500">
                        {dept.active} active • {dept.completed} completed ({dept.completionRate}%)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-800 block">{dept.avgTurnaround}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold font-mono">{dept.slaRate} SLA</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Individual Team Member Execution */}
            <Card className="p-4 border-slate-200 bg-white shadow-2xs">
              <h4 className="font-bold text-xs text-slate-900 mb-1">Staff Assignment & SLA Performance</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Measures individual workload distribution and on-time task delivery rates.
              </p>
              <div className="divide-y divide-slate-100">
                {teamLeaderboard.map((member) => (
                  <div key={member.name} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">{member.name}</span>
                      <span className="text-[11px] text-slate-500">{member.role}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-800 block">
                        {member.closedTasks} closed
                      </span>
                      <span className="text-[10px] text-purple-700 font-mono font-semibold">
                        {member.onTimeRate} on-time
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
