// src/components/maintenance/MaintenanceWorkOrdersView.tsx
// FishGate Design Constitution v1.0 - Section 4.2: Work Orders Execution Workspace

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/shared/Pagination';
import {
  Search,
  MoreHorizontal,
  Flame,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  CheckSquare,
  AlertTriangle,
  Building2,
  UserCheck,
  FileCheck,
} from 'lucide-react';
import { WorkOrderRecord, WorkOrderStatus, MaintenancePriority } from './types';

interface MaintenanceWorkOrdersViewProps {
  workOrders: WorkOrderRecord[];
  currency?: string;
  onSelectWorkOrder: (order: WorkOrderRecord) => void;
  onPrintWorkOrder: (order: WorkOrderRecord) => void;
  onUpdateStatus: (orderId: string, status: WorkOrderStatus) => void;
  onAssignWorkOrder?: (order: WorkOrderRecord) => void;
}

export function MaintenanceWorkOrdersView({
  workOrders,
  currency = 'RWF',
  onSelectWorkOrder,
  onPrintWorkOrder,
  onUpdateStatus,
  onAssignWorkOrder,
}: MaintenanceWorkOrdersViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const trades = useMemo(() => {
    const set = new Set<string>();
    workOrders.forEach((w) => set.add(w.tradeCategory));
    return Array.from(set);
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    return workOrders.filter((w) => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (tradeFilter !== 'all' && w.tradeCategory !== tradeFilter) return false;
      if (priorityFilter !== 'all' && w.priority !== priorityFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const numMatch = w.workOrderNumber.toLowerCase().includes(q);
        const titleMatch = w.title.toLowerCase().includes(q);
        const descMatch = w.issueDescription.toLowerCase().includes(q);
        const propMatch = w.propertyName.toLowerCase().includes(q);
        const vendorMatch = (w.assignedVendorName || '').toLowerCase().includes(q);
        const techMatch = (w.assignedTechnician || '').toLowerCase().includes(q);

        if (!numMatch && !titleMatch && !descMatch && !propMatch && !vendorMatch && !techMatch) {
          return false;
        }
      }

      return true;
    });
  }, [workOrders, statusFilter, tradeFilter, priorityFilter, search]);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const startIndex = (safePage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  const getStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] font-semibold">Assigned</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold gap-1"><Clock className="w-3 h-3" /> In Progress</Badge>;
      case 'parts_required':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">Parts Required</Badge>;
      case 'awaiting_approval':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">Awaiting Approval</Badge>;
      case 'awaiting_inspection':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold">Awaiting Inspection</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-600 text-white text-[10px] font-semibold gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>;
      case 'closed':
        return <Badge className="bg-slate-100 text-slate-700 text-[10px]">Closed</Badge>;
    }
  };

  const getPriorityBadge = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'emergency':
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold gap-1 bg-red-600"><Flame className="w-3 h-3" /> Emergency</Badge>;
      case 'high':
        return <Badge className="bg-amber-500 text-white text-[10px] uppercase font-bold">High</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 text-[10px]">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search work order #, issue, property, contractor, tech..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="parts_required">Parts Required</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={tradeFilter}
            onChange={(e) => {
              setTradeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Trades</option>
            {trades.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Priorities</option>
            <option value="emergency">Emergency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(search || statusFilter !== 'all' || tradeFilter !== 'all' || priorityFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTradeFilter('all');
                setPriorityFilter('all');
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">WO Number & Issue</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Premises</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Vendor & Technician</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Trade & Priority</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Due Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Cost (Est / Act)</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Progress</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-400">
                  <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No work orders found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((w) => (
                <TableRow
                  key={w.id}
                  className="text-xs hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => onSelectWorkOrder(w)}
                >
                  <TableCell className="max-w-[220px]">
                    <div className="font-mono font-bold text-blue-700 text-[11px]">
                      {w.workOrderNumber}
                    </div>
                    <div className="font-semibold text-slate-900 truncate mt-0.5" title={w.title}>
                      {w.title}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[160px]">
                    <div className="font-semibold text-slate-900 truncate">{w.propertyName}</div>
                    {w.unitNumber ? (
                      <span className="text-[10px] text-slate-500">Unit {w.unitNumber}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Common Area</span>
                    )}
                  </TableCell>

                  <TableCell className="max-w-[170px]">
                    <div className="font-semibold text-slate-900 truncate">
                      {w.assignedVendorName || 'In-House Crew'}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Tech: {w.assignedTechnician || 'Lead Tech'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <span className="font-medium text-slate-800 block text-[11px]">{w.tradeCategory}</span>
                      {getPriorityBadge(w.priority)}
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-600 whitespace-nowrap">
                    {format(new Date(w.dueDate), 'MMM d, yyyy')}
                  </TableCell>

                  <TableCell className="text-right whitespace-nowrap font-mono font-bold text-slate-900">
                    <div>{currency} {(w.actualCost || w.estimatedCost).toLocaleString()}</div>
                    {w.actualCost && w.actualCost !== w.estimatedCost && (
                      <span className="text-[10px] text-slate-400 font-normal block">
                        Est: {currency} {w.estimatedCost.toLocaleString()}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="min-w-[100px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-medium text-slate-500">
                        <span>{w.progress}%</span>
                      </div>
                      <Progress value={w.progress} className="h-1.5" />
                    </div>
                  </TableCell>

                  <TableCell>{getStatusBadge(w.status)}</TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuItem onClick={() => onSelectWorkOrder(w)} className="gap-2">
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> View Work Order
                        </DropdownMenuItem>
                        {onAssignWorkOrder && w.status !== 'completed' && w.status !== 'closed' && (
                          <DropdownMenuItem onClick={() => onAssignWorkOrder(w)} className="gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Assign Contractor
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onPrintWorkOrder(w)} className="gap-2">
                          <Printer className="w-3.5 h-3.5 text-blue-600" /> Print Work Sheet
                        </DropdownMenuItem>
                        {w.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus(w.id, 'completed')} className="gap-2 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="pt-2 flex justify-end">
        <Pagination
          page={safePage}
          total={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
