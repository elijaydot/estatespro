// src/components/work/TasksUpcomingDeadlines.tsx
// FishGate Design Constitution v1.0 - Section 6: Upcoming Deadlines (Clean Forward-Looking Schedule)

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Flame,
  AlertTriangle,
  Building,
  User,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { TaskRecord, TaskPriority } from './types';

interface TasksUpcomingDeadlinesProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
}

export function TasksUpcomingDeadlines({ tasks, onSelectTask }: TasksUpcomingDeadlinesProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter unresolved tasks sorted by due date
  const upcomingList = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5); // Clean, calm: top 5 upcoming deliverables
  }, [tasks]);

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Upcoming Deadlines</span>
        </h3>
        <span className="text-[11px] text-slate-400">Next 7–14 days trajectory</span>
      </div>

      <div className="space-y-2">
        {upcomingList.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 border border-slate-200 rounded-lg bg-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            No upcoming deadlines. All operational deliverables are caught up.
          </div>
        ) : (
          upcomingList.map((task) => {
            const isToday = task.dueDate === todayStr;
            const isPast = task.dueDate < todayStr;

            return (
              <Card
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="p-3 border border-slate-200/90 hover:border-slate-300 bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  {/* Date badge */}
                  <div
                    className={`p-2 rounded-md border text-center shrink-0 min-w-[70px] ${
                      isPast
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : isToday
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="block text-[9px] font-bold uppercase">
                      {isPast ? 'OVERDUE' : isToday ? 'TODAY' : 'DUE'}
                    </span>
                    <span className="block font-mono font-black text-xs">
                      {task.dueDate.slice(5)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                        {task.taskNumber}
                      </span>
                      {getPriorityBadge(task.priority)}
                      <span className="text-[10px] text-slate-400 capitalize">{task.source}</span>
                    </div>

                    <h4 className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {task.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">
                      {task.propertyName} {task.unitNumber ? `• Unit ${task.unitNumber}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[8px] font-bold flex items-center justify-center border border-slate-200">
                      {task.owner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate max-w-[120px]">{task.owner.name}</span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
