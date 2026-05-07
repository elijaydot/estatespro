import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, Smartphone, Lock, RefreshCcw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { generateRecoveryCodes, saveRecoveryCodes, logSecurityEvent } from '@/lib/security';

function formatQrDataUri(rawQr: string) {
  if (!rawQr) return '';
  if (rawQr.startsWith('data:image')) return rawQr;
  return `data:image/svg+xml;utf8,${encodeURIComponent(rawQr)}`;
}

export function SecuritySettings() {
  const { mfa, enrollMfaTotp, verifyMfaEnrollment, disableMfa } = useAuth();
  const { isManager } = useUserRole();
  const { toast } = useToast();

  const [isBusy, setIsBusy] = useState(false);
  const [isPreparingEnrollment, setIsPreparingEnrollment] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string | null;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isGeneratingRecovery, setIsGeneratingRecovery] = useState(false);

  const isSwitchChecked = mfa.isEnabled || !!enrollmentData;

  const requiresMfa = useMemo(() => isManager, [isManager]);

  const startEnrollment = async () => {
    setIsPreparingEnrollment(true);
    const { data, error } = await enrollMfaTotp();
    setIsPreparingEnrollment(false);

    if (error || !data) {
      toast({
        title: 'Unable to start MFA setup',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setEnrollmentData(data);
    setVerifyCode('');
  };

  const handleEnableVerify = async () => {
    if (!enrollmentData) return;
    if (!verifyCode.trim()) {
      toast({ title: 'Code required', description: 'Enter the 6-digit code from your authenticator app.', variant: 'destructive' });
      return;
    }

    setIsBusy(true);
    const { error } = await verifyMfaEnrollment(enrollmentData.factorId, verifyCode.trim());
    setIsBusy(false);

    if (error) {
      await logSecurityEvent('mfa_enable_failed', { reason: error.message || 'verify_error' });
      toast({ title: 'Invalid code', description: error.message || 'Could not verify your MFA code.', variant: 'destructive' });
      return;
    }

    setEnrollmentData(null);
    setVerifyCode('');
    await logSecurityEvent('mfa_enabled');
    toast({ title: 'MFA enabled', description: 'Your account now has two-step verification.' });
  };

  const handleDisable = async () => {
    if (!disablePassword.trim() || !disableCode.trim()) {
      toast({
        title: 'Missing details',
        description: 'Enter your password and a fresh authenticator code to disable MFA.',
        variant: 'destructive',
      });
      return;
    }

    setIsBusy(true);
    const { error } = await disableMfa(disablePassword, disableCode);
    setIsBusy(false);

    if (error) {
      await logSecurityEvent('mfa_disable_failed', { reason: error.message || 'disable_error' });
      toast({ title: 'Could not disable MFA', description: error.message || 'Please try again.', variant: 'destructive' });
      return;
    }

    setDisablePassword('');
    setDisableCode('');
    setRecoveryCodes([]);
    await logSecurityEvent('mfa_disabled');
    toast({ title: 'MFA disabled', description: 'Two-step verification has been turned off.' });
  };

  const handleGenerateRecoveryCodes = async () => {
    if (!mfa.isEnabled) {
      toast({
        title: 'Enable MFA first',
        description: 'Recovery codes are only available after MFA is enabled.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingRecovery(true);
    try {
      const generated = generateRecoveryCodes(10);
      const saved = await saveRecoveryCodes(generated);
      if (saved < 1) {
        throw new Error('No recovery codes were saved.');
      }

      setRecoveryCodes(generated);
      await logSecurityEvent('recovery_codes_generated', { count: saved });
      toast({
        title: 'Recovery codes generated',
        description: 'Save these one-time codes in a secure place. They will only be shown once.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to generate recovery codes',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingRecovery(false);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    if (recoveryCodes.length === 0) return;
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast({ title: 'Copied', description: 'Recovery codes copied to clipboard.' });
  };

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      if (!mfa.isEnabled && !enrollmentData) {
        void startEnrollment();
      }
      return;
    }

    if (mfa.isEnabled) {
      toast({
        title: 'Confirm to disable MFA',
        description: 'Use the disable section below to confirm with password and authenticator code.',
      });
      return;
    }

    setEnrollmentData(null);
    setVerifyCode('');
  };

  return (
    <div className="space-y-6">
      {requiresMfa && !mfa.isEnabled && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>MFA required for manager access</AlertTitle>
          <AlertDescription>
            Landlords and property managers must enable MFA before using other manager features.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Two-factor authentication (MFA)</p>
              <p className="text-sm text-muted-foreground">
                Protect your account with a time-based code from an authenticator app.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {mfa.isEnabled ? (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Enabled</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">Disabled</span>
              )}
              <Switch checked={isSwitchChecked} onCheckedChange={handleToggleChange} disabled={isBusy || isPreparingEnrollment} />
            </div>
          </div>

          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>Recommended apps</AlertTitle>
            <AlertDescription>
              Google Authenticator, Microsoft Authenticator, or 1Password can generate your login codes.
            </AlertDescription>
          </Alert>

          {isPreparingEnrollment && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your MFA setup...
            </div>
          )}

          {enrollmentData && (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Step 1: Scan QR Code</p>
              <div className="bg-white rounded-lg p-3 inline-flex">
                <img
                  src={formatQrDataUri(enrollmentData.qrCode)}
                  alt="MFA QR code"
                  className="h-40 w-40"
                />
              </div>

              <div className="space-y-2">
                <Label>Manual setup key</Label>
                <Input value={enrollmentData.secret} readOnly className="font-mono text-xs" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfa-enable-code">Step 2: Enter 6-digit code</Label>
                <Input
                  id="mfa-enable-code"
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleEnableVerify} disabled={isBusy || verifyCode.length < 6}>
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Verify and Enable
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEnrollmentData(null);
                    setVerifyCode('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mfa.isEnabled && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Backup and recovery codes</p>
                </div>
                <Button variant="outline" onClick={handleGenerateRecoveryCodes} disabled={isGeneratingRecovery || isBusy}>
                  {isGeneratingRecovery ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Generate Codes
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Recovery codes are single-use and let you sign in if you lose access to your authenticator app.
              </p>

              {recoveryCodes.length > 0 && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                    {recoveryCodes.map((item) => (
                      <div key={item} className="rounded bg-background px-2 py-1 border">
                        {item}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyRecoveryCodes}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Codes
                  </Button>
                </div>
              )}
            </div>
          )}

          {mfa.isEnabled && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Disable MFA (requires confirmation)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                For security, enter your password and a fresh authenticator code before disabling MFA.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mfa-disable-password">Current password</Label>
                  <Input
                    id="mfa-disable-password"
                    type="password"
                    value={disablePassword}
                    onChange={(event) => setDisablePassword(event.target.value)}
                    placeholder="Your password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mfa-disable-code">Authenticator code</Label>
                  <Input
                    id="mfa-disable-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={disableCode}
                    onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                  />
                </div>
              </div>

              <Button variant="destructive" onClick={handleDisable} disabled={isBusy || !disablePassword || disableCode.length < 6}>
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable MFA'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
