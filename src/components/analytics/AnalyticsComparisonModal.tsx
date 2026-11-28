// src/components/analytics/AnalyticsComparisonModal.tsx
// FishGate Design Constitution v1.0 - Side-by-side Property Comparison Modal

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, DollarSign, ShieldCheck, Wrench, CheckCircle2 } from 'lucide-react';
import { PropertyComparisonRow } from './types';

interface AnalyticsComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: PropertyComparisonRow[];
}

export function AnalyticsComparisonModal({
  isOpen,
  onClose,
  properties,
}: AnalyticsComparisonModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <span>Cross-Property Analytical Comparison</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Side-by-side operational, financial, and occupancy benchmarking across portfolio assets.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold text-slate-700 w-1/4">Metric / Dimension</th>
                {properties.map((p) => (
                  <th key={p.propertyId} className="py-2.5 px-3 font-bold text-slate-900 border-l border-slate-200">
                    {p.propertyName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600 bg-slate-50/50">Unit Capacity</td>
                {properties.map((p) => (
                  <td key={p.propertyId} className="py-2.5 px-3 font-mono font-bold text-slate-800 border-l border-slate-200">
                    {p.unitCount} units
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600 bg-slate-50/50">Occupancy Rate</td>
                {properties.map((p) => (
                  <td key={p.propertyId} className="py-2.5 px-3 border-l border-slate-200">
                    <Badge variant="outline" className={`font-mono text-xs ${
                      p.occupancyRate >= 95 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {p.occupancyRate}%
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600 bg-slate-50/50">Monthly Rent Roll</td>
                {properties.map((p) => (
                  <td key={p.propertyId} className="py-2.5 px-3 font-mono font-bold text-slate-900 border-l border-slate-200">
                    RWF {(p.monthlyRevenue / 1000000).toFixed(1)}M
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600 bg-slate-50/50">Collection Realization</td>
                {properties.map((p) => (
                  <td key={p.propertyId} className="py-2.5 px-3 font-mono text-emerald-700 font-bold border-l border-slate-200">
                    {p.collectionRate}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600 bg-slate-50/50">Operating Expense Ratio</td>
                {properties.map((p) => (
                  <td key={p.propertyId} className="py-2.5 px-3 font-mono text-slate-700 border-l border-slate-200">
                    {p.opexRatio}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600 bg-slate-50/50">Avg Resolution SLA</td>
                {properties.map((p) => (
                  <td key={p.propertyId} className="py-2.5 px-3 font-mono font-bold text-slate-800 border-l border-slate-200">
                    {p.avgSlaDays} days
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-600 bg-slate-50/50">Premises Health Score</td>
                {properties.map((p) => (
                  <td key={p.propertyId} className="py-2.5 px-3 border-l border-slate-200">
                    <span className="font-mono font-bold text-slate-900">{p.healthScore}/100</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
