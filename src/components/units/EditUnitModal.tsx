// src/components/units/EditUnitModal.tsx
// Section-based Unit Asset Profile Editor under FishGate Design Constitution v1.0

import React, { useState, useEffect, useMemo } from 'react';
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
import { useProperties } from '@/hooks/useProperties';
import {
  useUpdateUnit,
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

interface EditUnitModalProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: Unit) => void;
}

export function EditUnitModal({
  unit,
  open,
  onOpenChange,
  onSuccess,
}: EditUnitModalProps) {
  const { formatCurrency } = useSettings();
  const { data: properties = [] } = useProperties();
  const updateUnit = useUpdateUnit();

  const [activeTab, setActiveTab] = useState<string>('basic');
  const [formData, setFormData] = useState<Partial<Unit>>({});

  useEffect(() => {
    if (unit) {
      // Strip relations and system keys from state
      const {
        properties: _p,
        tenants: _t,
        maintenance_requests: _m,
        created_at: _c,
        updated_at: _u,
        user_id: _uid,
        ...cleanInitial
      } = unit as any;

      setFormData({
        ...cleanInitial,
        image_urls: unit.image_urls || (unit.image_url ? [unit.image_url] : []),
        amenities: unit.amenities || [],
        accessibility_features: unit.accessibility_features || [],
        utilities_included: unit.utilities_included || [],
        documents: unit.documents || [],
        currency: unit.currency || 'RWF',
        billing_frequency: unit.billing_frequency || 'monthly',
        status: unit.status || 'available',
      });
    }
  }, [unit]);

  const completeness = useMemo(
    () => calculateUnitCompleteness(formData as any),
    [formData]
  );

  if (!unit) return null;

  const toggleArrayItem = (
    field: 'amenities' | 'accessibility_features' | 'utilities_included' | 'required_documents',
    item: string
  ) => {
    setFormData((prev) => {
      const current = (prev as any)[field] || [];
      const updated = current.includes(item)
        ? current.filter((x: string) => x !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const handleSave = async () => {
    if (!formData.unit_number?.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Unit Number cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const {
        properties: _p,
        tenants: _t,
        maintenance_requests: _m,
        created_at: _c,
        updated_at: _u,
        user_id: _uid,
        id: _formId,
        ...cleanData
      } = formData as any;

      const payload: any = {
        id: unit.id,
        ...cleanData,
        image_url: formData.image_urls?.[0] || formData.image_url || null,
        completeness_score: completeness.score,
      };

      const updated = await updateUnit.mutateAsync(payload);
      toast({
        title: 'Unit Profile Updated',
        description: `Saved with ${completeness.score}% operational completeness.`,
      });
      onOpenChange(false);
      if (onSuccess && updated) {
        onSuccess(updated as Unit);
      }
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update unit.',
        variant: 'destructive',
      });
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Home },
    { id: 'specs', label: 'Specifications', icon: Layers },
    { id: 'financials', label: 'Rental Profile', icon: DollarSign },
    { id: 'occupancy', label: 'Occupancy & Rules', icon: Users },
    { id: 'lease', label: 'Lease Defaults', icon: FileText },
    { id: 'operations', label: 'Operations & Risk', icon: Wrench },
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
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    Edit Unit: {unit.unit_number}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Operational unit inventory specifications and compliance settings
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
                disabled={updateUnit.isPending}
                className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{updateUnit.isPending ? 'Saving...' : 'Save Unit'}</span>
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

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-background">
          {completeness.missingItems.length > 0 && (
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Missing: {completeness.missingItems.slice(0, 3).map((m) => m.label).join(', ')}
                  {completeness.missingItems.length > 3 && ` +${completeness.missingItems.length - 3} more`}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Complete fields to reach 100%</span>
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Unit Gallery & Primary Image</Label>
                <MultiImageUpload
                  value={formData.image_urls || []}
                  onChange={(urls) =>
                    setFormData({ ...formData, image_urls: urls, image_url: urls[0] || '' })
                  }
                  maxFiles={8}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Parent Property</Label>
                  <Select
                    value={formData.property_id || ''}
                    onValueChange={(val) => setFormData({ ...formData, property_id: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          🏢 {p.name} ({p.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unit Number *</Label>
                  <Input
                    value={formData.unit_number || ''}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Internal Unit Code</Label>
                  <Input
                    value={(formData as any).unit_code || ''}
                    onChange={(e) => setFormData({ ...formData, unit_code: e.target.value } as any)}
                    className="h-9 text-xs uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Building Name</Label>
                  <Input
                    value={(formData as any).building_name || ''}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Floor</Label>
                    <Input
                      type="number"
                      value={formData.floor || 1}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Wing</Label>
                    <Input
                      value={(formData as any).wing || ''}
                      onChange={(e) => setFormData({ ...formData, wing: e.target.value } as any)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Unit Type</Label>
                  <Select
                    value={(formData as any).unit_type || '2 Bedroom Apartment'}
                    onValueChange={(val) => setFormData({ ...formData, unit_type: val } as any)}
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
                    value={(formData as any).unit_category || 'Residential'}
                    onValueChange={(val) => setFormData({ ...formData, unit_category: val } as any)}
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
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECIFICATIONS */}
          {activeTab === 'specs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bedrooms</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.bedrooms ?? 1}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bathrooms</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.bathrooms ?? 1}
                    onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Toilets</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(formData as any).toilets ?? 1}
                    onChange={(e) => setFormData({ ...formData, toilets: parseInt(e.target.value) || 0 } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Parking Spaces</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(formData as any).parking_spaces ?? 0}
                    onChange={(e) => setFormData({ ...formData, parking_spaces: parseInt(e.target.value) || 0 } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Floor Area (sqm)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(formData as any).floor_area_sqm ?? (formData.sqft ? Math.round(formData.sqft / 10.764) : 0)}
                    onChange={(e) => {
                      const sqm = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        floor_area_sqm: sqm,
                        sqft: Math.round(sqm * 10.764),
                      } as any);
                    }}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Balcony Access</Label>
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border/70 h-9">
                    <span className="text-xs font-medium">Private Balcony</span>
                    <Switch
                      checked={(formData as any).has_balcony || false}
                      onCheckedChange={(val) => setFormData({ ...formData, has_balcony: val } as any)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Furnishing</Label>
                  <Select
                    value={(formData as any).furnishing_status || 'unfurnished'}
                    onValueChange={(val) => setFormData({ ...formData, furnishing_status: val } as any)}
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
                    value={(formData as any).view_type || 'City Skyline'}
                    onValueChange={(val) => setFormData({ ...formData, view_type: val } as any)}
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

              {/* Amenities */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_UNIT_AMENITIES.map((item) => {
                    const selected = (formData.amenities || []).includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('amenities', item)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border text-left',
                          selected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                        )}
                      >
                        {selected ? '✓ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Utilities */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Utilities Included</Label>
                <div className="flex flex-wrap gap-2">
                  {UTILITIES_OPTIONS.map((item) => {
                    const selected = ((formData as any).utilities_included || []).includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('utilities_included', item)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border text-left',
                          selected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
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

          {/* TAB 3: FINANCIAL PROFILE */}
          {activeTab === 'financials' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Monthly Rent *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.rent_amount || 0}
                    onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Market Benchmark Rent</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(formData as any).market_rent || 0}
                    onChange={(e) => setFormData({ ...formData, market_rent: parseFloat(e.target.value) || 0 } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Security Deposit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(formData as any).security_deposit || 0}
                    onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Input
                    value={(formData as any).currency || 'RWF'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Billing Frequency</Label>
                  <Select
                    value={(formData as any).billing_frequency || 'monthly'}
                    onValueChange={(val) => setFormData({ ...formData, billing_frequency: val } as any)}
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
                  <Label className="text-xs font-semibold">Annual Revenue Target</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(formData as any).revenue_target || 0}
                    onChange={(e) => setFormData({ ...formData, revenue_target: parseFloat(e.target.value) || 0 } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-xs font-semibold">Pricing Notes</Label>
                  <Textarea
                    value={(formData as any).pricing_notes || ''}
                    onChange={(e) => setFormData({ ...formData, pricing_notes: e.target.value } as any)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OCCUPANCY & RULES */}
          {activeTab === 'occupancy' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Operational Status</Label>
                <Select
                  value={formData.status || 'available'}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label} — {s.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Availability Date</Label>
                  <Input
                    type="date"
                    value={(formData as any).available_from || ''}
                    onChange={(e) => setFormData({ ...formData, available_from: e.target.value } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Max Occupants</Label>
                  <Input
                    type="number"
                    min="1"
                    value={(formData as any).max_occupants || 2}
                    onChange={(e) => setFormData({ ...formData, max_occupants: parseInt(e.target.value) || 1 } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Preferred Tenant Profile</Label>
                  <Input
                    value={(formData as any).preferred_tenant_type || ''}
                    onChange={(e) => setFormData({ ...formData, preferred_tenant_type: e.target.value } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Move-In Rules</Label>
                  <Textarea
                    value={(formData as any).move_in_rules || ''}
                    onChange={(e) => setFormData({ ...formData, move_in_rules: e.target.value } as any)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LEASE DEFAULTS */}
          {activeTab === 'lease' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Lease Term (Months)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={(formData as any).default_lease_term_months || 12}
                    onChange={(e) => setFormData({ ...formData, default_lease_term_months: parseInt(e.target.value) || 12 } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lease Category</Label>
                  <Select
                    value={(formData as any).lease_category || 'Standard Residential Lease'}
                    onValueChange={(val) => setFormData({ ...formData, lease_category: val } as any)}
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
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">Mandatory Documents</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REQUIRED_DOCUMENTS_OPTIONS.map((doc) => {
                    const selected = ((formData as any).required_documents || []).includes(doc);
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
                        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: OPERATIONS */}
          {activeTab === 'operations' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Maintenance Responsibility</Label>
                  <Select
                    value={(formData as any).maintenance_responsibility || 'landlord_standard'}
                    onValueChange={(val) => setFormData({ ...formData, maintenance_responsibility: val } as any)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landlord_standard">Landlord Standard</SelectItem>
                      <SelectItem value="split_tenant">Split Tenant / Landlord</SelectItem>
                      <SelectItem value="triple_net">Triple Net (Commercial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inspection Cadence</Label>
                  <Select
                    value={(formData as any).inspection_frequency || 'quarterly'}
                    onValueChange={(val) => setFormData({ ...formData, inspection_frequency: val } as any)}
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
                  <Label className="text-xs font-semibold">Risk Rating</Label>
                  <Select
                    value={(formData as any).risk_rating || 'low'}
                    onValueChange={(val) => setFormData({ ...formData, risk_rating: val } as any)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cleaning Schedule</Label>
                  <Input
                    value={(formData as any).cleaning_schedule || ''}
                    onChange={(e) => setFormData({ ...formData, cleaning_schedule: e.target.value } as any)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Operational Notes</Label>
                  <Textarea
                    value={(formData as any).operational_notes || ''}
                    onChange={(e) => setFormData({ ...formData, operational_notes: e.target.value } as any)}
                    rows={3}
                    className="text-xs"
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
            disabled={updateUnit.isPending}
            className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{updateUnit.isPending ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
