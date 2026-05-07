import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logSecurityEvent } from '@/lib/security';

export function useStepUpGuard() {
  const { mfa } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const ensureAal2 = async (action: string) => {
    if (mfa.currentLevel === 'aal2') {
      return true;
    }

    await logSecurityEvent('step_up_required', {
      action,
      currentLevel: mfa.currentLevel,
      nextLevel: mfa.nextLevel,
    });

    const nextPath = `${location.pathname}${location.search || ''}`;
    navigate(`/mfa-challenge?next=${encodeURIComponent(nextPath)}`);

    toast({
      title: 'Additional verification required',
      description: 'Complete MFA verification before performing this action.',
    });

    return false;
  };

  return { ensureAal2 };
}
