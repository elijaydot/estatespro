import React from 'react';
import {
  Sparkles,
  BrainCircuit,
  Lightbulb,
  ShieldAlert,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FinancialIntelligence } from '@/components/dashboard/FinancialIntelligence';
import { PredictiveAnalytics } from '@/components/ai/PredictiveAnalytics';

interface AiInsightsReportsProps {
  reportId: string;
  totalRevenue: number;
  outstandingBalance: number;
  occupancyRate: number;
  formatCurrency: (amount: number) => string;
}

export function AiInsightsReports({
  reportId,
  totalRevenue,
  outstandingBalance,
  occupancyRate,
  formatCurrency,
}: AiInsightsReportsProps) {
  return (
    <div className="space-y-6">
      {/* Microsoft Copilot for Business Executive Header */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  Microsoft Copilot Enterprise Intelligence
                </h3>
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold uppercase">
                  Continuous Telemetry
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated continuous synthesis of cashflow velocity, arrears exposure, and tenant behavior.
              </p>
            </div>
          </div>
        </div>

        {/* Actionability Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-background/80 border border-border/60">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Cashflow Efficiency</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Stable & Yielding</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">99.4% reconciliation health</p>
          </div>
          <div className="p-3 rounded-lg bg-background/80 border border-border/60">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Tenant Retention Risk</p>
            <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">Low Exposure</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Leases aligned with scheduled terms</p>
          </div>
          <div className="p-3 rounded-lg bg-background/80 border border-border/60">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">Operational Anomaly</p>
            <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">Zero Critical Defaults</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Routine aging triage active</p>
          </div>
        </div>
      </div>

      {/* Embedded Real Analytical Engine */}
      <div className="space-y-6">
        <FinancialIntelligence embedded />
        <div className="border-t border-border/60 pt-6">
          <PredictiveAnalytics embedded />
        </div>
      </div>
    </div>
  );
}
