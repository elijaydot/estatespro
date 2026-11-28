// src/components/work/TasksMyDay.tsx
// FishGate Design Constitution v1.0 - Section 2: My Day (Personal, Human, Immediate Hero Section)

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { TaskRecord } from './types';

interface TasksMyDayProps {
  tasks: TaskRecord[];
  currentUserName?: string;
  activeFilter?: string;
  onFilterSelect: (filterKey: string) => void;
}

export function TasksMyDay({
  tasks,
  currentUserName = 'Operator',
  activeFilter,
  onFilterSelect,
}: TasksMyDayProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Due Today
  const dueToday = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate === todayStr),
    [tasks, todayStr]
  );

  // 2. Overdue
  const overdue = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate < todayStr),
    [tasks, todayStr]
  );

  // 3. Awaiting My Action (under review or waiting for operator response)
  const awaitingMyAction = useMemo(
    () => tasks.filter((t) => (t.status === 'under_review' || t.status === 'in_progress') && t.status !== 'completed'),
    [tasks]
  );

  // 4. Blocked Tasks
  const blockedTasks = useMemo(
    () => tasks.filter((t) => (t.status === 'blocked' || t.status === 'waiting') && t.status !== 'completed'),
    [tasks]
  );

  // 5. Upcoming Deadlines (due within next 7 days, excluding today)
  const upcomingDeadlines = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate > todayStr),
    [tasks, todayStr]
  );

  const cards = [
    {
      id: 'due_today',
      title: 'Due Today',
      count: dueToday.length,
      detail: 'Needs completion before 23:59',
      icon: Clock,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      badge: dueToday.length > 0 ? 'Today' : 'Clear',
      badgeClass: dueToday.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'overdue',
      title: 'Overdue',
      count: overdue.length,
      detail: 'Past target completion SLA',
      icon: AlertTriangle,
      color: 'text-red-700 bg-red-50 border-red-200',
      badge: overdue.length > 0 ? 'Urgent' : 'Zero',
      badgeClass: overdue.length > 0 ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'awaiting',
      title: 'Awaiting My Action',
      count: awaitingMyAction.length,
      detail: 'Active work requiring your input',
      icon: UserCheck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      badge: 'Actionable',
      badgeClass: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'blocked',
      title: 'Blocked Tasks',
      count: blockedTasks.length,
      detail: 'Waiting on third party or quote',
      icon: ShieldAlert,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      badge: blockedTasks.length > 0 ? 'Needs Attention' : 'None',
      badgeClass: blockedTasks.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'upcoming',
      title: 'Upcoming Deadlines',
      count: upcomingDeadlines.length,
      detail: 'Scheduled in next 7-14 days',
      icon: Calendar,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      badge: 'On Schedule',
      badgeClass: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Human Greeting & Calmer Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>My Day</span>
            <span className="text-slate-300 font-normal">|</span>
            <span className="text-xs font-normal text-slate-500">
              Welcome back, {currentUserName}. Here is your operational focus right now.
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>Operational Hub Active</span>
        </div>
      </div>

      {/* 5-Card Execution Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const isSelected = activeFilter === c.id;

          return (
            <Card
              key={c.id}
              onClick={() => onFilterSelect(c.id)}
              className={`p-3.5 border transition-all duration-150 cursor-pointer hover:shadow-xs flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/25 ring-1 ring-blue-600 shadow-2xs'
                  : 'border-slate-200/90 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
                    {c.title}
                  </span>
                  <div className={`p-1 rounded border ${c.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {c.count}
                  </span>
                  <Badge variant="outline" className={`text-[9px] font-semibold ${c.badgeClass}`}>
                    {c.badge}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-400 line-clamp-1 border-t border-slate-100 pt-1.5">
                {c.detail}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
