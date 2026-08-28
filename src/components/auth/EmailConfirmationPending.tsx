import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, RefreshCw, ExternalLink, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface EmailConfirmationPendingProps {
  email: string;
  role?: 'landlord' | 'property_manager' | 'tenant';
  onBackToSignup?: () => void;
  loginPath?: string;
}

export function EmailConfirmationPending({
  email,
  role = 'landlord',
  onBackToSignup,
  loginPath = '/login',
}: EmailConfirmationPendingProps) {
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}${role === 'tenant' ? '/tenant' : '/dashboard'}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Verification email resent!',
        description: `We've sent a new confirmation link to ${email}. Please check your inbox and spam folder.`,
      });
      setCooldown(60);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resend confirmation email';
      toast({
        title: 'Unable to resend email',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  const getEmailProviderUrl = () => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    if (domain.includes('gmail') || domain.includes('googlemail')) return 'https://mail.google.com';
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn')) return 'https://outlook.live.com';
    if (domain.includes('yahoo')) return 'https://mail.yahoo.com';
    if (domain.includes('icloud') || domain.includes('me.com')) return 'https://www.icloud.com/mail';
    if (domain.includes('proton') || domain.includes('pm.me')) return 'https://mail.proton.me';
    return null;
  };

  const emailProviderUrl = getEmailProviderUrl();

  return (
    <Card className="card-shadow-lg border-0 animate-scale-in">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
          <Mail className="h-8 w-8 animate-pulse" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
        <CardDescription className="text-sm mt-2 max-w-sm mx-auto">
          We&apos;ve sent a verification link to{' '}
          <span className="font-semibold text-foreground break-all">{email}</span>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Click the <strong>&quot;Verify Email &amp; Activate Account&quot;</strong> button in the email to finish setup.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>The link is safe and valid for 24 hours.</span>
          </div>
        </div>

        <div className="space-y-3">
          {emailProviderUrl && (
            <Button
              asChild
              className="w-full h-11 bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90"
            >
              <a href={emailProviderUrl} target="_blank" rel="noopener noreferrer">
                Open Email Provider
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="w-full h-11 font-medium"
          >
            {resending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </>
            ) : cooldown > 0 ? (
              `Resend email in ${cooldown}s`
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
          {onBackToSignup ? (
            <button
              type="button"
              onClick={onBackToSignup}
              className="inline-flex items-center hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Change email
            </button>
          ) : (
            <span />
          )}

          <Link
            to={loginPath}
            className="text-primary hover:underline font-medium"
          >
            Back to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
