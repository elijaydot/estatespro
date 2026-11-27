// src/components/maintenance/MaintenanceHealthSummary.tsx
// FishGate Design Constitution v1.0 - Section 2: Maintenance Health Summary (Max 4 Cards)

import { Card, CardContent } from '@/components/ui/card';
import { Wrench, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { MaintenanceRequestRecord, WorkOrderRecord } from './types';

interface MaintenanceHealthSummaryProps {
  requests: MaintenanceRequestRecord[];
  workOrders: WorkOrderRecord[];
  currency?: string;
  onSelectView?: (view: 'requests' | 'work-orders') => void;
}

export function MaintenanceHealthSummary({
  requests,
  workOrders,
  currency = 'RWF',
  onSelectView,
}: MaintenanceHealthSummaryProps) {
  // 1. Open Requests: reported, triaged, awaiting assignment, or assigned
  const openRequests = requests.filter(
    (r) => r.status !== 'closed' && r.status !== 'cancelled'
  );
  const emergencyCount = openRequests.filter((r) => r.priority === 'emergency').length;

  // 2. Work in Progress: active execution
  const inProgressOrders = workOrders.filter(
    (w) => w.status === 'in_progress' || w.status === 'scheduled' || w.status === 'parts_required'
  );
  const activeVendorsCount = new Set(
    inProgressOrders.map((w) => w.assignedVendorName).filter(Boolean)
  ).size;

  // 3. Overdue Items
  const now = new Date();
  const overdueOrders = workOrders.filter(
    (w) =>
      w.status !== 'completed' &&
      w.status !== 'closed' &&
      new Date(w.dueDate).getTime() < now.getTime()
  );
  const overdueRequests = requests.filter(
    (r) =>
      r.status !== 'closed' &&
      r.status !== 'cancelled' &&
      r.assignment?.dueDate &&
      new Date(r.assignment.dueDate).getTime() < now.getTime()
  );
  const totalOverdue = overdueOrders.length + overdueRequests.length;

  // 4. Monthly Maintenance Cost
  const totalCostThisMonth = workOrders.reduce((sum, w) => sum + (w.actualCost || w.estimatedCost || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Open Requests */}
      <Card
        onClick={() => onSelectView?.('requests')}
        className="cursor-pointer border-slate-200/80 shadow-xs hover:border-blue-300 transition-all bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Open Requests
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {openRequests.length}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              {emergencyCount > 0 ? (
                <span className="text-red-600 font-bold">{emergencyCount} emergency priority</span>
              ) : (
                <span>All requests within normal SLA</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Work In Progress */}
      <Card
        onClick={() => onSelectView?.('work-orders')}
        className="cursor-pointer border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Work In Progress
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {inProgressOrders.length}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>{activeVendorsCount} contractors currently dispatched</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Overdue Items */}
      <Card
        onClick={() => onSelectView?.('work-orders')}
        className="cursor-pointer border-slate-200/80 shadow-xs hover:border-amber-300 transition-all bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Overdue Items
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-amber-700 tracking-tight">
              {totalOverdue}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>{totalOverdue > 0 ? 'Exceeded target resolution SLA' : 'Zero SLA violations'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Monthly Maintenance Cost */}
      <Card
        className="border-slate-200/80 shadow-xs bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Monthly Maintenance Cost
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {currency} {totalCostThisMonth.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>Materials, labor & contractor billing</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
