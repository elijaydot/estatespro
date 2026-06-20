import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  Wrench, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Home,
  CreditCard,
  Loader2,
  Receipt,
  Sparkles,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { useSettings } from '@/contexts/useSettings';
import { format, differenceInDays } from 'date-fns';

type RecurringBillRow = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  created_at: string;
  invoices?: {
    description?: string | null;
  } | null;
};

type MaintenanceRequestRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export default function TenantDashboard() {
  const { data: portalData, isLoading } = useTenantPortalData();
  const { formatCurrency } = useSettings();

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

  const { tenant, property, unit, currentLease, nextPayment, stats, recurringBills = [], totalRecurringAmount = 0 } = portalData;

  const leaseProgress = currentLease
    ? (() => {
        const totalDays = differenceInDays(new Date(currentLease.end_date), new Date(currentLease.start_date));
        const daysRemaining = Math.max(0, differenceInDays(new Date(currentLease.end_date), new Date()));
        return ((totalDays - daysRemaining) / totalDays) * 100;
      })()
    : 0;

  const daysRemaining = currentLease
    ? Math.max(0, differenceInDays(new Date(currentLease.end_date), new Date()))
    : 0;

  const daysUntilDue = nextPayment
    ? differenceInDays(new Date(nextPayment.due_date), new Date())
    : 0;

  const recurringBillRows = recurringBills as RecurringBillRow[];
  const paymentRows = portalData.payments as PaymentRow[];
  const maintenanceRows = portalData.maintenanceRequests as MaintenanceRequestRow[];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-primary/10 via-background to-success/10 p-5 md:p-7 card-shadow-md">
        <div className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-success/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tenant Overview</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">Welcome back, {tenant.name.split(' ')[0]}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1.5">
              <Home className="h-4 w-4" />
              {unit ? `Unit ${unit.unit_number}` : 'No unit assigned'} • {property?.name || 'No property'}
            </p>
          </div>
          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">Monthly due</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(stats.totalMonthlyDue)}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">Open requests</p>
              <p className="mt-1 text-lg font-bold text-foreground">{stats.openMaintenance}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`mt-1 text-lg font-bold ${stats.balance > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(stats.balance)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/tenant/payments">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-success/10 w-fit mx-auto mb-3">
                <Wallet className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium">Pay Rent</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tenant/maintenance">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-warning/10 w-fit mx-auto mb-3">
                <Wrench className="h-6 w-6 text-warning" />
              </div>
              <p className="font-medium">Maintenance</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tenant/lease">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-info/10 w-fit mx-auto mb-3">
                <FileText className="h-6 w-6 text-info" />
              </div>
              <p className="font-medium">View Lease</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tenant/messages">
          <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Contact</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Action Rail</p>
          <p className="text-sm font-medium text-foreground">Stay ahead: pay due invoices, track maintenance, and keep lease docs current.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 border-primary/30 bg-primary/5 text-primary font-display"><Sparkles className="h-3.5 w-3.5 mr-1" />Priorities</Badge>
          <Link to="/tenant/notifications"><Button variant="outline" size="sm" className="rounded-full">Updates</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Summary with Recurring Bills */}
          <Card className="card-shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Monthly Payment Summary</CardTitle>
              <Link to="/tenant/payments">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {/* Breakdown */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Monthly Rent</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(stats.monthlyRent)}</span>
                </div>
                {recurringBillRows.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{bill.name}</span>
                      <Badge variant="secondary" className="text-xs">{bill.frequency}</Badge>
                    </div>
                    <span className="font-semibold">{formatCurrency(bill.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="font-bold text-primary">Total Monthly Due</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(stats.totalMonthlyDue)}</span>
                </div>
              </div>

              {/* Next Invoice Payment */}
              {nextPayment ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5">
                  <div>
                    <p className="text-sm font-medium">Next Invoice Due</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(nextPayment.due_date), 'MMM d, yyyy')} — {formatCurrency(nextPayment.amount - nextPayment.paid_amount)} remaining
                    </p>
                  </div>
                  <Link to="/tenant/payments">
                    <Button size="sm" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pay Now
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm text-success font-medium">
                    No pending payments - you're all caught up!
                  </span>
                </div>
              )}

              {stats.balance > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    Outstanding balance: {formatCurrency(stats.balance)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {portalData.payments.length === 0 && portalData.maintenanceRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {paymentRows.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-secondary">
                        <DollarSign className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Payment received</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {formatCurrency(payment.amount)} - {payment.invoices?.description || 'Payment'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(payment.created_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                  {maintenanceRows.slice(0, 2).map((request) => (
                    <div key={request.id} className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Wrench className={`h-4 w-4 ${request.status === 'completed' ? 'text-success' : 'text-warning'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          Maintenance {request.status === 'completed' ? 'completed' : 'submitted'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{request.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(request.created_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Lease Status */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Lease Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentLease ? (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Lease Progress</span>
                      <span className="font-medium">{Math.round(leaseProgress)}%</span>
                    </div>
                    <Progress value={leaseProgress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-medium">{format(new Date(currentLease.end_date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Days Remaining</span>
                    <Badge variant="secondary">{daysRemaining} days</Badge>
                  </div>
                  <Link to="/tenant/lease">
                    <Button variant="outline" className="w-full mt-2">
                      View Lease Details
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active lease</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Summary */}
          <Card className="card-shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Maintenance</CardTitle>
              <Link to="/tenant/maintenance">
                <Button variant="ghost" size="sm" className="gap-1">
                  View <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-warning/10 text-center">
                  <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
                  <p className="text-2xl font-bold">{stats.openMaintenance}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="p-4 rounded-lg bg-success/10 text-center">
                  <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
                  <p className="text-2xl font-bold">{stats.completedMaintenance}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unit Info */}
          {unit && (
            <Card className="card-shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Your Unit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unit</span>
                    <span className="font-medium">{unit.unit_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bedrooms</span>
                    <span className="font-medium">{unit.bedrooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bathrooms</span>
                    <span className="font-medium">{unit.bathrooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium">{unit.sqft} sq ft</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
