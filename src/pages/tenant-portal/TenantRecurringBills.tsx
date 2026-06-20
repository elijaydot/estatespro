import { useQuery } from '@tanstack/react-query';
import {
  Droplets,
  Shield,
  Zap,
  Wifi,
  Trash,
  RefreshCw,
  Loader2,
  AlertCircle,
  Calendar,
  Building,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { useSettings } from '@/contexts/useSettings';
import { supabase } from '@/integrations/supabase/client';

type RecurringBillRow = {
  id: string;
  name: string;
  bill_type: string;
  amount: number;
  frequency: string;
  description: string | null;
};

const getBillIcon = (type: string) => {
  switch (type) {
    case 'water':
      return Droplets;
    case 'security':
      return Shield;
    case 'electricity':
      return Zap;
    case 'internet':
      return Wifi;
    case 'garbage':
      return Trash;
    default:
      return RefreshCw;
  }
};

const getFrequencyLabel = (frequency: string) => {
  switch (frequency) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Every 3 months';
    case 'yearly':
      return 'Annually';
    default:
      return frequency;
  }
};

export default function TenantRecurringBills() {
  const { data: portalData, isLoading: portalLoading } = useTenantPortalData();
  const { formatCurrency } = useSettings();

  // Fetch recurring bills - RLS handles visibility automatically
  const { data: recurringBills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['tenant_recurring_bills', portalData?.tenant?.id],
    queryFn: async () => {
      if (!portalData?.tenant) return [];

      // RLS policy "Tenants can view recurring bills for their property" handles filtering
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!portalData?.tenant,
  });

  const isLoading = portalLoading || billsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!portalData || !portalData.tenant) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Account Not Linked</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Your account hasn't been linked to a tenant profile yet. 
            Please contact your property manager for assistance.
          </p>
        </div>
      </div>
    );
  }

  const billRows = recurringBills as RecurringBillRow[];

  // Group bills by frequency
  const monthlyBills = billRows.filter((b) => b.frequency === 'monthly');
  const quarterlyBills = billRows.filter((b) => b.frequency === 'quarterly');
  const yearlyBills = billRows.filter((b) => b.frequency === 'yearly');

  // Calculate totals
  const monthlyTotal = monthlyBills.reduce((sum, b) => sum + b.amount, 0);
  const quarterlyMonthly = quarterlyBills.reduce((sum, b) => sum + b.amount / 3, 0);
  const yearlyMonthly = yearlyBills.reduce((sum, b) => sum + b.amount / 12, 0);
  const effectiveMonthlyTotal = monthlyTotal + quarterlyMonthly + yearlyMonthly;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-info/15 via-background to-success/10 p-5 md:p-6 card-shadow-md">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-info/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-success/20 blur-3xl" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Amenity Billing</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">Recurring Bills</h1>
            <p className="text-muted-foreground">View your recurring amenity bills and charges</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 border-info/30 bg-info/5 text-info font-display">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Predictable Monthly View
          </Badge>
        </div>
      </section>

      <div className="rounded-xl border border-border/70 bg-card/85 p-3">
        <p className="text-sm text-foreground">Use effective monthly totals to budget quarterly and annual charges ahead of time.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bills</p>
                <p className="text-2xl font-bold text-foreground">{recurringBills.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Total</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyTotal)}</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Calendar className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Effective Monthly</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(effectiveMonthlyTotal)}</p>
                <p className="text-xs text-muted-foreground">Including quarterly & yearly</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <RefreshCw className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills List */}
      {recurringBills.length === 0 ? (
        <Card className="card-shadow-md">
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Recurring Bills</h3>
            <p className="text-muted-foreground mt-2">
              Your property manager hasn't set up any recurring bills for your property yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {billRows.map((bill) => {
            const IconComponent = getBillIcon(bill.bill_type);
            return (
              <Card key={bill.id} className="card-shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-muted">
                      <IconComponent className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{bill.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{bill.bill_type}</p>
                      {bill.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {bill.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(bill.amount)}</p>
                      <p className="text-xs text-muted-foreground">{getFrequencyLabel(bill.frequency)}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {bill.frequency}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bill Details by Frequency */}
      {(quarterlyBills.length > 0 || yearlyBills.length > 0) && (
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Bill Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyBills.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Monthly Bills</h4>
                  <div className="space-y-2">
                    {monthlyBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span>{bill.name}</span>
                        <span className="font-semibold">{formatCurrency(bill.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {quarterlyBills.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Quarterly Bills</h4>
                  <div className="space-y-2">
                    {quarterlyBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span>{bill.name}</span>
                        <span className="font-semibold">{formatCurrency(bill.amount)} / quarter</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {yearlyBills.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Yearly Bills</h4>
                  <div className="space-y-2">
                    {yearlyBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span>{bill.name}</span>
                        <span className="font-semibold">{formatCurrency(bill.amount)} / year</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
