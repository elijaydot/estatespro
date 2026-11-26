// src/components/expenses/AddVendorModal.tsx
// FishGate Design Constitution v1.0 - Operational Vendor Onboarding Modal

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Users, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useQueryClient } from '@tanstack/react-query';

interface AddVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendorCreated?: (vendor: any) => void;
}

export function AddVendorModal({
  open,
  onOpenChange,
  onVendorCreated,
}: AddVendorModalProps) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [vendorType, setVendorType] = useState('Contractor');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('Kigali, Rwanda');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Name Required', description: 'Please provide a vendor name.', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('vendors' as never)
        .insert({
          company_id: activeCompanyId !== 'all' && activeCompanyId ? activeCompanyId : undefined,
          name: name.trim(),
          vendor_type: vendorType,
          contact_name: contactName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          status: 'active',
          rating: 5,
        } as never)
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Vendor Added',
        description: `${name} registered as an operational vendor partner.`,
      });

      if (onVendorCreated && data) {
        onVendorCreated(data);
      }

      onOpenChange(false);
      setName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setNotes('');
    } catch (err: any) {
      toast({
        title: 'Failed to Add Vendor',
        description: err.message || 'Could not register vendor in database.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
            <Users className="w-4 h-4" />
          </div>
          <DialogTitle className="text-base font-bold text-slate-900">
            Register Operational Vendor
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Add a service provider, maintenance contractor, or utility partner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Vendor / Company Name *</Label>
            <Input
              placeholder="e.g. Kigali Electrical & Power Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Vendor Type</Label>
              <select
                className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
              >
                <option value="Contractor">Contractor</option>
                <option value="Security Agency">Security Agency</option>
                <option value="Cleaning Service">Cleaning Service</option>
                <option value="Utility Provider">Utility Provider</option>
                <option value="Supplier">Equipment Supplier</option>
                <option value="Professional Service">Professional</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Contact Person</Label>
              <Input
                placeholder="e.g. Patrick Mugabo"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Phone</Label>
              <Input
                placeholder="+250 788 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Email</Label>
              <Input
                type="email"
                placeholder="contact@vendor.rw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Address / City</Label>
            <Input
              placeholder="KN 3 Rd, Kigali, Rwanda"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Service Scope & Notes</Label>
            <Textarea
              placeholder="Services covered under SLA, billing bank account, key technicians..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 text-xs resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
