import { useState } from 'react';
import { Send, Mail, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
import { Tenant } from '@/hooks/useTenants';

interface PaymentReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  amountDue: number;
  onSendReminder: (params: {
    tenantId: string;
    amount: number;
    message: string;
    sendEmail: boolean;
  }) => Promise<void>;
  currency?: string;
}

export function PaymentReminderModal({
  open,
  onOpenChange,
  tenant,
  amountDue,
  onSendReminder,
  currency = 'RWF',
}: PaymentReminderModalProps) {
  const [sendEmail, setSendEmail] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [customMessage, setCustomMessage] = useState(
    `Dear ${tenant?.name || 'Resident'},\n\nThis is a friendly reminder that your outstanding rental balance of ${currency} ${amountDue.toLocaleString()} is currently due for settlement. Kindly settle via MTN Mobile Money (*182*8*1#) or bank transfer at your earliest convenience.\n\nThank you for your prompt cooperation!`
  );
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!tenant) return;
    try {
      setIsSending(true);
      await onSendReminder({
        tenantId: tenant.id,
        amount: amountDue,
        message: customMessage,
        sendEmail,
      });

      toast({
        title: 'Reminder Dispatched',
        description: `Payment reminder sent to ${tenant.name}.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Reminder Failed',
        description: err?.message || 'Could not send reminder.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Send Payment Reminder
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dispatches a notification and official reminder email to the resident.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-900">{tenant?.name || 'Resident'}</p>
              <p className="text-[11px] text-slate-500">{tenant?.email || tenant?.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Arrears Due</p>
              <p className="font-bold text-rose-600 text-sm">{currency} {amountDue.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Reminder Content</Label>
            <Textarea
              rows={6}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="text-xs font-sans leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded text-blue-600"
              />
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              Deliver via Email
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <Bell className="w-3.5 h-3.5 text-indigo-600" />
              In-App Notification
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
            onClick={handleSend}
            disabled={isSending || !customMessage.trim()}
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Sending Reminder...' : 'Send Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
