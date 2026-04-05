import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';

function RenderContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-inherit prose-p:my-1 prose-strong:text-inherit prose-em:text-inherit prose-code:text-inherit prose-headings:text-inherit prose-li:text-inherit prose-blockquote:text-inherit">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function TenantMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any;

    async function loadData() {
      if (!user) return;

      try {
        // Get tenant record - this is the domain identity for messaging
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*, properties(name, user_id, company_id)')
          .eq('tenant_user_id', user.id)
          .maybeSingle();

        if (tenantError) throw tenantError;
        if (!tenant) { setIsLoading(false); return; }
        setTenantProfile(tenant);

        // Query messages using tenant.id (domain ID)
        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${tenant.id},recipient_id.eq.${tenant.id}`)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;
        setMessages(msgs || []);

        // Mark unread messages as read
        const unreadIds = (msgs || [])
          .filter((m: any) => !m.is_read && m.recipient_id === tenant.id)
          .map((m: any) => m.id);
        
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }

        // Realtime: listen for messages where tenant is recipient OR sender
        // (to catch own sent messages reflected back)
        channel = supabase
          .channel('tenant-messages-rt')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          }, (payload) => {
            const msg = payload.new as any;
            // Only add if relevant to this tenant
            if (msg.recipient_id === tenant.id || msg.sender_id === tenant.id) {
              setMessages(prev => {
                // Avoid duplicates (optimistic + realtime)
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              // Auto-mark as read if we're the recipient
              if (msg.recipient_id === tenant.id && !msg.is_read) {
                supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {});
              }
            }
          })
          .subscribe();
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !newSubject.trim()) || !tenantProfile) return;

    setIsSending(true);
    try {
      // Send to the property owner (landlord) using their auth.uid()
      const landlordId = tenantProfile.user_id;

      const messageData = {
        sender_id: tenantProfile.id,  // tenant domain ID
        recipient_id: landlordId,     // landlord auth.uid()
        user_id: landlordId,          // owner of the record for RLS
        property_id: tenantProfile.property_id,
        content: newMessage || newSubject,
        subject: newSubject || 'Message',
        is_read: false,
      };

      const { error } = await supabase.from('messages').insert([messageData]);
      if (error) throw error;

      // Also send to assigned PM(s)
      if (tenantProfile.property_id) {
        const { data: pmAssignments } = await supabase
          .from('property_manager_assignments')
          .select('manager_id')
          .eq('property_id', tenantProfile.property_id);

        if (pmAssignments && pmAssignments.length > 0) {
          for (const pm of pmAssignments) {
            if (pm.manager_id !== landlordId) {
              await supabase.from('messages').insert([{
                ...messageData,
                recipient_id: pm.manager_id,
                user_id: pm.manager_id,
              }]);
            }
          }
        }
      }

      // Optimistic update
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        sender_id: tenantProfile.id,
        recipient_id: landlordId,
        content: newMessage || newSubject,
        created_at: new Date().toISOString(),
        subject: newSubject || 'Message',
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setNewSubject('');
      setIsNewMessageOpen(false);

    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Communicate with property management</p>
        </div>
        <Button className="gap-2" onClick={() => setIsNewMessageOpen(true)}>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)] min-h-[500px]">
        <Card className="card-shadow-md lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-80px)]">
              <div className="w-full p-4 text-left border-b border-border bg-secondary/50">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">PM</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Property Management</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {messages.length > 0 ? messages[messages.length - 1].content : 'No messages yet'}
                    </p>
                    {messages.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(messages[messages.length - 1].created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="card-shadow-md lg:col-span-2 flex flex-col">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">PM</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Property Management</CardTitle>
                <p className="text-sm text-muted-foreground">Usually responds within 24 hours</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>No messages yet. Start a conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMe = message.sender_id === tenantProfile?.id;
                    return (
                      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          <RenderContent content={message.content} />
                          <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t border-border">
              <RichTextEditor
                value={newMessage}
                onChange={setNewMessage}
                placeholder="Type your message... (Shift+Enter for new line)"
                onSubmit={handleSendMessage}
                minHeight="60px"
              />
              <div className="flex justify-end mt-2">
                <Button
                  className="gap-2"
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Message Dialog */}
      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a message to property management. Both the landlord and property manager will receive it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>To</Label>
              <Input value="Property Management (Landlord & PM)" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What is your message about?"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <RichTextEditor
                value={newMessage}
                onChange={setNewMessage}
                placeholder="Type your message here..."
                minHeight="120px"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewMessageOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSendMessage}
              className="gap-2"
              disabled={isSending || (!newMessage.trim() && !newSubject.trim())}
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
