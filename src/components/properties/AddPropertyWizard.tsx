import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Layers,
  Users,
  DollarSign,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Compass,
  Navigation,
  Globe,
  FileText,
  Shield,
  Zap,
  Phone,
  Mail,
  ExternalLink,
  Info,
  Sparkles,
  Calendar,
  Lock,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Property,
  PropertyEmergencyContact,
  PropertyDocument,
  useCreateProperty,
} from '@/hooks/useProperties';
import {
  calculatePropertyCompleteness,
  generatePropertyCode,
  getCurrentBrowserLocation,
  reverseGeocodeCoordinates,
  RWANDA_PROVINCES,
  COMMON_AMENITIES,
  ACCESSIBILITY_FEATURES,
  SECURITY_FEATURES,
  UTILITIES_LIST,
} from '@/lib/propertyProfileCompleteness';
import { cn } from '@/lib/utils';

interface AddPropertyWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (property: Property) => void;
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment Building / Complex' },
  { value: 'house', label: 'Single Family Residence / Villa' },
  { value: 'commercial', label: 'Commercial Office Tower' },
  { value: 'retail', label: 'Retail Mall / Shopping Center' },
  { value: 'mixed', label: 'Mixed-Use Development (Retail + Res)' },
  { value: 'short_let', label: 'Hospitality & Serviced Short-Stay' },
  { value: 'industrial', label: 'Industrial Warehouse & Logistics' },
  { value: 'other', label: 'Other Real Estate Asset' },
];

const PROPERTY_CATEGORIES = [
  { value: 'residential', label: 'Residential Living' },
  { value: 'commercial', label: 'Commercial & Corporate' },
  { value: 'mixed', label: 'Mixed-Use Community' },
  { value: 'hospitality', label: 'Hospitality & Leisure' },
  { value: 'industrial', label: 'Industrial & Supply Chain' },
];

export function AddPropertyWizard({
  open,
  onOpenChange,
  onSuccess,
}: AddPropertyWizardProps) {
  const { settings, formatCurrency } = useSettings();
  const { activeCompanyId, companies } = useActiveCompany();
  const createProperty = useCreateProperty();

  const currentCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId),
    [companies, activeCompanyId]
  );

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));

  // Step 2 location mode: 'auto' | 'manual'
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationLockSuccess, setLocationLockSuccess] = useState<boolean>(false);

  // Form State across all 6 data steps
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: '',
    portfolio_name: '',
    property_code: '',
    type: 'apartment',
    category: 'residential',
    description: '',
    status: 'active',
    opening_date: '',
    image_url: '',
    image_urls: [] as string[],
    documents: [] as PropertyDocument[],

    // Step 2: Location & Address
    country: settings.defaultCountry || 'Rwanda',
    province: 'Kigali City',
    district: 'Gasabo',
    sector: '',
    cell: '',
    village: '',
    address: '',
    zip_code: '',
    upi: '',
    latitude: null as number | null,
    longitude: null as number | null,
    google_maps_url: '',
    landmark: '',
    time_zone: 'Africa/Kigali',

    // Step 3: Characteristics
    building_type: 'Single Building',
    property_usage: 'Residential',
    number_of_buildings: 1,
    number_of_floors: 3,
    total_units: 10,
    residential_units: 10,
    commercial_units: 0,
    parking_spaces: 12,
    land_area: 1200,
    gross_floor_area: 2800,
    year_built: new Date().getFullYear(),
    construction_status: 'completed',
    amenities: ['High-Speed Fiber Internet', '24/7 Power Backup (Generator)', 'Dedicated Water Reservoirs'] as string[],
    accessibility_features: ['Wheelchair Access Ramps', 'Step-Free Building Entrance'] as string[],
    security_features: ['24/7 Professional Security Personnel', 'High-Definition CCTV Network'] as string[],
    utilities: ['National Grid Power (REG)', 'Municipal Water Supply (WASAC)', 'Standby Diesel Generator'] as string[],

    // Step 4: Ownership & Management
    owner_name: currentCompany?.name || 'Asset Owner',
    ownership_type: 'corporate',
    management_company: currentCompany?.name || 'EstatesPro Management Ltd',
    property_manager: '',
    management_phone: '',
    management_email: '',
    emergency_contacts: [
      { name: 'Estate Security Supervisor', phone: '+250 788 000 111', relationship: 'Head of Security' },
    ] as PropertyEmergencyContact[],
    ownership_notes: '',

    // Step 5: Financial Profile
    currency: settings.currencyCode || 'RWF',
    revenue_target: 5000000,
    operating_budget: 1500000,
    acquisition_cost: 0,
    market_value: 0,
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_expiry: '',
    insurance_amount: 0,
    landlord_tin: '',
    tax_rate: 15,
    cost_centre: '',
    accounting_reference: '',
    financial_notes: '',

    // Step 6: Operational Settings
    maintenance_strategy: 'preventive',
    inspection_frequency: 'quarterly',
    target_occupancy_rate: 95,
    lease_default_term: 12,
    lease_grace_period: 5,
    lease_late_fee: 5,
    lease_security_deposit: 1,
    policy_pets: false,
    policy_smoking: false,
    policy_subletting: false,
    policy_quiet_hours: '22:00 - 06:00',
    risk_classification: 'low',
    operational_notes: '',
  });

  // Calculate live completeness score
  const completeness = useMemo(
    () => calculatePropertyCompleteness(formData as any),
    [formData]
  );

  // Auto-generate code when property name or city changes if empty
  const handleGenerateCode = () => {
    const code = generatePropertyCode(formData.name || 'EST', formData.district || formData.city || 'KGL');
    setFormData((prev) => ({ ...prev, property_code: code }));
  };

  // Step change with validation
  const goToStep = (step: number) => {
    setCurrentStep(step);
    setVisitedSteps((prev) => new Set([...prev, step]));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        toast({ title: 'Property Name Required', description: 'Please provide a name for this property.', variant: 'destructive' });
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.address.trim()) {
        toast({ title: 'Street Address Required', description: 'Please provide a physical address.', variant: 'destructive' });
        return;
      }
      if (!formData.district.trim()) {
        toast({ title: 'District Required', description: 'Please provide the city or district.', variant: 'destructive' });
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.total_units || formData.total_units < 1) {
        toast({ title: 'Total Units Required', description: 'Property must contain at least 1 unit.', variant: 'destructive' });
        return;
      }
    }

    goToStep(Math.min(7, currentStep + 1));
  };

  const handlePrev = () => {
    goToStep(Math.max(1, currentStep - 1));
  };

  // Step 2: Auto-detect location handler
  const handleAutoDetectLocation = async () => {
    setIsLocating(true);
    setLocationLockSuccess(false);

    try {
      const coords = await getCurrentBrowserLocation();
      const geocode = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;

      setFormData((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
        google_maps_url: mapsUrl,
        address: geocode.address || prev.address || (geocode.displayName ? geocode.displayName.slice(0, 60) : ''),
        district: geocode.district || prev.district || 'Gasabo',
        province: geocode.state || prev.province || 'Kigali City',
        country: geocode.country || prev.country || 'Rwanda',
        zip_code: geocode.postalCode || prev.zip_code || '',
      }));

      setLocationLockSuccess(true);
      toast({
        title: 'Location Locked via GPS',
        description: `Coordinates (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}) and address auto-mapped successfully.`,
      });
    } catch (err: any) {
      toast({
        title: 'Auto-Location Notice',
        description: err.message || 'Could not fetch GPS location. You can enter details manually.',
        variant: 'destructive',
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Emergency contact management
  const addEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: [
        ...prev.emergency_contacts,
        { name: '', phone: '', relationship: 'Building Maintenance' },
      ],
    }));
  };

  const removeEmergencyContact = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== idx),
    }));
  };

  const updateEmergencyContact = (idx: number, field: keyof PropertyEmergencyContact, val: string) => {
    setFormData((prev) => {
      const list = [...prev.emergency_contacts];
      list[idx] = { ...list[idx], [field]: val };
      return { ...prev, emergency_contacts: list };
    });
  };

  // Chip multi-select toggle helper
  const toggleArrayItem = (field: 'amenities' | 'accessibility_features' | 'security_features' | 'utilities', item: string) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  // Final submission: Publish vs Save Draft
  const handleSaveProperty = async (status: 'active' | 'draft') => {
    if (!formData.name.trim() || !formData.address.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please ensure at least Property Name and Address are provided before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        portfolio_name: formData.portfolio_name.trim() || null,
        property_code: formData.property_code.trim() || generatePropertyCode(formData.name, formData.district),
        type: formData.type,
        category: formData.category,
        description: formData.description.trim() || null,
        status: status,
        opening_date: formData.opening_date || null,
        image_url: formData.image_urls[0] || formData.image_url || null,
        image_urls: formData.image_urls,
        documents: formData.documents,

        // Location
        country: formData.country,
        state: formData.province,
        province: formData.province,
        city: formData.district,
        district: formData.district,
        sector: formData.sector || null,
        cell: formData.cell || null,
        village: formData.village || null,
        address: formData.address.trim(),
        zip_code: formData.zip_code || '0000',
        upi: formData.upi || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        google_maps_url: formData.google_maps_url || null,
        landmark: formData.landmark || null,
        time_zone: formData.time_zone || 'Africa/Kigali',

        // Characteristics
        building_type: formData.building_type,
        property_usage: formData.property_usage,
        number_of_buildings: Number(formData.number_of_buildings) || 1,
        number_of_floors: Number(formData.number_of_floors) || 1,
        total_units: Number(formData.total_units) || 1,
        residential_units: Number(formData.residential_units) || 0,
        commercial_units: Number(formData.commercial_units) || 0,
        parking_spaces: Number(formData.parking_spaces) || 0,
        land_area: Number(formData.land_area) || null,
        gross_floor_area: Number(formData.gross_floor_area) || null,
        year_built: Number(formData.year_built) || null,
        construction_status: formData.construction_status,
        amenities: formData.amenities,
        accessibility_features: formData.accessibility_features,
        security_features: formData.security_features,
        utilities: formData.utilities,
        occupied_units: 0,

        // Ownership
        owner_name: formData.owner_name.trim() || null,
        ownership_type: formData.ownership_type,
        management_company: formData.management_company || null,
        property_manager: formData.property_manager || null,
        management_contacts: {
          phone: formData.management_phone,
          email: formData.management_email,
        },
        emergency_contacts: formData.emergency_contacts,
        ownership_notes: formData.ownership_notes || null,

        // Financials
        currency: formData.currency,
        revenue_target: Number(formData.revenue_target) || 0,
        operating_budget: Number(formData.operating_budget) || 0,
        acquisition_cost: Number(formData.acquisition_cost) || 0,
        market_value: Number(formData.market_value) || 0,
        insurance_provider: formData.insurance_provider || null,
        insurance_policy_number: formData.insurance_policy_number || null,
        insurance_expiry: formData.insurance_expiry || null,
        insurance_amount: Number(formData.insurance_amount) || 0,
        landlord_tin: formData.landlord_tin || null,
        tax_rate: Number(formData.tax_rate) || 15,
        cost_centre: formData.cost_centre || null,
        accounting_reference: formData.accounting_reference || null,
        financial_notes: formData.financial_notes || null,

        // Operational
        maintenance_strategy: formData.maintenance_strategy,
        inspection_frequency: formData.inspection_frequency,
        target_occupancy_rate: Number(formData.target_occupancy_rate) || 95,
        lease_rules: {
          default_term_months: formData.lease_default_term,
          grace_period_days: formData.lease_grace_period,
          late_fee_percentage: formData.lease_late_fee,
          security_deposit_months: formData.lease_security_deposit,
        },
        property_policies: {
          pets_allowed: formData.policy_pets,
          smoking_allowed: formData.policy_smoking,
          subletting_allowed: formData.policy_subletting,
          quiet_hours: formData.policy_quiet_hours,
        },
        risk_classification: formData.risk_classification,
        operational_notes: formData.operational_notes || null,

        completeness_score: completeness.score,
      };

      const result = await createProperty.mutateAsync(payload);
      toast({
        title: status === 'active' ? 'Property Published!' : 'Draft Saved!',
        description: `"${formData.name}" was successfully registered with a ${completeness.score}% asset profile completeness.`,
      });
      onOpenChange(false);
      if (onSuccess && result) {
        onSuccess(result as Property);
      }
    } catch (err: any) {
      toast({
        title: 'Error Creating Property',
        description: err.message || 'An error occurred during submission.',
        variant: 'destructive',
      });
    }
  };

  const stepsMeta = [
    { number: 1, title: 'Basic Info', icon: Building2 },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Characteristics', icon: Layers },
    { number: 4, title: 'Ownership', icon: Users },
    { number: 5, title: 'Financials', icon: DollarSign },
    { number: 6, title: 'Operations', icon: Wrench },
    { number: 7, title: 'Review', icon: CheckCircle2 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1040px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-border/80">
        {/* Wizard Top Header */}
        <div className="p-6 border-b border-border/70 bg-card shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    Onboard New Property Asset
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Step {currentStep} of 7: {stepsMeta[currentStep - 1].title}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Profile Completeness Pill */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Completeness
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
                  {completeness.score}% Asset Profile
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
                onClick={() => handleSaveProperty('draft')}
                disabled={createProperty.isPending}
                className="text-xs h-8 border-border/80"
              >
                Save Draft
              </Button>
            </div>
          </div>

          {/* Stepper Navigation Bar */}
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
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : isPassed
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isPassed ? <CheckCircle2 className="h-4 w-4" /> : s.number}
                  </div>
                  <span className="text-[11px] truncate w-full hidden sm:block font-medium">
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-background">
          {/* ====================================================
              STEP 1: BASIC PROPERTY INFORMATION
              ==================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Step 1: Basic Property Information
                </h3>
                <p className="text-xs text-muted-foreground">
                  Provide core identifying information and high-resolution media for the asset.
                </p>
              </div>

              {/* Photos Upload */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Property Gallery (Up to 10 photos)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    First photo acts as property cover
                  </span>
                </div>
                <MultiImageUpload
                  values={formData.image_urls}
                  onChange={(urls) =>
                    setFormData({ ...formData, image_urls: urls, image_url: urls[0] || '' })
                  }
                  folder="properties"
                  maxImages={10}
                />
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="propName" className="text-xs font-semibold">
                    Property Asset Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="propName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Kigali Heights Tower & Residences"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="propCode" className="text-xs font-semibold">
                      Property Code
                    </Label>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Generate
                    </button>
                  </div>
                  <Input
                    id="propCode"
                    value={formData.property_code}
                    onChange={(e) => setFormData({ ...formData, property_code: e.target.value })}
                    placeholder="e.g., KGL-TOW-001"
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Type, Category & Portfolio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Property Type <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Asset Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="portfolio" className="text-xs font-semibold">
                    Portfolio Group (Optional)
                  </Label>
                  <Input
                    id="portfolio"
                    value={formData.portfolio_name}
                    onChange={(e) => setFormData({ ...formData, portfolio_name: e.target.value })}
                    placeholder="e.g., Prime Kigali Commercials"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Operational Status & Opening Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Asset Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active & Operational</SelectItem>
                      <SelectItem value="under_construction">Under Construction</SelectItem>
                      <SelectItem value="renovation">Under Renovation</SelectItem>
                      <SelectItem value="planned">Planned / Development Pipeline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="openingDate" className="text-xs font-semibold">
                    Official Opening / Commissioning Date
                  </Label>
                  <Input
                    id="openingDate"
                    type="date"
                    value={formData.opening_date}
                    onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold">
                  Executive Property Overview
                </Label>
                <Textarea
                  id="desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of architectural layout, target tenant demographic, accessibility, and neighborhood amenities..."
                  rows={3}
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 2: LOCATION & ADDRESS
              Auto-Location GPS Geocoding + Manual Entry
              ==================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Step 2: Location & Address
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Specify exact geographic placement, Rwanda administrative tiers, and coordinates.
                  </p>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setLocationMode('auto')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      locationMode === 'auto'
                        ? 'bg-card text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    Auto-Location GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      locationMode === 'manual'
                        ? 'bg-card text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                    Manual Entry
                  </button>
                </div>
              </div>

              {/* Auto-Location Detection Banner */}
              {locationMode === 'auto' && (
                <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Compass className="h-4 w-4" />
                        Automated Geographic Mapping
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Use your device GPS to detect exact coordinates and reverse-geocode address fields automatically.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAutoDetectLocation}
                      disabled={isLocating}
                      className="gap-2 h-9 text-xs shrink-0"
                    >
                      <Navigation className={cn('h-3.5 w-3.5', isLocating && 'animate-spin')} />
                      <span>{isLocating ? 'Detecting Location...' : 'Auto-Detect My Location'}</span>
                    </Button>
                  </div>

                  {locationLockSuccess && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          Coordinates locked: {formData.latitude?.toFixed(5)}° N, {formData.longitude?.toFixed(5)}° E
                        </span>
                      </div>
                      {formData.google_maps_url && (
                        <a
                          href={formData.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] underline font-semibold"
                        >
                          View on Google Maps <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Address Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Rwanda"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Province / State</Label>
                  <Select
                    value={formData.province}
                    onValueChange={(val) => {
                      const firstDistrict = RWANDA_PROVINCES[val]?.[0] || 'Gasabo';
                      setFormData({ ...formData, province: val, district: firstDistrict });
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select province..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(RWANDA_PROVINCES).map((prov) => (
                        <SelectItem key={prov} value={prov} className="text-xs">
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">District / City</Label>
                  <Select
                    value={formData.district}
                    onValueChange={(val) => setFormData({ ...formData, district: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select district..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(RWANDA_PROVINCES[formData.province] || ['Gasabo', 'Kicukiro', 'Nyarugenge']).map(
                        (dist) => (
                          <SelectItem key={dist} value={dist} className="text-xs">
                            {dist}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Administrative Sub-levels: Sector, Cell, Village */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Sector</Label>
                  <Input
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="e.g., Kimihurura / Kacyiru"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cell</Label>
                  <Input
                    value={formData.cell}
                    onChange={(e) => setFormData({ ...formData, cell: e.target.value })}
                    placeholder="e.g., Rugando"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Village</Label>
                  <Input
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder="e.g., Gasabo Village"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Street Address & Postal Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="stAddress" className="text-xs font-semibold">
                    Physical Street Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="stAddress"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., KG 7 Ave, Plot 145"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zipCode" className="text-xs font-semibold">
                    Postal Code / P.O. Box
                  </Label>
                  <Input
                    id="zipCode"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="e.g., 0000"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* National Land Authority UPI & Landmark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="upi" className="text-xs font-semibold">
                      🇷🇼 National Land Authority UPI
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Parcel Identifier</span>
                  </div>
                  <Input
                    id="upi"
                    value={formData.upi}
                    onChange={(e) => setFormData({ ...formData, upi: e.target.value })}
                    placeholder="e.g., 1/03/05/02/1234"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="landmark" className="text-xs font-semibold">
                    Landmark / Proximity Reference
                  </Label>
                  <Input
                    id="landmark"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="e.g., Opposite Kigali Convention Center, Near BK Arena"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* GPS Coordinates & Google Maps Link */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })
                    }
                    placeholder="-1.944100"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })
                    }
                    placeholder="30.061900"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Google Maps URL</Label>
                  <Input
                    value={formData.google_maps_url}
                    onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                    placeholder="https://maps.google.com/?q=..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 3: PROPERTY CHARACTERISTICS
              Building Type, Amenities, Accessibility, Security, Utilities
              ==================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Step 3: Property Characteristics & Specifications
                </h3>
                <p className="text-xs text-muted-foreground">
                  Structural metrics, physical specifications, amenities, and security architecture.
                </p>
              </div>

              {/* Architecture & Units Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Building Architecture</Label>
                  <Select
                    value={formData.building_type}
                    onValueChange={(val) => setFormData({ ...formData, building_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single Building">Single Tower / Building</SelectItem>
                      <SelectItem value="Multi-Building Complex">Multi-Building Complex</SelectItem>
                      <SelectItem value="High-rise Tower">High-rise Tower (10+ fl)</SelectItem>
                      <SelectItem value="Villa Compound">Villa Compound</SelectItem>
                      <SelectItem value="Gated Community">Gated Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Number of Floors</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.number_of_floors}
                    onChange={(e) => setFormData({ ...formData, number_of_floors: parseInt(e.target.value) || 1 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Total Rentable Units <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.total_units}
                    onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 1 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Parking Spaces</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.parking_spaces}
                    onChange={(e) => setFormData({ ...formData, parking_spaces: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Land Area, Floor Area, Year Built */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Land Area (sqm)</Label>
                  <Input
                    type="number"
                    value={formData.land_area}
                    onChange={(e) => setFormData({ ...formData, land_area: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 1200"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gross Floor Area (sqm)</Label>
                  <Input
                    type="number"
                    value={formData.gross_floor_area}
                    onChange={(e) => setFormData({ ...formData, gross_floor_area: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 2800"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Year Built / Commissioned</Label>
                  <Input
                    type="number"
                    value={formData.year_built}
                    onChange={(e) => setFormData({ ...formData, year_built: parseInt(e.target.value) || 2024 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Construction Status</Label>
                  <Select
                    value={formData.construction_status}
                    onValueChange={(val) => setFormData({ ...formData, construction_status: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed & Handed Over</SelectItem>
                      <SelectItem value="under_construction">Under Active Construction</SelectItem>
                      <SelectItem value="renovating">Renovating</SelectItem>
                      <SelectItem value="planned">Pre-Development / Planning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amenities Selector */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Property Amenities & Shared Facilities
                </Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AMENITIES.map((amenity) => {
                    const isSelected = formData.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleArrayItem('amenities', amenity)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                        )}
                      >
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security Features */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Security & Life-Safety Features
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SECURITY_FEATURES.map((sec) => {
                    const isSelected = formData.security_features.includes(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => toggleArrayItem('security_features', sec)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                        )}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Utilities Available */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Utilities & Infrastructure Backbones
                </Label>
                <div className="flex flex-wrap gap-2">
                  {UTILITIES_LIST.map((util) => {
                    const isSelected = formData.utilities.includes(util);
                    return (
                      <button
                        key={util}
                        type="button"
                        onClick={() => toggleArrayItem('utilities', util)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                        )}
                      >
                        {util}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 4: OWNERSHIP & MANAGEMENT
              Owner, Management Co, Contacts, 24/7 Emergency
              ==================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Step 4: Ownership & Management Team
                </h3>
                <p className="text-xs text-muted-foreground">
                  Record property legal ownership, designated property manager, and 24/7 operational contacts.
                </p>
              </div>

              {/* Owner & Entity Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs font-semibold">
                    Legal Property Owner / Entity Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="ownerName"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="e.g., Kigali Real Estate Holdings Ltd"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ownership Structure</Label>
                  <Select
                    value={formData.ownership_type}
                    onValueChange={(val) => setFormData({ ...formData, ownership_type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Sole Proprietor</SelectItem>
                      <SelectItem value="corporate">Corporate Entity / LLC</SelectItem>
                      <SelectItem value="joint_venture">Joint Venture Partnership</SelectItem>
                      <SelectItem value="family_trust">Family Trust / Estate</SelectItem>
                      <SelectItem value="reit">Real Estate Investment Trust (REIT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Management Team */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Management Company</Label>
                  <Input
                    value={formData.management_company}
                    onChange={(e) => setFormData({ ...formData, management_company: e.target.value })}
                    placeholder="e.g., EstatesPro Management Ltd"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Designated Property Manager</Label>
                  <Input
                    value={formData.property_manager}
                    onChange={(e) => setFormData({ ...formData, property_manager: e.target.value })}
                    placeholder="e.g., John Doe"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Manager Direct Phone</Label>
                  <Input
                    value={formData.management_phone}
                    onChange={(e) => setFormData({ ...formData, management_phone: e.target.value })}
                    placeholder="+250 788 000 000"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* 24/7 Emergency Contacts */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      24/7 Emergency & Operational Contacts
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Critical phone numbers for after-hours incidents, security, and utility dispatch.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmergencyContact}
                    className="gap-1 h-8 text-xs border-border/80"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Contact</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.emergency_contacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 items-center"
                    >
                      <Input
                        placeholder="Contact Name / Service"
                        value={contact.name}
                        onChange={(e) => updateEmergencyContact(idx, 'name', e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                      <Input
                        placeholder="Phone Number (+250...)"
                        value={contact.phone}
                        onChange={(e) => updateEmergencyContact(idx, 'phone', e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                      <Input
                        placeholder="Role / Service (e.g. Electrician)"
                        value={contact.relationship}
                        onChange={(e) => updateEmergencyContact(idx, 'relationship', e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmergencyContact(idx)}
                          disabled={formData.emergency_contacts.length === 1}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 5: FINANCIAL PROFILE
              Revenue Target, Budget, Insurance, Tax TIN
              ==================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Step 5: Financial Profile & Compliance
                </h3>
                <p className="text-xs text-muted-foreground">
                  Set revenue benchmarks, operating budget allocations, tax compliance, and asset insurance.
                </p>
              </div>

              {/* Currency & Targets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Operating Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) => setFormData({ ...formData, currency: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RWF">RWF (Rwandan Franc)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                      <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                      <SelectItem value="GHS">GHS (Ghanaian Cedi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Monthly Inflow Target</Label>
                  <Input
                    type="number"
                    value={formData.revenue_target}
                    onChange={(e) => setFormData({ ...formData, revenue_target: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 5000000"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Monthly Operating Budget</Label>
                  <Input
                    type="number"
                    value={formData.operating_budget}
                    onChange={(e) => setFormData({ ...formData, operating_budget: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 1500000"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Tax Information */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  🇷🇼 Statutory Tax & Compliance Configuration
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tin" className="text-xs font-semibold">
                      Landlord / Company Tax Identification Number (TIN)
                    </Label>
                    <Input
                      id="tin"
                      value={formData.landlord_tin}
                      onChange={(e) => setFormData({ ...formData, landlord_tin: e.target.value })}
                      placeholder="e.g., 100234567"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxRate" className="text-xs font-semibold">
                      Statutory Rental Income Tax Rate (%)
                    </Label>
                    <Input
                      id="taxRate"
                      type="number"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 15 })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Insurance Details */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Property Asset Insurance Coverage
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Insurance Provider</Label>
                    <Input
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                      placeholder="e.g., Sanlam Assurance / Prime"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Policy Number</Label>
                    <Input
                      value={formData.insurance_policy_number}
                      onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                      placeholder="e.g., POL-PROP-2026-99"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Policy Expiration Date</Label>
                    <Input
                      type="date"
                      value={formData.insurance_expiry}
                      onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 6: OPERATIONAL SETTINGS
              Maintenance Strategy, Inspection Frequency, Rules, Policies
              ==================================================== */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Step 6: Operational Settings & Governance
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure maintenance triage rules, routine inspections, and resident building policies.
                </p>
              </div>

              {/* Maintenance & Inspection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Maintenance Strategy</Label>
                  <Select
                    value={formData.maintenance_strategy}
                    onValueChange={(val) => setFormData({ ...formData, maintenance_strategy: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventive First (Scheduled audits)</SelectItem>
                      <SelectItem value="reactive">On-Demand / Reactive Triage</SelectItem>
                      <SelectItem value="hybrid">Hybrid Contractor SLA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inspection Frequency</Label>
                  <Select
                    value={formData.inspection_frequency}
                    onValueChange={(val) => setFormData({ ...formData, inspection_frequency: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Routine</SelectItem>
                      <SelectItem value="quarterly">Quarterly Audit</SelectItem>
                      <SelectItem value="semi_annual">Semi-Annual Review</SelectItem>
                      <SelectItem value="annual">Annual Structural Assessment</SelectItem>
                      <SelectItem value="turnover_only">Turnover / Move-in Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Occupancy Rate (%)</Label>
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={formData.target_occupancy_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, target_occupancy_rate: parseInt(e.target.value) || 95 })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Building Policies */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Property Code of Conduct & Resident Policies
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">Pets Allowed</span>
                      <span className="text-[11px] text-muted-foreground">Domestic pet approvals</span>
                    </div>
                    <Switch
                      checked={formData.policy_pets}
                      onCheckedChange={(val) => setFormData({ ...formData, policy_pets: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">Smoking Allowed</span>
                      <span className="text-[11px] text-muted-foreground">Designated areas only</span>
                    </div>
                    <Switch
                      checked={formData.policy_smoking}
                      onCheckedChange={(val) => setFormData({ ...formData, policy_smoking: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">Subletting Allowed</span>
                      <span className="text-[11px] text-muted-foreground">Short-term Airbnb sublease</span>
                    </div>
                    <Switch
                      checked={formData.policy_subletting}
                      onCheckedChange={(val) => setFormData({ ...formData, policy_subletting: val })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              STEP 7: REVIEW & VALIDATION
              Completeness, Missing Checks, Summary Cards, Publish
              ==================================================== */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Step 7: Review Asset Profile & Publish
                </h3>
                <p className="text-xs text-muted-foreground">
                  Verify completeness score and missing items before committing property to active portfolio.
                </p>
              </div>

              {/* Profile Completeness Banner */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Asset Profile Quality Rating
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-extrabold text-foreground">
                        {completeness.score}% Complete
                      </span>
                      <Badge
                        className={cn(
                          'text-xs font-semibold',
                          completeness.score >= 80
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : completeness.score >= 50
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {completeness.score >= 80
                          ? 'Enterprise Ready'
                          : completeness.score >= 50
                          ? 'Good (Recommendations Pending)'
                          : 'Incomplete'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveProperty('draft')}
                      disabled={createProperty.isPending}
                      className="gap-1.5 text-xs h-9"
                    >
                      <span>Save as Draft</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveProperty('active')}
                      disabled={createProperty.isPending || !formData.name || !formData.address}
                      className="gap-1.5 text-xs h-9 bg-primary text-primary-foreground font-semibold"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{createProperty.isPending ? 'Publishing...' : 'Publish Property'}</span>
                    </Button>
                  </div>
                </div>

                {/* Missing Items Callout */}
                {completeness.missingItems.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Recommended Fields to Complete:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {completeness.missingItems.slice(0, 8).map((item) => (
                        <button
                          key={item.field}
                          type="button"
                          onClick={() => goToStep(item.step)}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border',
                            item.critical
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                          )}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] opacity-70">Step {item.step}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic & Location */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground pb-2 border-b border-border/60">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Basic Details & Location</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Name: <span className="text-foreground font-semibold">{formData.name}</span></div>
                    <div>Code: <span className="text-foreground font-mono">{formData.property_code || 'Auto'}</span></div>
                    <div>Type: <span className="text-foreground capitalize">{formData.type}</span></div>
                    <div>Units: <span className="text-foreground font-bold">{formData.total_units}</span></div>
                    <div className="col-span-2">Address: <span className="text-foreground">{formData.address}, {formData.district}</span></div>
                    {formData.latitude && (
                      <div className="col-span-2 text-emerald-600">GPS: {formData.latitude.toFixed(4)}, {formData.longitude?.toFixed(4)}</div>
                    )}
                  </div>
                </div>

                {/* Ownership & Finance */}
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground pb-2 border-b border-border/60">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>Ownership & Financials</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Owner: <span className="text-foreground font-semibold">{formData.owner_name}</span></div>
                    <div>Manager: <span className="text-foreground">{formData.property_manager || 'None'}</span></div>
                    <div>Revenue Target: <span className="text-foreground font-semibold">{formatCurrency(formData.revenue_target)}</span></div>
                    <div>Budget: <span className="text-foreground">{formatCurrency(formData.operating_budget)}</span></div>
                    <div className="col-span-2">Tax TIN: <span className="text-foreground font-mono">{formData.landlord_tin || 'Not provided'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Bottom Navigation Bar */}
        <div className="p-4 border-t border-border/70 bg-card shrink-0 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handlePrev}
            className="gap-1.5 h-9 text-xs border-border/80"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{currentStep === 1 ? 'Cancel' : 'Previous Step'}</span>
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="gap-1.5 h-9 text-xs font-semibold bg-primary text-primary-foreground"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveProperty('active')}
                disabled={createProperty.isPending || !formData.name || !formData.address}
                className="gap-1.5 h-9 text-xs font-semibold bg-primary text-primary-foreground"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{createProperty.isPending ? 'Publishing...' : 'Publish Property'}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
