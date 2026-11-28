// src/components/forecasts/ForecastsAreas.tsx
// FishGate Design Constitution v1.0 - Section 3: Forecast Areas (5 Forward Perspectives)
// Areas: Revenue Outlook, Occupancy Outlook, Lease Outlook, Maintenance Outlook, Workload Outlook

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DollarSign,
  Building,
  FileText,
  Wrench,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Layers,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ForecastAreaType } from './types';

interface ForecastsAreasProps {
  activeArea?: ForecastAreaType;
  onAreaChange?: (area: ForecastAreaType) => void;
}

export function ForecastsAreas({
  activeArea: controlledArea,
  onAreaChange,
}: ForecastsAreasProps) {
  const [internalArea, setInternalArea] = useState<ForecastAreaType>('revenue');
  const activeTab = controlledArea || internalArea;

  const handleTabChange = (val: string) => {
    const a = val as ForecastAreaType;
    if (onAreaChange) {
      onAreaChange(a);
    } else {
      setInternalArea(a);
    }
  };

  // Area 1: Revenue Outlook Data
  const monthlyRevenueForecast = [
    { month: 'Dec 2026', projected: 31.8, baseline: 31.5, notes: '+RWF 300K initial intake' },
    { month: 'Jan 2027', projected: 32.5, baseline: 31.5, notes: 'Vision City annual 8% indexation' },
    { month: 'Feb 2027', projected: 33.2, baseline: 31.5, notes: 'Full absorption of 2 new units' },
    { month: 'Mar 2027', projected: 33.6, baseline: 31.5, notes: 'Stabilized Q1 cashflow' },
  ];

  // Area 2: Occupancy Outlook Data
  const occupancyProjections = [
    { property: 'Riverside Luxury Suites', current: 100, projectedQ1: 100, vacantUnits: 0, status: 'Full Capacity' },
    { property: 'Kigali Heights Residences', current: 95, projectedQ1: 100, vacantUnits: 1, status: 'Final Lease Pending' },
    { property: 'Vision City Commercial & Residential', current: 85.7, projectedQ1: 92.8, vacantUnits: 2, status: '1 Unit Reserved' },
  ];

  // Area 3: Lease Outlook Data
  const upcomingLeaseExpirations = [
    { tenant: 'Afreximbank Regional Mission', unit: 'Unit PH-02', property: 'Riverside Suites', rent: 'RWF 2,400,000', expiryDate: 'Dec 31, 2026', renewalStatus: 'In Negotiation', probability: 'High (95%)' },
    { tenant: 'Kigali Tech Innovations Ltd', unit: 'Suite B-101', property: 'Vision City Commercial', rent: 'RWF 1,600,000', expiryDate: 'Jan 15, 2027', renewalStatus: 'Terms Dispatched', probability: 'Medium (75%)' },
    { tenant: 'Dr. Claire Mukamana', unit: 'Apt A-402', property: 'Kigali Heights Residences', rent: 'RWF 1,200,000', expiryDate: 'Jan 31, 2027', renewalStatus: 'Confirmed Renewal', probability: 'Confirmed (100%)' },
  ];

  // Area 4: Maintenance Outlook Data
  const maintenanceDemand = [
    { category: 'HVAC Seasonal Servicing', scheduledDate: 'Dec 05, 2026', premises: 'All Properties', estimatedCost: 'RWF 850,000', vendor: 'ElectroPower Rwanda', priority: 'Preventative' },
    { category: 'Elevator Safety Recertification', scheduledDate: 'Dec 12, 2026', premises: 'Kigali Heights & Riverside', estimatedCost: 'RWF 1,200,000', vendor: 'Schindler & Otis Engineering', priority: 'Statutory' },
    { category: 'Water Pressure Booster Overhaul', scheduledDate: 'Dec 19, 2026', premises: 'Vision City Common Bay', estimatedCost: 'RWF 650,000', vendor: 'Wasac Certified Plumbing', priority: 'Routine' },
  ];

  // Area 5: Workload Outlook Data
  const workloadDepartments = [
    { department: 'Facilities & Maintenance', scheduledTasks: 14, forwardApprovals: 2, capacityLoad: '78% (Healthy)', lead: 'Alexandre Nshimiyimana' },
    { department: 'Leasing & Resident Relations', scheduledTasks: 8, forwardApprovals: 1, capacityLoad: '62% (Optimal)', lead: 'Diane Uwase' },
    { department: 'Finance & Collections', scheduledTasks: 6, forwardApprovals: 1, capacityLoad: '55% (Balanced)', lead: 'Eric Habimana' },
    { department: 'Executive Management', scheduledTasks: 3, forwardApprovals: 3, capacityLoad: '45% (Available)', lead: 'Jean Claude Bizimana' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Forecast Areas (Forward Operational Horizons)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Comprehensive planning perspectives across collections, tenant capacity, contracts, facilities, and staff execution.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 grid grid-cols-2 md:grid-cols-5 h-auto w-full gap-1">
          <TabsTrigger
            value="revenue"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Revenue Outlook</span>
          </TabsTrigger>
          <TabsTrigger
            value="occupancy"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Occupancy Outlook</span>
          </TabsTrigger>
          <TabsTrigger
            value="lease"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lease Outlook</span>
          </TabsTrigger>
          <TabsTrigger
            value="maintenance"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Maintenance Outlook</span>
          </TabsTrigger>
          <TabsTrigger
            value="workload"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Workload Outlook</span>
          </TabsTrigger>
        </TabsList>

        {/* ---------------- 1. REVENUE OUTLOOK ---------------- */}
        <TabsContent value="revenue" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Projected Q1 Monthly Rent Roll
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">RWF 33.2M</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  +5.4% Forward Growth
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Baseline increases from RWF 31.5M to RWF 33.2M by February 2027.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Scheduled Indexation Boost
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">+RWF 950K</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                  Vision City Commercial
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Annual statutory contract indexation applies on January 1, 2027.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Identified Revenue at Risk
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">RWF 1.6M</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                  1 Maturing Lease
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Kigali Tech Innovations renewal pending final corporate sign-off.
              </p>
            </Card>
          </div>

          <Card className="p-4 border-slate-200 bg-white shadow-2xs">
            <h4 className="font-bold text-xs text-slate-900 mb-1">Projected Monthly Collections Trajectory (Q1 2027)</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Compares projected gross receipts against current contractual baseline.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Forecast Horizon</th>
                    <th className="py-2.5 px-3">Contractual Baseline</th>
                    <th className="py-2.5 px-3">Projected Invoiced Collections</th>
                    <th className="py-2.5 px-3">Incremental Delta</th>
                    <th className="py-2.5 px-3 text-right">Planning Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyRevenueForecast.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{row.month}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">RWF {row.baseline}M</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">RWF {row.projected}M</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-700 font-mono font-semibold flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" />
                          +RWF {((row.projected - row.baseline) * 1000).toFixed(0)}K
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 font-medium">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- 2. OCCUPANCY OUTLOOK ---------------- */}
        <TabsContent value="occupancy" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Projected Portfolio Occupancy
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">95.8%</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                  46 of 48 Units
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Occupancy projected to climb 1.6% as new tenants arrive in December.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Vacancy Absorption Pipeline
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">2 Inquiries</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  High Intent
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Unit B-204 at Kigali Heights has lease contracts out for signature.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Worst-Case Vacancy Floor
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">91.6%</span>
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                  Stress Tested
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Even if both pending lease renewals fail to extend, portfolio remains &gt; 91%.
              </p>
            </Card>
          </div>

          <Card className="p-4 border-slate-200 bg-white shadow-2xs">
            <h4 className="font-bold text-xs text-slate-900 mb-1">Property Occupancy Trajectory & Capacity</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Asset-level forward capacity utilization forecast for Q1.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 px-3">Premises Asset</th>
                    <th className="py-2 px-3 font-mono">Current Occupancy</th>
                    <th className="py-2 px-3 font-mono">Q1 Projected</th>
                    <th className="py-2 px-3 font-mono">Vacant Units</th>
                    <th className="py-2 px-3 text-right">Forward Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {occupancyProjections.map((p) => (
                    <tr key={p.property} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{p.property}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{p.current}%</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">{p.projectedQ1}%</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{p.vacantUnits} vacant</td>
                      <td className="py-3 px-3 text-right">
                        <Badge variant="outline" className="text-[10px] font-medium bg-slate-50 text-slate-700 border-slate-200">
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- 3. LEASE OUTLOOK ---------------- */}
        <TabsContent value="lease" className="mt-3 space-y-3">
          <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-md flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-700 shrink-0" />
              <span className="text-purple-950">
                <strong>Forward Contract Maturity Tracker:</strong> 8 leases expire in the next 60 to 90 days. Early renewal incentives have been triggered across all accounts.
              </span>
            </div>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 font-mono text-[10px]">
              87.5% Target Retention
            </Badge>
          </div>

          <Card className="p-4 border-slate-200 bg-white shadow-2xs">
            <h4 className="font-bold text-xs text-slate-900 mb-1">Upcoming Lease Maturities (Next 60 Days)</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Details upcoming expiration dates, monthly rent roll at risk, and renewal probability.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 px-3">Resident / Organization</th>
                    <th className="py-2 px-3">Premises & Unit</th>
                    <th className="py-2 px-3">Monthly Rent</th>
                    <th className="py-2 px-3">Expiry Date</th>
                    <th className="py-2 px-3">Renewal Status</th>
                    <th className="py-2 px-3 text-right">Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingLeaseExpirations.map((l) => (
                    <tr key={l.tenant} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{l.tenant}</td>
                      <td className="py-3 px-3 text-slate-600">{l.property} ({l.unit})</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{l.rent}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{l.expiryDate}</td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-medium">
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
        </TabsContent>

        {/* ---------------- 4. MAINTENANCE OUTLOOK ---------------- */}
        <TabsContent value="maintenance" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                December Planned Facilities Budget
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">RWF 4.2M</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                  Within Budget
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                18 preventive and routine tasks scheduled without emergency premiums.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Statutory Safety Recertifications
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">2 Audits</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                  Scheduled
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Elevator hoisting recertification by Rwanda Fire & Safety Authority on Dec 12.
              </p>
            </Card>

            <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Recurring Asset Health Risk
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">Apt C-301 Chiller</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                  Valve Replacement
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Scheduled for complete valve rebuild to prevent seasonal compressor breakdown.
              </p>
            </Card>
          </div>

          <Card className="p-4 border-slate-200 bg-white shadow-2xs">
            <h4 className="font-bold text-xs text-slate-900 mb-1">Scheduled Preventative Maintenance Demand (December 2026)</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Planned work orders with assigned certified vendors and allocated budget.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 px-3">Maintenance Work Order</th>
                    <th className="py-2 px-3">Scheduled Date</th>
                    <th className="py-2 px-3">Affected Premises</th>
                    <th className="py-2 px-3">Budgeted Cost</th>
                    <th className="py-2 px-3">Certified Partner</th>
                    <th className="py-2 px-3 text-right">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenanceDemand.map((m) => (
                    <tr key={m.category} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-blue-600" />
                        <span>{m.category}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{m.scheduledDate}</td>
                      <td className="py-3 px-3 text-slate-600">{m.premises}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{m.estimatedCost}</td>
                      <td className="py-3 px-3 text-slate-700">{m.vendor}</td>
                      <td className="py-3 px-3 text-right">
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                          {m.priority}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- 5. WORKLOAD OUTLOOK ---------------- */}
        <TabsContent value="workload" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4 border-slate-200 bg-white shadow-2xs">
              <h4 className="font-bold text-xs text-slate-900 mb-1">Department Forward Task Allocation</h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Projected workload volume across operational teams for the next 30 days.
              </p>
              <div className="divide-y divide-slate-100">
                {workloadDepartments.map((dept) => (
                  <div key={dept.department} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">{dept.department}</span>
                      <span className="text-[11px] text-slate-500">
                        Lead: {dept.lead} • {dept.scheduledTasks} planned tasks
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border-emerald-200">
                        {dept.capacityLoad}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-1">Upcoming Executive Approvals Queue</h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Decisions expected to require board or executive sign-off in December.
                </p>
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">Schindler 2027 Preventative Service Agreement</span>
                      <span className="text-[11px] text-slate-500">RWF 4,800,000 annual contract</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                      Dec 10 Due
                    </Badge>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">Solar Hybrid Inverter CAPEX Retrofit</span>
                      <span className="text-[11px] text-slate-500">RWF 8,200,000 energy efficiency investment</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                      Dec 18 Due
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Operational capacity status:</span>
                <span className="font-semibold text-emerald-700">100% Prepared for Q1 Execution</span>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
