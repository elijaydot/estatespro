// src/components/work/TasksBoardView.tsx
// FishGate Design Constitution v1.0 - Section 4.3: Planner / Kanban Execution Board

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
  ChevronRight,
  User,
  Plus,
} from 'lucide-react';
import { TaskRecord, TaskStatus, TaskPriority } from './types';

interface TasksBoardViewProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onQuickCreate?: (columnStatus: TaskStatus) => void;
}

const COLUMNS: { key: TaskStatus; label: string; headerColor: string }[] = [
  { key: 'not_started', label: 'Not Started', headerColor: 'border-t-slate-400' },
  { key: 'in_progress', label: 'In Progress', headerColor: 'border-t-blue-600' },
  { key: 'waiting', label: 'Waiting / Blocked', headerColor: 'border-t-amber-500' },
  { key: 'under_review', label: 'Review & Sign-Off', headerColor: 'border-t-purple-500' },
  { key: 'completed', label: 'Completed', headerColor: 'border-t-emerald-600' },
];

export function TasksBoardView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onQuickCreate,
}: TasksBoardViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="text-[9px] uppercase font-bold px-1 py-0 gap-0.5"><Flame className="w-2.5 h-2.5" /> Critical</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-[9px] uppercase font-bold bg-amber-50 text-amber-800 border-amber-300 px-1 py-0">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-[9px] uppercase font-semibold bg-blue-50 text-blue-700 border-blue-200 px-1 py-0">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-[9px] uppercase font-medium bg-slate-50 text-slate-600 border-slate-200 px-1 py-0">Low</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 overflow-x-auto min-h-[550px] pb-4">
      {COLUMNS.map((col) => {
        // Collect tasks for this column. If column is 'waiting', also include 'blocked'
        const columnTasks = tasks.filter((t) => {
          if (col.key === 'waiting') {
            return t.status === 'waiting' || t.status === 'blocked';
          }
          return t.status === col.key;
        });

        return (
          <div
            key={col.key}
            className="flex flex-col rounded-lg bg-slate-100/60 border border-slate-200 p-2.5 min-w-[240px]"
          >
            {/* Column Header */}
            <div className={`pt-1 pb-2 px-1 border-t-2 ${col.headerColor} flex items-center justify-between mb-2`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-900">{col.label}</span>
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded-full border border-slate-200">
                  {columnTasks.length}
                </span>
              </div>

              {onQuickCreate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-900"
                  onClick={() => onQuickCreate(col.key)}
                  title={`Add task to ${col.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Column Cards */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
              {columnTasks.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-md bg-white/50">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isOverdue = task.dueDate < todayStr && task.status !== 'completed';

                  return (
                    <Card
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="p-3 border border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs transition-all cursor-pointer group space-y-2"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 truncate">
                          {task.taskNumber}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {getPriorityBadge(task.priority)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-slate-700">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs w-40">
                              <DropdownMenuItem onClick={() => onSelectTask(task)}>
                                View Details
                              </DropdownMenuItem>
                              {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                                <DropdownMenuItem
                                  key={c.key}
                                  onClick={() => onUpdateStatus(task.id, c.key)}
                                >
                                  Move to {c.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {task.title}
                      </div>

                      {/* Property & Unit */}
                      <div className="text-[10px] text-slate-500 truncate" title={task.propertyName}>
                        {task.propertyName} {task.unitNumber ? `• Unit ${task.unitNumber}` : ''}
                      </div>

                      {/* Bottom Meta */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className={`w-3 h-3 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className={`font-mono ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                            {task.dueDate.slice(5)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5" /> {task.comments.length}
                            </span>
                          )}
                          <div
                            className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[8px] flex items-center justify-center border border-slate-200"
                            title={task.owner.name}
                          >
                            {task.owner.name.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
