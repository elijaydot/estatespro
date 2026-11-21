import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Eye,
  EyeOff,
  Check,
  Building2,
  UserCog,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { EmailConfirmationPending } from '@/components/auth/EmailConfirmationPending';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useI18n } from '@/contexts/useI18n';
import {
  lookupRdbCompany,
  validateRwandanTin,
  validateRwandanNationalId,
  submitFullKybApplication,
  type RdbCompanyRecord,
  type RdbLegalStructure,
} from '@/lib/kybVerificationService';

const db = supabase;

type SignupRole = 'landlord' | 'property_manager';

interface Company {
  id: string;
  name: string;
}

type PmInviteValidationResponse = {
  invite?: {
    email: string;
    company_id: string;
    company_name?: string | null;
  } | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Unknown signup error';
};

export default function Signup() {
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Profile & KYC
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SignupRole>('landlord');
  const [idType, setIdType] = useState<'national_id' | 'passport'>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Rwandan Company Lookup (RDB / RRA TIN)
  const [tin, setTin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [legalStructure, setLegalStructure] = useState<RdbLegalStructure>('Company Limited by Shares (Ltd)');
  const [rwarebLicense, setRwarebLicense] = useState('');
  const [rdbRecord, setRdbRecord] = useState<RdbCompanyRecord | null>(null);
  const [lookingUpRdb, setLookingUpRdb] = useState(false);
  const [rdbLookupError, setRdbLookupError] = useState<string | null>(null);

  // Step 3: Proof of Authority & Compliance Consent
  const [directorRole, setDirectorRole] = useState<'Managing Director' | 'Board Member' | 'Authorized Property Manager' | 'Legal Representative'>('Managing Director');
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [ncsaConsent, setNcsaConsent] = useState(true);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  // PM Invite Token handling
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pmInviteToken = searchParams.get('pm_invite');

  // Load existing companies if PM without invite
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
        .then(({ data }: { data: PmInviteValidationResponse | null }) => {
          if (data?.invite) {
            setEmail(data.invite.email);
            setSelectedCompanyId(data.invite.company_id);
            setCompanyName(data.invite.company_name || '');
          }
        });
    }
  }, [pmInviteToken]);

  // Handle RDB TIN Lookup
  const handleRdbLookup = async () => {
    const val = validateRwandanTin(tin);
    if (!val.isValid) {
      setRdbLookupError(val.error || 'Please enter a valid 9-digit Rwandan TIN.');
      return;
    }

    setLookingUpRdb(true);
    setRdbLookupError(null);
    try {
      const res = await lookupRdbCompany(val.cleaned);
      if (res.found && res.company) {
        setRdbRecord(res.company);
        setCompanyName(res.company.legalName);
        setLegalStructure(res.company.legalStructure);
        toast({
          title: '✅ RDB Company Found',
          description: `${res.company.legalName} (${res.company.legalStructure}) registered with RDB.`,
        });
      } else {
        setRdbLookupError(res.message);
      }
    } catch (err: unknown) {
      setRdbLookupError(getErrorMessage(err));
    } finally {
      setLookingUpRdb(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!name.trim()) {
      toast({ title: 'Validation', description: 'Please enter your full name.', variant: 'destructive' });
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Validation', description: 'Please enter a valid email address.', variant: 'destructive' });
      return false;
    }
    if (password.length < 8) {
      toast({ title: 'Validation', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return false;
    }
    if (idType === 'national_id' && idNumber) {
      const nidaVal = validateRwandanNationalId(idNumber);
      if (!nidaVal.isValid) {
        toast({ title: 'Validation', description: nidaVal.error, variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!tin.trim()) {
      toast({ title: 'Validation', description: 'Please enter your 9-digit RDB / RRA TIN.', variant: 'destructive' });
      return false;
    }
    if (!rdbRecord) {
      toast({ title: 'RDB Verification Required', description: 'Please click "Verify with RDB" to validate your company.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  // Final Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pmInviteToken) {
      if (!authorityConfirmed) {
        toast({
          title: 'Authority Confirmation Required',
          description: 'Please confirm that you are an authorized director or representative.',
          variant: 'destructive',
        });
        return;
      }
      if (!ncsaConsent) {
        toast({
          title: 'Data Protection Consent Required',
          description: 'NCSA Data Protection consent (Law Nº 058/2021) is required under Rwandan law.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const metadata: Record<string, string> = {
        name,
        role,
        national_id: idNumber,
        id_type: idType,
      };

      if (pmInviteToken) {
        metadata.company_id = selectedCompanyId;
      } else {
        metadata.company_name = companyName || rdbRecord?.legalName || 'Rwandan Real Estate Ltd';
        metadata.tin = tin;
        metadata.legal_structure = legalStructure;
        metadata.rwareb_license = rwarebLicense;
        metadata.director_role = directorRole;
        metadata.kyb_verified = 'true';
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Sign up user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: metadata,
        },
      });

      if (error) throw error;

      // Mark PM invite as used if applicable
      if (pmInviteToken && role === 'property_manager') {
        await supabase.functions.invoke('invite-token', {
          body: {
            operation: 'consume_pm',
            token: pmInviteToken,
            email: normalizedEmail,
          },
        });
      }

      // Record KYB Verification in database
      if (!pmInviteToken && rdbRecord) {
        await submitFullKybApplication({
          tin,
          companyName: companyName || rdbRecord.legalName,
          legalStructure,
          applicantName: name,
          idType,
          idNumber: idNumber || '1199680012345678',
          directorRole,
          rdbCertificateUrl: certificateFile ? `rdb-certs/${certificateFile.name}` : undefined,
          rwarebLicenseNumber: rwarebLicense || undefined,
          ncsaDataConsent: true,
        });
      }

      // If email confirmation is required, Supabase returns user without active session
      if (!data.session) {
        setPendingEmail(normalizedEmail);
        setConfirmationPending(true);
        return;
      }

      toast({
        title: '🎉 Account Created & Business Verified',
        description: 'Welcome to FishGate. Your company is authenticated with RDB.',
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      toast({ title: 'Signup failed', description: getErrorMessage(error), variant: 'destructive' });
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
    <div className="relative min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      {/* Top Controls: Language & Theme */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg animate-scale-in py-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden border border-border/80 shadow-lg bg-[#060b18]">
              <img src="/fishgate-mark.png" alt="FishGate" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-2xl text-foreground leading-none block">FishGate</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-primary/80 font-semibold">Property OS</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
            <span>🇷🇼</span>
            <span>RDB Registered & RRA EBM Fiscal Compliant</span>
          </div>
        </div>

        {confirmationPending ? (
          <EmailConfirmationPending
            email={pendingEmail}
            role={role}
            onBackToSignup={() => setConfirmationPending(false)}
            loginPath="/login"
          />
        ) : (
          <Card className="card-shadow-lg border border-border/80 shadow-xl overflow-hidden">
            <CardHeader className="space-y-1.5 text-center bg-card/60 border-b border-border/60 pb-5">
              <CardTitle className="text-xl sm:text-2xl font-bold">
                {pmInviteToken ? 'Complete Property Manager Account' : 'Register Your Property Business'}
              </CardTitle>
              <CardDescription className="text-xs">
                {pmInviteToken
                  ? 'Joining pre-approved property organization'
                  : 'Fast, secure onboarding with automated RDB company verification'}
              </CardDescription>

              {/* Step Progression Bar (Mobile & Web Responsive) */}
              {!pmInviteToken && (
                <div className="pt-3">
                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div className={`p-2 rounded-lg border text-xs transition-all ${
                      step === 1 ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/60 text-muted-foreground'
                    }`}>
                      <span className="block text-[10px] opacity-75">Step 1</span>
                      <span className="truncate block font-medium">1. Your Profile</span>
                    </div>
                    <div className={`p-2 rounded-lg border text-xs transition-all ${
                      step === 2 ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/60 text-muted-foreground'
                    }`}>
                      <span className="block text-[10px] opacity-75">Step 2</span>
                      <span className="truncate block font-medium">2. RDB Check</span>
                    </div>
                    <div className={`p-2 rounded-lg border text-xs transition-all ${
                      step === 3 ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/60 text-muted-foreground'
                    }`}>
                      <span className="block text-[10px] opacity-75">Step 3</span>
                      <span className="truncate block font-medium">3. Law & Files</span>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* ==================================================== */}
                {/* STEP 1: Personal Credentials & Identity (KYC)         */}
                {/* ==================================================== */}
                {step === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Role Selection Tabs */}
                    {!pmInviteToken && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('landlord')}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                            role === 'landlord'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                          }`}
                        >
                          <Building2 className="h-5 w-5" />
                          <span className="text-xs font-semibold">Landlord / Owner</span>
                          <span className="text-[10px] text-center opacity-70">Owns residential/commercial estates</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('property_manager')}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                            role === 'property_manager'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                          }`}
                        >
                          <UserCog className="h-5 w-5" />
                          <span className="text-xs font-semibold">Property Manager</span>
                          <span className="text-[10px] text-center opacity-70">Manages operations & leasing</span>
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium">Full Legal Name (Representative)</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="e.g. Mugisha Jean-Luc"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-10 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="idType" className="text-xs font-medium">Identity Document</Label>
                        <Select value={idType} onValueChange={(val: 'national_id' | 'passport') => setIdType(val)}>
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="national_id">Rwandan National ID (NIDA)</SelectItem>
                            <SelectItem value="passport">International Passport</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="idNumber" className="text-xs font-medium">
                          {idType === 'national_id' ? '16-Digit NIDA Number' : 'Passport Number'}
                        </Label>
                        <Input
                          id="idNumber"
                          type="text"
                          inputMode={idType === 'national_id' ? 'numeric' : 'text'}
                          placeholder={idType === 'national_id' ? '1199680012345678' : 'PC123456'}
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          className="h-10 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="director@company.rw"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        readOnly={!!pmInviteToken}
                        className="h-10 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-10 pr-10 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
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
                              className={`flex items-center gap-1.5 text-[11px] ${
                                req.met ? 'text-emerald-400' : 'text-muted-foreground'
                              }`}
                            >
                              <Check className={`h-3 w-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                              {req.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {pmInviteToken ? (
                      <Button
                        type="submit"
                        className="w-full h-11 bg-primary text-white font-medium"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Complete Registration
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="w-full h-11 bg-primary text-white font-medium gap-2"
                        onClick={() => {
                          if (validateStep1()) setStep(2);
                        }}
                      >
                        Continue to Business Verification
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* ==================================================== */}
                {/* STEP 2: Rwandan Company Lookup (RDB / RRA TIN)        */}
                {/* ==================================================== */}
                {step === 2 && !pmInviteToken && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Rwanda Development Board (RDB) Lookup</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        In Rwanda, your company's RDB registration code is identical to your 9-digit RRA Tax Identification Number (TIN).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="tinInput" className="text-xs font-semibold flex items-center justify-between">
                        <span>RRA TIN / RDB Company Code (9 digits) *</span>
                        <span className="text-[10px] text-muted-foreground font-normal">e.g. 100234567</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="tinInput"
                          type="text"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="100234567"
                          value={tin}
                          onChange={(e) => setTin(e.target.value.replace(/[^0-9]/g, ''))}
                          className="h-10 text-xs font-mono tracking-wider font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRdbLookup}
                          disabled={lookingUpRdb || tin.length < 9}
                          className="h-10 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shrink-0"
                        >
                          {lookingUpRdb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                          Verify with RDB
                        </Button>
                      </div>
                      {rdbLookupError && (
                        <p className="text-xs text-destructive flex items-center gap-1 pt-1">
                          <AlertCircle className="h-3 w-3" /> {rdbLookupError}
                        </p>
                      )}
                    </div>

                    {/* Verified Company Card Preview */}
                    {rdbRecord && (
                      <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-2 animate-fade-in text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            {rdbRecord.legalName}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            RDB Active
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                          <div>
                            <span className="block text-[10px]">TIN / Company Code:</span>
                            <span className="font-mono font-semibold text-foreground">{rdbRecord.tin}</span>
                          </div>
                          <div>
                            <span className="block text-[10px]">Structure:</span>
                            <span className="font-semibold text-foreground">{rdbRecord.legalStructure}</span>
                          </div>
                          <div>
                            <span className="block text-[10px]">Registered Jurisdiction:</span>
                            <span>{rdbRecord.registeredAddress.district}, Kigali</span>
                          </div>
                          <div>
                            <span className="block text-[10px]">Incorporation Date:</span>
                            <span>{rdbRecord.registrationDate}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {role === 'property_manager' && (
                      <div className="space-y-1.5 pt-1">
                        <Label htmlFor="rwarebLicense" className="text-xs font-medium">
                          RWAREB Professional License (Optional for PMs)
                        </Label>
                        <Input
                          id="rwarebLicense"
                          type="text"
                          placeholder="e.g. RWAREB-PM-2026-081"
                          value={rwarebLicense}
                          onChange={(e) => setRwarebLicense(e.target.value)}
                          className="h-10 text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Rwanda Real Estate Brokers Association compliance credential.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/3 h-11 text-xs gap-1.5"
                        onClick={() => setStep(1)}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </Button>
                      <Button
                        type="button"
                        className="w-2/3 h-11 bg-primary text-white font-medium text-xs gap-2"
                        onClick={() => {
                          if (validateStep2()) setStep(3);
                        }}
                      >
                        Confirm & Attach Documents
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ==================================================== */}
                {/* STEP 3: Proof of Authority & Law Nº 058/2021 Consent  */}
                {/* ==================================================== */}
                {step === 3 && !pmInviteToken && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Your Official Role in Company</Label>
                      <Select
                        value={directorRole}
                        onValueChange={(val: typeof directorRole) => setDirectorRole(val)}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Managing Director">Managing Director / Shareholder</SelectItem>
                          <SelectItem value="Board Member">Board Member / Controlling Person</SelectItem>
                          <SelectItem value="Legal Representative">Legal Representative</SelectItem>
                          <SelectItem value="Authorized Property Manager">Authorized Property Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* RDB Certificate File Upload (Mobile & Desktop Friendly) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>Upload RDB Certificate of Domestic Company Registration</span>
                        <span className="text-[10px] text-muted-foreground">PDF or Image</span>
                      </Label>
                      <label className="border-2 border-dashed border-border/80 hover:border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-secondary/30 transition-colors">
                        <Upload className="h-6 w-6 text-primary mb-1.5" />
                        <span className="text-xs font-semibold text-foreground">
                          {certificateFile ? certificateFile.name : 'Tap to select RDB Certificate or take photo'}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {certificateFile ? `${(certificateFile.size / 1024).toFixed(0)} KB · Ready to verify` : 'Lists directors & shareholders issued by Registrar General'}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setCertificateFile(f);
                              toast({ title: 'Certificate Attached', description: f.name });
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Authority Confirmation Checkbox */}
                    <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-border/80 bg-secondary/20">
                      <input
                        type="checkbox"
                        id="authorityCheck"
                        checked={authorityConfirmed}
                        onChange={(e) => setAuthorityConfirmed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="authorityCheck" className="text-xs text-foreground cursor-pointer leading-relaxed">
                        I declare that I am a registered Director, Shareholder, or Authorized Officer of <span className="font-semibold text-primary">{rdbRecord?.legalName || 'this company'}</span>, and the documents provided are authentic.
                      </label>
                    </div>

                    {/* NCSA Data Protection Law Consent Checkbox */}
                    <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-border/80 bg-secondary/20">
                      <input
                        type="checkbox"
                        id="ncsaConsentCheck"
                        checked={ncsaConsent}
                        onChange={(e) => setNcsaConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="ncsaConsentCheck" className="text-xs text-foreground cursor-pointer leading-relaxed">
                        I consent to the collection and programmatic verification of business and identity data in accordance with <span className="font-semibold text-emerald-400">Rwandan Law Nº 058/2021</span> relating to the protection of personal data and privacy (NCSA).
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/3 h-11 text-xs gap-1.5"
                        onClick={() => setStep(2)}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </Button>
                      <Button
                        type="submit"
                        className="w-2/3 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-2 shadow-md"
                        disabled={isSubmitting || !authorityConfirmed || !ncsaConsent}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying with RDB...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Complete & Verify Business
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </form>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 text-center">
                <Link to="/tenant/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Are you a tenant? <span className="font-medium text-primary">Access Tenant Portal -&gt;</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
