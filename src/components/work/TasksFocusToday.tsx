// src/components/work/TasksFocusToday.tsx
// FishGate Design Constitution v1.0 - Section 3: Focus Today (Priority Operational Hero Section)

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Flame,
  AlertTriangle,
  Clock,
  ArrowRight,
  Building2,
  User,
  Wrench,
  FileText,
  CreditCard,
  CheckCircle2,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { TaskRecord, TaskPriority, TaskSource } from './types';

interface TasksFocusTodayProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
  onExecutePrimaryAction: (task: TaskRecord) => void;
}

export function TasksFocusToday({
  tasks,
  onSelectTask,
  onExecutePrimaryAction,
}: TasksFocusTodayProps) {
  // Filter only priority work: Critical or High priority that are unresolved
  const priorityTasks = tasks.filter(
    (t) =>
      (t.priority === 'critical' || t.priority === 'high') &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
  ).slice(0, 3); // Top 3 most critical items to preserve cognitive focus

  if (priorityTasks.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              Priority Focus Clear
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              All critical and high-priority operational deadlines have been addressed for today.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md">
          Zero Critical Bottlenecks
        </span>
      </div>
    );
  }

  const getSourceIcon = (source: TaskSource) => {
    switch (source) {
      case 'leases':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'collections':
        return <CreditCard className="w-3.5 h-3.5 text-amber-600" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-orange-600" />;
      case 'finance':
      case 'approvals':
        return <Receipt className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    if (priority === 'critical') {
      return (
        <Badge variant="destructive" className="text-[10px] uppercase font-bold gap-1 px-1.5 py-0.5 animate-pulse">
          <Flame className="w-3 h-3" /> Critical Action
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] uppercase font-bold bg-amber-50 text-amber-800 border-amber-300 gap-1 px-1.5 py-0.5">
        <AlertTriangle className="w-3 h-3 text-amber-600" /> High Priority
      </Badge>
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Focus Today • Operational Command Queue
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Prioritized by operational impact & deadline SLA
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {priorityTasks.map((task) => (
          <Card
            key={task.id}
            onClick={() => onSelectTask(task)}
            className="p-4 border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between bg-white cursor-pointer group"
          >
            <div>
              {/* Top Meta: Source & Priority */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  {getSourceIcon(task.source)}
                  <span className="capitalize">{task.source}</span>
                  {task.sourceEntityRef && (
                    <span className="font-mono text-[10px] text-slate-400 font-bold">
                      • {task.sourceEntityRef}
                    </span>
                  )}
                </div>
                {getPriorityBadge(task.priority)}
              </div>

              {/* Title & Scope */}
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                {task.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                {task.description}
              </p>

              {/* Premises & Space Info */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="truncate max-w-[170px]" title={task.propertyName}>
                  <strong className="text-slate-800">{task.propertyName}</strong>
                  {task.unitNumber && <span> (Unit {task.unitNumber})</span>}
                </div>
                <div className="flex items-center gap-1 text-slate-700 font-mono font-medium whitespace-nowrap">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Due {task.dueDate}</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Owner & Primary Action */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                  {task.owner.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] font-medium text-slate-700 truncate">
                  {task.owner.name}
                </span>
              </div>

              <Button
                size="sm"
                className="h-7 text-[11px] font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onExecutePrimaryAction(task);
                }}
              >
                <span>{task.primaryAction?.label || 'Execute Action'}</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
