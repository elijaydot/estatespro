// src/components/maintenance/AddMaintenanceVendorModal.tsx
// FishGate Design Constitution v1.0 - Onboard Physical Contractor & Vendor Partner

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Building, Phone, Mail, User, ShieldCheck, Flame, Wrench, Clock } from 'lucide-react';
import { VendorOperationalProfile } from './types';

interface AddMaintenanceVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddVendor: (vendor: VendorOperationalProfile) => void;
}

const COMMON_TRADES = [
  'Electrical & Power Generators',
  'Plumbing & Drainage',
  'HVAC & Air Conditioning',
  'Elevator & Heavy Lifts',
  'Security, CCTV & Access Controls',
  'Sanitation & Waste Management',
  'Painting & Structural Masonry',
  'Roofing & Waterproofing',
  'Landscaping & Grounds Keeping',
  'General Facility Maintenance',
];

export function AddMaintenanceVendorModal({
  open,
  onOpenChange,
  onAddVendor,
}: AddMaintenanceVendorModalProps) {
  // Unconditional declaration of hooks at the top
  const [name, setName] = useState('');
  const [tradeCategory, setTradeCategory] = useState(COMMON_TRADES[0]);
  const [customTrade, setCustomTrade] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyService, setEmergencyService] = useState(false);
  const [insuranceValid, setInsuranceValid] = useState(true);
  const [licenseValid, setLicenseValid] = useState(true);
  const [slaHours, setSlaHours] = useState('4');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: 'Validation Error', description: 'Company / Contractor name is required.', variant: 'destructive' });
      return;
    }
    if (!contactPerson.trim()) {
      toast({ title: 'Validation Error', description: 'Contact person name is required.', variant: 'destructive' });
      return;
    }
    if (!phone.trim()) {
      toast({ title: 'Validation Error', description: 'Phone number is required for operational dispatch.', variant: 'destructive' });
      return;
    }

    const finalTrade = tradeCategory === 'Other' && customTrade.trim() ? customTrade.trim() : tradeCategory;

    const newVendor: VendorOperationalProfile = {
      id: `vend-${Date.now()}`,
      name: name.trim(),
      tradeCategory: finalTrade,
      contactPerson: contactPerson.trim(),
      email: email.trim() || `dispatch@${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}.rw`,
      phone: phone.trim(),
      activeWorkOrders: 0,
      responseTimeHours: parseFloat(slaHours) || 4.0,
      completionRate: 100,
      costYtd: 0,
      rating: 5.0,
      emergencyService,
      status: 'active',
      insuranceValid,
      licenseValid,
      slaStandardHours: parseFloat(slaHours) || 4.0,
    };

    onAddVendor(newVendor);
    onOpenChange(false);

    // Reset Form
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setEmergencyService(false);
    setInsuranceValid(true);
    setLicenseValid(true);
    setSlaHours('4');

    toast({
      title: 'Contractor Partner Registered',
      description: `${newVendor.name} has been onboarded to your operational vendor roster.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Onboard Contractor / Vendor Partner</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Register a licensed trade service provider for property repair dispatch and work orders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Company / Contractor Name *</Label>
            <div className="relative">
              <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="e.g. Kigali Premier HVAC & Cooling Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Trade Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Primary Trade Specialization *</Label>
            <select
              value={tradeCategory}
              onChange={(e) => setTradeCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
            >
              {COMMON_TRADES.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
              <option value="Other">Other Specialized Trade...</option>
            </select>

            {tradeCategory === 'Other' && (
              <Input
                placeholder="Specify trade category..."
                value={customTrade}
                onChange={(e) => setCustomTrade(e.target.value)}
                className="text-xs h-9 mt-2"
                required
              />
            )}
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Primary Contact Person *</Label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="e.g. Alexandre Nshimiyimana"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="pl-9 text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Phone Number *</Label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="e.g. +250 788 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 text-xs h-9"
                  required
                />
              </div>
            </div>
          </div>

          {/* Email & SLA Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Dispatch Email</Label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  type="email"
                  placeholder="e.g. dispatch@contractor.rw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">SLA Response Window (Hours)</Label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={slaHours}
                  onChange={(e) => setSlaHours(e.target.value)}
                  className="pl-9 text-xs h-9 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Compliance & Emergency Checkboxes */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
            <span className="font-semibold text-slate-900 block text-xs">Compliance & Operational Availability</span>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyService}
                onChange={(e) => setEmergencyService(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-600" />
                Provide 24/7 Emergency Dispatch & Out-of-Hours Response
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={insuranceValid}
                onChange={(e) => setInsuranceValid(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Commercial General Liability Insurance Verified & Current
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={licenseValid}
                onChange={(e) => setLicenseValid(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                Trade Registration Certificate / License on File
              </span>
            </label>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
            >
              <Building className="w-3.5 h-3.5" />
              Save & Register Contractor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
