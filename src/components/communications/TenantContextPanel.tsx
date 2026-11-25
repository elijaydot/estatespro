import {
  Phone,
  Mail,
  Home,
  FileText,
  CreditCard,
  Wrench,
  ExternalLink,
  PlusCircle,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ConversationThread } from './types';

interface TenantContextPanelProps {
  thread: ConversationThread;
  onClose?: () => void;
  onViewLease?: (leaseId: string) => void;
  onLogPayment?: (tenantId: string) => void;
  onCreateMaintenance?: (tenantId: string) => void;
  onSendEmail?: (email: string) => void;
}

export function TenantContextPanel({
  thread,
  onClose,
  onViewLease,
  onLogPayment,
  onCreateMaintenance,
  onSendEmail,
}: TenantContextPanelProps) {
  const isOverdue = thread.paymentStatus === 'overdue' || (thread.balanceDue && thread.balanceDue > 0);
  const initials = thread.tenantName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/60 border-l border-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Resident Context Dossier
        </h4>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Resident Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
          <Avatar className="h-14 w-14 mx-auto border-2 border-white shadow-sm ring-2 ring-blue-500/20">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-2 text-base font-bold text-slate-900 leading-tight">
            {thread.tenantName}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {thread.propertyName || 'Portfolio Resident'} • Unit {thread.unitNumber || 'N/A'}
          </p>

          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-100">
            {thread.tenantPhone && (
              <a
                href={`tel:${thread.tenantPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Direct Phone Call"
              >
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                Call
              </a>
            )}
            {thread.tenantEmail && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs font-semibold gap-1.5 text-slate-700"
                onClick={() => onSendEmail?.(thread.tenantEmail)}
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                Email
              </Button>
            )}
          </div>
        </div>

        {/* Premises & Tenancy Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Tenancy & Premises
              </span>
            </div>
            <Badge
              variant="outline"
              className={
                thread.leaseStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]'
                  : 'bg-amber-50 text-amber-700 border-amber-200 text-[11px]'
              }
            >
              {thread.leaseStatus ? thread.leaseStatus.toUpperCase() : 'ACTIVE'}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Property:</span>
              <span className="font-semibold text-slate-800 text-right">{thread.propertyName || 'Estate'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Unit:</span>
              <span className="font-semibold text-slate-800">Unit {thread.unitNumber || 'Standard'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Monthly Rent:</span>
              <span className="font-bold text-slate-900">
                RWF {Number(thread.rentAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {thread.leaseId && onViewLease && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5"
              onClick={() => onViewLease(thread.leaseId!)}
            >
              <FileText className="w-3.5 h-3.5" />
              View Full Lease Record
              <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
            </Button>
          )}
        </div>

        {/* Financial & Payment Standing Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Financial Standing
              </span>
            </div>
            {isOverdue ? (
              <Badge variant="destructive" className="text-[11px] font-semibold gap-1">
                <AlertTriangle className="w-3 h-3" />
                OVERDUE
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold gap-1">
                <CheckCircle2 className="w-3 h-3" />
                CURRENT
              </Badge>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-2.5 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Balance Due:</span>
              <span className={isOverdue ? 'font-bold text-rose-600' : 'font-bold text-emerald-700'}>
                RWF {Number(thread.balanceDue || 0).toLocaleString()}
              </span>
            </div>
            {thread.lastPaymentDate && (
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Last Settlement:</span>
                <span>{thread.lastPaymentDate}</span>
              </div>
            )}
          </div>

          {onLogPayment && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs font-semibold gap-1.5 text-slate-700 hover:bg-slate-50"
              onClick={() => onLogPayment(thread.tenantId)}
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              Log Payment / Invoice
            </Button>
          )}
        </div>

        {/* Maintenance Relationship Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Maintenance Health
              </span>
            </div>
            <Badge variant="outline" className="text-[11px] text-slate-600">
              {thread.openMaintenanceCount || 0} Open
            </Badge>
          </div>

          {thread.lastMaintenanceTitle ? (
            <div className="text-xs bg-amber-50/70 border border-amber-200/60 rounded-lg p-2 text-amber-900">
              <p className="font-semibold line-clamp-1">{thread.lastMaintenanceTitle}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Technician response in progress</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No open maintenance orders for this premises.</p>
          )}

          {onCreateMaintenance && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs font-semibold gap-1.5 text-slate-700 hover:bg-slate-50"
              onClick={() => onCreateMaintenance(thread.tenantId)}
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
              Create Work Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
