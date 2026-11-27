// src/components/work/TasksWorkSummary.tsx
// FishGate Design Constitution v1.0 - Section 2: Work Summary (Max 4 Cards, Zero KPI Overload)

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock, AlertTriangle, Hourglass, ArrowUpRight } from 'lucide-react';
import { TaskRecord } from './types';

interface TasksWorkSummaryProps {
  tasks: TaskRecord[];
  currentUserId?: string;
  activeFilter?: string;
  onFilterSelect: (filterKey: string) => void;
}

export function TasksWorkSummary({
  tasks,
  currentUserId,
  activeFilter,
  onFilterSelect,
}: TasksWorkSummaryProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Assigned To Me
  const assignedToMe = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'cancelled'
  );

  // 2. Due Today
  const dueToday = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      t.dueDate === todayStr
  );

  // 3. Overdue
  const overdue = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      t.dueDate < todayStr
  );

  // 4. Waiting For Others
  const waitingForOthers = tasks.filter(
    (t) =>
      t.status === 'waiting' ||
      t.status === 'blocked' ||
      t.status === 'under_review'
  );

  const cards = [
    {
      id: 'assigned_to_me',
      title: 'Assigned To Me',
      count: assignedToMe.length,
      detail: 'Active work items allocated to your profile',
      icon: UserCheck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      badge: 'Active Work',
      badgeClass: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'due_today',
      title: 'Due Today',
      count: dueToday.length,
      detail: 'Deliverables due by close of business',
      icon: Clock,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      badge: 'Due 23:59',
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'overdue',
      title: 'Overdue',
      count: overdue.length,
      detail: 'Unresolved work past target deadline',
      icon: AlertTriangle,
      color: 'text-red-700 bg-red-50 border-red-200',
      badge: overdue.length > 0 ? 'Requires Action' : 'Clear',
      badgeClass: overdue.length > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'waiting',
      title: 'Waiting For Others',
      count: waitingForOthers.length,
      detail: 'Pending third-party sign-off or external dependency',
      icon: Hourglass,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      badge: 'Blocked / Review',
      badgeClass: 'bg-amber-100 text-amber-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeFilter === c.id;

        return (
          <Card
            key={c.id}
            onClick={() => onFilterSelect(c.id)}
            className={`p-4 border transition-all duration-150 cursor-pointer hover:shadow-sm ${
              isSelected
                ? 'border-blue-600 bg-blue-50/20 ring-1 ring-blue-600'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-md border ${c.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {c.count}
              </span>
              <Badge variant="outline" className={`text-[10px] font-semibold ${c.badgeClass}`}>
                {c.badge}
              </Badge>
            </div>

            <p className="mt-1 text-[11px] text-slate-500 leading-normal line-clamp-1">
              {c.detail}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
