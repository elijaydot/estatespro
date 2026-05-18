import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { consumeRecoveryCode, logSecurityEvent } from "@/lib/security";

export default function MfaChallenge() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mfa, verifyMfaChallenge, logout } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);

  const nextRoute = useMemo(() => {
    const requested = searchParams.get("next");
    if (requested && requested.startsWith("/")) {
      return requested;
    }
    return role === "tenant" ? "/tenant" : "/dashboard";
  }, [role, searchParams]);

  useEffect(() => {
    if (!mfa.isLoading && !mfa.needsChallenge) {
      navigate(nextRoute, { replace: true });
    }
  }, [mfa.isLoading, mfa.needsChallenge, navigate, nextRoute]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length < 6) {
      toast({ title: "Code required", description: "Enter the 6-digit code from your authenticator app.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await verifyMfaChallenge(code);
    setIsSubmitting(false);

    if (error) {
      await logSecurityEvent("mfa_challenge_failed", {
        method: "totp",
      });
      toast({
        title: "Verification failed",
        description: error.message || "The code was invalid. Try again.",
        variant: "destructive",
      });
      return;
    }

    await logSecurityEvent("mfa_challenge_passed", {
      method: "totp",
    });
    toast({ title: "Verified", description: "MFA challenge completed." });
    navigate(nextRoute, { replace: true });
  };

  const handleRecoverySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!recoveryCode.trim()) {
      toast({ title: "Recovery code required", description: "Enter one of your saved recovery codes.", variant: "destructive" });
      return;
    }

    setIsRecoverySubmitting(true);
    try {
      const isValid = await consumeRecoveryCode(recoveryCode.trim().toUpperCase());

      if (!isValid) {
        await logSecurityEvent("mfa_challenge_failed", { method: "recovery_code" });
        toast({
          title: "Invalid recovery code",
          description: "The recovery code is invalid or already used.",
          variant: "destructive",
        });
        return;
      }

      await logSecurityEvent("mfa_challenge_passed", { method: "recovery_code" });
      toast({ title: "Recovery code accepted", description: "You are now signed in." });
      navigate(nextRoute, { replace: true });
    } catch (error: any) {
      toast({
        title: "Recovery check failed",
        description: error?.message || "Unable to verify recovery code.",
        variant: "destructive",
      });
    } finally {
      setIsRecoverySubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Verify your login</CardTitle>
          <CardDescription>
            Enter the current code from your authenticator app to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Authenticator code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={isSubmitting || roleLoading}
              />
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting || roleLoading || code.length < 6}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Use a recovery code instead</p>
            <form onSubmit={handleRecoverySubmit} className="space-y-3">
              <Input
                inputMode="text"
                placeholder="ABCD-1234"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
                disabled={isRecoverySubmitting}
              />
              <Button type="submit" variant="outline" className="w-full" disabled={isRecoverySubmitting || !recoveryCode.trim()}>
                {isRecoverySubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking code...
                  </>
                ) : (
                  "Use Recovery Code"
                )}
              </Button>
            </form>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
