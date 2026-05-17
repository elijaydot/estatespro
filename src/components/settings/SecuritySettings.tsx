import { useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Copy, RefreshCw, KeyRound, Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from '@/hooks/use-toast';
import { useMfaStatus, mfaApi } from '@/hooks/useMfa';

function copy(text: string, label = 'Copied') {
  navigator.clipboard.writeText(text).then(() => toast({ title: label }));
}

function downloadCodes(codes: string[]) {
  const blob = new Blob([
    'FishGate — MFA recovery codes\n',
    'Keep these safe. Each can be used once.\n\n',
    ...codes.map((c) => c + '\n'),
  ], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fishgate-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export function SecuritySettings() {
  const { status, loading, refresh } = useMfaStatus();
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const [regenOpen, setRegenOpen] = useState(false);
  const [regenCode, setRegenCode] = useState('');

  async function startSetup() {
    setBusy(true);
    try {
      const data = await mfaApi.setup();
      setSetupData({ secret: data.secret, otpauth_uri: data.otpauth_uri });
      setSetupCode('');
      setRecoveryCodes(null);
      setSetupOpen(true);
    } catch (e: any) {
      toast({ title: 'Could not start setup', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    setBusy(true);
    try {
      const res = await mfaApi.enable(setupCode);
      setRecoveryCodes(res.recovery_codes);
      await refresh();
      toast({ title: 'MFA enabled', description: 'Save your recovery codes before closing.' });
    } catch (e: any) {
      toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setBusy(true);
    try {
      await mfaApi.disable(disableCode);
      await refresh();
      setDisableOpen(false);
      setDisableCode('');
      toast({ title: 'MFA disabled' });
    } catch (e: any) {
      toast({ title: 'Could not disable MFA', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmRegen() {
    setBusy(true);
    try {
      const res = await mfaApi.regenerateCodes(regenCode);
      setRecoveryCodes(res.recovery_codes);
      await refresh();
      setRegenOpen(false);
      setRegenCode('');
      toast({ title: 'New recovery codes generated', description: 'Previous codes are now invalid.' });
    } catch (e: any) {
      toast({ title: 'Could not regenerate', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground">Protect your account with multi-factor authentication</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {status?.enabled ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Shield className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <CardTitle className="text-base">Authenticator App (TOTP)</CardTitle>
                <CardDescription>
                  Use Microsoft Authenticator, Google Authenticator, Authy, or any TOTP app.
                </CardDescription>
              </div>
            </div>
            {status?.enabled ? (
              <Badge variant="default" className="shrink-0">MFA enabled</Badge>
            ) : (
              <Badge variant="outline" className="shrink-0">MFA disabled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : status?.enabled ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Enabled on</p>
                  <p className="font-medium">{status.enrolled_at ? new Date(status.enrolled_at).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last verified</p>
                  <p className="font-medium">{status.last_verified_at ? new Date(status.last_verified_at).toLocaleString() : '—'}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm">
                  <p className="font-medium flex items-center gap-2"><KeyRound className="h-4 w-4" /> Recovery codes</p>
                  <p className="text-muted-foreground">{status.recovery_codes_remaining} remaining</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                </Button>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button variant="destructive" onClick={() => setDisableOpen(true)}>Disable MFA</Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Your account is not protected by MFA</AlertTitle>
                <AlertDescription>
                  Adding a second factor blocks anyone who steals your password.
                </AlertDescription>
              </Alert>
              <Button onClick={startSetup} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                Enable MFA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup dialog */}
      <Dialog open={setupOpen} onOpenChange={(o) => { if (!busy) setSetupOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{recoveryCodes ? 'Save your recovery codes' : 'Set up authenticator'}</DialogTitle>
            <DialogDescription>
              {recoveryCodes
                ? 'Each code works once. Store them in a password manager — you will not see them again.'
                : 'Scan this QR code with your authenticator app, then enter the 6-digit code it shows.'}
            </DialogDescription>
          </DialogHeader>

          {!recoveryCodes && setupData && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <QRCodeSVG value={setupData.otpauth_uri} size={192} level="M" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Can't scan? Enter this key manually:</Label>
                <div className="flex gap-2">
                  <Input readOnly value={setupData.secret} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copy(setupData.secret)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="setup-code">6-digit code from your app</Label>
                <Input
                  id="setup-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          )}

          {recoveryCodes && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-3 rounded-md">
                {recoveryCodes.map((c) => <div key={c}>{c}</div>)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => copy(recoveryCodes.join('\n'), 'All codes copied')}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => downloadCodes(recoveryCodes)}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!recoveryCodes ? (
              <Button onClick={confirmSetup} disabled={busy || setupCode.length !== 6}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify & enable
              </Button>
            ) : (
              <Button onClick={() => { setSetupOpen(false); setRecoveryCodes(null); setSetupData(null); }}>
                I've saved them
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable dialog */}
      <Dialog open={disableOpen} onOpenChange={(o) => { if (!busy) setDisableOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable MFA</DialogTitle>
            <DialogDescription>
              Enter a current 6-digit code (or a recovery code) to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            inputMode="text"
            placeholder="123456 or AAAAA-BBBBB"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            autoComplete="one-time-code"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDisable} disabled={busy || !disableCode}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate dialog */}
      <Dialog open={regenOpen} onOpenChange={(o) => { if (!busy) setRegenOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerate recovery codes</DialogTitle>
            <DialogDescription>
              Enter your current 6-digit authenticator code. Existing codes will stop working.
            </DialogDescription>
          </DialogHeader>
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={regenCode}
            onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ''))}
            autoComplete="one-time-code"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenOpen(false)}>Cancel</Button>
            <Button onClick={confirmRegen} disabled={busy || regenCode.length !== 6}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
