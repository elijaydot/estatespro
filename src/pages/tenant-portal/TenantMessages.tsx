import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Clock,
  Plus,
  Loader2,
  Bell,
  Check,
  CheckCheck,
  Sparkles,
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
import { useAuth } from '@/contexts/useAuth';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

interface TenantMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  subject: string;
  created_at: string;
  is_read: boolean;
  client_message_id?: string | null;
}

type TenantProfile = {
  id: string;
  user_id: string;
  property_id: string | null;
  properties?: {
    name: string;
    user_id: string;
    company_id: string | null;
  } | null;
};

function RenderContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-inherit prose-p:my-1 prose-strong:text-inherit prose-em:text-inherit prose-code:text-inherit prose-headings:text-inherit prose-li:text-inherit prose-blockquote:text-inherit">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function TenantMessages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: unreadNotifications = 0 } = useUnreadNotificationsCount();
  const [messages, setMessages] = useState<TenantMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;

    async function loadData() {
      if (!user) return;

      try {
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*, properties(name, user_id, company_id)')
          .eq('tenant_user_id', user.id)
          .maybeSingle();

        if (tenantError) throw tenantError;
        if (!tenant) {
          setIsLoading(false);
          return;
        }
        setTenantProfile(tenant);

        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${tenant.id},recipient_id.eq.${tenant.id}`)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;
        setMessages((msgs || []) as TenantMessage[]);

        const unreadIds = (msgs || [])
          .filter((message: TenantMessage) => !message.is_read && message.recipient_id === tenant.id)
          .map((message: TenantMessage) => message.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }

        channel = supabase
          .channel('tenant-messages-rt')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                const deleted = payload.old as TenantMessage;
                setMessages((prev) => prev.filter((message) => message.id !== deleted.id));
                return;
              }

              const message = payload.new as TenantMessage;
              if (message.recipient_id !== tenant.id && message.sender_id !== tenant.id) {
                return;
              }

              setMessages((prev) => {
                if (payload.eventType === 'UPDATE') {
                  return prev.map((item) => (item.id === message.id ? message : item));
                }

                if (prev.some((item) => item.id === message.id)) return prev;

                if (
                  message.client_message_id &&
                  pendingClientIdsRef.current.has(message.client_message_id)
                ) {
                  pendingClientIdsRef.current.delete(message.client_message_id);
                  const replaced = prev.map((item) =>
                    item.client_message_id === message.client_message_id ? message : item
                  );
                  if (replaced.some((item) => item.id === message.id)) return replaced;
                  return [...replaced, message].sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                }

                return [...prev, message].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });

              if (message.recipient_id === tenant.id && !message.is_read) {
                supabase.from('messages').update({ is_read: true }).eq('id', message.id).then(() => {});
              }
            }
          )
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
    const landlordId = tenantProfile.user_id;
    const clientMessageId = crypto.randomUUID();
    const optimisticId = `temp-${Date.now()}`;

    pendingClientIdsRef.current.add(clientMessageId);

    const optimisticMessage: TenantMessage = {
      id: optimisticId,
      client_message_id: clientMessageId,
      sender_id: tenantProfile.id,
      recipient_id: landlordId,
      content: newMessage || newSubject,
      created_at: new Date().toISOString(),
      subject: newSubject || 'Message',
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const messageData = {
        client_message_id: clientMessageId,
        sender_id: tenantProfile.id,
        recipient_id: landlordId,
        user_id: landlordId,
        property_id: tenantProfile.property_id,
        content: newMessage || newSubject,
        subject: newSubject || 'Message',
        is_read: false,
      };

      const { error } = await supabase.from('messages').insert([messageData]);
      if (error) throw error;
      setNewMessage('');
      setNewSubject('');
      setIsNewMessageOpen(false);
    } catch {
      pendingClientIdsRef.current.delete(clientMessageId);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-primary/10 via-background to-info/10 p-5 md:p-6 card-shadow-md">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-info/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tenant Communications</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">Messages</h1>
            <p className="text-muted-foreground">Communicate with property management in real time</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 border-primary/30 bg-primary/5 text-primary font-display">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Fast Response Thread
          </Badge>
        </div>
      </section>

      <div className="rounded-xl border border-border/70 bg-card/80 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">Use this thread for urgent updates, confirmations, and maintenance follow-ups.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/tenant/notifications')}>
            <Bell className="h-4 w-4" />
            Notifications
            {unreadNotifications > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </Button>
          <Button className="gap-2" onClick={() => setIsNewMessageOpen(true)}>
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </div>
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
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className={`text-xs ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </p>
                            {isMe && (
                              <span className={isMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}>
                                {message.is_read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                              </span>
                            )}
                          </div>
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
                  disabled={isSending || (!newMessage.trim() && !newSubject.trim())}
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Send a message to property management.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>To</Label>
              <Input value="Property Management" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What is your message about?"
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
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
            <Button variant="outline" onClick={() => setIsNewMessageOpen(false)}>
              Cancel
            </Button>
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
