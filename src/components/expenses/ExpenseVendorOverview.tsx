// src/components/expenses/ExpenseVendorOverview.tsx
// FishGate Design Constitution v1.0 - Section 6: Vendor Management & Contract Health

import { Users, Building2, ShieldCheck, AlertCircle, Plus, ExternalLink, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VendorSummaryItem } from './types';

interface ExpenseVendorOverviewProps {
  vendors: VendorSummaryItem[];
  onAddVendor: () => void;
  onRecordPayment: (vendorId: string) => void;
  currency?: string;
}

export function ExpenseVendorOverview({
  vendors,
  onAddVendor,
  onRecordPayment,
  currency = 'RWF',
}: ExpenseVendorOverviewProps) {
  return (
    <Card className="border border-slate-200 shadow-2xs bg-white overflow-hidden">
      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <span>Key Operational Service Partners ({vendors.length})</span>
          </CardTitle>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Contracted facility service providers, SLAs, and performance health
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="text-xs font-semibold gap-1.5 h-8 text-slate-700 bg-white"
          onClick={onAddVendor}
        >
          <Plus className="w-3.5 h-3.5 text-blue-600" />
          Add Vendor
        </Button>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-slate-100">
        {vendors.slice(0, 3).map((vendor) => (
          <div key={vendor.id} className="p-4 flex flex-col justify-between hover:bg-slate-50/60 transition-colors">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{vendor.vendorName}</h4>
                  <span className="text-xs text-slate-500 font-medium block mt-0.5">{vendor.services}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-bold uppercase px-1.5',
                    vendor.riskStatus === 'low'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : vendor.riskStatus === 'moderate'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  )}
                >
                  {vendor.riskStatus} risk
                </Badge>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contact:</span>
                  <span className="font-medium text-slate-800">{vendor.contactName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Outlay:</span>
                  <span className="font-bold text-slate-900">{currency} {vendor.totalSpend.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Contracts:</span>
                  <span className="font-semibold text-slate-800">{vendor.activeContracts} ongoing</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Service Rating:</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {vendor.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100">
                {vendor.performanceNotes}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Last paid: {vendor.lastPaymentDate}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                onClick={() => onRecordPayment(vendor.id)}
              >
                Log Payment
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
