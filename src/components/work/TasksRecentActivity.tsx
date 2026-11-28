// src/components/work/TasksRecentActivity.tsx
// FishGate Design Constitution v1.0 - Section 7: Recent Activity (Human Operational Audit Stream)

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  CheckCircle2,
  Clock,
  MessageSquare,
  UserCheck,
  Building,
  Wrench,
  FileText,
  CreditCard,
} from 'lucide-react';
import { TaskRecord } from './types';

interface TasksRecentActivityProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
}

export function TasksRecentActivity({ tasks, onSelectTask }: TasksRecentActivityProps) {
  // Synthesize realistic recent activities from tasks and comments
  const activities = [
    {
      id: 'act-1',
      actor: 'Diane Uwase',
      action: 'completed key orientation and turnover checklist for Unit B-102',
      taskNumber: 'TSK-2026-106',
      time: '2 hours ago',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    {
      id: 'act-2',
      actor: 'Aimable Nkurunziza',
      action: 'received quotation from Wasac Plumbing for balcony drainage remediation',
      taskNumber: 'TSK-2026-103',
      time: '4 hours ago',
      icon: Wrench,
      iconColor: 'text-orange-600',
    },
    {
      id: 'act-3',
      actor: 'Eric Habimana',
      action: 'dispatched formal arrears demand notice to guarantor for Unit A-201',
      taskNumber: 'TSK-2026-102',
      time: 'Yesterday at 16:45',
      icon: CreditCard,
      iconColor: 'text-amber-600',
    },
    {
      id: 'act-4',
      actor: 'Diane Uwase',
      action: 'agreed to 8% escalation rate for Commercial Unit C-301 lease renewal',
      taskNumber: 'TSK-2026-101',
      time: 'Yesterday at 14:30',
      icon: FileText,
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>Recent Activity</span>
        </h3>
        <span className="text-[11px] text-slate-400">Operational audit stream</span>
      </div>

      <Card className="p-3.5 border border-slate-200/90 bg-white divide-y divide-slate-100">
        {activities.map((act) => {
          const Icon = act.icon;
          const relatedTask = tasks.find((t) => t.taskNumber === act.taskNumber);

          return (
            <div
              key={act.id}
              onClick={() => relatedTask && onSelectTask(relatedTask)}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 p-1.5 rounded transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className={`w-3.5 h-3.5 ${act.iconColor}`} />
                </div>

                <div className="min-w-0">
                  <span className="font-semibold text-slate-900">{act.actor} </span>
                  <span className="text-slate-600">{act.action} </span>
                  <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-1 py-0.2 rounded border border-blue-200 group-hover:underline">
                    {act.taskNumber}
                  </span>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 font-mono">
                {act.time}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
