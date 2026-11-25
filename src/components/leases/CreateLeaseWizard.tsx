// src/components/leases/CreateLeaseWizard.tsx
// FishGate Design Constitution v1.0 - 7-Step Enterprise Lease Creation Wizard

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  RefreshCw,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Home,
  User,
  Plus,
  Trash2,
  Save,
  Check,
  Send,
  Upload,
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
import { useCreateLease, generateLeaseNumber, type Lease } from '@/hooks/useLeases';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useSettings } from '@/contexts/useSettings';
import {
  calculateLeaseHealth,
  LEASE_TYPES,
  BILLING_FREQUENCIES,
  RENEWAL_STATUSES,
} from '@/lib/leaseHealthModel';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface CreateLeaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPropertyId?: string;
  defaultUnitId?: string;
  defaultTenantId?: string;
  onSuccess?: () => void;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Basics', label: 'Lease Basics', icon: FileText },
  { id: 2, title: 'Dates & Terms', label: 'Dates & Terms', icon: Calendar },
  { id: 3, title: 'Financials', label: 'Financial Terms', icon: DollarSign },
  { id: 4, title: 'Renewals', label: 'Renewal Rules', icon: RefreshCw },
  { id: 5, title: 'Compliance', label: 'Compliance & Docs', icon: ShieldCheck },
  { id: 6, title: 'Special Terms', label: 'Special Clauses', icon: Sliders },
  { id: 7, title: 'Review', label: 'Review & Publish', icon: CheckCircle2 },
];

const defaultTermsTemplate = `STANDARD STATUTORY RESIDENTIAL LEASE AGREEMENT

1. PREMISES & OCCUPANCY: The Landlord grants and the Tenant accepts occupancy of the specified unit solely for lawful residential use.
2. RENT OBLIGATIONS: Rent is payable in advance without offset on or before the due date as defined in the payment terms.
3. SECURITY DEPOSIT: The security deposit protects against unpaid liabilities or property damages beyond reasonable wear and tear.
4. PEACEFUL ENJOYMENT & MAINTENANCE: The Tenant shall maintain the unit in sanitary condition and respect quiet hours.
5. ACCESS BY LANDLORD: The Landlord may enter upon reasonable advance notice for inspections or essential maintenance.
6. DEFAULT & TERMINATION: Breach of terms or failure to settle rent after the designated grace period constitutes grounds for lease termination.`;

export function CreateLeaseWizard({
  open,
  onOpenChange,
  defaultPropertyId = '',
  defaultUnitId = '',
  defaultTenantId = '',
  onSuccess,
}: CreateLeaseWizardProps) {
  const { formatCurrency, settings } = useSettings();
  const createLease = useCreateLease();

  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Lease>>({
    lease_number: generateLeaseNumber(),
    property_id: defaultPropertyId,
    unit_id: defaultUnitId,
    tenant_id: defaultTenantId,
    lease_type: 'residential',
    lease_category: 'standard',
    status: 'draft',
    renewal_status: 'not_started',
    lease_description: '',
    start_date: '',
    end_date: '',
    move_in_date: '',
    expected_move_out_date: '',
    renewal_date: '',
    notice_period_days: 30,
    grace_period_days: 5,
    occupancy_start_date: '',
    occupancy_end_date: '',
    monthly_rent: 0,
    security_deposit: 0,
    advance_rent: 0,
    utility_charges: 0,
    parking_charges: 0,
    service_charges: 0,
    late_fee_amount: 0,
    billing_frequency: 'monthly',
    annual_escalation_pct: 0,
    currency: settings.currency || 'RWF',
    payment_terms: 'Rent payable on or before the 1st day of each month via electronic bank transfer or MoMo.',
    is_renewable: true,
    renewal_type: 'standard',
    renewal_period_months: 12,
    auto_renewal: false,
    renewal_reminder_days: 60,
    renewal_notes: '',
    pets_allowed: false,
    subletting_allowed: false,
    guest_policy: 'Guests permitted for up to 14 consecutive days without prior management registration.',
    parking_allocation: '1 assigned vehicle bay.',
    property_restrictions: 'No commercial business operations, no hazardous chemicals, strict quiet hours after 10:00 PM.',
    custom_clauses: '',
    terms: defaultTermsTemplate,
    special_conditions: '',
    documents: [],
  });

  // Uploaded document item helper
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<string>('contract');
  const [newDocUrl, setNewDocUrl] = useState('');

  // Auto-sync property unit selection
  useEffect(() => {
    if (defaultPropertyId) {
      setFormData((prev) => ({ ...prev, property_id: defaultPropertyId }));
    }
    if (defaultUnitId) {
      setFormData((prev) => ({ ...prev, unit_id: defaultUnitId }));
    }
    if (defaultTenantId) {
      setFormData((prev) => ({ ...prev, tenant_id: defaultTenantId }));
    }
  }, [defaultPropertyId, defaultUnitId, defaultTenantId]);

  // Load draft from localStorage when opening
  useEffect(() => {
    if (open) {
      const savedDraft = localStorage.getItem('fishgate-lease-wizard-draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData((prev) => ({ ...prev, ...parsed }));
        } catch {
          // ignore
        }
      }
    }
  }, [open]);

  // Options
  const propertyOptions = useMemo(() => {
    return properties.map((p) => ({
      value: p.id,
      label: p.name,
      description: `${p.city || ''}, ${p.country || ''}`,
    }));
  }, [properties]);

  const unitOptions = useMemo(() => {
    const list = formData.property_id
      ? units.filter((u) => u.property_id === formData.property_id)
      : units;
    return list.map((u) => ({
      value: u.id,
      label: `Unit ${u.unit_number}`,
      description: u.rent_amount ? formatCurrency(u.rent_amount) : 'Rent not set',
    }));
  }, [units, formData.property_id, formatCurrency]);

  const tenantOptions = useMemo(() => {
    return tenants.map((t) => ({
      value: t.id,
      label: t.name,
      description: t.email || t.phone || '',
    }));
  }, [tenants]);

  // Auto-fill unit rent and deposit when unit is selected
  const handleUnitSelect = (unitId: string) => {
    const found = units.find((u) => u.id === unitId);
    setFormData((prev) => ({
      ...prev,
      unit_id: unitId,
      monthly_rent: found?.rent_amount || prev.monthly_rent || 0,
      security_deposit: found?.deposit_amount || found?.rent_amount || prev.security_deposit || 0,
    }));
  };

  // Live health and completeness calculation
  const health = useMemo(() => {
    return calculateLeaseHealth(formData);
  }, [formData]);

  // Save draft helper
  const handleSaveDraft = () => {
    localStorage.setItem('fishgate-lease-wizard-draft', JSON.stringify(formData));
    toast({
      title: 'Draft Saved Locally',
      description: 'Your lease creation progress has been preserved on this device.',
    });
  };

  // Add attached document
  const handleAddDocument = () => {
    if (!newDocName.trim()) {
      toast({ title: 'Document Title Required', description: 'Enter a name for this document.' });
      return;
    }
    const newDoc = {
      id: crypto.randomUUID(),
      name: newDocName.trim(),
      type: newDocType as any,
      url: newDocUrl.trim() || 'https://storage.fishgate.estate/contracts/sample-agreement.pdf',
      uploaded_at: new Date().toISOString(),
    };
    setFormData((prev) => ({
      ...prev,
      documents: [...(prev.documents || []), newDoc],
    }));
    setNewDocName('');
    setNewDocUrl('');
  };

  const handleRemoveDocument = (docId: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((d) => d.id !== docId),
    }));
  };

  // Step Validation
  const canProceed = useMemo(() => {
    if (currentStep === 1) {
      return Boolean(formData.property_id && formData.unit_id && formData.tenant_id);
    }
    if (currentStep === 2) {
      return Boolean(formData.start_date && formData.end_date);
    }
    if (currentStep === 3) {
      return Boolean(formData.monthly_rent && Number(formData.monthly_rent) > 0);
    }
    return true;
  }, [currentStep, formData]);

  // Final Submission
  const handleSubmit = async (targetStatus: string = 'active') => {
    if (!formData.property_id || !formData.unit_id || !formData.tenant_id) {
      toast({
        title: 'Missing Core Information',
        description: 'Please ensure property, unit, and resident are specified.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createLease.mutateAsync({
        ...formData,
        status: targetStatus,
        document_url: formData.documents?.[0]?.url || null,
      });

      // Clear draft on successful creation
      localStorage.removeItem('fishgate-lease-wizard-draft');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto p-0 flex flex-col gap-0 border-border shadow-xl">
        {/* Wizard Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Create Lease Agreement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                7-Step Structured Workflow • FishGate Design Constitution v1.0
              </DialogDescription>
            </div>

            {/* Completeness / Health Meter Badge */}
            <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
              <span className="text-[11px] font-medium text-muted-foreground">Health:</span>
              <span
                className={cn(
                  'text-xs font-bold',
                  health.score >= 80 ? 'text-emerald-600' : health.score >= 50 ? 'text-amber-600' : 'text-rose-600'
                )}
              >
                {health.score}%
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0 h-4">
                {health.grade}
              </Badge>
            </div>
          </div>

          {/* Step Progress Pills */}
          <div className="grid grid-cols-7 gap-1.5 mt-4 pt-1">
            {WIZARD_STEPS.map((step) => {
              const IconComp = step.icon;
              const isCurrent = currentStep === step.id;
              const isPast = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    'flex flex-col items-center text-center p-1.5 rounded-md transition-all text-[10px] font-medium',
                    isCurrent
                      ? 'bg-primary/10 text-primary border border-primary/30 font-semibold'
                      : isPast
                      ? 'bg-muted/40 text-muted-foreground hover:bg-muted'
                      : 'text-muted-foreground/60 opacity-60'
                  )}
                >
                  <IconComp className="h-3.5 w-3.5 mb-1 shrink-0" />
                  <span className="truncate w-full">{step.title}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Wizard Step Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* STEP 1: LEASE BASICS */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-border pb-2">
                <h4 className="text-sm font-semibold text-foreground">Step 1: Lease Basics</h4>
                <p className="text-xs text-muted-foreground">
                  Assign the core property, rentable space, resident, and legal lease category.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lease Reference Number *</Label>
                  <Input
                    value={formData.lease_number || ''}
                    onChange={(e) => setFormData({ ...formData, lease_number: e.target.value })}
                    placeholder="LS-2026-XXXX"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Lease Type *</Label>
                  <Select
                    value={formData.lease_type || 'residential'}
                    onValueChange={(val) => setFormData({ ...formData, lease_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select lease type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEASE_TYPES.map((lt) => (
                        <SelectItem key={lt.value} value={lt.value} className="text-xs">
                          {lt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Property *</Label>
                  <SearchableSelect
                    options={propertyOptions}
                    value={formData.property_id || ''}
                    onValueChange={(val) => setFormData({ ...formData, property_id: val, unit_id: '' })}
                    placeholder="Select property..."
                    searchPlaceholder="Search properties..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Rentable Unit *</Label>
                  <SearchableSelect
                    options={unitOptions}
                    value={formData.unit_id || ''}
                    onValueChange={handleUnitSelect}
                    placeholder="Select unit..."
                    searchPlaceholder="Search units..."
                    disabled={!formData.property_id}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Resident / Tenant *</Label>
                  <SearchableSelect
                    options={tenantOptions}
                    value={formData.tenant_id || ''}
                    onValueChange={(val) => setFormData({ ...formData, tenant_id: val })}
                    placeholder="Select resident..."
                    searchPlaceholder="Search residents..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Lease Category</Label>
                  <Select
                    value={formData.lease_category || 'standard'}
                    onValueChange={(val) => setFormData({ ...formData, lease_category: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard" className="text-xs">Standard Term Agreement</SelectItem>
                      <SelectItem value="corporate" className="text-xs">Corporate Company Lease</SelectItem>
                      <SelectItem value="sublease" className="text-xs">Sublease Assignment</SelectItem>
                      <SelectItem value="student" className="text-xs">Student Tenancy</SelectItem>
                      <SelectItem value="diplomatic" className="text-xs">Diplomatic Clause Lease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Agreement Description / Management Notes</Label>
                <Textarea
                  rows={2}
                  value={formData.lease_description || ''}
                  onChange={(e) => setFormData({ ...formData, lease_description: e.target.value })}
                  placeholder="Summary of primary objectives, resident profile notes, or corporate tenant billing contacts..."
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: DATES & TERMS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-border pb-2">
                <h4 className="text-sm font-semibold text-foreground">Step 2: Dates & Tenancy Horizon</h4>
                <p className="text-xs text-muted-foreground">
                  Define the contractual term duration, occupancy handover, notice timeline, and grace periods.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lease Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        start_date: e.target.value,
                        move_in_date: formData.move_in_date || e.target.value,
                        occupancy_start_date: formData.occupancy_start_date || e.target.value,
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Lease End Date *</Label>
                  <Input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        end_date: e.target.value,
                        expected_move_out_date: formData.expected_move_out_date || e.target.value,
                        occupancy_end_date: formData.occupancy_end_date || e.target.value,
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Key Handover / Move-in Date</Label>
                  <Input
                    type="date"
                    value={formData.move_in_date || ''}
                    onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Expected Move-Out Date</Label>
                  <Input
                    type="date"
                    value={formData.expected_move_out_date || ''}
                    onChange={(e) => setFormData({ ...formData, expected_move_out_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Notice Period (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.notice_period_days ?? 30}
                    onChange={(e) =>
                      setFormData({ ...formData, notice_period_days: parseInt(e.target.value) || 0 })
                    }
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Standard: 30–60 days</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Grace Period (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.grace_period_days ?? 5}
                    onChange={(e) =>
                      setFormData({ ...formData, grace_period_days: parseInt(e.target.value) || 0 })
                    }
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Days before late fee applies</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Renewal Decision Date</Label>
                  <Input
                    type="date"
                    value={formData.renewal_date || ''}
                    onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Target negotiation date</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINANCIAL TERMS */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-border pb-2">
                <h4 className="text-sm font-semibold text-foreground">Step 3: Financial Commitments & Billing</h4>
                <p className="text-xs text-muted-foreground">
                  Specify agreed rental rates, deposits, ancillary fees, escalation parameters, and currency.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Monthly Rent ({formData.currency || 'RWF'}) *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.monthly_rent || ''}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })}
                    placeholder="350000"
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Security Deposit ({formData.currency || 'RWF'})</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.security_deposit || ''}
                    onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
                    placeholder="350000"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Advance Rent Paid</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.advance_rent || ''}
                    onChange={(e) => setFormData({ ...formData, advance_rent: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Utility Surcharge ({formData.currency || 'RWF'})</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.utility_charges || ''}
                    onChange={(e) => setFormData({ ...formData, utility_charges: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Parking Fee ({formData.currency || 'RWF'})</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.parking_charges || ''}
                    onChange={(e) => setFormData({ ...formData, parking_charges: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Late Fee Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.late_fee_amount || ''}
                    onChange={(e) => setFormData({ ...formData, late_fee_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="25000"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Billing Frequency</Label>
                  <Select
                    value={formData.billing_frequency || 'monthly'}
                    onValueChange={(val) => setFormData({ ...formData, billing_frequency: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_FREQUENCIES.map((bf) => (
                        <SelectItem key={bf.value} value={bf.value} className="text-xs">
                          {bf.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Annual Escalation (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.annual_escalation_pct || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, annual_escalation_pct: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="5.0"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Billing Currency</Label>
                  <Input
                    value={formData.currency || 'RWF'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    placeholder="RWF"
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Payment Instructions & Terms</Label>
                <Textarea
                  rows={2}
                  value={formData.payment_terms || ''}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="Banking channel details, mobile money merchant codes, due date rules..."
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: RENEWAL SETTINGS */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-border pb-2">
                <h4 className="text-sm font-semibold text-foreground">Step 4: Renewal Settings & Automation</h4>
                <p className="text-xs text-muted-foreground">
                  Configure proactive renewal reminder cycles, extension terms, and automatic escalation clauses.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Allow Term Renewal</Label>
                    <input
                      type="checkbox"
                      checked={formData.is_renewable ?? true}
                      onChange={(e) => setFormData({ ...formData, is_renewable: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Allows resident to request or receive formal lease extensions upon expiration.
                  </p>
                </div>

                <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Automatic Rollover</Label>
                    <input
                      type="checkbox"
                      checked={formData.auto_renewal ?? false}
                      onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically transitions to a month-to-month agreement if no exit notice is submitted.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Renewal Extension Period</Label>
                  <Select
                    value={String(formData.renewal_period_months || 12)}
                    onValueChange={(val) =>
                      setFormData({ ...formData, renewal_period_months: parseInt(val) || 12 })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6" className="text-xs">6 Months</SelectItem>
                      <SelectItem value="12" className="text-xs">12 Months (Standard 1 Year)</SelectItem>
                      <SelectItem value="24" className="text-xs">24 Months (2 Years)</SelectItem>
                      <SelectItem value="36" className="text-xs">36 Months (3 Years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Renewal Reminder Horizon</Label>
                  <Select
                    value={String(formData.renewal_reminder_days || 60)}
                    onValueChange={(val) =>
                      setFormData({ ...formData, renewal_reminder_days: parseInt(val) || 60 })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Reminder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30" className="text-xs">30 Days Before End</SelectItem>
                      <SelectItem value="60" className="text-xs">60 Days Before End (Recommended)</SelectItem>
                      <SelectItem value="90" className="text-xs">90 Days Before End</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Renewal Status Initial</Label>
                  <Select
                    value={formData.renewal_status || 'not_started'}
                    onValueChange={(val) => setFormData({ ...formData, renewal_status: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {RENEWAL_STATUSES.map((rs) => (
                        <SelectItem key={rs.value} value={rs.value} className="text-xs">
                          {rs.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Renewal Notes & Escalation Criteria</Label>
                <Textarea
                  rows={2}
                  value={formData.renewal_notes || ''}
                  onChange={(e) => setFormData({ ...formData, renewal_notes: e.target.value })}
                  placeholder="Agreed renewal rental adjustment cap, tenant tenure loyalty terms..."
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 5: COMPLIANCE & DOCUMENTATION */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-border pb-2">
                <h4 className="text-sm font-semibold text-foreground">Step 5: Compliance, Documents & Addenda</h4>
                <p className="text-xs text-muted-foreground">
                  Attach signed executed contracts, resident identification, proof of income, and statutory terms.
                </p>
              </div>

              {/* Document upload / attachment input */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <p className="text-xs font-semibold text-foreground">Attach Contract or Compliance Document</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Input
                    placeholder="Document Name (e.g. Signed Lease)"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Select value={newDocType} onValueChange={setNewDocType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Doc Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract" className="text-xs">Executed Lease Contract</SelectItem>
                      <SelectItem value="id_card" className="text-xs">Tenant National ID / Passport</SelectItem>
                      <SelectItem value="guarantor" className="text-xs">Guarantor Guarantee Letter</SelectItem>
                      <SelectItem value="insurance" className="text-xs">Resident Liability Insurance</SelectItem>
                      <SelectItem value="certificate" className="text-xs">Compliance Certificate</SelectItem>
                      <SelectItem value="addendum" className="text-xs">Special Addendum</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleAddDocument}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Attach Document
                  </Button>
                </div>

                {/* List of attached documents */}
                {(formData.documents || []).length > 0 ? (
                  <div className="space-y-1.5 pt-2 border-t border-border/80">
                    {formData.documents!.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 bg-card rounded border border-border text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-medium text-foreground truncate">{doc.name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0">
                            {doc.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveDocument(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    No physical or digital PDF documents attached yet.
                  </p>
                )}
              </div>

              {/* Statutory Terms & Conditions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Statutory Lease Terms & Clauses</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-primary"
                    onClick={() => setFormData({ ...formData, terms: defaultTermsTemplate })}
                  >
                    Load Standard Template
                  </Button>
                </div>
                <Textarea
                  rows={6}
                  value={formData.terms || ''}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Paste legal agreement articles..."
                  className="text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* STEP 6: SPECIAL CONDITIONS */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-border pb-2">
                <h4 className="text-sm font-semibold text-foreground">Step 6: Special Conditions & House Rules</h4>
                <p className="text-xs text-muted-foreground">
                  Define community regulations, pet policies, subletting privileges, and customized stipulations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Pet Policy Permitted</Label>
                    <input
                      type="checkbox"
                      checked={formData.pets_allowed ?? false}
                      onChange={(e) => setFormData({ ...formData, pets_allowed: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Grants permission to keep domestic pets subject to estate quiet guidelines.
                  </p>
                </div>

                <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Subletting Privileges</Label>
                    <input
                      type="checkbox"
                      checked={formData.subletting_allowed ?? false}
                      onChange={(e) => setFormData({ ...formData, subletting_allowed: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Allows tenant to assign or sublet premises upon written management approval.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Guest Policy</Label>
                  <Input
                    value={formData.guest_policy || ''}
                    onChange={(e) => setFormData({ ...formData, guest_policy: e.target.value })}
                    placeholder="Guest duration limits..."
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Parking Bay Allocation</Label>
                  <Input
                    value={formData.parking_allocation || ''}
                    onChange={(e) => setFormData({ ...formData, parking_allocation: e.target.value })}
                    placeholder="e.g. Bay P-12, Basement 1"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Property Restrictions</Label>
                <Input
                  value={formData.property_restrictions || ''}
                  onChange={(e) => setFormData({ ...formData, property_restrictions: e.target.value })}
                  placeholder="Noise curfews, exterior alterations, commercial restrictions..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Custom Special Conditions & Additional Covenants</Label>
                <Textarea
                  rows={3}
                  value={formData.special_conditions || ''}
                  onChange={(e) => setFormData({ ...formData, special_conditions: e.target.value })}
                  placeholder="Any unique stipulations agreed between landlord and resident..."
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW & PUBLISH */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-border pb-2">
                <h4 className="text-sm font-semibold text-foreground">Step 7: Final Review & Activation</h4>
                <p className="text-xs text-muted-foreground">
                  Verify agreement summary and legal compliance parameters before activating tenancy.
                </p>
              </div>

              {/* Health Score Banner */}
              <div
                className={cn(
                  'p-4 rounded-xl border flex items-center justify-between',
                  health.score >= 80
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200'
                    : health.score >= 50
                    ? 'border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200'
                    : 'border-rose-500/30 bg-rose-500/5 text-rose-900 dark:text-rose-200'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-bold text-sm">
                      Agreement Health: {health.score}% ({health.grade})
                    </span>
                  </div>
                  {health.missingItems.length > 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Missing: {health.missingItems.join(', ')}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      All required business terms, spaces, and dates are fully validated.
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider">ACV Committed</p>
                  <p className="text-base font-bold text-foreground">
                    {formatCurrency((Number(formData.monthly_rent) || 0) * 12)}/yr
                  </p>
                </div>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-card rounded-xl border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Lease Ref</span>
                  <span className="font-semibold text-foreground font-mono">{formData.lease_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Resident</span>
                  <span className="font-semibold text-foreground truncate block">
                    {tenants.find((t) => t.id === formData.tenant_id)?.name || 'Not Selected'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Property / Space</span>
                  <span className="font-semibold text-foreground truncate block">
                    {properties.find((p) => p.id === formData.property_id)?.name || 'Property'} •{' '}
                    Unit {units.find((u) => u.id === formData.unit_id)?.unit_number || 'Unit'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Monthly Rent</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(formData.monthly_rent || 0)}/mo
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Term Duration</span>
                  <span className="font-medium text-foreground">
                    {formData.start_date || 'N/A'} → {formData.end_date || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Deposit</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(formData.security_deposit || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Renewal Mode</span>
                  <span className="font-medium text-foreground capitalize">
                    {formData.renewal_type || 'Standard'} ({formData.renewal_period_months || 12}m)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Notice Window</span>
                  <span className="font-medium text-foreground">
                    {formData.notice_period_days || 30} Days
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Actions */}
        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between sticky bottom-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handleSaveDraft}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save Draft
            </Button>
            {currentStep > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                size="sm"
                className="h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!canProceed}
                onClick={() => setCurrentStep((s) => Math.min(7, s + 1))}
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  disabled={createLease.isPending}
                  onClick={() => handleSubmit('draft')}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  disabled={createLease.isPending}
                  onClick={() => handleSubmit('pending_signature')}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Send for Signature
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  disabled={createLease.isPending}
                  onClick={() => handleSubmit('active')}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {createLease.isPending ? 'Activating...' : 'Activate Lease'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
