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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

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

  // Fetch recurring bills for this tenant
  const { data: recurringBills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['tenant_recurring_bills', portalData?.tenant?.id, portalData?.property?.user_id],
    queryFn: async () => {
      if (!portalData?.tenant || !portalData?.property) return [];

      // Get bills that apply to this tenant specifically OR to all tenants at this property
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('user_id', portalData.property.user_id)
        .eq('is_active', true)
        .or(`tenant_id.eq.${portalData.tenant.id},tenant_id.is.null`)
        .or(`property_id.eq.${portalData.tenant.property_id},property_id.is.null`);

      if (error) throw error;

      // Filter to only include bills that match property or are global
      return (data || []).filter((bill: any) => {
        // If bill has specific tenant, must match
        if (bill.tenant_id && bill.tenant_id !== portalData.tenant.id) return false;
        // If bill has specific property, must match
        if (bill.property_id && bill.property_id !== portalData.tenant.property_id) return false;
        return true;
      });
    },
    enabled: !!portalData?.tenant && !!portalData?.property,
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

  // Group bills by frequency
  const monthlyBills = recurringBills.filter((b: any) => b.frequency === 'monthly');
  const quarterlyBills = recurringBills.filter((b: any) => b.frequency === 'quarterly');
  const yearlyBills = recurringBills.filter((b: any) => b.frequency === 'yearly');

  // Calculate totals
  const monthlyTotal = monthlyBills.reduce((sum: number, b: any) => sum + b.amount, 0);
  const quarterlyMonthly = quarterlyBills.reduce((sum: number, b: any) => sum + b.amount / 3, 0);
  const yearlyMonthly = yearlyBills.reduce((sum: number, b: any) => sum + b.amount / 12, 0);
  const effectiveMonthlyTotal = monthlyTotal + quarterlyMonthly + yearlyMonthly;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recurring Bills</h1>
        <p className="text-muted-foreground">View your recurring amenity bills and charges</p>
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
            <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Recurring Bills</h3>
            <p className="text-muted-foreground mt-2">
              You don't have any recurring bills at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringBills.map((bill: any) => {
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
                    {monthlyBills.map((bill: any) => (
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
                    {quarterlyBills.map((bill: any) => (
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
                    {yearlyBills.map((bill: any) => (
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
