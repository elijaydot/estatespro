import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle, Lightbulb, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Cell, Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/useSettings';
import { useRevenueData } from '@/hooks/useDashboardStats';
import { useInvoices } from '@/hooks/useInvoices';
import { parseMetricNumber } from '@/lib/dashboardPresentation';
import { useActiveCompany } from '@/contexts/useActiveCompany';

interface FinancialInsights {
  payment_behavior: {
    summary: string;
    at_risk_tenants: { name: string; reason: string; risk_level: 'high' | 'medium' | 'low' }[];
    collection_rate: string;
  };
  cash_flow: {
    projected_monthly_income: number;
    current_collection_rate: number;
    trend: 'improving' | 'stable' | 'declining';
    forecast_summary: string;
  };
  anomalies: { type: string; description: string; severity: 'high' | 'medium' | 'low' }[];
  recommendations: string[];
}

type InvoiceWithTenant = {
  amount: number;
  paid_amount: number;
  status: string;
  tenants?: { name?: string | null } | null;
};

const RISK_COLORS = {
  high: 'hsl(var(--destructive))',
  medium: 'hsl(var(--warning))',
  low: 'hsl(var(--success))',
};

export function FinancialIntelligence({ embedded = false }: { embedded?: boolean }) {
  const { activeCompanyId } = useActiveCompany();
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { formatCurrency } = useSettings();
  const { data: revenueData = [] } = useRevenueData();
  const { data: invoiceData = [] } = useInvoices();

  useEffect(() => {
    setInsights(null);
  }, [activeCompanyId]);

  const handleAnalyze = async () => {
    if (!activeCompanyId) { toast.error('Select a company before using AI features.'); return; }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI features.');
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-financial-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ companyId: activeCompanyId }),
      });
      if (!response.ok) {
        if (response.status === 429) { toast.error('Rate limit exceeded. Try again later.'); return; }
        if (response.status === 402) { toast.error('AI credits depleted.'); return; }
        throw new Error('Failed to generate insights');
      }
      const result = await response.json();
      setInsights(result.insights);
    } catch {
      toast.error('Failed to generate financial insights.');
    } finally {
      setIsLoading(false);
    }
  };

  const emptyContent = (
    <div className="flex min-h-36 flex-col items-start justify-center gap-3 rounded-xl bg-muted/25 p-5">
      <p className="text-sm text-muted-foreground">Analyze collection health, cash flow, tenant risk, and anomalies.</p>
      <Button onClick={handleAnalyze} disabled={isLoading} className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
        {isLoading ? 'Analyzing...' : 'Run financial analysis'}
      </Button>
    </div>
  );

  if (!insights) return embedded ? emptyContent : <Card><CardContent className="p-5">{emptyContent}</CardContent></Card>;

  const collectionRate = Math.max(0, Math.min(100, parseMetricNumber(insights.cash_flow.current_collection_rate)));
  const gaugeColor = collectionRate >= 80 ? 'hsl(var(--success))' : collectionRate >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const riskData = (['high', 'medium', 'low'] as const).map((risk) => ({
    name: risk,
    value: insights.payment_behavior.at_risk_tenants.filter((tenant) => tenant.risk_level === risk).length,
    fill: RISK_COLORS[risk],
  }));
  const overdueByTenant = new Map<string, number>();
  (invoiceData as InvoiceWithTenant[])
    .filter((invoice) => invoice.status === 'pending' || invoice.status === 'partial')
    .forEach((invoice) => {
      const name = invoice.tenants?.name;
      if (name) overdueByTenant.set(name.toLowerCase(), (overdueByTenant.get(name.toLowerCase()) || 0) + Number(invoice.amount) - Number(invoice.paid_amount));
    });
  const trend = insights.cash_flow.trend;
  const trendLabel = trend === 'improving' ? 'Growing' : trend === 'declining' ? 'Declining' : 'Stable';

  const content = (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleAnalyze} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Collection rate</p>
          <div className="relative h-36">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: collectionRate, fill: gaugeColor }]} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" background={{ fill: 'hsl(var(--muted))' }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-bold">{collectionRate}%</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Cash flow trend</p>
            <span className="flex items-center gap-1 text-xs font-medium">
              {trend === 'improving' ? <TrendingUp className="h-4 w-4 text-success" /> : trend === 'declining' ? <TrendingDown className="h-4 w-4 text-destructive" /> : <BarChart3 className="h-4 w-4" />}
              {trendLabel}
            </span>
          </div>
          <div className="h-36">
            {revenueData.some((point) => point.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">No cash flow recorded yet</div>}
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium text-muted-foreground">At-risk tenants</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={riskData} dataKey="value" innerRadius={24} outerRadius={40}>{riskData.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {insights.payment_behavior.at_risk_tenants.slice(0, 2).map((tenant) => (
              <div key={tenant.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium">{tenant.name}</span>
                <span className="shrink-0 text-muted-foreground">{formatCurrency(overdueByTenant.get(tenant.name.toLowerCase()) || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {insights.anomalies.length > 0 ? (
        <div className="space-y-2">
          {insights.anomalies.slice(0, 3).map((anomaly, index) => (
            <div key={`${anomaly.type}-${index}`} className="flex items-center gap-2 border-t border-border/60 py-2 text-sm">
              {anomaly.severity === 'low' ? <CheckCircle className="h-4 w-4 text-success" /> : <AlertTriangle className={`h-4 w-4 ${anomaly.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />}
              <span className="min-w-0 flex-1 truncate">{anomaly.description}</span>
              <Badge variant="outline" className="capitalize">{anomaly.severity}</Badge>
            </div>
          ))}
          {insights.anomalies.length > 3 ? <Button variant="link" size="sm" className="px-0">View all</Button> : null}
        </div>
      ) : null}
      {insights.recommendations.length > 0 ? (
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Lightbulb className="h-4 w-4" />Recommendations</p>
          <ol className="space-y-1.5 text-sm">
            {insights.recommendations.slice(0, 3).map((recommendation, index) => <li key={index} className="truncate"><span className="mr-2 font-semibold text-primary">{index + 1}.</span>{recommendation}</li>)}
          </ol>
        </div>
      ) : null}
    </div>
  );

  return embedded ? content : <Card><CardContent className="p-5">{content}</CardContent></Card>;
}