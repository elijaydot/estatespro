import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export function MfaReminderBanner() {
  const navigate = useNavigate();
  const { mfa } = useAuth();
  const { role, isLoading } = useUserRole();

  if (isLoading || mfa.isLoading || mfa.isEnabled) return null;

  const isTenant = role === 'tenant';
  const isManager = role === 'landlord' || role === 'property_manager';

  const message = isManager
    ? 'MFA is required for manager accounts. Enable it now to continue securely.'
    : 'Protect your account by enabling MFA in settings.';

  return (
    <Alert className="mb-4 border-amber-500/35 bg-amber-500/10">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Security recommendation</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        <Button
          size="sm"
          onClick={() => navigate(isTenant ? '/tenant/settings' : '/settings?tab=security')}
        >
          Set up MFA
        </Button>
      </AlertDescription>
    </Alert>
  );
}
