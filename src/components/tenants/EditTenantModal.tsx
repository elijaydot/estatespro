// src/components/tenants/EditTenantModal.tsx
// FishGate Design Constitution v1.0 - Section-Based Resident Profile Editor

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  Home,
  Sliders,
  CheckCircle2,
  Building2,
  AlertTriangle,
  Save,
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
import { useUpdateTenant, type Tenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import {
  calculateTenantCompleteness,
  TENANT_STATUSES,
  EMPLOYMENT_STATUSES,
  CONTACT_METHODS,
  RISK_LEVELS,
} from '@/lib/tenantProfileCompleteness';
import { cn } from '@/lib/utils';

interface EditTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onSuccess?: () => void;
}

const TABS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'lease', label: 'Lease & Space', icon: Home },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
];

export function EditTenantModal({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}: EditTenantModalProps) {
  const [activeTab, setActiveTab] = useState('identity');
  const updateTenant = useUpdateTenant();

  const { data: properties = [] } = useProperties();
  const { data: allUnits = [] } = useUnits();

  const [formData, setFormData] = useState<Partial<Tenant>>({});

  useEffect(() => {
    if (tenant) {
      setFormData({ ...tenant });
    }
  }, [tenant]);

  const availableUnits = useMemo(() => {
    if (!formData.property_id) return [];
    return allUnits.filter((u) => u.property_id === formData.property_id);
  }, [allUnits, formData.property_id]);

  const completeness = useMemo(() => {
    return calculateTenantCompleteness(formData);
  }, [formData]);

  const updateField = (key: keyof Tenant, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'first_name' || key === 'last_name') {
        const first = key === 'first_name' ? value : prev.first_name || '';
        const last = key === 'last_name' ? value : prev.last_name || '';
        next.name = `${first} ${last}`.trim();
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    try {
      await updateTenant.mutateAsync({
        id: tenant.id,
        ...formData,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      // Error toasted in mutation
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border/80 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border/70 bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>Edit Resident Profile: {tenant.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Section-based relationship records, KYC data quality, and lease settings.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-3 bg-card px-3.5 py-1.5 rounded-xl border border-border/80 shadow-2xs self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Completeness
                </span>
                <span className="text-xs font-bold text-foreground">
                  {completeness.score}% Complete
                </span>
              </div>
              <div className="w-14 h-2 rounded-full bg-muted overflow-hidden">
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

          {/* Tab Navigation */}
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/60 pb-1">
            {TABS.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <IconComp className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: IDENTITY */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={formData.first_name || ''}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Middle Name</Label>
                  <Input
                    value={formData.middle_name || ''}
                    onChange={(e) => updateField('middle_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    value={formData.last_name || ''}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Name</Label>
                  <Input
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
                  <Label className="text-xs">Nationality</Label>
                  <Input
                    value={formData.nationality || ''}
                    onChange={(e) => updateField('nationality', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">National ID Number</Label>
                  <Input
                    value={formData.national_id || ''}
                    onChange={(e) => updateField('national_id', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Passport Number</Label>
                  <Input
                    value={formData.passport_number || ''}
                    onChange={(e) => updateField('passport_number', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Phone</Label>
                  <Input
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Secondary Phone</Label>
                  <Input
                    value={formData.secondary_phone || ''}
                    onChange={(e) => updateField('secondary_phone', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alternative Email</Label>
                  <Input
                    type="email"
                    value={formData.alternative_email || ''}
                    onChange={(e) => updateField('alternative_email', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-3">
                <span className="text-xs font-bold text-foreground">Emergency Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Contact Name</Label>
                    <Input
                      value={formData.emergency_contact || ''}
                      onChange={(e) => updateField('emergency_contact', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      value={formData.emergency_contact_relationship || ''}
                      onChange={(e) => updateField('emergency_contact_relationship', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Emergency Phone</Label>
                    <Input
                      value={formData.emergency_phone || ''}
                      onChange={(e) => updateField('emergency_phone', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADDRESS */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Current Residential Address</Label>
                <Textarea
                  value={formData.current_address || ''}
                  onChange={(e) => updateField('current_address', e.target.value)}
                  className="text-xs"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Previous Address</Label>
                <Textarea
                  value={formData.previous_address || ''}
                  onChange={(e) => updateField('previous_address', e.target.value)}
                  className="text-xs"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employer Address</Label>
                  <Input
                    value={formData.employer_address || ''}
                    onChange={(e) => updateField('employer_address', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mailing Address</Label>
                  <Input
                    value={formData.mailing_address || ''}
                    onChange={(e) => updateField('mailing_address', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EMPLOYMENT */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employer</Label>
                  <Input
                    value={formData.employer || ''}
                    onChange={(e) => updateField('employer', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Occupation</Label>
                  <Input
                    value={formData.occupation || ''}
                    onChange={(e) => updateField('occupation', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Income (RWF)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_income || 0}
                    onChange={(e) => updateField('monthly_income', Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Guarantor Name</Label>
                  <Input
                    value={formData.guarantor_name || ''}
                    onChange={(e) => updateField('guarantor_name', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Guarantor Contact</Label>
                  <Input
                    value={formData.guarantor_contact || ''}
                    onChange={(e) => updateField('guarantor_contact', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LEASE */}
          {activeTab === 'lease' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Property</Label>
                  <Select
                    value={formData.property_id || ''}
                    onValueChange={(val) => {
                      updateField('property_id', val);
                      updateField('unit_id', '');
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select property" />
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
                  <Label className="text-xs">Unit</Label>
                  <Select
                    value={formData.unit_id || ''}
                    onValueChange={(val) => updateField('unit_id', val)}
                    disabled={!formData.property_id}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select unit" />
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
                  <Label className="text-xs">Monthly Rent (RWF)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_rent || 0}
                    onChange={(e) => updateField('monthly_rent', Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lifecycle Status</Label>
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Risk Level</Label>
                  <Select
                    value={formData.risk_level || 'low'}
                    onValueChange={(val) => updateField('risk_level', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
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

              <div className="space-y-1.5">
                <Label className="text-xs">Operational Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="text-xs"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 bg-muted/20 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={updateTenant.isPending}
            className="text-xs h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{updateTenant.isPending ? 'Saving...' : 'Save Profile Changes'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
