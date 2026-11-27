// src/components/work/TasksListView.tsx
// FishGate Design Constitution v1.0 - Section 4.4: High-Density Tabular Execution List

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
  CheckCircle2,
  Clock,
  Eye,
  CheckSquare,
  AlertTriangle,
  Building2,
  UserCheck,
  FileText,
  CreditCard,
  Wrench,
  Receipt,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { TaskRecord, TaskStatus, TaskPriority, TaskSource } from './types';

interface TasksListViewProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onAssignTask?: (task: TaskRecord) => void;
}

export function TasksListView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onAssignTask,
}: TasksListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const numMatch = t.taskNumber.toLowerCase().includes(q);
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = t.description.toLowerCase().includes(q);
        const propMatch = t.propertyName.toLowerCase().includes(q);
        const ownerMatch = t.owner.name.toLowerCase().includes(q);
        const refMatch = (t.sourceEntityRef || '').toLowerCase().includes(q);

        if (!numMatch && !titleMatch && !descMatch && !propMatch && !ownerMatch && !refMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, sourceFilter, search]);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + pageSize);

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'not_started':
        return <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">Not Started</Badge>;
      case 'in_progress':
        return <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">In Progress</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-semibold">Waiting</Badge>;
      case 'blocked':
        return <Badge variant="destructive" className="text-[10px] font-semibold">Blocked</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-semibold">Under Review</Badge>;
      case 'completed':
        return <Badge className="text-[10px] bg-emerald-600 text-white font-semibold">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-[10px]">Cancelled</Badge>;
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold gap-0.5"><Flame className="w-2.5 h-2.5" /> Critical</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-[10px] uppercase font-bold bg-amber-50 text-amber-800 border-amber-300">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-blue-50 text-blue-700 border-blue-200">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-[10px] uppercase font-medium bg-slate-50 text-slate-600 border-slate-200">Low</Badge>;
    }
  };

  const getSourceBadge = (source: TaskSource) => {
    switch (source) {
      case 'leases':
        return <span className="flex items-center gap-1 text-[11px] text-blue-700 font-semibold"><FileText className="w-3 h-3 text-blue-600" /> Leases</span>;
      case 'collections':
        return <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold"><CreditCard className="w-3 h-3 text-emerald-600" /> Collections</span>;
      case 'maintenance':
        return <span className="flex items-center gap-1 text-[11px] text-orange-700 font-semibold"><Wrench className="w-3 h-3 text-orange-600" /> Maintenance</span>;
      case 'finance':
      case 'approvals':
        return <span className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold"><Receipt className="w-3 h-3 text-purple-600" /> Approvals</span>;
      default:
        return <span className="capitalize text-[11px] text-slate-600 font-medium">{source}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Multi-Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search tasks by reference, title, property, assignee..."
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
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting / Blocked</option>
            <option value="under_review">Under Review</option>
            <option value="completed">Completed</option>
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
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Sources</option>
            <option value="leases">Lease Renewals</option>
            <option value="collections">Collections</option>
            <option value="maintenance">Maintenance</option>
            <option value="approvals">Approvals & Outlays</option>
            <option value="manual">Manual Assignments</option>
          </select>

          {(search || statusFilter !== 'all' || priorityFilter !== 'all' || sourceFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setSourceFilter('all');
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* High Density Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Task & Reference</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Source</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Property & Space</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Owner</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Priority</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Due Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Created</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-400">
                  <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No tasks found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map((t) => (
                <TableRow
                  key={t.id}
                  className="text-xs hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => onSelectTask(t)}
                >
                  <TableCell className="max-w-[220px]">
                    <div className="font-mono text-[10px] font-bold text-blue-700">
                      {t.taskNumber}
                    </div>
                    <div className="font-semibold text-slate-900 truncate mt-0.5" title={t.title}>
                      {t.title}
                    </div>
                  </TableCell>

                  <TableCell>{getSourceBadge(t.source)}</TableCell>

                  <TableCell className="max-w-[170px]">
                    <div className="font-semibold text-slate-900 truncate">{t.propertyName}</div>
                    {t.unitNumber ? (
                      <span className="text-[10px] text-slate-500">Unit {t.unitNumber}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Common Facility</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[8px] font-bold flex items-center justify-center border border-slate-200">
                        {t.owner.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800 text-[11px] truncate max-w-[120px]">
                        {t.owner.name}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>{getPriorityBadge(t.priority)}</TableCell>

                  <TableCell>{getStatusBadge(t.status)}</TableCell>

                  <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                    {t.dueDate}
                  </TableCell>

                  <TableCell className="text-slate-500 text-[11px] whitespace-nowrap">
                    {t.createdAt.slice(0, 10)}
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs">
                        <DropdownMenuItem onClick={() => onSelectTask(t)} className="gap-2">
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> View Details
                        </DropdownMenuItem>
                        {t.status !== 'completed' && (
                          <DropdownMenuItem
                            onClick={() => onUpdateStatus(t.id, 'completed')}
                            className="gap-2 text-emerald-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mark Completed
                          </DropdownMenuItem>
                        )}
                        {onAssignTask && (
                          <DropdownMenuItem onClick={() => onAssignTask(t)} className="gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Reassign Task
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

      {/* Pagination & Page Sizer */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <Pagination
          page={safePage}
          total={filteredTasks.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
