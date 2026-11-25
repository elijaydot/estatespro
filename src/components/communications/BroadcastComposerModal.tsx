import { useState } from 'react';
import { Megaphone, Users, Building2, Send, AlertTriangle, Bell, Mail, ShieldAlert } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Property } from '@/hooks/useProperties';

interface BroadcastComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  onSendBroadcast: (params: {
    title: string;
    message: string;
    targetRole: 'all' | 'tenant' | 'landlord' | 'property_manager';
    propertyId?: string | null;
  }) => Promise<void>;
}

export function BroadcastComposerModal({
  open,
  onOpenChange,
  properties,
  onSendBroadcast,
}: BroadcastComposerModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'tenant' | 'landlord' | 'property_manager'>('tenant');
  const [propertyId, setPropertyId] = useState<string>('all');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [channels, setChannels] = useState<{ inApp: boolean; email: boolean }>({
    inApp: true,
    email: true,
  });
  const [isSending, setIsSending] = useState(false);

  const handleDispatch = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Broadcast title and announcement body are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSending(true);
      await onSendBroadcast({
        title: title.trim(),
        message: message.trim(),
        targetRole,
        propertyId: propertyId === 'all' ? null : propertyId,
      });
      toast({
        title: 'Broadcast Dispatched',
        description: 'Announcement successfully broadcast to selected audience.',
      });
      onOpenChange(false);
      setTitle('');
      setMessage('');
    } catch (err: any) {
      toast({
        title: 'Broadcast Failed',
        description: err?.message || 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Create Portfolio Broadcast Announcement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dispatch mass operational notices, maintenance advisories, and community announcements.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* Target Audience Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Property Target
              </Label>
              <select
                className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                <option value="all">Entire Portfolio (All Properties)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Target Audience
              </Label>
              <select
                className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
              >
                <option value="tenant">Residents / Tenants Only</option>
                <option value="all">All Stakeholders (Tenants & Landlords)</option>
                <option value="landlord">Landlords & Owners Only</option>
                <option value="property_manager">Staff & Managers Only</option>
              </select>
            </div>
          </div>

          {/* Title & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold text-slate-700">Announcement Title *</Label>
              <Input
                placeholder="e.g., Scheduled Water Supply Maintenance & Tank Cleaning"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Priority Level</Label>
              <select
                className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="normal">Standard Advisory</option>
                <option value="urgent">Urgent / Emergency</option>
              </select>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Delivery Channels</Label>
            <div className="flex items-center gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.inApp}
                  onChange={(e) => setChannels({ ...channels, inApp: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                In-App Notice Banner
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.email}
                  onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                Email Notification
              </label>
            </div>
          </div>

          {/* Message Body */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Announcement Content *</Label>
            <Textarea
              placeholder="Provide clear details, affected areas, dates, times, and contact instructions..."
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs font-sans leading-relaxed"
            />
          </div>

          {priority === 'urgent' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                Urgent broadcasts are highlighted prominently in resident portals and sent with priority headers.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/70 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
            onClick={handleDispatch}
            disabled={isSending || !title.trim() || !message.trim()}
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Dispatching...' : 'Dispatch Broadcast'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
