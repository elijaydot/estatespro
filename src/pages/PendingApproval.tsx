import { useAuth } from '@/contexts/AuthContext';
import { useMyMembership } from '@/hooks/useCompanies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function PendingApproval() {
  const { logout, profile } = useAuth();
  const { data: membership, isLoading } = useMyMembership();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = membership?.status || 'pending';
  const companyName = (membership as any)?.companies?.name || 'the company';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-lg">
            EP
          </div>
          <span className="font-bold text-2xl text-foreground">FishGate</span>
        </div>

        <Card className="card-shadow-lg border-0">
          <CardHeader className="text-center">
            {status === 'pending' && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-warning" />
                </div>
                <CardTitle className="text-2xl">Application Pending</CardTitle>
                <CardDescription className="text-base">
                  Your application to join <strong>{companyName}</strong> as a Property Manager is awaiting approval from the landlord.
                </CardDescription>
              </>
            )}
            {status === 'rejected' && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Application Rejected</CardTitle>
                <CardDescription className="text-base">
                  Your application to join <strong>{companyName}</strong> was not approved. Please contact the landlord for more information.
                </CardDescription>
              </>
            )}
            {status === 'deactivated' && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Account Deactivated</CardTitle>
                <CardDescription className="text-base">
                  Your access to <strong>{companyName}</strong> has been deactivated. Please contact the landlord.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                Signed in as <strong>{profile?.name || profile?.email}</strong>
              </p>
            </div>
            <Button variant="outline" onClick={logout} className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

