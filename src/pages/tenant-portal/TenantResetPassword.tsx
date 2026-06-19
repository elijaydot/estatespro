import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, AlertCircle, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Please try again.';
};

export default function TenantResetPassword() {
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(!!data.session);
      setIsChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // End recovery session so the user logs in with the new password normally.
      await supabase.auth.signOut();

      toast({
        title: 'Password updated',
        description: 'You can now log in with your new password.',
      });
      navigate('/tenant/login');
    } catch (err: unknown) {
      toast({
        title: 'Unable to reset password',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md card-shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Reset link expired</CardTitle>
            <CardDescription>
              Please request a new password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/tenant/forgot-password" className="text-primary font-medium hover:underline">
              Request a new reset link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-lg">
            <Home className="h-6 w-6" />
          </div>
          <span className="font-bold text-2xl text-foreground">Tenant Portal</span>
        </div>

        <Card className="card-shadow-lg border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Set a new password</CardTitle>
            <CardDescription>
              Choose a strong password to secure your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11"
                />
              </div>

              <Button type="submit" className="w-full h-11 bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
