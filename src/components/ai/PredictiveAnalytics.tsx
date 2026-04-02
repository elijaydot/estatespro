import { useState } from 'react';
import { Brain, Loader2, TrendingUp, TrendingDown, Minus, Wrench, RefreshCw, DollarSign, Home, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

export function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Please log in.'); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-predictive-analytics`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({}),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error('Rate limit exceeded.'); return; }
        if (resp.status === 402) { toast.error('AI credits depleted.'); return; }
        throw new Error('Request failed');
      }

      const data = await resp.json();
      setPredictions(data.predictions);
    } catch { toast.error('Failed to generate predictions.'); }
    finally { setIsLoading(false); }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving' || trend === 'increasing') return <TrendingUp className="h-4 w-4 text-chart-2" />;
    if (trend === 'declining' || trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getLikelihoodColor = (l: string) => {
    if (l === 'high') return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
    if (l === 'medium') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  if (!predictions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Predictive Analytics
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto mb-4 text-primary/30" />
          <p className="text-sm text-muted-foreground mb-4">
            AI-powered forecasting for occupancy, maintenance costs, lease renewals, and revenue.
          </p>
          <Button onClick={handleAnalyze} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {isLoading ? 'Analyzing Portfolio...' : 'Generate Predictions'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Predictive Analytics
            <Badge variant="secondary" className="text-xs">AI</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={isLoading} className="gap-1.5">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Occupancy Forecast */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Home className="h-4 w-4 text-primary" />
            Occupancy Forecast
            {getTrendIcon(predictions.occupancy_forecast.trend)}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-bold">{predictions.occupancy_forecast.current_rate}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground">30-Day</p>
              <p className="text-lg font-bold">{predictions.occupancy_forecast.predicted_30_days}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground">90-Day</p>
              <p className="text-lg font-bold">{predictions.occupancy_forecast.predicted_90_days}</p>
            </div>
          </div>
          {predictions.occupancy_forecast.factors?.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
              {predictions.occupancy_forecast.factors.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          )}
        </div>

        {/* Maintenance Predictions */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-warning" />
            Maintenance Cost Predictions
            {getTrendIcon(predictions.maintenance_predictions.cost_trend)}
          </h4>
          <p className="text-sm">Predicted Monthly: <span className="font-bold">{predictions.maintenance_predictions.predicted_monthly_cost}</span></p>
          {predictions.maintenance_predictions.high_risk_areas?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {predictions.maintenance_predictions.high_risk_areas.map((a, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-warning/5">{a}</Badge>
              ))}
            </div>
          )}
          {predictions.maintenance_predictions.recommendations?.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
              {predictions.maintenance_predictions.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          )}
        </div>

        {/* Lease Renewal Scoring */}
        {predictions.lease_renewal_scoring?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <RefreshCw className="h-4 w-4 text-chart-4" />
              Lease Renewal Likelihood
            </h4>
            <div className="space-y-2">
              {predictions.lease_renewal_scoring.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">Ends: {s.lease_end}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', getLikelihoodColor(s.renewal_likelihood))}>{s.renewal_likelihood}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Projections */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-chart-2" />
            Revenue Projections
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="text-sm font-bold">{predictions.revenue_projections.projected_monthly}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground">Quarterly</p>
              <p className="text-sm font-bold">{predictions.revenue_projections.projected_quarterly}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground">Annual</p>
              <p className="text-sm font-bold">{predictions.revenue_projections.projected_annual}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Growth Rate: <span className="font-medium text-foreground">{predictions.revenue_projections.growth_rate}</span></p>
          {predictions.revenue_projections.risks?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Risks</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {predictions.revenue_projections.risks.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}
          {predictions.revenue_projections.opportunities?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-chart-2 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Opportunities</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {predictions.revenue_projections.opportunities.map((o, i) => <li key={i}>• {o}</li>)}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
