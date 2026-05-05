import { useState, useMemo, useEffect, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Send,
  Mail,
  Search,
  Plus,
  Trash2,
  Users,
  ChevronRight,
  MessageCircle,
  Loader2,
  Check,
  CheckCheck,
  Radio,
  RefreshCcw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/use-toast';
import {
  useMessages,
  useUnreadCount,
  useSendMessage,
  useMarkAsRead,
  useDeleteMessage,
  type Message,
} from '@/hooks/useMessages';
import { useTenants, type Tenant } from '@/hooks/useTenants';
import { useAuth } from '@/contexts/AuthContext';
import { SuggestedReplies } from '@/components/ai/SuggestedReplies';
import ReactMarkdown from 'react-markdown';

type TenantWithRelations = Tenant & {
  tenant_user_id: string | null;
};

type ThreadMessage = Message & {
  isFromMe: boolean;
  senderName: string;
};

interface MessageThread {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  messages: ThreadMessage[];
  lastMessage: Message;
  unreadCount: number;
}

function RenderContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`prose prose-sm max-w-none whitespace-pre-wrap break-words prose-p:my-1 prose-strong:text-inherit prose-em:text-inherit prose-code:text-inherit prose-headings:text-inherit prose-li:text-inherit prose-blockquote:text-inherit ${className || 'text-inherit'}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function MessagesPageV2() {
  const { user } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    content: '',
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: allMessages = [], isLoading, isError, error } = useMessages();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: tenants = [] } = useTenants();

  const messageRows = allMessages as Message[];
  const tenantRows = tenants as TenantWithRelations[];

  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const deleteMessage = useDeleteMessage();

  // Group messages by tenant (conversation threads)
  // Key insight: messages to/from tenants use tenant.id (domain ID), not tenant_user_id
  const threads = useMemo(() => {
    const threadMap = new Map<string, MessageThread>();
    const currentUserId = user?.id;

    messageRows.forEach((msg) => {
      // For landlord/PM: sender_id is their auth.uid(), recipient_id for tenant msgs is tenant.id
      // For tenant: sender_id is tenant.id, recipient_id is landlord auth.uid()
      const isSentByMe = msg.sender_id === currentUserId;
      const otherPartyId = isSentByMe ? msg.recipient_id : msg.sender_id;

      // Find tenant info - match by tenant.id (domain) OR tenant_user_id (auth)
      const tenant = tenantRows.find((t) =>
        t.id === otherPartyId || t.tenant_user_id === otherPartyId
      );

      const tenantId = tenant?.id || otherPartyId;
      const tenantName = tenant?.name || 'Unknown';
      const tenantEmail = tenant?.email || '';

      if (!threadMap.has(tenantId)) {
        threadMap.set(tenantId, {
          tenantId,
          tenantName,
          tenantEmail,
          messages: [],
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      const thread = threadMap.get(tenantId)!;
      thread.messages.push({
        ...msg,
        isFromMe: isSentByMe,
        senderName: isSentByMe ? 'You' : tenantName,
      });

      if (new Date(msg.created_at) > new Date(thread.lastMessage.created_at)) {
        thread.lastMessage = msg;
      }

      if (!msg.is_read && msg.recipient_id === currentUserId) {
        thread.unreadCount++;
      }
    });

    threadMap.forEach((thread) => {
      thread.messages.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return Array.from(threadMap.values()).sort((a, b) =>
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  }, [messageRows, tenantRows, user?.id]);

  // Keep selected thread in sync when messages update
  useEffect(() => {
    setSelectedThread((current) => {
      if (!current) return current;
      return threads.find((t) => t.tenantId === current.tenantId) ?? current;
    });
  }, [threads]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread?.messages.length]);

  const filteredThreads = threads.filter((thread) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || (
      (thread.tenantName || '').toLowerCase().includes(q) ||
      (thread.lastMessage.subject || '').toLowerCase().includes(q)
    );

    if (!matchesQuery) return false;
    if (!showUnreadOnly) return true;
    return thread.unreadCount > 0;
  });

  // Compose: use tenant.id as recipient (domain ID, not auth uid)
  const recipientOptions = tenantRows.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.email,
  }));

  const handleSendMessage = async () => {
    if (!newMessage.recipient_id || !newMessage.subject || !newMessage.content) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      await sendMessage.mutateAsync(newMessage);
      setIsComposeOpen(false);
      setNewMessage({ recipient_id: '', subject: '', content: '' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedThread) return;

    // Reply to tenant using tenant.id as recipient
    try {
      await sendMessage.mutateAsync({
        recipient_id: selectedThread.tenantId,
        subject: `Re: ${selectedThread.lastMessage.subject || 'Message'}`,
        content: replyContent,
        parent_message_id: selectedThread.lastMessage.id,
      });
      setReplyContent('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleSelectThread = async (thread: MessageThread) => {
    setSelectedThread(thread);
    for (const msg of thread.messages) {
      if (!msg.is_read && !msg.isFromMe) {
        await markAsRead.mutateAsync(msg.id);
      }
    }
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    try {
      await deleteMessage.mutateAsync(messageToDelete);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Comms hub
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Communicate with tenants in a focused, real-time workspace</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
          <Button
            variant={showUnreadOnly ? 'default' : 'outline'}
            onClick={() => setShowUnreadOnly((current) => !current)}
            className="gap-2 w-full rounded-full px-4"
          >
            <Mail className="h-4 w-4" />
            {showUnreadOnly ? 'Unread Only' : 'All Threads'}
          </Button>
          <Button onClick={() => setIsComposeOpen(true)} className="gap-2 w-full rounded-full px-4">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      <Card className="border border-border/70 bg-card/85 backdrop-blur-sm card-shadow-md overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-primary" />
              Conversation cockpit
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Search threads faster, focus unread messages, and reply with AI suggestions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 border-primary/30 text-primary">
              Threads {threads.length}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 border-warning/30 text-warning">
              Unread {unreadCount}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 border-success/30 text-success">
              Messages {allMessages.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <Card className="card-shadow-md border-destructive/20">
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <Mail className="h-8 w-8 text-destructive mx-auto" />
              <p className="font-medium">Could not load messages</p>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message || 'Please try again.'}</p>
              <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="card-shadow-sm animate-enter stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{threads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm animate-enter stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Mail className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm animate-enter stagger-3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <MessageCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{allMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 card-shadow-md border-border/70 animate-enter stagger-2">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-border/70 bg-card/80"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[500px]">
            <div className="space-y-1 p-2">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 pulse-soft" />
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-foreground">No conversations found</p>
                  <p className="text-xs mt-1">Try clearing search or start a new message.</p>
                  <Button size="sm" className="rounded-full mt-4" onClick={() => setIsComposeOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Start conversation
                  </Button>
                </div>
              ) : (
                filteredThreads.map((thread, index) => (
                  <button
                    key={thread.tenantId}
                    onClick={() => handleSelectThread(thread)}
                    style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
                    className={`w-full text-left p-4 rounded-lg transition-colors border ${
                      selectedThread?.tenantId === thread.tenantId
                        ? 'bg-primary/10 border-primary/20 shadow-sm'
                        : 'border-transparent hover:bg-muted/70'
                    } animate-enter`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        {thread.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                            {thread.unreadCount}
                          </div>
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {getInitials(thread.tenantName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-medium truncate ${thread.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {thread.tenantName}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(thread.lastMessage.created_at), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {thread.lastMessage.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {thread.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                          {thread.lastMessage.content?.substring(0, 50)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-2 card-shadow-md border-border/70 flex flex-col animate-enter stagger-3">
          {selectedThread ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedThread.tenantName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedThread.tenantName}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Radio className="h-3.5 w-3.5 text-success" />
                        Live conversation
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {selectedThread.messages.length} messages
                  </Badge>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4" style={{ height: '380px' }}>
                <div className="space-y-4">
                  {selectedThread.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[84%] rounded-xl p-4 shadow-sm ${
                          msg.isFromMe
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <p className={`text-xs font-medium ${msg.isFromMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {msg.senderName}
                          </p>
                          <p className={`text-xs ${msg.isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        {msg.subject && !msg.subject.startsWith('Re:') && (
                          <p className={`text-sm font-medium mb-1 ${msg.isFromMe ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {msg.subject}
                          </p>
                        )}
                        <RenderContent
                          content={msg.content || ''}
                          className={msg.isFromMe ? 'text-primary-foreground' : 'text-foreground'}
                        />
                        {msg.isFromMe && (
                          <div className="mt-2 flex justify-end">
                            <span className={`inline-flex items-center ${msg.isFromMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {msg.is_read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <SuggestedReplies
                  messages={selectedThread.messages}
                  tenantName={selectedThread.tenantName}
                  onSelect={(reply) => setReplyContent(reply)}
                />
                <RichTextEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="Type your reply... (Shift+Enter for new line)"
                  onSubmit={handleSendReply}
                  minHeight="60px"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || sendMessage.isPending}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendMessage.isPending ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] text-center">
              <Mail className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a tenant from the list to view messages
              </p>
              <Button size="sm" className="rounded-full mt-4" onClick={() => setIsComposeOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Message
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Send a message to a tenant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <SearchableSelect
                options={recipientOptions}
                value={newMessage.recipient_id}
                onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}
                placeholder="Select tenant..."
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder="Enter message subject..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <RichTextEditor
                value={newMessage.content}
                onChange={(val) => setNewMessage({ ...newMessage, content: val })}
                placeholder="Type your message here..."
                minHeight="120px"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} disabled={sendMessage.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              {sendMessage.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
