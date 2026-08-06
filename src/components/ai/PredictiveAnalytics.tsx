import { useEffect, useState } from 'react';
import { AlertTriangle, Brain, CheckCircle, Loader2, RefreshCw, TrendingUp, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSettings } from '@/contexts/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { formatPredictiveCurrency, parseMetricNumber } from '@/lib/dashboardPresentation';
import { cn } from '@/lib/utils';
import { useActiveCompany } from '@/contexts/useActiveCompany';

interface Predictions {
  occupancy_forecast: {
    current_rate: string;
    predicted_30_days: string;
    predicted_90_days: string;
    trend: string;
    factors: string[];
  };
  maintenance_predictions: {
    predicted_monthly_cost: string;
    high_risk_areas: string[];
    cost_trend: string;
    recommendations: string[];
  };
  lease_renewal_scoring: Array<{
    tenant_name: string;
    lease_end: string;
    renewal_likelihood: string;
    reasoning: string;
  }>;
  revenue_projections: {
    projected_monthly: string;
    projected_quarterly: string;
    projected_annual: string;
    growth_rate: string;
    risks: string[];
    opportunities: string[];
  };
}

const likelihoodStyles: Record<string, string> = {
  high: 'border-success/30 bg-success/10 text-success',
  medium: 'border-warning/30 bg-warning/10 text-warning',
  low: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export function PredictiveAnalytics({ embedded = false }: { embedded?: boolean }) {
  const { activeCompanyId } = useActiveCompany();
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { formatCurrency } = useSettings();

  useEffect(() => {
    setPredictions(null);
  }, [activeCompanyId]);

  const handleAnalyze = async () => {
    if (!activeCompanyId) { toast.error('Select a company before using AI features.'); return; }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Please log in.'); return; }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-predictive-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ companyId: activeCompanyId }),
      });
      if (!response.ok) {
        if (response.status === 429) { toast.error('Rate limit exceeded.'); return; }
        if (response.status === 402) { toast.error('AI credits depleted.'); return; }
        throw new Error('Request failed');
      }
      const data = await response.json();
      setPredictions(data.predictions);
    } catch {
      toast.error('Failed to generate predictions.');
    } finally {
      setIsLoading(false);
    }
  };

  const emptyContent = (
    <div className="flex min-h-36 flex-col items-start justify-center gap-3 rounded-xl bg-muted/25 p-5">
      <p className="text-sm text-muted-foreground">Forecast occupancy, maintenance costs, renewals, and portfolio revenue.</p>
      <Button onClick={handleAnalyze} disabled={isLoading} className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        {isLoading ? 'Analyzing portfolio...' : 'Generate predictions'}
      </Button>
    </div>
  );

  if (!predictions) return embedded ? emptyContent : <Card><CardContent className="p-5">{emptyContent}</CardContent></Card>;

  const occupancyData = [
    { period: 'Current', rate: parseMetricNumber(predictions.occupancy_forecast.current_rate) },
    { period: '30 days', rate: parseMetricNumber(predictions.occupancy_forecast.predicted_30_days) },
    { period: '90 days', rate: parseMetricNumber(predictions.occupancy_forecast.predicted_90_days) },
  ];
  const monthlyRevenue = parseMetricNumber(predictions.revenue_projections.projected_monthly);
  const quarterlyRevenue = parseMetricNumber(predictions.revenue_projections.projected_quarterly);
  const annualRevenue = parseMetricNumber(predictions.revenue_projections.projected_annual);
  const revenueData = [
    { period: 'Monthly', amount: monthlyRevenue },
    { period: 'Quarter avg.', amount: quarterlyRevenue / 3 },
    { period: 'Annual avg.', amount: annualRevenue / 12 },
  ];
  const maintenanceCost = parseMetricNumber(predictions.maintenance_predictions.predicted_monthly_cost);
  const maintenanceShare = monthlyRevenue > 0 ? Math.min(100, (maintenanceCost / monthlyRevenue) * 100) : 0;

  const content = (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleAnalyze} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Occupancy forecast</p>
            <Badge variant="outline" className="capitalize">{predictions.occupancy_forecast.trend}</Badge>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyData} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Wrench className="h-4 w-4" />Maintenance cost</p>
            <span className="text-sm font-semibold">{formatPredictiveCurrency(predictions.maintenance_predictions.predicted_monthly_cost, formatCurrency)}</span>
          </div>
          <Progress value={maintenanceShare} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">{maintenanceShare.toFixed(1)}% of projected monthly revenue</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {predictions.maintenance_predictions.high_risk_areas.slice(0, 4).map((area) => <Badge key={area} variant="outline">{area}</Badge>)}
          </div>
        </section>
      </div>
      {predictions.lease_renewal_scoring.length > 0 ? (
        <section>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Renewal likelihood</p>
          <div className="divide-y divide-border/60">
            {predictions.lease_renewal_scoring.slice(0, 4).map((score) => (
              <div key={`${score.tenant_name}-${score.lease_end}`} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{score.tenant_name}</p><p className="text-xs text-muted-foreground">Lease ends {score.lease_end}</p></div>
                <Badge variant="outline" className={cn('shrink-0 capitalize', likelihoodStyles[score.renewal_likelihood.toLowerCase()] || likelihoodStyles.low)}>{score.renewal_likelihood}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Revenue forecast</p>
            <Badge className="gap-1"><TrendingUp className="h-3 w-3" />{predictions.revenue_projections.growth_rate}</Badge>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <span>{formatPredictiveCurrency(predictions.revenue_projections.projected_monthly, formatCurrency)}</span>
            <span>{formatPredictiveCurrency(predictions.revenue_projections.projected_quarterly, formatCurrency)}</span>
            <span>{formatPredictiveCurrency(predictions.revenue_projections.projected_annual, formatCurrency)}</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div><p className="mb-2 flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Risks</p>{predictions.revenue_projections.risks.slice(0, 3).map((risk) => <p key={risk} className="mb-1 text-xs text-muted-foreground">{risk}</p>)}</div>
          <div><p className="mb-2 flex items-center gap-1 text-xs font-medium text-success"><CheckCircle className="h-3.5 w-3.5" />Opportunities</p>{predictions.revenue_projections.opportunities.slice(0, 3).map((opportunity) => <p key={opportunity} className="mb-1 text-xs text-muted-foreground">{opportunity}</p>)}</div>
        </div>
      </section>
    </div>
  );

  return embedded ? content : <Card><CardContent className="p-5">{content}</CardContent></Card>;
}