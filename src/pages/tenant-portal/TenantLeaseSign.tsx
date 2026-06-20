import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Home, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { useLease, useSignLease, useUploadSignature } from '@/hooks/useLeases';
import { useCreateNotification } from '@/hooks/useNotifications';

type LeaseRelations = {
  tenants?: {
    id: string;
    name: string;
  } | null;
  properties?: {
    id: string;
    name: string;
  } | null;
  units?: {
    id: string;
    unit_number: string;
  } | null;
};

export default function TenantLeaseSign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const { data: lease, isLoading } = useLease(id || '');
  const signLease = useSignLease();
  const uploadSignature = useUploadSignature();
  const createNotification = useCreateNotification();

  const handleSign = async () => {
    if (!lease || !signaturePadRef.current) return;

    if (signaturePadRef.current.isEmpty()) {
      toast({ 
        title: 'Signature Required', 
        description: 'Please provide your signature before signing.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!agreedToTerms) {
      toast({ 
        title: 'Agreement Required', 
        description: 'Please agree to the lease terms before signing.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSigning(true);
    try {
      const blob = await signaturePadRef.current.toBlob();
      if (!blob) {
        throw new Error('Failed to capture signature');
      }

      const signatureUrl = await uploadSignature.mutateAsync({ 
        leaseId: lease.id, 
        signatureBlob: blob 
      });
      
      await signLease.mutateAsync({ 
        leaseId: lease.id, 
        signatureUrl, 
        signerType: 'tenant' 
      });

      await createNotification.mutateAsync({
        title: 'Lease Signed',
        message: `Tenant has signed lease ${lease.lease_number}`,
        type: 'success',
        link: `/leases`,
      });

      toast({ 
        title: 'Lease Signed Successfully', 
        description: 'Thank you for signing your lease agreement.' 
      });
      
      navigate('/tenant/lease');
    } catch (error) {
      console.error('Error signing lease:', error);
      toast({ 
        title: 'Signing Failed', 
        description: 'There was an error signing the lease. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Lease Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The lease you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/tenant/lease')} className="mt-4">
          Back to Lease
        </Button>
      </div>
    );
  }

  const leaseRelations = lease as typeof lease & LeaseRelations;
  const tenant = leaseRelations.tenants;
  const property = leaseRelations.properties;
  const unit = leaseRelations.units;
  const daysUntilStart = differenceInDays(new Date(lease.start_date), new Date());
  const alreadySigned = !!lease.tenant_signed_at;

  if (alreadySigned) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/tenant/lease')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Lease
        </Button>

        <Card className="card-shadow-md border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8">
              <CheckCircle className="h-16 w-16 text-success mb-4" />
              <h2 className="text-2xl font-bold text-foreground">Lease Already Signed</h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                You have already signed this lease agreement on{' '}
                {format(new Date(lease.tenant_signed_at!), 'MMMM d, yyyy')}.
              </p>
              {lease.status === 'active' && (
                <Badge className="mt-4 bg-success/10 text-success border-success/20">
                  Lease Active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-info/15 via-background to-primary/10 p-5 md:p-6 card-shadow-md">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-info/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tenant/lease')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Lease Signature Flow</p>
            <h1 className="font-display text-2xl font-bold text-foreground">Sign Lease Agreement</h1>
            <p className="text-muted-foreground">Review and sign your lease for {unit?.unit_number}</p>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-border/70 bg-card/85 p-3">
        <p className="text-sm text-foreground">Confirm terms and sign only when details match your agreed rental contract.</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tenant/lease')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Review Summary</h2>
          <p className="text-muted-foreground">Lease #{lease.lease_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lease Summary */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lease Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lease Number</p>
                  <p className="font-semibold">{lease.lease_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-semibold">{property?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-semibold">{unit?.unit_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-semibold">{formatCurrency(lease.monthly_rent)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">{format(new Date(lease.start_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">{format(new Date(lease.end_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Security Deposit</p>
                  <p className="font-medium">{formatCurrency(lease.security_deposit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                  {lease.terms || 'No additional terms specified.'}
                </pre>
              </div>
              {lease.special_conditions && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Special Conditions</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-foreground">{lease.special_conditions}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle>Your Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignaturePad ref={signaturePadRef} width={500} height={200} />

              <div className="flex items-start space-x-3 pt-4">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the terms and conditions of this lease agreement. 
                  I understand that by signing, I am entering into a legally binding contract.
                </Label>
              </div>

              <Button 
                onClick={handleSign} 
                disabled={isSigning || !agreedToTerms}
                className="w-full gap-2"
                size="lg"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Sign Lease Agreement
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Signing Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Landlord</span>
                {lease.landlord_signed_at ? (
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <CheckCircle className="h-3 w-3" /> Signed
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tenant</span>
                {lease.tenant_signed_at ? (
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <CheckCircle className="h-3 w-3" /> Signed
                  </Badge>
                ) : (
                  <Badge variant="outline">Awaiting signature</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenant Info */}
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Home className="h-5 w-5" />
                Your Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{tenant?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{tenant?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{tenant?.phone || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className="card-shadow-md border-info/20 bg-info/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-info mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Important</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Once signed, this lease agreement is legally binding. 
                    Make sure to review all terms carefully before signing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
