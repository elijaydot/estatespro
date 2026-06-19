import { Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/contexts/useSettings';
import { differenceInDays } from 'date-fns';

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  description: string | null;
  tenants: { name: string | null } | null;
  units: { unit_number: string | null } | null;
  properties: { name: string | null } | null;
};

export function RentExpiryWidget() {
  const { formatCurrency } = useSettings();

  const { data: dueInvoices = [], isLoading } = useQuery({
    queryKey: ['rent-expiry-notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Get pending/partial invoices due within 30 days or overdue
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, amount, paid_amount, due_date, status, description,
          tenants:tenant_id(name),
          units:unit_id(unit_number),
          properties:property_id(name)
        `)
        .in('status', ['pending', 'partial'])
        .lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(8);

      if (error) throw error;
      return ((data || []) as InvoiceRow[]).map((inv) => ({
        ...inv,
        daysUntilDue: differenceInDays(new Date(inv.due_date), now),
        balance: inv.amount - inv.paid_amount,
      }));
    },
  });

  if (isLoading) {
    return <Skeleton className="h-[300px] rounded-xl" />;
  }

  const overdueCount = dueInvoices.filter(i => i.daysUntilDue < 0).length;
  const dueSoonCount = dueInvoices.filter(i => i.daysUntilDue >= 0 && i.daysUntilDue <= 7).length;

  return (
    <Card className="card-shadow-md animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" />
            Rent Payment Alerts
          </CardTitle>
          <div className="flex gap-2">
            {overdueCount > 0 && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                {overdueCount} overdue
              </Badge>
            )}
            {dueSoonCount > 0 && (
              <Badge className="bg-warning/10 text-warning border-warning/20">
                {dueSoonCount} due soon
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dueInvoices.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 text-success/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No rent payments due soon</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dueInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg ${inv.daysUntilDue < 0 ? 'bg-destructive/10' : inv.daysUntilDue <= 7 ? 'bg-warning/10' : 'bg-info/10'}`}>
                    {inv.daysUntilDue < 0 ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {inv.tenants?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.units?.unit_number || 'N/A'} • {inv.properties?.name || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatCurrency(inv.balance)}</p>
                  <Badge className={
                    inv.daysUntilDue < 0
                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                      : inv.daysUntilDue <= 7
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-info/10 text-info border-info/20'
                  }>
                    {inv.daysUntilDue < 0
                      ? `${Math.abs(inv.daysUntilDue)}d overdue`
                      : inv.daysUntilDue === 0
                        ? 'Due today'
                        : `${inv.daysUntilDue}d left`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
