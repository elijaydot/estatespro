import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff, Check, Building2, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
const db = supabase as any;

type SignupRole = 'landlord' | 'property_manager';

interface Company {
  id: string;
  name: string;
}

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [role, setRole] = useState<SignupRole>('landlord');
  const [showPassword, setShowPassword] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const { isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for PM invite token
  const pmInviteToken = searchParams.get('pm_invite');

  useEffect(() => {
    if (role === 'property_manager' && !pmInviteToken) {
      setLoadingCompanies(true);
      db
        .from('companies')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          setCompanies(data || []);
          setLoadingCompanies(false);
        });
    }
  }, [role, pmInviteToken]);

  // If PM invite, validate and pre-fill
  useEffect(() => {
    if (pmInviteToken) {
      setRole('property_manager');
      supabase.functions
        .invoke('invite-token', { body: { operation: 'validate_pm', token: pmInviteToken } })
        .then(({ data }: any) => {
          if (data?.invite) {
            setEmail(data.invite.email);
            setSelectedCompanyId(data.invite.company_id);
            setCompanyName(data.invite.company_name || '');
          }
        });
    }
  }, [pmInviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const metadata: Record<string, string> = { name, role };
      
      if (role === 'landlord') {
        metadata.company_name = companyName;
      } else if (role === 'property_manager' && selectedCompanyId) {
        metadata.company_id = selectedCompanyId;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: metadata,
        },
      });

      if (error) throw error;

      // Mark PM invite as used
      if (pmInviteToken && role === 'property_manager') {
        await supabase.functions.invoke('invite-token', {
          body: {
            operation: 'consume_pm',
            token: pmInviteToken,
            email: email.trim().toLowerCase(),
          },
        });
      }

      navigate('/dashboard');
    } catch (error: any) {
      const { toast } = await import('@/components/ui/use-toast');
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-lg">
            EP
          </div>
          <span className="font-bold text-2xl text-foreground">FishGate</span>
        </div>

        <Card className="card-shadow-lg border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              {pmInviteToken 
                ? 'Complete your registration as a Property Manager'
                : 'Start managing your properties with FishGate'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Selection Tabs */}
            {!pmInviteToken && (
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setRole('landlord')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'landlord'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <Building2 className="h-6 w-6" />
                  <span className="text-sm font-medium">Landlord</span>
                  <span className="text-xs text-center opacity-70">Own & oversee properties</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('property_manager')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'property_manager'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <UserCog className="h-6 w-6" />
                  <span className="text-sm font-medium">Property Manager</span>
                  <span className="text-xs text-center opacity-70">Manage daily operations</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {role === 'landlord' && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company / Portfolio Name</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your Company LLC"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    This creates your company that property managers can join
                  </p>
                </div>
              )}

              {role === 'property_manager' && !pmInviteToken && (
                <div className="space-y-2">
                  <Label>Select Company to Join</Label>
                  {loadingCompanies ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading companies...
                    </div>
                  ) : companies.length > 0 ? (
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choose a company..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No companies available. Ask a landlord to invite you.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your application will require landlord approval
                  </p>
                </div>
              )}

              {role === 'property_manager' && pmInviteToken && companyName && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-primary">
                    Joining: {companyName}
                  </p>
                  <p className="text-xs text-muted-foreground">Pre-approved via invite</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={!!pmInviteToken}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {password && (
                  <div className="space-y-1 mt-2">
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-xs ${
                          req.met ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        <Check className={`h-3 w-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={isSubmitting || (role === 'property_manager' && !pmInviteToken && !selectedCompanyId && companies.length > 0)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  role === 'landlord' ? 'Create Landlord Account' : 'Apply as Property Manager'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t text-center">
              <Link to="/tenant/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Are you a tenant? <span className="font-medium text-primary">Access Tenant Portal -&gt;</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

