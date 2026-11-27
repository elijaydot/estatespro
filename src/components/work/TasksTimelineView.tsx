// src/components/work/TasksTimelineView.tsx
// FishGate Design Constitution v1.0 - Section 4.5: Operational Deadline & Timeline Scheduling

import { useMemo } from 'react';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Building,
  User,
  ArrowRight,
  Milestone,
} from 'lucide-react';
import { TaskRecord, TaskPriority, TaskSource } from './types';

interface TasksTimelineViewProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
}

export function TasksTimelineView({ tasks, onSelectTask }: TasksTimelineViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Group tasks by dueDate chronological order
  const timelineGroups = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();

    // Sort tasks by dueDate
    const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    sorted.forEach((t) => {
      const key = t.dueDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });

    return Array.from(map.entries());
  }, [tasks]);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Milestone className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Operational Deadlines & Milestone Trajectory
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {tasks.length} tracked operational actions
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {timelineGroups.map(([dateKey, items]) => {
          const isDatePast = dateKey < todayStr;
          const isDateToday = dateKey === todayStr;

          let dotClass = 'bg-blue-600 ring-4 ring-blue-100';
          if (isDatePast) {
            dotClass = 'bg-red-500 ring-4 ring-red-100';
          } else if (isDateToday) {
            dotClass = 'bg-emerald-600 ring-4 ring-emerald-100 animate-pulse';
          }

          return (
            <div key={dateKey} className="relative space-y-2">
              {/* Timeline Bullet Node */}
              <div
                className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full ${dotClass} border-2 border-white`}
              />

              {/* Date Header */}
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-xs text-slate-900">
                  {dateKey}
                </span>
                {isDateToday && (
                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                    TODAY'S TARGET
                  </Badge>
                )}
                {isDatePast && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[9px] font-bold">
                    PAST DEADLINE
                  </Badge>
                )}
                <span className="text-[11px] text-slate-400">
                  ({items.length} {items.length === 1 ? 'action' : 'actions'})
                </span>
              </div>

              {/* Items Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                {items.map((task) => (
                  <Card
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="p-3 border border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                          {task.taskNumber}
                        </span>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {task.source}
                        </Badge>
                        {getPriorityBadge(task.priority)}
                        <span className="text-[10px] text-slate-500">
                          {task.propertyName} {task.unitNumber ? `• Unit ${task.unitNumber}` : ''}
                        </span>
                      </div>

                      <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {task.title}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 text-slate-700 text-[11px]">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[8px] font-bold flex items-center justify-center border border-slate-200">
                          {task.owner.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[120px]">{task.owner.name}</span>
                      </div>

                      <Badge
                        className={`text-[10px] capitalize font-medium ${
                          task.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
