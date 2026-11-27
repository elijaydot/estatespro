// src/components/maintenance/MaintenanceCriticalAttention.tsx
// FishGate Design Constitution v1.0 - Section 3: Critical Attention (Operational Hero Section)

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ShieldAlert,
  Flame,
  CheckCircle2,
  ArrowRight,
  Clock,
  Home,
  Building2,
  UserCheck,
} from 'lucide-react';
import { CriticalAttentionItem } from './types';

interface MaintenanceCriticalAttentionProps {
  items: CriticalAttentionItem[];
  onActionClick: (item: CriticalAttentionItem) => void;
}

export function MaintenanceCriticalAttention({
  items,
  onActionClick,
}: MaintenanceCriticalAttentionProps) {
  if (items.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
        <CardContent className="py-4 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                Zero Critical Maintenance Hazards
              </p>
              <p className="text-xs text-emerald-800">
                All physical property systems, safety checks, and tenant repairs are operating within statutory SLA limits.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-800 text-xs font-semibold">
            All Systems Nominal
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const getPriorityBadge = (priority: CriticalAttentionItem['priority']) => {
    switch (priority) {
      case 'emergency':
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold gap-1 bg-red-600">
            <Flame className="w-3 h-3" /> Emergency
          </Badge>
        );
      case 'safety':
        return (
          <Badge className="bg-amber-600 text-white text-[10px] uppercase font-bold gap-1">
            <ShieldAlert className="w-3 h-3" /> Safety Hazard
          </Badge>
        );
      case 'inspection_failure':
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold gap-1">
            <AlertTriangle className="w-3 h-3" /> Failed Inspection
          </Badge>
        );
      case 'occupancy_risk':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">
            Occupancy Risk
          </Badge>
        );
      case 'vendor_delay':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-semibold">
            Vendor Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] font-semibold">
            {priority}
          </Badge>
        );
    }
  };

  return (
    <Card className="border-red-200/90 bg-gradient-to-r from-red-50/50 via-white to-amber-50/40 shadow-xs">
      <CardHeader className="py-3 px-5 border-b border-red-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-100 text-red-700 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-sm font-bold text-slate-900">
            Critical Attention • Physical Operations ({items.length})
          </CardTitle>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Ranked by life-safety, occupancy impact & statutory compliance
        </span>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all gap-4 text-xs"
          >
            {/* Left: Issue, Location & Impact */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 mt-0.5 shrink-0">
                {item.priority === 'emergency' ? (
                  <Flame className="w-4 h-4 text-red-600 animate-pulse" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{item.issue}</span>
                  {getPriorityBadge(item.priority)}
                </div>

                <div className="flex items-center gap-3 text-slate-600 flex-wrap pt-0.5">
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {item.property}
                  </span>
                  {item.unit && (
                    <span className="flex items-center gap-1 font-medium text-slate-800">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      Unit {item.unit}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-500">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Owner: {item.owner}
                  </span>
                </div>

                <div className="text-slate-600 pt-1">
                  <span className="text-slate-400 font-medium">Operational Impact: </span>
                  <span className="font-semibold text-slate-800">{item.impact}</span>
                </div>
              </div>
            </div>

            {/* Right: Primary Action Button */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              <Button
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => onActionClick(item)}
              >
                {item.primaryAction}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
