// src/components/work/TasksWorkloadView.tsx
// FishGate Design Constitution v1.0 - Section 5: Team Workload, Capacity & Productivity Management

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Flame,
  Building,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { TaskRecord, WorkloadMember } from './types';

interface TasksWorkloadViewProps {
  tasks: TaskRecord[];
  onSelectMember?: (memberName: string) => void;
}

export function TasksWorkloadView({ tasks, onSelectMember }: TasksWorkloadViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Calculate Member Workloads
  const memberWorkload = useMemo(() => {
    const map = new Map<string, WorkloadMember>();

    tasks.forEach((t) => {
      const name = t.owner.name;
      if (!map.has(name)) {
        map.set(name, {
          id: t.owner.id,
          name,
          role: t.owner.role || 'Operational Specialist',
          department: t.department || 'Property Operations',
          activeCount: 0,
          completedCount: 0,
          overdueCount: 0,
          capacityStatus: 'optimal',
        });
      }

      const m = map.get(name)!;
      if (t.status === 'completed') {
        m.completedCount++;
      } else {
        m.activeCount++;
        if (t.dueDate < todayStr) {
          m.overdueCount++;
        }
      }
    });

    // Determine capacity
    return Array.from(map.values()).map((m) => {
      let capacityStatus: 'optimal' | 'busy' | 'overloaded' = 'optimal';
      if (m.activeCount >= 6) {
        capacityStatus = 'overloaded';
      } else if (m.activeCount >= 3) {
        capacityStatus = 'busy';
      }
      return { ...m, capacityStatus };
    });
  }, [tasks, todayStr]);

  // Department Summary
  const departmentStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; active: number }>();

    tasks.forEach((t) => {
      const dept = t.department || 'General Operations';
      if (!map.has(dept)) {
        map.set(dept, { total: 0, completed: 0, active: 0 });
      }
      const st = map.get(dept)!;
      st.total++;
      if (t.status === 'completed') st.completed++;
      else st.active++;
    });

    return Array.from(map.entries()).map(([department, data]) => ({
      department,
      ...data,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, [tasks]);

  const totalCompleted = tasks.filter((t) => t.status === 'completed').length;
  const overallRate = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;

  return (
    <div className="space-y-6">
      {/* Top High-Level Capacity Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Platform Completion Rate
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">{overallRate}%</span>
            <span className="text-[11px] text-slate-500 font-medium">of assigned workload closed</span>
          </div>
          <Progress value={overallRate} className="h-1.5 mt-2.5" />
        </Card>

        <Card className="p-4 border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Team Members
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">{memberWorkload.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">collaborators managing tasks</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
            <span className="text-emerald-700 font-semibold">
              {memberWorkload.filter((m) => m.capacityStatus === 'optimal').length} optimal load
            </span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">
              {memberWorkload.filter((m) => m.capacityStatus === 'busy').length} near capacity
            </span>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Blocked Operational Bottlenecks
            </span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">{blockedTasks}</span>
            <span className="text-[11px] text-slate-500 font-medium">tasks requiring escalation</span>
          </div>
          <span className="mt-2 inline-block text-[10px] text-red-700 font-semibold">
            {blockedTasks > 0 ? 'Requires management triage' : 'All workflows proceeding normally'}
          </span>
        </Card>
      </div>

      {/* Workload by User Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Workload Distribution by Team Member
          </h3>
          <span className="text-[11px] text-slate-500">Balanced team capacity view</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {memberWorkload.map((m) => (
            <Card
              key={m.id || m.name}
              className="p-3.5 border border-slate-200 hover:border-slate-300 bg-white space-y-2 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px] flex items-center justify-center border border-slate-200 shrink-0">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 truncate block">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {m.role}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={
                    m.capacityStatus === 'overloaded'
                      ? 'destructive'
                      : m.capacityStatus === 'busy'
                      ? 'outline'
                      : 'secondary'
                  }
                  className={`text-[9px] uppercase font-bold ${
                    m.capacityStatus === 'busy' ? 'bg-amber-50 text-amber-800 border-amber-300' : ''
                  }`}
                >
                  {m.capacityStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-1 rounded bg-slate-50">
                  <span className="text-[9px] text-slate-400 block font-semibold">ACTIVE</span>
                  <span className="font-bold font-mono text-xs text-slate-900">{m.activeCount}</span>
                </div>
                <div className="p-1 rounded bg-slate-50">
                  <span className="text-[9px] text-slate-400 block font-semibold">DONE</span>
                  <span className="font-bold font-mono text-xs text-emerald-700">{m.completedCount}</span>
                </div>
                <div className="p-1 rounded bg-slate-50">
                  <span className="text-[9px] text-slate-400 block font-semibold">OVERDUE</span>
                  <span className={`font-bold font-mono text-xs ${m.overdueCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {m.overdueCount}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Workload by Department */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Departmental Operational Performance
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {departmentStats.map((d) => (
            <Card key={d.department} className="p-3.5 border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{d.department}</span>
                <span className="text-xs font-mono font-bold text-blue-700">{d.completionRate}% Done</span>
              </div>
              <Progress value={d.completionRate} className="h-1.5" />
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{d.active} pending tasks</span>
                <span>{d.total} total recorded</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
