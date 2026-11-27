// src/components/maintenance/MaintenanceRequestsView.tsx
// FishGate Design Constitution v1.0 - Section 4.1: Requests View

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
  AlertTriangle,
  Clock,
  CheckCircle2,
  Paperclip,
  Wrench,
  ArrowRight,
  Eye,
  UserCheck,
  Building2,
  Home,
  XCircle,
} from 'lucide-react';
import { MaintenanceRequestRecord, RequestStatus, MaintenancePriority } from './types';

interface MaintenanceRequestsViewProps {
  requests: MaintenanceRequestRecord[];
  currency?: string;
  onSelectRequest: (request: MaintenanceRequestRecord) => void;
  onConvertToWorkOrder: (request: MaintenanceRequestRecord) => void;
  onAssignRequest: (request: MaintenanceRequestRecord) => void;
}

export function MaintenanceRequestsView({
  requests,
  currency = 'RWF',
  onSelectRequest,
  onConvertToWorkOrder,
  onAssignRequest,
}: MaintenanceRequestsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const categories = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => set.add(r.category));
    return Array.from(set);
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const refMatch = r.reference.toLowerCase().includes(q);
        const titleMatch = r.title.toLowerCase().includes(q);
        const descMatch = r.description.toLowerCase().includes(q);
        const propMatch = r.propertyName.toLowerCase().includes(q);
        const unitMatch = (r.unitNumber || '').toLowerCase().includes(q);
        const residentMatch = r.reportedBy.name.toLowerCase().includes(q);

        if (!refMatch && !titleMatch && !descMatch && !propMatch && !unitMatch && !residentMatch) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusFilter, priorityFilter, categoryFilter, search]);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

  const getPriorityBadge = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'emergency':
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold gap-1 bg-red-600">
            <Flame className="w-3 h-3" /> Emergency
          </Badge>
        );
      case 'high':
        return (
          <Badge className="bg-amber-500 text-white text-[10px] uppercase font-bold">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="text-slate-700 text-[10px] font-semibold border-slate-300">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="secondary" className="text-slate-500 text-[10px]">
            Low
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'reported':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">Reported</Badge>;
      case 'triaged':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">Triaged</Badge>;
      case 'awaiting_assignment':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">Awaiting Assignment</Badge>;
      case 'assigned':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] font-semibold">Assigned</Badge>;
      case 'converted_to_work_order':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">Work Order Active</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-slate-400 text-[10px]">Cancelled</Badge>;
      case 'closed':
        return <Badge className="bg-slate-100 text-slate-700 text-[10px]">Closed</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by title, ref, resident, property, unit, description..."
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
            <option value="reported">Reported</option>
            <option value="triaged">Triaged</option>
            <option value="awaiting_assignment">Awaiting Assignment</option>
            <option value="assigned">Assigned</option>
            <option value="converted_to_work_order">Work Order Active</option>
            <option value="closed">Closed</option>
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

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Reference & Title</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Premises & Space</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Reported By</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Category & Priority</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Date Reported</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Assigned Team</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Quick Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-400">
                  <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No maintenance requests found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((r) => (
                <TableRow
                  key={r.id}
                  className="text-xs hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => onSelectRequest(r)}
                >
                  <TableCell className="max-w-[240px]">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-blue-700 text-[11px]">
                      <span>{r.reference}</span>
                      {r.media.length > 0 && (
                        <span className="flex items-center gap-0.5 text-slate-400 font-sans text-[10px]">
                          <Paperclip className="w-3 h-3" /> {r.media.length}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-900 truncate mt-0.5" title={r.title}>
                      {r.title}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[170px]">
                    <div className="font-semibold text-slate-900 truncate">{r.propertyName}</div>
                    {r.unitNumber ? (
                      <span className="text-[10px] text-slate-500">Unit {r.unitNumber}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Common Facility</span>
                    )}
                  </TableCell>

                  <TableCell className="max-w-[140px]">
                    <div className="font-semibold text-slate-900 truncate">{r.reportedBy.name}</div>
                    <span className="text-[10px] text-slate-400 capitalize">{r.reportedBy.role}</span>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <span className="font-medium text-slate-800 block text-[11px]">{r.category}</span>
                      {getPriorityBadge(r.priority)}
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-600 whitespace-nowrap">
                    {format(new Date(r.createdAt), 'MMM d, yyyy')}
                    <span className="block text-[10px] text-slate-400">
                      {format(new Date(r.createdAt), 'h:mm a')}
                    </span>
                  </TableCell>

                  <TableCell>{getStatusBadge(r.status)}</TableCell>

                  <TableCell className="max-w-[150px]">
                    {r.assignment?.vendorName ? (
                      <div>
                        <div className="font-semibold text-slate-900 truncate">{r.assignment.vendorName}</div>
                        <span className="text-[10px] text-slate-400">Vendor Partner</span>
                      </div>
                    ) : r.assignment?.assignedTo ? (
                      <div>
                        <div className="font-semibold text-slate-900 truncate">{r.assignment.assignedTo}</div>
                        <span className="text-[10px] text-slate-400">In-house Tech</span>
                      </div>
                    ) : (
                      <span className="text-amber-600 text-[10px] font-semibold italic">Unassigned</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {r.status !== 'converted_to_work_order' && r.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                          onClick={() => onConvertToWorkOrder(r)}
                        >
                          Convert to WO <ArrowRight className="w-3 h-3" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem onClick={() => onSelectRequest(r)} className="gap-2">
                            <Eye className="w-3.5 h-3.5 text-slate-500" /> View Full Request
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAssignRequest(r)} className="gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Dispatch Vendor
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
          total={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
