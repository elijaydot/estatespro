// src/components/work/TasksMyWorkView.tsx
// FishGate Design Constitution v1.0 - Section 4.1: My Work Daily Personal Cockpit

import { useState, useMemo } from 'react';
import { format, isToday, isThisWeek, isPast, isFuture, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Building,
  User,
  MessageSquare,
  Paperclip,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Flame,
  CheckSquare,
  FileText,
  CreditCard,
  Wrench,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';
import { TaskRecord, TaskPriority, TaskStatus, TaskSource } from './types';

interface TasksMyWorkViewProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
  onToggleComplete: (taskId: string, currentStatus: TaskStatus) => void;
  onQuickAssign?: (task: TaskRecord) => void;
}

export function TasksMyWorkView({
  tasks,
  onSelectTask,
  onToggleComplete,
  onQuickAssign,
}: TasksMyWorkViewProps) {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Group collapsed states
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    completed: true, // Default collapsed
  });

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = t.description.toLowerCase().includes(q);
        const propMatch = t.propertyName.toLowerCase().includes(q);
        const refMatch = t.taskNumber.toLowerCase().includes(q);
        const tenantMatch = (t.tenantName || '').toLowerCase().includes(q);
        const ownerMatch = t.owner.name.toLowerCase().includes(q);

        if (!titleMatch && !descMatch && !propMatch && !refMatch && !tenantMatch && !ownerMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, priorityFilter, sourceFilter, search]);

  // Split into required Constitution groups:
  // - Overdue
  // - Today
  // - This Week
  // - Upcoming
  // - Waiting
  // - Completed
  const groups = useMemo(() => {
    const overdueList: TaskRecord[] = [];
    const todayList: TaskRecord[] = [];
    const thisWeekList: TaskRecord[] = [];
    const upcomingList: TaskRecord[] = [];
    const waitingList: TaskRecord[] = [];
    const completedList: TaskRecord[] = [];

    filteredTasks.forEach((t) => {
      if (t.status === 'completed' || t.status === 'cancelled') {
        completedList.push(t);
        return;
      }

      if (t.status === 'waiting' || t.status === 'blocked' || t.status === 'under_review') {
        waitingList.push(t);
        return;
      }

      const isDuePast = t.dueDate < todayStr;
      const isDueToday = t.dueDate === todayStr;

      if (isDuePast) {
        overdueList.push(t);
      } else if (isDueToday) {
        todayList.push(t);
      } else {
        try {
          const parsed = parseISO(t.dueDate);
          if (isThisWeek(parsed, { weekStartsOn: 1 })) {
            thisWeekList.push(t);
          } else {
            upcomingList.push(t);
          }
        } catch {
          upcomingList.push(t);
        }
      }
    });

    return [
      {
        key: 'overdue',
        title: 'Overdue Work',
        badge: `${overdueList.length}`,
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        items: overdueList,
        icon: AlertTriangle,
        iconColor: 'text-red-600',
      },
      {
        key: 'today',
        title: 'Due Today',
        badge: `${todayList.length}`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        items: todayList,
        icon: Clock,
        iconColor: 'text-emerald-600',
      },
      {
        key: 'this_week',
        title: 'This Week',
        badge: `${thisWeekList.length}`,
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        items: thisWeekList,
        icon: CheckSquare,
        iconColor: 'text-blue-600',
      },
      {
        key: 'upcoming',
        title: 'Upcoming Scheduled Work',
        badge: `${upcomingList.length}`,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        items: upcomingList,
        icon: Clock,
        iconColor: 'text-slate-500',
      },
      {
        key: 'waiting',
        title: 'Waiting & Under Review',
        badge: `${waitingList.length}`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        items: waitingList,
        icon: Clock,
        iconColor: 'text-amber-600',
      },
      {
        key: 'completed',
        title: 'Completed Work',
        badge: `${completedList.length}`,
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        items: completedList,
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
      },
    ];
  }, [filteredTasks, todayStr]);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold px-1.5 py-0 gap-0.5"><Flame className="w-2.5 h-2.5" /> Critical</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-[10px] uppercase font-bold bg-amber-50 text-amber-800 border-amber-300 px-1.5 py-0">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-[10px] uppercase font-medium bg-slate-50 text-slate-600 border-slate-200 px-1.5 py-0">Low</Badge>;
    }
  };

  const getSourceBadge = (source: TaskSource) => {
    switch (source) {
      case 'leases':
        return <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1"><FileText className="w-2.5 h-2.5" /> Lease</Badge>;
      case 'collections':
        return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><CreditCard className="w-2.5 h-2.5" /> Collections</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 gap-1"><Wrench className="w-2.5 h-2.5" /> Maintenance</Badge>;
      case 'finance':
      case 'approvals':
        return <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 gap-1"><Receipt className="w-2.5 h-2.5" /> Approvals</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 capitalize">{source}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Workspace Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search my tasks by title, property, resident, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
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
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Sources</option>
            <option value="leases">Lease Renewals</option>
            <option value="collections">Collections</option>
            <option value="maintenance">Maintenance</option>
            <option value="approvals">Approvals & Outlays</option>
            <option value="manual">Manual Assignments</option>
          </select>

          {(search || priorityFilter !== 'all' || sourceFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSearch('');
                setPriorityFilter('all');
                setSourceFilter('all');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Accordion Groups */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups[group.key];
          const Icon = group.icon;

          // Don't render empty groups unless it's Today or Overdue
          if (group.items.length === 0 && group.key !== 'today' && group.key !== 'overdue') {
            return null;
          }

          return (
            <div key={group.key} className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between p-3 bg-slate-50/70 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                  <Icon className={`w-4 h-4 ${group.iconColor}`} />
                  <span className="font-bold text-xs text-slate-900">{group.title}</span>
                  <Badge variant="outline" className={`text-[10px] font-mono font-bold ${group.badgeClass}`}>
                    {group.badge}
                  </Badge>
                </div>

                <span className="text-[10px] text-slate-400 font-medium">
                  {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                </span>
              </button>

              {/* Group Tasks List */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {group.items.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No tasks in this category.
                    </div>
                  ) : (
                    group.items.map((task) => {
                      const isComplete = task.status === 'completed';

                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className={`p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                            isComplete ? 'opacity-60 bg-slate-50/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete(task.id, task.status);
                              }}
                              className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>

                            {/* Task Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                  {task.taskNumber}
                                </span>
                                {getSourceBadge(task.source)}
                                {getPriorityBadge(task.priority)}
                                {task.sourceEntityRef && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Ref: {task.sourceEntityRef}
                                  </span>
                                )}
                              </div>

                              <div className={`font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors ${isComplete ? 'line-through text-slate-500' : ''}`}>
                                {task.title}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                                <span className="truncate max-w-[200px] text-slate-700">
                                  {task.propertyName} {task.unitNumber ? `• Unit ${task.unitNumber}` : ''}
                                </span>
                                {task.tenantName && (
                                  <span className="truncate max-w-[150px] text-slate-500">
                                    • Resident: {task.tenantName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Meta & Badges Right Side */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Comments and Attachments badges */}
                            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[10px]">
                              {task.comments.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <MessageSquare className="w-3 h-3" /> {task.comments.length}
                                </span>
                              )}
                              {task.attachments.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Paperclip className="w-3 h-3" /> {task.attachments.length}
                                </span>
                              )}
                            </div>

                            {/* Due Date */}
                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className={task.dueDate < todayStr && !isComplete ? 'text-red-600 font-bold' : ''}>
                                {task.dueDate}
                              </span>
                            </div>

                            {/* Owner Avatar */}
                            <div
                              className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center"
                              title={`Assigned to ${task.owner.name}`}
                            >
                              {task.owner.name.slice(0, 2).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
