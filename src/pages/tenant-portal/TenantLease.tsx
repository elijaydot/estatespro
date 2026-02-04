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
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/contexts/SettingsContext';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export default function TenantLease() {
  const { formatCurrency } = useSettings();
  const { data: portalData, isLoading } = useTenantPortalData();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async (leaseId: string) => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({ title: 'Error', description: 'Please log in again', variant: 'destructive' });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lease-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ leaseId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }

      const html = await response.text();
      
      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast({ title: 'Error', description: error.message || 'Failed to generate lease PDF', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

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

  const { activeLease, pendingLease, property, unit } = portalData;
  const currentLease = activeLease || pendingLease;

  // Show pending lease requiring signature
  if (pendingLease && !activeLease) {
    const lease = pendingLease as any;

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
                  <span><strong>Property:</strong> {property?.name || 'N/A'}</span>
                  <span><strong>Unit:</strong> {unit?.unit_number || 'N/A'}</span>
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
                  <Link to={`/tenant/lease/sign/${lease.id}`}>
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Section */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Lease Agreement</p>
                <p className="text-sm text-muted-foreground">
                  Lease #{lease.lease_number} • {format(new Date(lease.start_date), 'MMM yyyy')} - {format(new Date(lease.end_date), 'MMM yyyy')}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => handleDownloadPdf(lease.id)} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
