import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Smartphone,
  Lock,
  RefreshCcw,
  Copy,
  Download,
  Activity,
  MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { generateRecoveryCodes, saveRecoveryCodes, logSecurityEvent } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import {
  getTrustedDeviceExpiry,
  revokeTrustedDevice,
} from "@/lib/trustedDevice";
import { downloadTextFile } from "@/lib/download";

function formatQrDataUri(rawQr: string) {
  if (!rawQr) return "";
  if (rawQr.startsWith("data:image")) return rawQr;
  return `data:image/svg+xml;utf8,${encodeURIComponent(rawQr)}`;
}

function buildRecoveryCodesText(codes: string[], email?: string | null) {
  const lines = [
    "FishGate — Two-factor recovery codes",
    "==========================================",
    email ? `Account: ${email}` : "",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Each code can be used ONCE to sign in if you lose your authenticator.",
    "Store these somewhere safe (password manager, printed copy).",
    "",
    ...codes.map((c, i) => `${String(i + 1).padStart(2, "0")}.  ${c}`),
    "",
    "If you suspect these were exposed, regenerate them in Settings → Security.",
  ];
  return lines.filter((l) => l !== "").join("\n") + "\n";
}

type AuditEvent = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
};

const ACTIVITY_EVENT_TYPES = [
  "mfa_enabled",
  "mfa_disabled",
  "mfa_enable_failed",
  "mfa_disable_failed",
  "mfa_challenge_passed",
  "mfa_challenge_failed",
  "mfa_verify_failed",
  "recovery_codes_generated",
  "recovery_codes_regenerated",
  "recovery_code_used",
  "recovery_code_failed",
  "mfa_device_trusted",
  "login_failed",
];

const EVENT_LABEL: Record<string, string> = {
  mfa_enabled: "MFA enabled",
  mfa_disabled: "MFA disabled",
  mfa_enable_failed: "MFA enable failed",
  mfa_disable_failed: "MFA disable failed",
  mfa_challenge_passed: "MFA challenge passed",
  mfa_challenge_failed: "MFA challenge failed",
  mfa_verify_failed: "MFA verification failed",
  recovery_codes_generated: "Recovery codes generated",
  recovery_codes_regenerated: "Recovery codes regenerated",
  recovery_code_used: "Recovery code used",
  recovery_code_failed: "Recovery code failed",
  mfa_device_trusted: "Device trusted (30 days)",
  login_failed: "Failed login attempt",
};

function isFailureEvent(type: string) {
  return type.endsWith("_failed");
}

export function SecuritySettings() {
  const { mfa, enrollMfaTotp, verifyMfaEnrollment, disableMfa, refreshMfaState, refreshSession, user, profile } = useAuth();
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
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isGeneratingRecovery, setIsGeneratingRecovery] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [trustedExpiry, setTrustedExpiry] = useState<Date | null>(null);

  const isSwitchChecked = mfa.isEnabled || !!enrollmentData;
  const canStartEnrollment = !mfa.isEnabled && !isBusy && !isPreparingEnrollment;
  const requiresMfa = useMemo(() => isManager, [isManager]);
  const accountEmail = profile?.email ?? user?.email ?? null;

  const syncMfaUiState = async (reason: string) => {
    console.info('[MFA][UI] sync-start', { reason });
    await refreshSession();
    await refreshMfaState();
    console.info('[MFA][UI] sync-complete', { reason });
  };

  useEffect(() => {
    setTrustedExpiry(getTrustedDeviceExpiry(user?.id));
  }, [user?.id]);

  const loadActivity = async () => {
    if (!user?.id) return;
    setEventsLoading(true);
    const { data, error } = await (supabase as any)
      .from("security_audit_events")
      .select("id, event_type, metadata, created_at, ip_address, user_agent")
      .eq("user_id", user.id)
      .in("event_type", ACTIVITY_EVENT_TYPES)
      .order("created_at", { ascending: false })
      .limit(25);
    setEventsLoading(false);
    if (error) {
      console.error("activity load error", error);
      return;
    }
    setEvents((data as AuditEvent[]) || []);
  };

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mfa.isEnabled]);

  const startEnrollment = async () => {
    console.info('[MFA][UI] start-enrollment-click');
    setIsPreparingEnrollment(true);
    try {
      const { data, error } = await enrollMfaTotp();

      if (error || !data) {
        toast({
          title: "Unable to start MFA setup",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setEnrollmentData(data);
      setVerifyCode("");
    } finally {
      // Guarantees setup controls recover after errors/retries.
      setIsPreparingEnrollment(false);
      await syncMfaUiState('start-enrollment');
    }
  };

  const handleEnableVerify = async () => {
    if (!enrollmentData) return;
    if (!verifyCode.trim()) {
      toast({ title: "Code required", description: "Enter the 6-digit code from your authenticator app.", variant: "destructive" });
      return;
    }

    setIsBusy(true);
    const { error } = await verifyMfaEnrollment(enrollmentData.factorId, verifyCode.trim());
    setIsBusy(false);

    if (error) {
      await logSecurityEvent("mfa_enable_failed", { reason: error.message || "verify_error" });
      await loadActivity();
      toast({ title: "Invalid code", description: error.message || "Could not verify your MFA code.", variant: "destructive" });
      await syncMfaUiState('enable-verify-error');
      return;
    }

    setEnrollmentData(null);
    setVerifyCode("");
    await syncMfaUiState('enable-verify-success');
    await logSecurityEvent("mfa_enabled");
    await loadActivity();
    toast({ title: "MFA enabled", description: "Your account now has two-step verification." });
  };

  const handleDisable = async () => {
    if (!disablePassword.trim() || !disableCode.trim()) {
      toast({
        title: "Missing details",
        description: "Enter your password and a fresh authenticator code to disable MFA.",
        variant: "destructive",
      });
      return;
    }

    setIsBusy(true);
    const { error } = await disableMfa(disablePassword, disableCode);
    setIsBusy(false);

    if (error) {
      await logSecurityEvent("mfa_disable_failed", { reason: error.message || "disable_error" });
      await loadActivity();
      toast({ title: "Could not disable MFA", description: error.message || "Please try again.", variant: "destructive" });
      await syncMfaUiState('disable-error');
      return;
    }

    setDisablePassword("");
    setDisableCode("");
    setRecoveryCodes([]);
    setEnrollmentData(null);
    setVerifyCode("");
    revokeTrustedDevice(user?.id);
    setTrustedExpiry(null);
    await syncMfaUiState('disable-success');
    await logSecurityEvent("mfa_disabled");
    await loadActivity();
    toast({ title: "MFA disabled", description: "Two-step verification has been turned off." });
  };

  const doGenerateRecoveryCodes = async (isRegenerate: boolean) => {
    setIsGeneratingRecovery(true);
    try {
      const generated = generateRecoveryCodes(10);
      const saved = await saveRecoveryCodes(generated);
      if (saved < 1) throw new Error("No recovery codes were saved.");

      setRecoveryCodes(generated);
      await logSecurityEvent(
        isRegenerate ? "recovery_codes_regenerated" : "recovery_codes_generated",
        { count: saved },
      );
      await loadActivity();
      toast({
        title: isRegenerate ? "Recovery codes regenerated" : "Recovery codes generated",
        description: "Save these one-time codes now — previous codes are no longer valid.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate recovery codes",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingRecovery(false);
    }
  };

  const handleGenerateClick = () => {
    if (!mfa.isEnabled) {
      toast({
        title: "Enable MFA first",
        description: "Recovery codes are only available after MFA is enabled.",
        variant: "destructive",
      });
      return;
    }
    // If user already has codes shown OR previously generated, confirm
    setConfirmRegenOpen(true);
  };

  const handleCopyRecoveryCodes = async () => {
    if (recoveryCodes.length === 0) return;
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast({ title: "Copied", description: "Recovery codes copied to clipboard." });
  };

  const handleDownloadRecoveryCodes = () => {
    if (recoveryCodes.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `fishgate-recovery-codes-${stamp}.txt`,
      buildRecoveryCodesText(recoveryCodes, accountEmail),
      "text/plain;charset=utf-8",
    );
    toast({ title: "Downloaded", description: "Recovery codes saved to your device." });
  };

  const handleRevokeTrusted = () => {
    revokeTrustedDevice(user?.id);
    setTrustedExpiry(null);
    toast({
      title: "Device trust removed",
      description: "MFA will be required on next login from this browser.",
    });
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
        title: "Confirm to disable MFA",
        description: "Use the disable section below to confirm with password and authenticator code.",
      });
      return;
    }

    setEnrollmentData(null);
    setVerifyCode("");
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
              <Switch checked={isSwitchChecked} onCheckedChange={handleToggleChange} disabled={isBusy} />
            </div>
          </div>

          {!mfa.isEnabled && !enrollmentData && (
            <div>
              <Button onClick={() => void startEnrollment()} disabled={!canStartEnrollment}>
                {isPreparingEnrollment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparing setup...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Set up MFA
                  </>
                )}
              </Button>
            </div>
          )}

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
                  onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
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
                    setVerifyCode("");
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
                <Button variant="outline" onClick={handleGenerateClick} disabled={isGeneratingRecovery || isBusy}>
                  {isGeneratingRecovery ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      {recoveryCodes.length > 0 ? "Regenerate Codes" : "Generate Codes"}
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
                  <div className="flex flex-wrap gap-2">
                    <Button variant="default" size="sm" onClick={handleDownloadRecoveryCodes}>
                      <Download className="h-4 w-4 mr-2" />
                      Download (.txt)
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyRecoveryCodes}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Codes
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    These codes will not be shown again. Save them now.
                  </p>
                </div>
              )}
            </div>
          )}

          {mfa.isEnabled && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Trusted device</p>
              </div>
              {trustedExpiry ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    This browser is trusted until{" "}
                    <span className="font-medium text-foreground">{trustedExpiry.toLocaleString()}</span>.
                    MFA will be skipped on login here until then.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleRevokeTrusted}>
                    Forget this device
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This browser is not trusted. You can enable “Remember this device for 30 days” on the next MFA challenge.
                </p>
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
                    onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
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
                  "Disable MFA"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-base font-semibold text-foreground">Recent security activity</p>
                <p className="text-xs text-muted-foreground">
                  MFA changes and failed sign-in attempts for your account (last 25 events).
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadActivity} disabled={eventsLoading}>
              {eventsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          </div>

          {eventsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No security events recorded yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {events.map((e) => {
                const failed = isFailureEvent(e.event_type);
                return (
                  <li key={e.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            "inline-block h-2 w-2 rounded-full " +
                            (failed ? "bg-destructive" : "bg-emerald-500")
                          }
                        />
                        <span className="text-sm font-medium text-foreground">
                          {EVENT_LABEL[e.event_type] ?? e.event_type}
                        </span>
                      </div>
                      {e.user_agent && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {e.user_agent}
                        </p>
                      )}
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {recoveryCodes.length > 0 ? "Regenerate recovery codes?" : "Generate recovery codes?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {recoveryCodes.length > 0 ? (
                <>
                  This will <strong>invalidate all of your existing recovery codes</strong> and
                  replace them with 10 new ones. Make sure you can save the new codes immediately —
                  they are shown only once.
                </>
              ) : (
                <>
                  You'll receive 10 single-use codes to sign in if you lose access to your
                  authenticator app. They will be shown only once — save them somewhere safe.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmRegenOpen(false);
                await doGenerateRecoveryCodes(recoveryCodes.length > 0);
              }}
            >
              {recoveryCodes.length > 0 ? "Yes, regenerate" : "Generate codes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
