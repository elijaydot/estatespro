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
  Compass,
  Navigation,
  ExternalLink,
  Phone,
  Trash2,
  Plus,
  Shield,
  Zap,
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
import {
  Property,
  PropertyEmergencyContact,
  useUpdateProperty,
} from '@/hooks/useProperties';
import {
  calculatePropertyCompleteness,
  getCurrentBrowserLocation,
  reverseGeocodeCoordinates,
  RWANDA_PROVINCES,
  COMMON_AMENITIES,
  ACCESSIBILITY_FEATURES,
  SECURITY_FEATURES,
  UTILITIES_LIST,
} from '@/lib/propertyProfileCompleteness';
import { cn } from '@/lib/utils';

interface EditPropertyModalProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: Property) => void;
}

export function EditPropertyModal({
  property,
  open,
  onOpenChange,
  onSuccess,
}: EditPropertyModalProps) {
  const { formatCurrency } = useSettings();
  const updateProperty = useUpdateProperty();

  const [activeTab, setActiveTab] = useState<string>('basic');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Form State initialized from property prop
  const [formData, setFormData] = useState<Partial<Property>>({});

  useEffect(() => {
    if (property) {
      setFormData({
        ...property,
        image_urls: property.image_urls || (property.image_url ? [property.image_url] : []),
        amenities: property.amenities || [],
        accessibility_features: property.accessibility_features || [],
        security_features: property.security_features || [],
        utilities: property.utilities || [],
        emergency_contacts: property.emergency_contacts || [],
        currency: property.currency || 'RWF',
        tax_rate: property.tax_rate ?? 15,
        target_occupancy_rate: property.target_occupancy_rate ?? 95,
      });
    }
  }, [property]);

  // Profile completeness calculation
  const completeness = useMemo(
    () => calculatePropertyCompleteness(formData),
    [formData]
  );

  if (!property) return null;

  // Auto-detect GPS handler
  const handleAutoDetectLocation = async () => {
    setIsLocating(true);
    try {
      const coords = await getCurrentBrowserLocation();
      const geocode = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;

      setFormData((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
        google_maps_url: mapsUrl,
        address: geocode.address || prev.address || '',
        district: geocode.district || prev.district || 'Gasabo',
        province: geocode.state || prev.province || 'Kigali City',
        country: geocode.country || prev.country || 'Rwanda',
      }));

      toast({
        title: 'Location Updated via GPS',
        description: `Coordinates (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}) auto-filled.`,
      });
    } catch (err: any) {
      toast({
        title: 'Auto-Location Notice',
        description: err.message || 'Could not fetch GPS location.',
        variant: 'destructive',
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Toggle multi-select chips
  const toggleArrayItem = (field: 'amenities' | 'accessibility_features' | 'security_features' | 'utilities', item: string) => {
    setFormData((prev) => {
      const current = (prev[field] as string[]) || [];
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  // Save changes handler
  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.address?.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Property Name and Address cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload: any = {
        id: property.id,
        ...formData,
        image_url: formData.image_urls?.[0] || formData.image_url || null,
        completeness_score: completeness.score,
      };

      const updated = await updateProperty.mutateAsync(payload);
      toast({
        title: 'Property Profile Updated',
        description: `Saved with ${completeness.score}% asset completeness.`,
      });
      onOpenChange(false);
      if (onSuccess && updated) {
        onSuccess(updated as Property);
      }
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update property.',
        variant: 'destructive',
      });
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'location', label: 'Location & Maps', icon: MapPin },
    { id: 'characteristics', label: 'Specs & Features', icon: Layers },
    { id: 'ownership', label: 'Ownership & Team', icon: Users },
    { id: 'financials', label: 'Financial Profile', icon: DollarSign },
    { id: 'operations', label: 'Operations & Rules', icon: Wrench },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-border/80">
        {/* Header */}
        <div className="p-6 border-b border-border/70 bg-card shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    Edit Asset Profile: {property.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Section-based property asset management and data quality controls
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Completeness Meter */}
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
                  {completeness.score}% Complete
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
                size="sm"
                onClick={handleSave}
                disabled={updateProperty.isPending}
                className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{updateProperty.isPending ? 'Saving...' : 'Save Profile'}</span>
              </Button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-5 border-t border-border/50 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shrink-0',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-background">
          {/* Missing items alert */}
          {completeness.missingItems.length > 0 && (
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Missing: {completeness.missingItems.slice(0, 3).map((m) => m.label).join(', ')}
                  {completeness.missingItems.length > 3 && ` +${completeness.missingItems.length - 3} more`}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                Complete fields to reach 100%
              </span>
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Property Photos
                </Label>
                <MultiImageUpload
                  values={formData.image_urls || []}
                  onChange={(urls) =>
                    setFormData({ ...formData, image_urls: urls, image_url: urls[0] || '' })
                  }
                  folder="properties"
                  maxImages={10}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Property Name *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Property Code</Label>
                  <Input
                    value={formData.property_code || ''}
                    onChange={(e) => setFormData({ ...formData, property_code: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Type</Label>
                  <Select
                    value={formData.type || 'apartment'}
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment Building</SelectItem>
                      <SelectItem value="house">Single Family House / Villa</SelectItem>
                      <SelectItem value="commercial">Commercial Tower</SelectItem>
                      <SelectItem value="retail">Retail Mall</SelectItem>
                      <SelectItem value="mixed">Mixed-Use</SelectItem>
                      <SelectItem value="short_let">Short-Let / Hospitality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select
                    value={formData.category || 'residential'}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed">Mixed-Use</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Operational Status</Label>
                  <Select
                    value={formData.status || 'active'}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active & Operational</SelectItem>
                      <SelectItem value="under_construction">Under Construction</SelectItem>
                      <SelectItem value="renovation">Renovating</SelectItem>
                      <SelectItem value="planned">Planned Pipeline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 2: LOCATION & MAPS */}
          {activeTab === 'location' && (
            <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
              <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Compass className="h-4 w-4" /> Auto-Geocoding & GPS Location
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Update exact coordinates and address using device geolocation.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAutoDetectLocation}
                  disabled={isLocating}
                  className="gap-1.5 text-xs h-8 border-primary/30"
                >
                  <Navigation className={cn('h-3.5 w-3.5', isLocating && 'animate-spin')} />
                  <span>{isLocating ? 'Locating...' : 'Auto-Detect Location'}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Country</Label>
                  <Input
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Province / State</Label>
                  <Input
                    value={formData.province || formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value, state: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">District / City</Label>
                  <Input
                    value={formData.district || formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value, city: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Street Address *</Label>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Postal Code</Label>
                  <Input
                    value={formData.zip_code || ''}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">🇷🇼 UPI Identifier</Label>
                  <Input
                    value={formData.upi || ''}
                    onChange={(e) => setFormData({ ...formData, upi: e.target.value })}
                    placeholder="1/03/05/02/1234"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude ?? ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude ?? ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHARACTERISTICS */}
          {activeTab === 'characteristics' && (
            <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Total Units</Label>
                  <Input
                    type="number"
                    value={formData.total_units || 1}
                    onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 1 })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Floors</Label>
                  <Input
                    type="number"
                    value={formData.number_of_floors || 1}
                    onChange={(e) => setFormData({ ...formData, number_of_floors: parseInt(e.target.value) || 1 })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Parking Spaces</Label>
                  <Input
                    type="number"
                    value={formData.parking_spaces || 0}
                    onChange={(e) => setFormData({ ...formData, parking_spaces: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Land Area (sqm)</Label>
                  <Input
                    type="number"
                    value={formData.land_area || 0}
                    onChange={(e) => setFormData({ ...formData, land_area: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Amenities
                </Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AMENITIES.map((item) => {
                    const isSelected = (formData.amenities || []).includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('amenities', item)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OWNERSHIP */}
          {activeTab === 'ownership' && (
            <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Owner Name *</Label>
                  <Input
                    value={formData.owner_name || ''}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Property Manager</Label>
                  <Input
                    value={formData.property_manager || ''}
                    onChange={(e) => setFormData({ ...formData, property_manager: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIALS */}
          {activeTab === 'financials' && (
            <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Input
                    value={formData.currency || 'RWF'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Monthly Revenue Target</Label>
                  <Input
                    type="number"
                    value={formData.revenue_target || 0}
                    onChange={(e) => setFormData({ ...formData, revenue_target: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Monthly Operating Budget</Label>
                  <Input
                    type="number"
                    value={formData.operating_budget || 0}
                    onChange={(e) => setFormData({ ...formData, operating_budget: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tax TIN (RRA)</Label>
                  <Input
                    value={formData.landlord_tin || ''}
                    onChange={(e) => setFormData({ ...formData, landlord_tin: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Insurance Policy #</Label>
                  <Input
                    value={formData.insurance_policy_number || ''}
                    onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: OPERATIONS */}
          {activeTab === 'operations' && (
            <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Maintenance Strategy</Label>
                  <Select
                    value={formData.maintenance_strategy || 'preventive'}
                    onValueChange={(val) => setFormData({ ...formData, maintenance_strategy: val })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventive First</SelectItem>
                      <SelectItem value="reactive">On-Demand Reactive</SelectItem>
                      <SelectItem value="hybrid">Hybrid SLA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Occupancy Rate (%)</Label>
                  <Input
                    type="number"
                    value={formData.target_occupancy_rate || 95}
                    onChange={(e) => setFormData({ ...formData, target_occupancy_rate: parseInt(e.target.value) || 95 })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 bg-card shrink-0 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={updateProperty.isPending}
            className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{updateProperty.isPending ? 'Saving Changes...' : 'Save Changes'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
