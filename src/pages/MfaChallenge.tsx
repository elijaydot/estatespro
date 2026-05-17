import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { mfaApi, markMfaSessionVerified } from '@/hooks/useMfa';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export default function MfaChallenge() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isTenant } = useUserRole();
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await mfaApi.verify(code.trim(), useRecovery);
      markMfaSessionVerified(user.id);
      toast({ title: 'Verified' });
      navigate(isTenant ? '/tenant' : '/dashboard', { replace: true });
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    await logout();
    navigate(isTenant ? '/tenant/login' : '/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            {useRecovery
              ? 'Enter one of your recovery codes.'
              : 'Open your authenticator app and enter the 6-digit code.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">{useRecovery ? 'Recovery code' : 'Authenticator code'}</Label>
              <Input
                id="mfa-code"
                autoFocus
                autoComplete="one-time-code"
                inputMode={useRecovery ? 'text' : 'numeric'}
                maxLength={useRecovery ? 11 : 6}
                placeholder={useRecovery ? 'AAAAA-BBBBB' : '123456'}
                value={code}
                onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))}
                className="h-11 text-center text-lg tracking-widest font-mono"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={busy || code.length < 6}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Verify
            </Button>
            <button
              type="button"
              onClick={() => { setUseRecovery((v) => !v); setCode(''); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {useRecovery ? 'Use authenticator code instead' : 'Use a recovery code instead'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="w-full text-xs text-muted-foreground hover:text-destructive"
            >
              Cancel and sign out
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
