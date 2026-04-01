import { useState } from 'react';
import { 
  Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, DollarSign, Users, BarChart3, Lightbulb, RefreshCw,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/SettingsContext';

interface PaymentBehavior {
  summary: string;
  at_risk_tenants: { name: string; reason: string; risk_level: 'high' | 'medium' | 'low' }[];
  collection_rate: string;
}

interface CashFlow {
  projected_monthly_income: number;
  current_collection_rate: number;
  trend: 'improving' | 'stable' | 'declining';
  forecast_summary: string;
}

interface Anomaly {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface FinancialInsights {
  payment_behavior: PaymentBehavior;
  cash_flow: CashFlow;
  anomalies: Anomaly[];
  recommendations: string[];
}

interface RawStats {
  totalActiveLeases: number;
  totalActiveTenants: number;
  totalMonthlyRent: number;
  totalInvoices: number;
  totalPaidInvoices: number;
  totalOverdueInvoices: number;
  totalOverdueAmount: number;
  totalCollected: number;
  totalPayments: number;
}

export function FinancialIntelligence() {
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [rawStats, setRawStats] = useState<RawStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { formatCurrency } = useSettings();

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI features.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-financial-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        if (response.status === 429) { toast.error('Rate limit exceeded. Try again later.'); return; }
        if (response.status === 402) { toast.error('AI credits depleted.'); return; }
        throw new Error('Failed to generate insights');
      }

      const result = await response.json();
      setInsights(result.insights);
      setRawStats(result.raw_stats);
      toast.success('Financial analysis complete!');
    } catch (error) {
      console.error('Financial insights error:', error);
      toast.error('Failed to generate financial insights.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case 'medium': return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
      default: return <CheckCircle className="h-3.5 w-3.5 text-info" />;
    }
  };

  if (!insights) {
    return (
      <Card className="border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-foreground">Financial Intelligence</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              AI-powered analysis of payment patterns, cash flow forecasting, and anomaly detection across your portfolio.
            </p>
          </div>
          <Button onClick={handleAnalyze} disabled={isLoading} className="gap-2 mt-1">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isLoading ? 'Analyzing...' : 'Run Financial Analysis'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Financial Intelligence</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleAnalyze} disabled={isLoading} className="gap-1.5 text-xs h-8">
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5">
          {/* Cash Flow Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Projected Monthly
              </div>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(insights.cash_flow.projected_monthly_income)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <BarChart3 className="h-3.5 w-3.5" />
                Collection Rate
              </div>
              <p className="text-lg font-bold text-foreground">
                {insights.cash_flow.current_collection_rate}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                {getTrendIcon(insights.cash_flow.trend)}
                Cash Flow Trend
              </div>
              <p className={cn(
                "text-lg font-bold capitalize",
                insights.cash_flow.trend === 'improving' && 'text-success',
                insights.cash_flow.trend === 'declining' && 'text-destructive',
                insights.cash_flow.trend === 'stable' && 'text-foreground'
              )}>
                {insights.cash_flow.trend}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{insights.cash_flow.forecast_summary}</p>

          {/* Payment Behavior */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Payment Behavior</h4>
              <Badge variant="outline" className="text-xs ml-auto">
                Collection: {insights.payment_behavior.collection_rate}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{insights.payment_behavior.summary}</p>
            
            {insights.payment_behavior.at_risk_tenants.length > 0 && (
              <div className="space-y-1.5">
                {insights.payment_behavior.at_risk_tenants.map((tenant, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border bg-background">
                    <Badge className={cn('text-[10px] px-1.5 py-0', getRiskColor(tenant.risk_level))}>
                      {tenant.risk_level}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{tenant.name}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">{tenant.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anomalies */}
          {insights.anomalies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h4 className="text-sm font-semibold text-foreground">Anomalies Detected</h4>
              </div>
              <div className="space-y-1.5">
                {insights.anomalies.map((anomaly, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md border border-border bg-background">
                    {getSeverityIcon(anomaly.severity)}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground">{anomaly.type}</span>
                      <p className="text-xs text-muted-foreground">{anomaly.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Recommendations</h4>
              </div>
              <ul className="space-y-1">
                {insights.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary font-bold shrink-0">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
