import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, CheckCircle2, Clock3, FileSpreadsheet, Loader2, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { useSettings } from '@/contexts/useSettings';
import { format } from 'date-fns';

const STATUS_STEPS: Array<{ id: string; label: string }> = [
  { id: 'inspection_pending', label: 'Inspection Pending' },
  { id: 'inspection_complete', label: 'Inspection Complete' },
  { id: 'deposit_decided', label: 'Deposit Decision' },
  { id: 'approved', label: 'Owner Approval' },
  { id: 'completed', label: 'Refund Completed' },
];

const toTitle = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function TenantExitStatus() {
  const { data: portalData, isLoading } = useTenantPortalData();
  const { formatCurrency } = useSettings();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!portalData?.tenant) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-warning" />
        <p className="text-muted-foreground">Tenant profile is not linked yet.</p>
      </div>
    );
  }

  const latestExit = portalData.latestExit as {
    id: string;
    status: string;
    exit_reason: string;
    deposit_amount: number;
    deduction_amount: number;
    refund_amount: number;
    deduction_reason: string | null;
    refund_method: string | null;
    refund_reference: string | null;
    refund_processed_at: string | null;
    portal_access_until: string | null;
    created_at: string;
    inspection_date: string | null;
    landlord_approved_at: string | null;
    completed_at: string | null;
  } | null;

  const stepIndex = latestExit ? STATUS_STEPS.findIndex((s) => s.id === latestExit.status) : -1;

  if (!latestExit) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="border-border/70 card-shadow-md">
          <CardHeader>
            <CardTitle>No Active Exit Process</CardTitle>
            <CardDescription>
              Your lease exit workflow has not been initiated yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">If you are planning to move out, contact your property manager to begin your exit process.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/70 card-shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-background to-info/10 p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Exit Timeline</p>
          <h1 className="text-2xl font-bold mt-1">Move-out Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Requested on {format(new Date(latestExit.created_at), 'MMM d, yyyy')} • Reason: {toTitle(latestExit.exit_reason)}
          </p>
        </div>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/70 p-3 bg-card/80">
              <p className="text-xs text-muted-foreground">Deposit amount</p>
              <p className="text-xl font-bold">{formatCurrency(latestExit.deposit_amount)}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-3 bg-card/80">
              <p className="text-xs text-muted-foreground">Deductions</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(latestExit.deduction_amount)}</p>
            </div>
            <div className="rounded-xl border border-border/70 p-3 bg-card/80">
              <p className="text-xs text-muted-foreground">Expected refund</p>
              <p className="text-xl font-bold text-success">{formatCurrency(latestExit.refund_amount)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {STATUS_STEPS.map((step, index) => {
              const isDone = stepIndex >= index;
              const isCurrent = latestExit.status === step.id;
              return (
                <div key={step.id} className={`rounded-lg border p-3 flex items-center justify-between ${isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border/70 bg-card'}`}>
                  <div className="flex items-center gap-2">
                    {isDone ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock3 className="h-4 w-4 text-muted-foreground" />}
                    <p className="text-sm font-medium">{step.label}</p>
                  </div>
                  {isCurrent && <Badge variant="outline" className="border-primary/30 text-primary">Current</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current status</span>
            <Badge variant="secondary">{toTitle(latestExit.status)}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Inspection date</span>
            <span>{latestExit.inspection_date ? format(new Date(latestExit.inspection_date), 'MMM d, yyyy') : 'Pending'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Approval date</span>
            <span>{latestExit.landlord_approved_at ? format(new Date(latestExit.landlord_approved_at), 'MMM d, yyyy') : 'Pending'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Refund processed</span>
            <span>{latestExit.refund_processed_at ? format(new Date(latestExit.refund_processed_at), 'MMM d, yyyy') : 'Pending'}</span>
          </div>

          {latestExit.deduction_reason && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1">Deduction reason</p>
                <p>{latestExit.deduction_reason}</p>
              </div>
            </>
          )}

          {latestExit.refund_method && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-muted-foreground text-xs">Refund method</p>
                  <p className="font-medium">{toTitle(latestExit.refund_method)}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-muted-foreground text-xs">Reference</p>
                  <p className="font-medium">{latestExit.refund_reference || 'N/A'}</p>
                </div>
              </div>
            </>
          )}

          {latestExit.portal_access_until && (
            <div className="rounded-lg border border-info/20 bg-info/5 p-3 flex items-start gap-2">
              <Calendar className="h-4 w-4 text-info mt-0.5" />
              <p>
                Portal archive access remains available until {format(new Date(latestExit.portal_access_until), 'MMM d, yyyy')}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/tenant/invoices">
          <Button variant="outline" className="w-full gap-2"><FileSpreadsheet className="h-4 w-4" />View Invoices</Button>
        </Link>
        <Link to="/tenant/payments">
          <Button className="w-full gap-2"><Wallet className="h-4 w-4" />Review Payments</Button>
        </Link>
      </div>
    </div>
  );
}
