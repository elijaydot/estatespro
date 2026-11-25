// src/components/tenants/AddTenantWizard.tsx
// FishGate Design Constitution v1.0 - 8-Step Resident Onboarding Wizard

import React, { useState, useMemo } from 'react';
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Home,
  Check,
  Calendar,
  Shield,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateTenant, type Tenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import {
  calculateTenantCompleteness,
  TENANT_STATUSES,
  EMPLOYMENT_STATUSES,
  CONTACT_METHODS,
  RISK_LEVELS,
} from '@/lib/tenantProfileCompleteness';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface AddTenantWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPropertyId?: string;
  defaultUnitId?: string;
}

const WIZARD_STEPS = [
  { step: 1, id: 'identity', title: 'Identity', icon: User, desc: 'Personal details & ID' },
  { step: 2, id: 'contact', title: 'Contact', icon: Phone, desc: 'Phones, emails & emergency' },
  { step: 3, id: 'address', title: 'Address', icon: MapPin, desc: 'Prior & current residence' },
  { step: 4, id: 'employment', title: 'Employment', icon: Briefcase, desc: 'Income & guarantor' },
  { step: 5, id: 'lease', title: 'Lease & Space', icon: Home, desc: 'Property, unit & dates' },
  { step: 6, id: 'documents', title: 'Documents', icon: FileText, desc: 'Verified attachments' },
  { step: 7, id: 'preferences', title: 'Preferences', icon: Sliders, desc: 'Rules, vehicle & pets' },
  { step: 8, id: 'review', title: 'Review & Create', icon: CheckCircle2, desc: 'Quality audit & publish' },
];

export function AddTenantWizard({
  open,
  onOpenChange,
  defaultPropertyId,
  defaultUnitId,
}: AddTenantWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const createTenant = useCreateTenant();

  const { data: properties = [] } = useProperties();
  const { data: allUnits = [] } = useUnits();

  // Wizard Form State
  const [formData, setFormData] = useState<Partial<Tenant>>({
    status: 'active',
    risk_level: 'low',
    nationality: 'Rwandan',
    preferred_contact_method: 'phone',
    employment_status: 'employed',
    lease_type: 'fixed_term',
    occupancy_type: 'single_family',
    property_id: defaultPropertyId || '',
    unit_id: defaultUnitId || '',
    documents: [],
    additional_occupants: [],
    communication_preferences: { sms: true, email: true, whatsapp: false },
    notes: '',
  });

  // Filter units for selected property
  const availableUnits = useMemo(() => {
    if (!formData.property_id) return [];
    return allUnits.filter((u) => u.property_id === formData.property_id);
  }, [allUnits, formData.property_id]);

  // Live profile completeness
  const completeness = useMemo(() => {
    return calculateTenantCompleteness(formData);
  }, [formData]);

  const updateField = (key: keyof Tenant, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-update combined full name when first or last name changes
      if (key === 'first_name' || key === 'last_name') {
        const first = key === 'first_name' ? value : prev.first_name || '';
        const last = key === 'last_name' ? value : prev.last_name || '';
        next.name = `${first} ${last}`.trim();
      }
      return next;
    });
  };

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (saveAsDraft = false) => {
    if (!formData.name && (!formData.first_name || !formData.last_name)) {
      toast({ title: 'Name required', description: 'Enter at least first and last name', variant: 'destructive' });
      setCurrentStep(1);
      return;
    }

    try {
      const payload: Partial<Tenant> = {
        ...formData,
        status: saveAsDraft ? 'prospective' : formData.status || 'active',
      };

      await createTenant.mutateAsync(payload);
      onOpenChange(false);
      // Reset form
      setCurrentStep(1);
      setFormData({
        status: 'active',
        risk_level: 'low',
        nationality: 'Rwandan',
        preferred_contact_method: 'phone',
        employment_status: 'employed',
        lease_type: 'fixed_term',
        documents: [],
      });
    } catch (err) {
      // Error is toasted in mutation
    }
  };

  // Document add helper
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('national_id');
  const [docUrl, setDocUrl] = useState('');

  const handleAddDocument = () => {
    if (!docTitle.trim() || !docUrl.trim()) return;
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: docTitle.trim(),
      type: docType,
      url: docUrl.trim(),
      uploadedAt: new Date().toISOString(),
    };
    updateField('documents', [...(formData.documents || []), newDoc]);
    setDocTitle('');
    setDocUrl('');
  };

  const handleRemoveDocument = (id: string) => {
    updateField('documents', (formData.documents || []).filter((d) => d.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-border/80 shadow-2xl">
        {/* Wizard Header */}
        <DialogHeader className="p-6 border-b border-border/70 bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>Onboard New Resident</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Multi-step onboarding for resident relationships, lease linkage, and KYC records.
              </DialogDescription>
            </div>

            {/* Profile Completeness Score */}
            <div className="flex items-center gap-3 bg-card px-3.5 py-1.5 rounded-xl border border-border/80 shadow-2xs self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Completeness
                </span>
                <span className="text-xs font-bold text-foreground">
                  {completeness.score}%
                </span>
              </div>
              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    completeness.score >= 80 ? 'bg-emerald-500' : completeness.score >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${completeness.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="mt-5 grid grid-cols-4 sm:grid-cols-8 gap-2">
            {WIZARD_STEPS.map((s) => {
              const isDone = currentStep > s.step;
              const isCurrent = currentStep === s.step;
              const IconComp = s.icon;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setCurrentStep(s.step)}
                  className={cn(
                    'p-2 rounded-xl text-left border transition-all flex flex-col gap-1',
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-card text-muted-foreground border-border/60 hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <IconComp className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-mono font-bold">0{s.step}</span>
                  </div>
                  <span className="text-[11px] font-semibold truncate leading-tight">
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Wizard Step Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: IDENTITY */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 1: Resident Identity</h3>
                <p className="text-xs text-muted-foreground">Legal name, identification numbers, and nationality.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    placeholder="e.g. Jean"
                    value={formData.first_name || ''}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Middle Name</Label>
                  <Input
                    placeholder="e.g. Claude"
                    value={formData.middle_name || ''}
                    onChange={(e) => updateField('middle_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name *</Label>
                  <Input
                    placeholder="e.g. Mugabo"
                    value={formData.last_name || ''}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Name / Alias</Label>
                  <Input
                    placeholder="e.g. JC"
                    value={formData.preferred_name || ''}
                    onChange={(e) => updateField('preferred_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => updateField('date_of_birth', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <Select value={formData.gender || ''} onValueChange={(val) => updateField('gender', val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nationality</Label>
                  <Input
                    placeholder="e.g. Rwandan"
                    value={formData.nationality || ''}
                    onChange={(e) => updateField('nationality', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">National ID Number (16 Digits)</Label>
                  <Input
                    placeholder="1 1990 8 0012345 0 12"
                    value={formData.national_id || ''}
                    onChange={(e) => updateField('national_id', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Passport Number (If applicable)</Label>
                  <Input
                    placeholder="e.g. PC123456"
                    value={formData.passport_number || ''}
                    onChange={(e) => updateField('passport_number', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Resident Photo URL</Label>
                <Input
                  placeholder="https://..."
                  value={formData.avatar_url || ''}
                  onChange={(e) => updateField('avatar_url', e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 2: Contact Information</h3>
                <p className="text-xs text-muted-foreground">Primary phones, emails, and emergency contacts.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Phone *</Label>
                  <Input
                    placeholder="+250 788 123 456"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Secondary Phone</Label>
                  <Input
                    placeholder="+250 730 000 000"
                    value={formData.secondary_phone || ''}
                    onChange={(e) => updateField('secondary_phone', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">WhatsApp Number</Label>
                  <Input
                    placeholder="+250 788 123 456"
                    value={formData.whatsapp_number || ''}
                    onChange={(e) => updateField('whatsapp_number', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Email *</Label>
                  <Input
                    type="email"
                    placeholder="resident@example.com"
                    value={formData.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alternative Email</Label>
                  <Input
                    type="email"
                    placeholder="alt.resident@example.com"
                    value={formData.alternative_email || ''}
                    onChange={(e) => updateField('alternative_email', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Emergency Contact Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Contact Name</Label>
                    <Input
                      placeholder="e.g. Marie Mugabo"
                      value={formData.emergency_contact || ''}
                      onChange={(e) => updateField('emergency_contact', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      placeholder="e.g. Spouse / Sibling"
                      value={formData.emergency_contact_relationship || ''}
                      onChange={(e) => updateField('emergency_contact_relationship', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Emergency Phone</Label>
                    <Input
                      placeholder="+250 788 000 000"
                      value={formData.emergency_phone || ''}
                      onChange={(e) => updateField('emergency_phone', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS INFORMATION */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 3: Address & Residence History</h3>
                <p className="text-xs text-muted-foreground">Prior addresses and current postal information.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Current / Recent Residential Address</Label>
                  <Textarea
                    placeholder="KG 123 St, Kimihurura, Gasabo, Kigali"
                    value={formData.current_address || ''}
                    onChange={(e) => updateField('current_address', e.target.value)}
                    className="text-xs"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Previous Address</Label>
                  <Textarea
                    placeholder="House 45, Nyarutarama, Kigali"
                    value={formData.previous_address || ''}
                    onChange={(e) => updateField('previous_address', e.target.value)}
                    className="text-xs"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employer Business Address</Label>
                  <Input
                    placeholder="Kigali Heights, 4th Floor, Gasabo"
                    value={formData.employer_address || ''}
                    onChange={(e) => updateField('employer_address', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mailing / Postal Address</Label>
                  <Input
                    placeholder="P.O. Box 1234, Kigali, Rwanda"
                    value={formData.mailing_address || ''}
                    onChange={(e) => updateField('mailing_address', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EMPLOYMENT & FINANCIAL PROFILE */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 4: Employment & Financial Profile</h3>
                <p className="text-xs text-muted-foreground">Occupation, monthly income verification, and guarantor.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employer / Organization</Label>
                  <Input
                    placeholder="e.g. Bank of Kigali"
                    value={formData.employer || ''}
                    onChange={(e) => updateField('employer', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Employment Status</Label>
                  <Select
                    value={formData.employment_status || 'employed'}
                    onValueChange={(val) => updateField('employment_status', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUSES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Occupation / Title</Label>
                  <Input
                    placeholder="e.g. Software Engineer"
                    value={formData.occupation || ''}
                    onChange={(e) => updateField('occupation', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Income (RWF)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1500000"
                    value={formData.monthly_income || ''}
                    onChange={(e) => updateField('monthly_income', Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Risk Classification</Label>
                  <Select
                    value={formData.risk_level || 'low'}
                    onValueChange={(val) => updateField('risk_level', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_LEVELS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Guarantor Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Guarantor Name</Label>
                    <Input
                      placeholder="e.g. Patrick Karekezi"
                      value={formData.guarantor_name || ''}
                      onChange={(e) => updateField('guarantor_name', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Guarantor Phone / Email</Label>
                    <Input
                      placeholder="+250 788 111 222"
                      value={formData.guarantor_contact || ''}
                      onChange={(e) => updateField('guarantor_contact', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      placeholder="e.g. Employer / Parent"
                      value={formData.guarantor_relationship || ''}
                      onChange={(e) => updateField('guarantor_relationship', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: LEASE & SPACE ASSIGNMENT */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 5: Lease & Unit Space</h3>
                <p className="text-xs text-muted-foreground">Assign building, rentable unit, rent amounts, and lease duration.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Assigned Property *</Label>
                  <Select
                    value={formData.property_id || ''}
                    onValueChange={(val) => {
                      updateField('property_id', val);
                      updateField('unit_id', '');
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select building/property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Assigned Unit *</Label>
                  <Select
                    value={formData.unit_id || ''}
                    onValueChange={(val) => {
                      updateField('unit_id', val);
                      const targetUnit = availableUnits.find((u) => u.id === val);
                      if (targetUnit && targetUnit.rent_amount) {
                        updateField('monthly_rent', Number(targetUnit.rent_amount));
                      }
                    }}
                    disabled={!formData.property_id}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={formData.property_id ? 'Select unit' : 'Choose property first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          Unit {u.unit_number} (Floor {u.floor || 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Move-In Date</Label>
                  <Input
                    type="date"
                    value={formData.move_in_date || ''}
                    onChange={(e) => updateField('move_in_date', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lease End Date</Label>
                  <Input
                    type="date"
                    value={formData.lease_end_date || ''}
                    onChange={(e) => updateField('lease_end_date', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expected Move-Out Date</Label>
                  <Input
                    type="date"
                    value={formData.expected_move_out_date || ''}
                    onChange={(e) => updateField('expected_move_out_date', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Rent (RWF)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_rent || 0}
                    onChange={(e) => updateField('monthly_rent', Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Security Deposit (RWF)</Label>
                  <Input
                    type="number"
                    value={formData.security_deposit || 0}
                    onChange={(e) => updateField('security_deposit', Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DOCUMENTS */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 6: Verified Documents & KYC</h3>
                <p className="text-xs text-muted-foreground">National IDs, signed lease agreements, employment proof.</p>
              </div>

              {/* Add document form */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-3">
                <span className="text-xs font-bold text-foreground">Attach Document URL</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Document title (e.g. Signed Lease)"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national_id">National ID / Passport</SelectItem>
                      <SelectItem value="signed_lease">Signed Lease Agreement</SelectItem>
                      <SelectItem value="employment_proof">Employment Proof</SelectItem>
                      <SelectItem value="bank_statement">Bank Statement</SelectItem>
                      <SelectItem value="other">Other Attachment</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="File URL (https://...)"
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                      className="h-9 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddDocument}
                      className="h-9 text-xs shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-2">
                {(!formData.documents || formData.documents.length === 0) ? (
                  <div className="p-6 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                    No verified documents attached yet. Attach at least one KYC document.
                  </div>
                ) : (
                  formData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-bold text-foreground">{doc.title}</span>
                          <span className="text-muted-foreground ml-2 capitalize">({doc.type.replace('_', ' ')})</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 7: PREFERENCES & NOTES */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 7: Preferences & Operational Rules</h3>
                <p className="text-xs text-muted-foreground">Communication channels, vehicle info, pets, and notes.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Contact Method</Label>
                  <Select
                    value={formData.preferred_contact_method || 'phone'}
                    onValueChange={(val) => updateField('preferred_contact_method', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_METHODS.map((cm) => (
                        <SelectItem key={cm.value} value={cm.value}>
                          {cm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tenant Lifecycle Status</Label>
                  <Select
                    value={formData.status || 'active'}
                    onValueChange={(val) => updateField('status', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENANT_STATUSES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Vehicle Information (Plates / Model)</Label>
                  <Input
                    placeholder="e.g. Toyota RAV4 (RAD 123 A)"
                    value={formData.vehicle_information || ''}
                    onChange={(e) => updateField('vehicle_information', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pet Information</Label>
                  <Input
                    placeholder="e.g. 1 Domestic Cat"
                    value={formData.pet_information || ''}
                    onChange={(e) => updateField('pet_information', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Operational Notes & Special Instructions</Label>
                <Textarea
                  placeholder="Any special access instructions, gate pass info, or relationship history..."
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="text-xs"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* STEP 8: REVIEW & CREATE */}
          {currentStep === 8 && (
            <div className="space-y-5">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-sm font-bold text-foreground">Step 8: Review & Publish Resident</h3>
                <p className="text-xs text-muted-foreground">Verify completeness, validation checks, and operational profile.</p>
              </div>

              {/* Quality Audit Summary */}
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Profile Quality Audit</span>
                  <Badge
                    className={cn(
                      'text-xs font-bold px-2 py-0.5',
                      completeness.score >= 80 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                    )}
                  >
                    {completeness.score}% Complete
                  </Badge>
                </div>

                {completeness.missingFields.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground block">
                      Recommended missing fields to reach 100%:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {completeness.missingFields.map((f, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                          • {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resident Overview Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                  <span className="font-bold text-foreground block">Resident Information</span>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Name:</span>
                    <span className="font-bold text-foreground">{formData.name || '—'}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Phone:</span>
                    <span className="text-foreground">{formData.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Email:</span>
                    <span className="text-foreground">{formData.email || '—'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                  <span className="font-bold text-foreground block">Lease & Space</span>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Property:</span>
                    <span className="text-foreground">
                      {properties.find((p) => p.id === formData.property_id)?.name || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Unit:</span>
                    <span className="text-foreground">
                      {allUnits.find((u) => u.id === formData.unit_id)?.unit_number || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Monthly Rent:</span>
                    <span className="font-mono font-bold text-foreground">
                      {Number(formData.monthly_rent || 0).toLocaleString()} RWF
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-border/70 bg-muted/20 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="text-xs h-9 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSubmit(true)}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Save as Draft
            </Button>

            {currentStep < 8 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="text-xs h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSubmit(false)}
                disabled={createTenant.isPending}
                className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{createTenant.isPending ? 'Publishing...' : 'Create Resident'}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
