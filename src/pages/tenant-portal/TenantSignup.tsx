import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useValidateInviteToken, useMarkInviteUsed } from '@/hooks/useTenantInvites';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export default function TenantSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const { data: invite, isLoading: isValidating, error: validationError } = useValidateInviteToken(inviteToken);
  const markInviteUsed = useMarkInviteUsed();
  const isEmailLocked = !!invite?.email;
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill email from invite
  useEffect(() => {
    if (invite?.email) {
      setFormData(prev => ({ ...prev, email: invite.email }));
    }
    if (invite?.tenants?.name) {
      setFormData(prev => ({ ...prev, name: invite.tenants.name }));
    }
  }, [invite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const redirectUrl = `${window.location.origin}/tenant`;

      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: formData.name,
            role: 'tenant',
          },
        },
      });

      if (signUpError) throw signUpError;

      // In some cases (e.g., email already registered / email confirmation required), signUp may
      // not return a session. We attempt an immediate sign-in to confirm the password is valid.
      let tenantUserId = authData.user?.id;
      if (!authData.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });

        if (signInError) {
          toast({
            title: 'Unable to log you in',
            description:
              'This email may already have an account (your password was not changed). Please log in with your existing password.',
            variant: 'destructive',
          });
          navigate('/tenant/login');
          return;
        }

        tenantUserId = signInData.user?.id;
      }

      if (!tenantUserId) {
        throw new Error('Account created, but user information was not returned. Please try again.');
      }

      // Create profile for the user (best-effort; auth works even if this fails)
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: tenantUserId,
        email: formData.email.trim().toLowerCase(),
        name: formData.name,
        role: 'tenant',
      });
      if (profileError) {
        console.warn('Profile insert failed (non-blocking):', profileError);
      }

      // Mark invite as used and link tenant to user
      if (inviteToken) {
        await markInviteUsed.mutateAsync({
          token: inviteToken,
          tenantUserId,
        });
      }

      toast({ title: 'Success', description: 'Account created successfully! You are now signed in.' });
      navigate('/tenant');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground mb-4">
              No invitation token provided. Please use the link from your invitation email.
            </p>
            <Button onClick={() => navigate('/tenant/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid or Expired Invitation</h2>
            <p className="text-muted-foreground mb-4">
              This invitation link is invalid or has expired. Please contact your property manager for a new invitation.
            </p>
            <Button onClick={() => navigate('/tenant/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-xl bg-primary/10 w-fit">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Set up your tenant portal account to access your lease, payments, and maintenance requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-3 bg-success/10 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-success">Invitation Verified</p>
              <p className="text-xs text-muted-foreground">
                Invited by your property manager
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
                readOnly={isEmailLocked}
                aria-readonly={isEmailLocked}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/tenant/login')}>
              Log in
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
