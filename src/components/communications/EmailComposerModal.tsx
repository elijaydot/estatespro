import { useState, useRef } from 'react';
import { Mail, Paperclip, Send, X, FileText, CheckCircle2 } from 'lucide-react';
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
import { MessageAttachment } from './types';

interface EmailComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipientEmail?: string;
  defaultRecipientName?: string;
  defaultSubject?: string;
  onSendEmail: (params: {
    recipientEmail: string;
    cc?: string;
    bcc?: string;
    subject: string;
    content: string;
    attachments: MessageAttachment[];
  }) => Promise<void>;
  onOpenTemplates?: () => void;
}

export function EmailComposerModal({
  open,
  onOpenChange,
  defaultRecipientEmail = '',
  defaultRecipientName = '',
  defaultSubject = '',
  onSendEmail,
  onOpenTemplates,
}: EmailComposerModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const newAttachments: MessageAttachment[] = files.map((f) => ({
      path: `email-attachments/${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!recipientEmail.trim() || !subject.trim() || !content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Recipient email, subject, and email body are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSending(true);
      await onSendEmail({
        recipientEmail: recipientEmail.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        content: content.trim(),
        attachments,
      });
      toast({
        title: 'Email Sent & Dispatched',
        description: `Official email dispatched to ${recipientEmail} and logged in timeline.`,
      });
      onOpenChange(false);
      setContent('');
      setAttachments([]);
    } catch (err: any) {
      toast({
        title: 'Dispatch Failed',
        description: err?.message || 'Could not send email.',
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
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Compose Official Email
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Sends an official email to the resident and records it in their unified timeline.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* To */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">To *</Label>
              <button
                type="button"
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                onClick={() => setShowCcBcc(!showCcBcc)}
              >
                {showCcBcc ? 'Hide CC/BCC' : '+ Add CC/BCC'}
              </button>
            </div>
            <Input
              placeholder="resident@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="text-xs"
            />
          </div>

          {showCcBcc && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">CC</Label>
                <Input
                  placeholder="property.owner@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">BCC</Label>
                <Input
                  placeholder="records@fishgate.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">Subject *</Label>
              {onOpenTemplates && (
                <button
                  type="button"
                  onClick={onOpenTemplates}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Insert Template
                </button>
              )}
            </div>
            <Input
              placeholder="Official notification subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Email Body *</Label>
            <Textarea
              placeholder="Write the full message content..."
              rows={9}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-xs font-sans leading-relaxed"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Attachments ({attachments.length})</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs font-semibold gap-1 text-slate-700"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-slate-50 border-slate-200 text-slate-700 text-xs py-1 px-2.5 gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span className="max-w-[140px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="text-slate-400 hover:text-slate-600 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/70 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
            onClick={handleSend}
            disabled={isSending || !recipientEmail.trim() || !subject.trim() || !content.trim()}
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Dispatching Email...' : 'Send Official Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
