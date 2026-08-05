import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, CheckCircle2, Clock3, FileSpreadsheet, Loader2, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { useSettings } from '@/contexts/useSettings';
import { format } from 'date-fns';
import { EmptyState } from '@/components/shared/EmptyState';
import { MetricCard } from '@/components/shared/MetricCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';

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
      <div className="space-y-6 animate-fade-in">
        <PageHeader eyebrow="Lease Transition" title="Exit Status" description="Track your move-out and deposit refund process." />
        <EmptyState icon={AlertTriangle} title="Tenant profile not linked" description="Contact your property manager to link your account." />
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
        <PageHeader eyebrow="Lease Transition" title="Exit Status" description="Track your move-out and deposit refund process." />
        <Card><EmptyState icon={Clock3} title="No Active Exit Process" description="Contact your property manager when you are ready to begin your move-out process." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader eyebrow="Exit Timeline" title="Move-out Progress" description={`Requested on ${format(new Date(latestExit.created_at), 'MMM d, yyyy')} · Reason: ${toTitle(latestExit.exit_reason)}`} action={<StatusPill variant="info">{toTitle(latestExit.status)}</StatusPill>} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Deposit Amount" value={formatCurrency(latestExit.deposit_amount)} icon={Wallet} />
        <MetricCard title="Deductions" value={formatCurrency(latestExit.deduction_amount)} icon={FileSpreadsheet} accent="danger" />
        <MetricCard title="Expected Refund" value={formatCurrency(latestExit.refund_amount)} icon={CheckCircle2} accent="success" />
      </div>

      <Card className="border-border/70 card-shadow-md overflow-hidden">
        <CardContent className="pt-6">

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
                  {isCurrent && <StatusPill variant="info">Current</StatusPill>}
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
            <StatusPill>{toTitle(latestExit.status)}</StatusPill>
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
