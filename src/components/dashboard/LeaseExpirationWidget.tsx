import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, RefreshCw, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLeases, useUpdateLease } from '@/hooks/useLeases';
import { useRenewLease, calculateRenewalDates } from '@/hooks/useLeaseRenewals';
import { useSettings } from '@/contexts/SettingsContext';
import { format, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaseWithDetails {
  id: string;
  lease_number: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  tenants?: { id: string; name: string; email: string; phone: string } | null;
  units?: { id: string; unit_number: string } | null;
  properties?: { id: string; name: string } | null;
}

export function LeaseExpirationWidget() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { data: leases = [], isLoading } = useLeases();
  const renewLease = useRenewLease();
  const updateLease = useUpdateLease();

  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);
  const [renewalData, setRenewalData] = useState({
    startDate: '',
    endDate: '',
    monthlyRent: 0,
    securityDeposit: 0,
  });

  // Get expiring leases (within 60 days)
  const expiringLeases = (leases as any[])
    .filter((lease) => {
      if (lease.status !== 'active') return false;
      const daysUntilExpiry = differenceInDays(new Date(lease.end_date), new Date());
      return daysUntilExpiry <= 60 && daysUntilExpiry > -30;
    })
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
    .slice(0, 5);

  const handleRenewClick = (lease: LeaseWithDetails) => {
    const { newStartDate, newEndDate } = calculateRenewalDates(lease.end_date, 12);
    setSelectedLease(lease);
    setRenewalData({
      startDate: newStartDate,
      endDate: newEndDate,
      monthlyRent: lease.monthly_rent,
      securityDeposit: lease.security_deposit,
    });
    setRenewDialogOpen(true);
  };

  const handleRenew = async () => {
    if (!selectedLease) return;

    await renewLease.mutateAsync({
      originalLeaseId: selectedLease.id,
      newStartDate: renewalData.startDate,
      newEndDate: renewalData.endDate,
      newMonthlyRent: renewalData.monthlyRent,
      newSecurityDeposit: renewalData.securityDeposit,
    });

    setRenewDialogOpen(false);
    setSelectedLease(null);
  };

  const getUrgencyBadge = (daysLeft: number) => {
    if (daysLeft <= 0) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <AlertTriangle className="h-3 w-3" /> Expired
        </Badge>
      );
    }
    if (daysLeft <= 14) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          {daysLeft} days
        </Badge>
      );
    }
    if (daysLeft <= 30) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          {daysLeft} days
        </Badge>
      );
    }
    return (
      <Badge className="bg-info/10 text-info border-info/20">
        {daysLeft} days
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="card-shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-shadow-md animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-warning" />
              Lease Expirations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary gap-1"
              onClick={() => navigate('/leases?tab=expired')}
            >
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expiringLeases.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-10 w-10 text-success/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No leases expiring soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringLeases.map((lease) => {
                const daysLeft = differenceInDays(new Date(lease.end_date), new Date());
                const tenant = lease.tenants;
                const unit = lease.units;
                const property = lease.properties;

                return (
                  <div
                    key={lease.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-card">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {tenant?.name || 'Unknown Tenant'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {unit?.unit_number || 'N/A'} • {property?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {format(new Date(lease.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getUrgencyBadge(daysLeft)}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleRenewClick(lease)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Renew
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renewal Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Renew Lease</DialogTitle>
            <DialogDescription>
              Create a new lease for {selectedLease?.tenants?.name} based on the expiring lease.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Current Lease:</strong> {selectedLease?.lease_number}</p>
              <p><strong>Unit:</strong> {selectedLease?.units?.unit_number} • {selectedLease?.properties?.name}</p>
              <p><strong>Expires:</strong> {selectedLease && format(new Date(selectedLease.end_date), 'MMM d, yyyy')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">New Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={renewalData.startDate}
                  onChange={(e) => setRenewalData({ ...renewalData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">New End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={renewalData.endDate}
                  onChange={(e) => setRenewalData({ ...renewalData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="monthlyRent">Monthly Rent</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  value={renewalData.monthlyRent}
                  onChange={(e) => setRenewalData({ ...renewalData, monthlyRent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  value={renewalData.securityDeposit}
                  onChange={(e) => setRenewalData({ ...renewalData, securityDeposit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenew} disabled={renewLease.isPending}>
              {renewLease.isPending ? 'Creating...' : 'Create Renewed Lease'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
