// src/components/work/TasksTeamTasks.tsx
// FishGate Design Constitution v1.0 - Section 5: Team Tasks (Lightweight Delegation & Accountability View)

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  Building,
  UserCheck,
  MoreHorizontal,
  Eye,
  FileText,
  CreditCard,
  Wrench,
  Receipt,
} from 'lucide-react';
import { TaskRecord, TaskPriority, TaskStatus, TaskSource, TaskOwner } from './types';

interface TasksTeamTasksProps {
  tasks: TaskRecord[];
  teamMembers: TaskOwner[];
  onSelectTask: (task: TaskRecord) => void;
  onQuickAssign?: (task: TaskRecord) => void;
  onUpdateStatus?: (taskId: string, newStatus: TaskStatus) => void;
}

export function TasksTeamTasks({
  tasks,
  teamMembers,
  onSelectTask,
  onQuickAssign,
  onUpdateStatus,
}: TasksTeamTasksProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [search, setSearch] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedMemberId !== 'all' && t.owner.id !== selectedMemberId && t.owner.name !== selectedMemberId) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(q);
        const ownerMatch = t.owner.name.toLowerCase().includes(q);
        const propMatch = t.propertyName.toLowerCase().includes(q);
        const refMatch = t.taskNumber.toLowerCase().includes(q);
        if (!titleMatch && !ownerMatch && !propMatch && !refMatch) return false;
      }
      return true;
    });
  }, [tasks, selectedMemberId, search]);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="text-[9px] uppercase font-bold px-1.5 py-0 gap-0.5"><Flame className="w-2.5 h-2.5" /> Critical</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-[9px] uppercase font-bold bg-amber-50 text-amber-800 border-amber-300 px-1.5 py-0">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-[9px] uppercase font-semibold bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-[9px] uppercase font-medium bg-slate-50 text-slate-600 border-slate-200 px-1.5 py-0">Low</Badge>;
    }
  };

  const getSourceIcon = (source: TaskSource) => {
    switch (source) {
      case 'leases':
        return <FileText className="w-3 h-3 text-blue-600" />;
      case 'collections':
        return <CreditCard className="w-3 h-3 text-emerald-600" />;
      case 'maintenance':
        return <Wrench className="w-3 h-3 text-orange-600" />;
      case 'finance':
      case 'approvals':
        return <Receipt className="w-3 h-3 text-purple-600" />;
      default:
        return <Building className="w-3 h-3 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Quick Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search team tasks by title, assignee, or premises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Team Members ({teamMembers.length})</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          {(search || selectedMemberId !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSearch('');
                setSelectedMemberId('all');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Team Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTasks.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white">
            <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            No team tasks matching criteria.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.dueDate < todayStr && task.status !== 'completed';
            const isCompleted = task.status === 'completed';

            return (
              <Card
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-3.5 border border-slate-200/90 hover:border-slate-300 bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group ${
                  isCompleted ? 'opacity-60 bg-slate-50/50' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                      {getSourceIcon(task.source)}
                      <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                        {task.taskNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[10px] capitalize text-slate-500">{task.source}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {getPriorityBadge(task.priority)}
                      <Badge
                        className={`text-[9px] capitalize font-medium ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <h4 className={`font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {task.propertyName} {task.unitNumber ? `(Unit ${task.unitNumber})` : ''}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[8px] font-bold flex items-center justify-center border border-slate-200">
                      {task.owner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800 text-[11px] truncate max-w-[140px]">
                      {task.owner.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                      <Clock className="w-3 h-3" />
                      {task.dueDate}
                    </span>

                    {onQuickAssign && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-blue-600 hover:text-blue-700 px-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAssign(task);
                        }}
                      >
                        Reassign
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
