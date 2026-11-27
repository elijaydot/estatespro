// src/components/maintenance/VendorDetailModal.tsx
// FishGate Design Constitution v1.0 - Section 4.4: Contractor Partner Operational Dossier

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Star,
  Flame,
  AlertTriangle,
  Wrench,
  Award,
  CalendarCheck,
  Briefcase,
} from 'lucide-react';
import { VendorOperationalProfile } from './types';

interface VendorDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorOperationalProfile | null;
  currency?: string;
  onDispatchWorkOrder?: (vendor: VendorOperationalProfile) => void;
}

export function VendorDetailModal({
  open,
  onOpenChange,
  vendor,
  currency = 'RWF',
  onDispatchWorkOrder,
}: VendorDetailModalProps) {
  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-semibold text-xs text-blue-700 bg-blue-50 border-blue-200">
                {vendor.tradeCategory}
              </Badge>
              <Badge
                className={`text-[10px] capitalize font-semibold ${
                  vendor.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {vendor.status} Partner
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-xs text-slate-900">{vendor.rating.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400">(Audited SLA)</span>
            </div>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{vendor.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Registered physical maintenance contractor and operational trade specialist
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Compliance & Emergency Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {vendor.emergencyService ? (
              <Badge variant="outline" className="text-[11px] bg-red-50 text-red-700 border-red-200 gap-1 px-2 py-0.5 font-bold">
                <Flame className="w-3 h-3 text-red-600" /> 24/7 Emergency Dispatch Available
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600 border-slate-200 gap-1 px-2 py-0.5">
                Standard Business Hours
              </Badge>
            )}

            {vendor.insuranceValid && (
              <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 px-2 py-0.5 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Valid General Liability Insurance
              </Badge>
            )}

            {vendor.licenseValid && (
              <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 gap-1 px-2 py-0.5 font-semibold">
                <Award className="w-3 h-3 text-blue-600" /> Statutory Trade License Verified
              </Badge>
            )}
          </div>

          {/* Operational Metrics Cards (4-Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Active Orders</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {vendor.activeWorkOrders}
              </div>
              <span className="text-[10px] text-slate-500">work orders</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Avg Response</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {vendor.responseTimeHours}h
              </div>
              <span className="text-[10px] text-slate-500">SLA target: {vendor.slaStandardHours || 4}h</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Completion Rate</span>
              <div className="flex items-center gap-1 text-lg font-bold font-mono text-slate-900 mt-1">
                <span>{vendor.completionRate}%</span>
                {vendor.completionRate >= 95 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <span className="text-[10px] text-slate-500">on-time closeout</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">YTD Outlay</span>
              <div className="text-sm font-bold font-mono text-slate-900 mt-1 truncate">
                {currency} {vendor.costYtd.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">invoiced spend</span>
            </div>
          </div>

          {/* Primary Dispatch Contact Person */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
            <span className="font-bold text-slate-900 block text-xs">Primary Point of Contact & Dispatch</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Account Representative</span>
                <span className="font-bold text-slate-900 text-sm block">{vendor.contactPerson}</span>
                <span className="text-[11px] text-slate-600">Lead Technical Dispatcher</span>
              </div>

              <div className="space-y-1.5">
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>{vendor.phone}</span>
                </a>
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>{vendor.email}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Service Level Agreement & Protocol */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
            <span className="font-bold text-slate-900 block text-xs">Operational Service Standards</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Contracted Response Window: <strong>{vendor.slaStandardHours || 4} hours</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Trade Coverage: <strong>{vendor.tradeCategory}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Billing Terms: <strong>Net 30 Days on Completed Sign-Off</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Audit Status: <strong>Fully Compliant & Approved</strong></span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            FishGate Verified Operational Partner
          </span>

          <div className="flex items-center gap-2 justify-end">
            {onDispatchWorkOrder && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
                onClick={() => {
                  onDispatchWorkOrder(vendor);
                  onOpenChange(false);
                }}
              >
                <Wrench className="w-3.5 h-3.5" /> Dispatch Work Order
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
