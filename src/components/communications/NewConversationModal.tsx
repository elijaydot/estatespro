import { useState } from 'react';
import { User, MessageSquare, Search, Send, Sparkles } from 'lucide-react';
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

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  onStartConversation: (recipientId: string, subject: string, content: string) => Promise<void>;
  onOpenTemplates?: () => void;
}

export function NewConversationModal({
  open,
  onOpenChange,
  tenants,
  onStartConversation,
  onOpenTemplates,
}: NewConversationModalProps) {
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const filteredTenants = tenants.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.phone || '').includes(q)
    );
  });

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleSend = async () => {
    if (!selectedTenantId) {
      toast({
        title: 'Recipient Required',
        description: 'Please select a resident to start this conversation.',
        variant: 'destructive',
      });
      return;
    }
    if (!subject.trim() || !content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Subject and message body cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSending(true);
      await onStartConversation(selectedTenantId, subject.trim(), content.trim());
      onOpenChange(false);
      setSelectedTenantId('');
      setSubject('');
      setContent('');
    } catch (err: any) {
      toast({
        title: 'Failed to Start Conversation',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Start New Resident Conversation
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Initiate a direct communication thread with a portfolio resident.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Select Resident */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Select Resident *</Label>
            {selectedTenant ? (
              <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50/60 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {selectedTenant.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{selectedTenant.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {selectedTenant.email} • {selectedTenant.phone || 'No phone'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-blue-700 hover:text-blue-900"
                  onClick={() => setSelectedTenantId('')}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search residents by name, email, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {filteredTenants.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching residents found.
                    </div>
                  ) : (
                    filteredTenants.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTenantId(t.id)}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                            {t.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{t.name}</p>
                            <p className="text-[11px] text-slate-400">{t.email || t.phone}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Select
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">Subject / Topic *</Label>
              {onOpenTemplates && (
                <button
                  type="button"
                  onClick={onOpenTemplates}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Browse Templates
                </button>
              )}
            </div>
            <Input
              placeholder="e.g., Routine Maintenance Confirmation or Lease Discussion"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Message Content *</Label>
            <Textarea
              placeholder="Write your message to the resident..."
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-xs leading-relaxed"
            />
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
            disabled={isSending || !selectedTenantId || !subject.trim() || !content.trim()}
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Starting Conversation...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
