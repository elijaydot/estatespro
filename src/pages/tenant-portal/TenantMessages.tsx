import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send,
  User,
  Clock,
  Search,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

  // Fetch tenant profile and messages
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // 1. Get tenant profile to know who the landlord is
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*, properties(name)')
          .eq('tenant_user_id', user.id)
          .single();

        if (tenantError) throw tenantError;
        setTenantProfile(tenant);

        // 2. Get messages - use tenant.id for filtering since messages use tenant_id
        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${tenant.id},recipient_id.eq.${tenant.id}`)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;
        setMessages(msgs || []);

      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Subscribe to new messages
    const channel = supabase
      .channel('tenant-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user?.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !newSubject.trim()) || !tenantProfile) return;
    
    setIsSending(true);
    try {
      // Use tenant.id as sender_id (consistent with how messages are filtered)
      const { error } = await supabase.from('messages').insert([{
        sender_id: tenantProfile.id, // Use tenant.id instead of user.id
        recipient_id: tenantProfile.user_id, // Property manager's user_id
        user_id: tenantProfile.user_id, // Landlord owns the message
        property_id: tenantProfile.property_id,
        content: newMessage || newSubject,
        subject: newSubject || 'Message',
        is_read: false
      }]);

      if (error) throw error;

      // Optimistic update
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        sender_id: tenantProfile.id, // Use tenant.id
        recipient_id: tenantProfile.user_id,
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
      {/* Header */}
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

      {/* Messages Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)] min-h-[500px]">
        {/* Conversations List */}
        <Card className="card-shadow-md lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-80px)]">
              {/* Single conversation with Property Management for now */}
              <div className="w-full p-4 text-left border-b border-border bg-secondary/50">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      PM
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Property Management</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {messages.length > 0 
                        ? messages[messages.length - 1].content 
                        : 'No messages yet'}
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

        {/* Message Thread */}
        <Card className="card-shadow-md lg:col-span-2 flex flex-col">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  PM
                </AvatarFallback>
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
                    <div
                      key={message.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          isMe
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
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
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[80px] resize-none"
                />
                <Button 
                  className="self-end gap-2" 
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
              Send a message to property management.
            </DialogDescription>
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
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                rows={5}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
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
