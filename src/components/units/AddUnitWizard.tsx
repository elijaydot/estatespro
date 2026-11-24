// src/components/units/AddUnitWizard.tsx
// FishGate Design Constitution v1.0 - 7-Step Progressive Unit Onboarding Wizard

import React, { useState, useMemo } from 'react';
import {
  Home,
  Layers,
  DollarSign,
  Users,
  FileText,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Plus,
  Trash2,
  Eye,
  Info,
  Calendar,
  Shield,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { toast } from '@/components/ui/use-toast';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { useSettings } from '@/contexts/useSettings';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useProperties } from '@/hooks/useProperties';
import {
  useCreateUnit,
  type Unit,
  type UnitDocument,
} from '@/hooks/useUnits';
import {
  calculateUnitCompleteness,
  UNIT_STATUSES,
  UNIT_TYPES,
  UNIT_CATEGORIES,
  FURNISHING_STATUSES,
  VIEW_TYPES,
  UTILITIES_OPTIONS,
  COMMON_UNIT_AMENITIES,
  ACCESSIBILITY_OPTIONS,
  LEASE_CATEGORIES,
  REQUIRED_DOCUMENTS_OPTIONS,
} from '@/lib/unitProfileCompleteness';
import { cn } from '@/lib/utils';

interface AddUnitWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPropertyId?: string;
  onSuccess?: (unit: Unit) => void;
}

export function AddUnitWizard({
  open,
  onOpenChange,
  defaultPropertyId,
  onSuccess,
}: AddUnitWizardProps) {
  const { formatCurrency, settings } = useSettings();
  const { activeCompanyId } = useActiveCompany();
  const { data: properties = [] } = useProperties();
  const createUnit = useCreateUnit();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));

  // Form State across all 6 data steps
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    property_id: defaultPropertyId || '',
    unit_number: '',
    unit_code: '',
    building_name: '',
    floor: 1,
    wing: '',
    unit_type: '2 Bedroom Apartment',
    unit_category: 'Residential',
    description: '',
    image_url: '',
    image_urls: [] as string[],
    documents: [] as UnitDocument[],

    // Step 2: Unit Specifications
    bedrooms: 2,
    bathrooms: 2,
    toilets: 2,
    floor_area_sqm: 85,
    sqft: 915,
    has_balcony: true,
    parking_spaces: 1,
    furnishing_status: 'unfurnished',
    view_type: 'City Skyline',
    amenities: [] as string[],
    accessibility_features: [] as string[],
    utilities_included: [] as string[],

    // Step 3: Rental Information
    rent_amount: 500000,
    market_rent: 550000,
    security_deposit: 500000,
    currency: 'RWF',
    billing_frequency: 'monthly',
    grace_period_days: 5,
    late_fee_percentage: 5,
    revenue_target: 6000000,
    pricing_notes: '',

    // Step 4: Occupancy Settings
    status: 'available',
    available_from: new Date().toISOString().split('T')[0],
    max_occupants: 4,
    occupancy_type: 'long_term',
    preferred_tenant_type: 'Families or Corporate Professionals',
    notice_period_days: 30,
    move_in_rules: 'Standard check-in inspection required prior to key handover.',

    // Step 5: Lease Defaults
    default_lease_term_months: 12,
    auto_renewal: false,
    renewal_notice_days: 60,
    lease_category: 'Standard Residential Lease',
    required_documents: ['National ID / Passport Copy', 'Proof of Income / 3 Months Bank Statement'] as string[],

    // Step 6: Operations
    maintenance_responsibility: 'landlord_standard',
    inspection_frequency: 'quarterly',
    cleaning_schedule: 'Pre-move-in and post-turnaround only',
    risk_rating: 'low',
    operational_notes: '',
  });

  // Calculate profile completeness
  const completeness = useMemo(
    () => calculateUnitCompleteness(formData as any),
    [formData]
  );

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    setVisitedSteps((prev) => new Set([...prev, stepNumber]));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.property_id) {
        toast({ title: 'Property Required', description: 'Please select a parent property.', variant: 'destructive' });
        return;
      }
      if (!formData.unit_number.trim()) {
        toast({ title: 'Unit Number Required', description: 'Please enter a unit number.', variant: 'destructive' });
        return;
      }
    }
    if (currentStep === 3) {
      if (!formData.rent_amount || Number(formData.rent_amount) <= 0) {
        toast({ title: 'Rent Amount Required', description: 'Please specify the monthly rent.', variant: 'destructive' });
        return;
      }
    }

    if (currentStep < 7) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  // Toggle multi-select chips
  const toggleArrayItem = (
    field: 'amenities' | 'accessibility_features' | 'utilities_included' | 'required_documents',
    item: string
  ) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  // Add document link
  const handleAddDocument = () => {
    const docTitle = prompt('Document Title (e.g. Unit Floor Plan, Inspection Checklist):');
    if (!docTitle) return;
    const docUrl = prompt('Document URL (or cloud link):', 'https://');
    if (!docUrl) return;

    const newDoc: UnitDocument = {
      id: `doc-${Date.now()}`,
      title: docTitle,
      type: 'Floor Plan / Specification',
      url: docUrl,
      uploadedAt: new Date().toISOString(),
    };
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, newDoc],
    }));
  };

  const handleRemoveDocument = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
  };

  // Handle final submission
  const handleSaveUnit = async (submissionStatus?: string) => {
    if (!formData.property_id || !formData.unit_number) {
      toast({
        title: 'Missing Required Information',
        description: 'Property and Unit Number are mandatory.',
        variant: 'destructive',
      });
      goToStep(1);
      return;
    }

    const finalStatus = submissionStatus || formData.status || 'available';

    try {
      const payload: any = {
        property_id: formData.property_id,
        unit_number: formData.unit_number.trim(),
        unit_code: formData.unit_code?.trim() || null,
        building_name: formData.building_name?.trim() || null,
        floor: Number(formData.floor) || 1,
        wing: formData.wing?.trim() || null,
        unit_type: formData.unit_type,
        unit_category: formData.unit_category,
        description: formData.description?.trim() || null,
        image_url: formData.image_urls[0] || formData.image_url || null,
        image_urls: formData.image_urls,
        documents: formData.documents,

        // Specifications
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        toilets: Number(formData.toilets) || 0,
        floor_area_sqm: Number(formData.floor_area_sqm) || 0,
        sqft: Number(formData.sqft) || Math.round((Number(formData.floor_area_sqm) || 0) * 10.764),
        has_balcony: formData.has_balcony,
        parking_spaces: Number(formData.parking_spaces) || 0,
        furnishing_status: formData.furnishing_status,
        view_type: formData.view_type,
        amenities: formData.amenities,
        accessibility_features: formData.accessibility_features,
        utilities_included: formData.utilities_included,

        // Rental Information
        rent_amount: Number(formData.rent_amount) || 0,
        market_rent: Number(formData.market_rent) || 0,
        security_deposit: Number(formData.security_deposit) || 0,
        currency: formData.currency,
        billing_frequency: formData.billing_frequency,
        late_fee_rules: {
          grace_period_days: Number(formData.grace_period_days) || 5,
          late_fee_percentage: Number(formData.late_fee_percentage) || 5,
        },
        revenue_target: Number(formData.revenue_target) || 0,
        pricing_notes: formData.pricing_notes || null,

        // Occupancy Settings
        status: finalStatus,
        available_from: formData.available_from || null,
        max_occupants: Number(formData.max_occupants) || 2,
        occupancy_type: formData.occupancy_type,
        preferred_tenant_type: formData.preferred_tenant_type || null,
        notice_period_days: Number(formData.notice_period_days) || 30,
        move_in_rules: formData.move_in_rules || null,

        // Lease Defaults
        default_lease_term_months: Number(formData.default_lease_term_months) || 12,
        renewal_rules: {
          auto_renewal: formData.auto_renewal,
          renewal_notice_days: Number(formData.renewal_notice_days) || 60,
        },
        lease_category: formData.lease_category,
        required_documents: formData.required_documents,

        // Operations
        maintenance_responsibility: formData.maintenance_responsibility,
        inspection_frequency: formData.inspection_frequency,
        cleaning_schedule: formData.cleaning_schedule || null,
        risk_rating: formData.risk_rating,
        operational_notes: formData.operational_notes || null,

        completeness_score: completeness.score,
      };

      const result = await createUnit.mutateAsync(payload);
      toast({
        title: finalStatus === 'draft' ? 'Draft Unit Saved' : 'Unit Created Successfully',
        description: `Unit ${formData.unit_number} registered with ${completeness.score}% operational completeness.`,
      });
      onOpenChange(false);
      if (onSuccess && result) {
        onSuccess(result as Unit);
      }
    } catch (err: any) {
      toast({
        title: 'Error Creating Unit',
        description: err.message || 'An error occurred during creation.',
        variant: 'destructive',
      });
    }
  };

  const stepsMeta = [
    { number: 1, title: 'Basic Info', icon: Home },
    { number: 2, title: 'Specifications', icon: Layers },
    { number: 3, title: 'Rental Info', icon: DollarSign },
    { number: 4, title: 'Occupancy', icon: Users },
    { number: 5, title: 'Lease Defaults', icon: FileText },
    { number: 6, title: 'Operations', icon: Wrench },
    { number: 7, title: 'Review', icon: CheckCircle2 },
  ];

  const selectedPropertyName = properties.find((p) => p.id === formData.property_id)?.name || 'Select Property';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1020px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-border/80">
        {/* Header */}
        <div className="p-6 border-b border-border/70 bg-card shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    Register New Unit
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Step {currentStep} of 7 — {stepsMeta[currentStep - 1].title}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Profile Completeness Bar */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Profile Completeness
                </span>
                <span
                  className={cn(
                    'text-xs font-bold',
                    completeness.score >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : completeness.score >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {completeness.score}% • {completeness.grade}
                </span>
              </div>

              <div className="w-20 bg-muted/60 h-2.5 rounded-full overflow-hidden border border-border/50">
                <div
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    completeness.score >= 80
                      ? 'bg-emerald-500'
                      : completeness.score >= 50
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  )}
                  style={{ width: `${completeness.score}%` }}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveUnit('draft')}
                disabled={createUnit.isPending || !formData.unit_number || !formData.property_id}
                className="text-xs h-8 border-border/80"
              >
                Save Draft
              </Button>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-7 gap-1 pt-5 border-t border-border/50 mt-4">
            {stepsMeta.map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.number;
              const isPassed = currentStep > s.number;
              const isVisited = visitedSteps.has(s.number);

              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => isVisited && goToStep(s.number)}
                  disabled={!isVisited}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl text-center transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : isPassed
                      ? 'text-foreground hover:bg-muted/40 cursor-pointer'
                      : isVisited
                      ? 'text-muted-foreground hover:bg-muted/30 cursor-pointer'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : isPassed
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isPassed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-[11px] truncate max-w-full font-medium">
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-background">
          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-foreground">Basic Unit Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Establish core identification, parent property assignment, and photographic assets.
                </p>
              </div>

              {/* Photos Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Unit Gallery & Primary Photo</Label>
                <MultiImageUpload
                  value={formData.image_urls}
                  onChange={(urls) =>
                    setFormData({ ...formData, image_urls: urls, image_url: urls[0] || '' })
                  }
                  maxFiles={8}
                />
                <span className="text-[11px] text-muted-foreground block">
                  Add high-resolution photography of the interior, view, kitchen, and amenities.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Parent Property *</Label>
                  <Select
                    value={formData.property_id}
                    onValueChange={(val) => setFormData({ ...formData, property_id: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Parent Property..." />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          🏢 {p.name} ({p.city}, {p.state})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unit Number / Identifier *</Label>
                  <Input
                    placeholder="e.g. Unit A-101, Apt 4B, Suite 300"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Internal Unit Code (Optional)</Label>
                  <Input
                    placeholder="e.g. KH-BLDA-FL1-U101"
                    value={formData.unit_code}
                    onChange={(e) => setFormData({ ...formData, unit_code: e.target.value })}
                    className="h-9 text-xs uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Building Name / Block</Label>
                  <Input
                    placeholder="e.g. Block A, East Tower, Main Building"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Floor Level</Label>
                    <Input
                      type="number"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Wing / Sector</Label>
                    <Input
                      placeholder="e.g. North Wing"
                      value={formData.wing}
                      onChange={(e) => setFormData({ ...formData, wing: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unit Type</Label>
                  <Select
                    value={formData.unit_type}
                    onValueChange={(val) => setFormData({ ...formData, unit_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unit Category</Label>
                  <Select
                    value={formData.unit_category}
                    onValueChange={(val) => setFormData({ ...formData, unit_category: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Unit Description</Label>
                  <Textarea
                    placeholder="Provide a descriptive overview of the space, architectural highlights, natural lighting, and exposure..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Floorplan & Architectural Documents */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold">Unit Documents & Floorplans</Label>
                    <p className="text-[11px] text-muted-foreground">Architectural schematics, unit specs, or utility maps.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDocument}
                    className="gap-1.5 text-xs h-7"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Document</span>
                  </Button>
                </div>

                {formData.documents.length > 0 ? (
                  <div className="divide-y rounded-lg border border-border/60 bg-muted/20">
                    {formData.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-semibold">{doc.title}</p>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary hover:underline truncate block max-w-sm"
                            >
                              {doc.url}
                            </a>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                    No documents attached yet. Click Add Document to attach floorplans.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Unit Specifications */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-foreground">Unit Specifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure layout dimensions, fixtures, furnishing, accessibility, and included utilities.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bedrooms</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bathrooms</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Toilets / Powder</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.toilets}
                    onChange={(e) => setFormData({ ...formData, toilets: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Parking Spaces</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.parking_spaces}
                    onChange={(e) => setFormData({ ...formData, parking_spaces: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Floor Area (sqm)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.floor_area_sqm}
                    onChange={(e) => {
                      const sqm = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        floor_area_sqm: sqm,
                        sqft: Math.round(sqm * 10.764),
                      });
                    }}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Approx. {formData.sqft} sq ft</span>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Balcony / Terrace</Label>
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border/70 h-9">
                    <span className="text-xs font-medium">Private Balcony Access</span>
                    <Switch
                      checked={formData.has_balcony}
                      onCheckedChange={(val) => setFormData({ ...formData, has_balcony: val })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Furnishing Status</Label>
                  <Select
                    value={formData.furnishing_status}
                    onValueChange={(val) => setFormData({ ...formData, furnishing_status: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FURNISHING_STATUSES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">View Type</Label>
                  <Select
                    value={formData.view_type}
                    onValueChange={(val) => setFormData({ ...formData, view_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amenities Multi-Select */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Unit Fixtures & Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_UNIT_AMENITIES.map((item) => {
                    const selected = formData.amenities.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('amenities', item)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border text-left',
                          selected
                            ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {selected ? '✓ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Utilities Included */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Utilities Included in Base Rent</Label>
                <div className="flex flex-wrap gap-2">
                  {UTILITIES_OPTIONS.map((item) => {
                    const selected = formData.utilities_included.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('utilities_included', item)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border text-left',
                          selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {selected ? '✓ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accessibility Features */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Accessibility Features</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCESSIBILITY_OPTIONS.map((item) => {
                    const selected = formData.accessibility_features.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('accessibility_features', item)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border text-left',
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {selected ? '✓ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Rental Information */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-foreground">Rental Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set baseline rental rates, security deposits, billing intervals, and late fee policies.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Current Monthly Rent *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.rent_amount}
                    onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Market Benchmark Rent</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.market_rent}
                    onChange={(e) => setFormData({ ...formData, market_rent: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Security Deposit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) => setFormData({ ...formData, currency: val })}
                  >
                    <SelectTrigger className="h-9 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RWF">RWF (Rwandan Franc)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Billing Frequency</Label>
                  <Select
                    value={formData.billing_frequency}
                    onValueChange={(val) => setFormData({ ...formData, billing_frequency: val })}
                  >
                    <SelectTrigger className="h-9 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly (3 Months)</SelectItem>
                      <SelectItem value="bi-annual">Bi-Annual (6 Months)</SelectItem>
                      <SelectItem value="annual">Annual (12 Months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Annual Revenue Target</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.revenue_target}
                    onChange={(e) => setFormData({ ...formData, revenue_target: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Late Fee Rules */}
              <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Late Fee Policy</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Grace Period (Days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.grace_period_days}
                      onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) || 0 })}
                      className="h-9 text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">Days past due date before penalty</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Late Fee (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.late_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, late_fee_percentage: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">% penalty charged on balance</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pricing Notes / Concessions</Label>
                <Textarea
                  placeholder="e.g. 1 month rent concession on 24-month lease, parking fee separate RWF 30,000/mo..."
                  value={formData.pricing_notes}
                  onChange={(e) => setFormData({ ...formData, pricing_notes: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Occupancy Settings */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-foreground">Occupancy & Tenant Settings</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Specify operational readiness status, maximum occupancy limits, and tenant criteria.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Operational Status *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {UNIT_STATUSES.map((st) => {
                    const isSelected = formData.status === st.value;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: st.value })}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'bg-primary/10 border-primary text-foreground shadow-2xs font-semibold ring-1 ring-primary'
                            : 'bg-card border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{st.label}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                          {st.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Availability Date</Label>
                  <Input
                    type="date"
                    value={formData.available_from}
                    onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Maximum Occupants</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_occupants}
                    onChange={(e) => setFormData({ ...formData, max_occupants: parseInt(e.target.value) || 1 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Occupancy Type</Label>
                  <Select
                    value={formData.occupancy_type}
                    onValueChange={(val) => setFormData({ ...formData, occupancy_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long_term">Long-Term Residential</SelectItem>
                      <SelectItem value="short_let">Short-Let / Serviced</SelectItem>
                      <SelectItem value="corporate">Corporate Staff Housing</SelectItem>
                      <SelectItem value="commercial">Commercial Lease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Required Move-Out Notice (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.notice_period_days}
                    onChange={(e) => setFormData({ ...formData, notice_period_days: parseInt(e.target.value) || 30 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Preferred Tenant Profile</Label>
                  <Input
                    placeholder="e.g. Expats, Diplomatic mission staff, Families, Single professionals"
                    value={formData.preferred_tenant_type}
                    onChange={(e) => setFormData({ ...formData, preferred_tenant_type: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Move-In Rules & Staging Requirements</Label>
                  <Textarea
                    placeholder="Specify handover protocols, inventory sign-off, key deposits, or meter reading rules..."
                    value={formData.move_in_rules}
                    onChange={(e) => setFormData({ ...formData, move_in_rules: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Lease Defaults */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-foreground">Lease Defaults & Legal Standards</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure default contract lengths, renewal protocols, and required tenant verification documents.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Lease Length (Months)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.default_lease_term_months}
                    onChange={(e) => setFormData({ ...formData, default_lease_term_months: parseInt(e.target.value) || 12 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lease Category</Label>
                  <Select
                    value={formData.lease_category}
                    onValueChange={(val) => setFormData({ ...formData, lease_category: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEASE_CATEGORIES.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Renewal Discussion Window (Days)</Label>
                  <Input
                    type="number"
                    min="15"
                    value={formData.renewal_notice_days}
                    onChange={(e) => setFormData({ ...formData, renewal_notice_days: parseInt(e.target.value) || 60 })}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Days before expiry to initiate renewal</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Auto-Renewal Clause</Label>
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border/70 h-9">
                    <span className="text-xs font-medium">Enable Automatic Term Extension</span>
                    <Switch
                      checked={formData.auto_renewal}
                      onCheckedChange={(val) => setFormData({ ...formData, auto_renewal: val })}
                    />
                  </div>
                </div>
              </div>

              {/* Required Documents Checklist */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Mandatory Tenant Verification Documents</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REQUIRED_DOCUMENTS_OPTIONS.map((doc) => {
                    const selected = formData.required_documents.includes(doc);
                    return (
                      <button
                        key={doc}
                        type="button"
                        onClick={() => toggleArrayItem('required_documents', doc)}
                        className={cn(
                          'p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between',
                          selected
                            ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-2xs'
                            : 'bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <span>{doc}</span>
                        {selected ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">+ Add</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Operations */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-foreground">Operational Policies & Risk Management</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define maintenance liabilities, periodic inspection intervals, and unit operational rating.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Maintenance Responsibility</Label>
                  <Select
                    value={formData.maintenance_responsibility}
                    onValueChange={(val) => setFormData({ ...formData, maintenance_responsibility: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord_standard">Landlord Standard (Repairs & Wear)</SelectItem>
                      <SelectItem value="split_tenant">Split Tenant / Landlord (Minor Tenant Paid)</SelectItem>
                      <SelectItem value="triple_net">Triple Net (Tenant Full Operational)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Routine Inspection Cadence</Label>
                  <Select
                    value={formData.inspection_frequency}
                    onValueChange={(val) => setFormData({ ...formData, inspection_frequency: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="bi-annual">Bi-Annual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Risk Classification</Label>
                  <Select
                    value={formData.risk_rating}
                    onValueChange={(val) => setFormData({ ...formData, risk_rating: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk (Standard Premium Asset)</SelectItem>
                      <SelectItem value="medium">Medium Risk (Older Equipment / High Turnover)</SelectItem>
                      <SelectItem value="high">High Risk (Requires Monitoring / Specialized)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Turnaround & Cleaning Schedule</Label>
                  <Input
                    placeholder="e.g. Deep clean post move-out, quarterly pest spray"
                    value={formData.cleaning_schedule}
                    onChange={(e) => setFormData({ ...formData, cleaning_schedule: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Operational & Technical Notes</Label>
                  <Textarea
                    placeholder="Special instructions for facilities team, water shutoff valve location, meter serial numbers, breaker panel details..."
                    value={formData.operational_notes}
                    onChange={(e) => setFormData({ ...formData, operational_notes: e.target.value })}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Review & Publish */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-foreground">Review & Publish Unit</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verify unit specifications and completeness score before adding to live inventory.
                </p>
              </div>

              {/* Completeness Summary Callout */}
              <div className="p-4 rounded-xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Asset Quality Rating:</span>
                    <Badge
                      className={cn(
                        'text-xs font-semibold',
                        completeness.score >= 80
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      )}
                    >
                      {completeness.score}% • {completeness.grade}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {completeness.missingItems.length === 0
                      ? 'All core and operational parameters have been successfully populated.'
                      : `${completeness.missingItems.length} recommended operational fields remaining.`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveUnit('draft')}
                    disabled={createUnit.isPending}
                    className="text-xs h-8"
                  >
                    Save Draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveUnit('available')}
                    disabled={createUnit.isPending || !formData.unit_number || !formData.property_id}
                    className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground font-semibold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{createUnit.isPending ? 'Publishing...' : 'Create Unit'}</span>
                  </Button>
                </div>
              </div>

              {/* Missing Items List */}
              {completeness.missingItems.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Recommended Information To Complete:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {completeness.missingItems.map((item) => (
                      <button
                        key={item.field}
                        type="button"
                        onClick={() => goToStep(item.step)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border',
                          item.critical
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-card text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        {item.label} (Step {item.step})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section-by-Section Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Basic Summary */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Info</span>
                    <button type="button" onClick={() => goToStep(1)} className="text-xs text-primary hover:underline font-medium">
                      Edit
                    </button>
                  </div>
                  <p className="text-base font-bold text-foreground">{formData.unit_number}</p>
                  <p className="text-xs text-muted-foreground">{selectedPropertyName} • Floor {formData.floor}</p>
                  <p className="text-xs text-muted-foreground">{formData.unit_type} ({formData.unit_category})</p>
                </div>

                {/* Specs Summary */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Specifications</span>
                    <button type="button" onClick={() => goToStep(2)} className="text-xs text-primary hover:underline font-medium">
                      Edit
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formData.bedrooms} Bed • {formData.bathrooms} Bath • {formData.floor_area_sqm} m²
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {formData.furnishing_status} • {formData.parking_spaces} Parking • {formData.view_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.amenities.length} amenities • {formData.utilities_included.length} utilities
                  </p>
                </div>

                {/* Rental Summary */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financials</span>
                    <button type="button" onClick={() => goToStep(3)} className="text-xs text-primary hover:underline font-medium">
                      Edit
                    </button>
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {formatCurrency(formData.rent_amount)} / {formData.billing_frequency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deposit: {formatCurrency(formData.security_deposit)} • Market: {formatCurrency(formData.market_rent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Grace: {formData.grace_period_days} days • Late Fee: {formData.late_fee_percentage}%
                  </p>
                </div>

                {/* Operations & Lease */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operations</span>
                    <button type="button" onClick={() => goToStep(4)} className="text-xs text-primary hover:underline font-medium">
                      Edit
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    Status: {formData.status.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Default Term: {formData.default_lease_term_months} Months • Inspection: {formData.inspection_frequency}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Risk: {formData.risk_rating} • {formData.required_documents.length} required docs
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-border/70 bg-card shrink-0 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
            className="text-xs"
          >
            {currentStep === 1 ? 'Cancel' : '← Back'}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="gap-1 text-xs bg-primary text-primary-foreground font-semibold"
              >
                <span>Continue</span>
                <span>→</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveUnit('available')}
                disabled={createUnit.isPending || !formData.unit_number || !formData.property_id}
                className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{createUnit.isPending ? 'Publishing...' : 'Create Unit'}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
