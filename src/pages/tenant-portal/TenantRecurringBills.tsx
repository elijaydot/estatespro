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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { MetricCard } from '@/components/shared/MetricCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
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
      <PageHeader eyebrow="Amenity Billing" title="Recurring Bills" description="Review recurring utility, service, and amenity charges." />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Active Bills" value={recurringBills.length} subtitle="Current recurring charges" icon={RefreshCw} accent="primary" />
        <MetricCard title="Monthly Total" value={formatCurrency(monthlyTotal)} subtitle="Monthly schedules only" icon={Calendar} iconColor="bg-info/10 text-info" accent="info" />
        <MetricCard title="Effective Monthly" value={formatCurrency(effectiveMonthlyTotal)} subtitle="Including quarterly and yearly" icon={RefreshCw} iconColor="bg-success/10 text-success" accent="success" />
      </div>

      {/* Bills List */}
      {recurringBills.length === 0 ? (
        <Card><EmptyState icon={Building} title="No recurring bills" description="Your property manager has not set up recurring charges for this property." /></Card>
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
                    <StatusPill className="capitalize">
                      {bill.frequency}
                    </StatusPill>
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
