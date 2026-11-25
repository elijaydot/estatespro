import { AlertCircle, Clock, ArrowRight, CheckCircle2, User, FileText, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ActionRequiredItem } from './types';

interface CommunicationActionRequiredProps {
  items: ActionRequiredItem[];
  onSelectResident: (residentId: string) => void;
  onOpenLeases?: () => void;
  onOpenMaintenance?: () => void;
}

export function CommunicationActionRequired({
  items,
  onSelectResident,
  onOpenLeases,
  onOpenMaintenance,
}: CommunicationActionRequiredProps) {
  if (items.length === 0) {
    return (
      <Card className="border border-emerald-100 bg-emerald-50/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                All Resident Inquiries & Responses are Up to Date
              </p>
              <p className="text-xs text-emerald-700">
                Zero overdue resident messages, pending renewal threads, or unhandled requests.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200">
            Optimal Response Time
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-amber-200 bg-amber-50/40 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-amber-100/80 bg-amber-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Action Required • Communications & Resident Follow-Ups ({items.length})
          </h3>
        </div>
        <span className="text-xs text-amber-700 font-medium">Prioritized by response urgency</span>
      </div>
      <div className="divide-y divide-amber-100/60 bg-white">
        {items.map((item) => {
          const isUrgent = item.urgency === 'urgent';
          const isLease = item.actionType === 'review_lease';
          const isMaint = item.actionType === 'maintenance';

          return (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5',
                    isUrgent
                      ? 'bg-rose-100 text-rose-700'
                      : isLease
                      ? 'bg-blue-100 text-blue-700'
                      : isMaint
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {isLease ? (
                    <FileText className="w-4 h-4" />
                  ) : isMaint ? (
                    <Wrench className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{item.residentName}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {item.propertyName} • Unit {item.unitNumber}
                    </span>
                    {isUrgent && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 mt-0.5">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400 inline" />
                    <span>{item.timeAgo}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  variant={isUrgent ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs font-semibold gap-1.5',
                    isUrgent && 'bg-rose-600 hover:bg-rose-700 text-white'
                  )}
                  onClick={() => {
                    if (isLease && onOpenLeases) {
                      onOpenLeases();
                    } else if (isMaint && onOpenMaintenance) {
                      onOpenMaintenance();
                    } else {
                      onSelectResident(item.residentId);
                    }
                  }}
                >
                  {item.actionLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
