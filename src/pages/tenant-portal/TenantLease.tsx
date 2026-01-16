import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { 
  FileText, 
  Download,
  Calendar,
  DollarSign,
  Home,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSignature,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useLeases } from '@/hooks/useLeases';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export default function TenantLease() {
  const { profile } = useAuth();
  const { formatCurrency } = useSettings();
  const { data: leases = [], isLoading } = useLeases();
  const [downloading, setDownloading] = useState(false);

  // Find the tenant's active or pending lease
  // In a real app, you'd filter by tenant_id linked to the logged-in user
  const tenantLeases = leases.filter(l => 
    l.status === 'active' || l.status === 'pending_signature'
  );
  
  const activeLease = tenantLeases.find(l => l.status === 'active');
  const pendingLease = tenantLeases.find(l => l.status === 'pending_signature');
  const currentLease = activeLease || pendingLease;

  const handleDownloadPdf = async (leaseId: string) => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lease-pdf?leaseId=${leaseId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to generate PDF');

      const html = await response.text();
      
      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({ title: 'Error', description: 'Failed to generate lease PDF', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Show pending lease requiring signature
  if (pendingLease && !activeLease) {
    const lease = pendingLease as any;
    const property = lease.properties;
    const unit = lease.units;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lease Agreement</h1>
            <p className="text-muted-foreground">Review and sign your lease agreement</p>
          </div>
          <Badge className="bg-warning/10 text-warning border-warning/20 gap-1 text-sm px-3 py-1">
            <AlertCircle className="h-4 w-4" /> Signature Required
          </Badge>
        </div>

        <Card className="card-shadow-md border-warning/20 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <FileSignature className="h-8 w-8 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Lease Pending Your Signature</h3>
                <p className="text-muted-foreground mt-1">
                  Your landlord has sent you lease #{lease.lease_number} for review and signature. 
                  Please review the terms carefully before signing.
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <span><strong>Property:</strong> {property?.name}</span>
                  <span><strong>Unit:</strong> {unit?.unit_number}</span>
                  <span><strong>Rent:</strong> {formatCurrency(lease.monthly_rent)}/month</span>
                  <span><strong>Start:</strong> {format(new Date(lease.start_date), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDownloadPdf(lease.id)} disabled={downloading}>
                  <Download className="h-4 w-4 mr-2" />
                  View PDF
                </Button>
                <Button asChild>
                  <Link to={`/tenant/lease/${lease.id}/sign`}>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Sign Lease
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Show lease preview details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Lease Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lease Number</p>
                  <p className="font-semibold">{lease.lease_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    Pending Signature
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{format(new Date(lease.start_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-semibold">{format(new Date(lease.end_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-semibold text-lg">{formatCurrency(lease.monthly_rent)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Deposit</p>
                  <p className="font-semibold">{formatCurrency(lease.security_deposit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Signature Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                {lease.landlord_signature_url ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Landlord Signature</p>
                  <p className="text-sm text-muted-foreground">
                    {lease.landlord_signature_url 
                      ? `Signed on ${format(new Date(lease.landlord_signed_at), 'MMM d, yyyy')}`
                      : 'Awaiting signature'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Your Signature</p>
                  <p className="text-sm text-muted-foreground">
                    Required to activate lease
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // No lease found
  if (!currentLease) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lease Details</h1>
          <p className="text-muted-foreground">View your lease agreement and documents</p>
        </div>
        <Card className="card-shadow-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Active Lease</h3>
            <p className="text-muted-foreground mt-2">
              You don't have an active lease at the moment. Please contact your property manager for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show active lease details
  const lease = currentLease as any;
  const property = lease.properties;
  const unit = lease.units;
  const totalDays = differenceInDays(new Date(lease.end_date), new Date(lease.start_date));
  const daysRemaining = Math.max(0, differenceInDays(new Date(lease.end_date), new Date()));
  const leaseProgress = ((totalDays - daysRemaining) / totalDays) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lease Details</h1>
          <p className="text-muted-foreground">View your lease agreement and documents</p>
        </div>
        <Badge className="bg-success/10 text-success border-success/20 gap-1 text-sm px-3 py-1">
          <CheckCircle className="h-4 w-4" /> Active Lease
        </Badge>
      </div>

      {/* Lease Status Card */}
      <Card className="card-shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {format(new Date(lease.start_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {format(new Date(lease.end_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                {formatCurrency(lease.monthly_rent)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time Remaining</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <Clock className="h-5 w-5 text-muted-foreground" />
                {daysRemaining} days
              </p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Lease Progress</span>
              <span className="font-medium">{Math.round(leaseProgress)}% complete</span>
            </div>
            <Progress value={leaseProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Details */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" /> Unit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Unit</p>
              <p className="font-semibold">{unit?.unit_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-semibold">{property?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium text-sm">
                {property ? `${property.address}, ${property.city}, ${property.state} ${property.zip_code}` : 'N/A'}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-semibold">{unit?.bedrooms || '-'}</p>
                <p className="text-xs text-muted-foreground">Bedrooms</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{unit?.bathrooms || '-'}</p>
                <p className="text-xs text-muted-foreground">Bathrooms</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{unit?.sqft || '-'}</p>
                <p className="text-xs text-muted-foreground">Sq. Ft.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Lease Number</span>
                <span className="text-sm font-medium">{lease.lease_number}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <span className="text-sm font-medium">{formatCurrency(lease.monthly_rent)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Security Deposit</span>
                <span className="text-sm font-medium">{formatCurrency(lease.security_deposit)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Lease Duration</span>
                <span className="text-sm font-medium">{totalDays} days</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className="bg-success/10 text-success">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Status */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" /> Signatures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              {lease.landlord_signature_url ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Landlord</p>
                <p className="text-sm text-muted-foreground">
                  {lease.landlord_signature_url 
                    ? `Signed ${format(new Date(lease.landlord_signed_at), 'MMM d, yyyy')}`
                    : 'Pending'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              {lease.tenant_signature_url ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Tenant</p>
                <p className="text-sm text-muted-foreground">
                  {lease.tenant_signature_url 
                    ? `Signed ${format(new Date(lease.tenant_signed_at), 'MMM d, yyyy')}`
                    : 'Pending'}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="text-xl font-semibold">{formatCurrency(lease.security_deposit)}</p>
              <Badge variant="secondary" className="mt-1">On file</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Lease */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Lease Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Lease Agreement - {lease.lease_number}</p>
                <p className="text-sm text-muted-foreground">
                  Signed on {lease.tenant_signed_at ? format(new Date(lease.tenant_signed_at), 'MMM d, yyyy') : 'Pending'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => handleDownloadPdf(lease.id)}
              disabled={downloading}
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Renewal Notice */}
      {daysRemaining <= 60 && daysRemaining > 0 && (
        <Card className="card-shadow-md border-info/20 bg-info/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-info/10">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Lease Renewal</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your lease will expire on {format(new Date(lease.end_date), 'MMM d, yyyy')}. Contact property management 
                  to discuss renewal options.
                </p>
              </div>
              <Button variant="outline">Contact Management</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
