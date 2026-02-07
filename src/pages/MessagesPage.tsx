import { useState } from 'react';
import { format } from 'date-fns';
import {
  Send,
  Inbox,
  Mail,
  Search,
  Plus,
  Trash2,
  Reply,
  User,
  Clock,
  Check,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  useInboxMessages,
  useSentMessages,
  useUnreadCount,
  useSendMessage,
  useMarkAsRead,
  useDeleteMessage,
} from '@/hooks/useMessages';
import { useTenants } from '@/hooks/useTenants';

export default function MessagesPage() {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    content: '',
  });

  const { data: inboxMessages = [], isLoading: inboxLoading } = useInboxMessages();
  const { data: sentMessages = [], isLoading: sentLoading } = useSentMessages();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: tenants = [] } = useTenants();

  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const deleteMessage = useDeleteMessage();

  const recipientOptions = tenants.map(t => ({
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

  const handleSelectMessage = async (message: any) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      await markAsRead.mutateAsync(message.id);
    }
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    try {
      await deleteMessage.mutateAsync(messageToDelete);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      if (selectedMessage?.id === messageToDelete) {
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const filteredInbox = inboxMessages.filter(m => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (m.subject || '').toLowerCase().includes(q) ||
      (m.content || '').toLowerCase().includes(q)
    );
  });

  const filteredSent = sentMessages.filter(m => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (m.subject || '').toLowerCase().includes(q) ||
      (m.content || '').toLowerCase().includes(q)
    );
  });

  const MessageList = ({ messages, loading }: { messages: any[], loading: boolean }) => {
    if (loading) {
      return <div className="p-4 text-center text-muted-foreground">Loading messages...</div>;
    }

    if (messages.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No messages yet</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <div className="space-y-1 p-2">
          {messages.map((message) => (
            <button
              key={message.id}
              onClick={() => handleSelectMessage(message)}
              className={`w-full text-left p-4 rounded-lg transition-colors ${
                selectedMessage?.id === message.id
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative mt-1">
                  {!message.is_read && (
                    <Circle className="h-2 w-2 fill-primary text-primary absolute -left-3 top-1" />
                  )}
                  <User className="h-8 w-8 p-1.5 rounded-full bg-muted text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium truncate ${!message.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {message.subject}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(message.created_at), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {message.content}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Communicate with tenants and property managers</p>
        </div>
        <Button onClick={() => setIsComposeOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Inbox className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inbox</p>
                <p className="text-2xl font-bold">{inboxMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
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
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Send className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{sentMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <Card className="lg:col-span-1 card-shadow-md">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <Tabs defaultValue="inbox">
            <div className="px-4">
              <TabsList className="w-full">
                <TabsTrigger value="inbox" className="flex-1 gap-2">
                  <Inbox className="h-4 w-4" />
                  Inbox
                  {unreadCount > 0 && (
                    <Badge className="ml-1 h-5 px-1.5">{unreadCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex-1 gap-2">
                  <Send className="h-4 w-4" />
                  Sent
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="inbox" className="mt-0">
              <MessageList messages={filteredInbox} loading={inboxLoading} />
            </TabsContent>
            <TabsContent value="sent" className="mt-0">
              <MessageList messages={filteredSent} loading={sentLoading} />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-2 card-shadow-md">
          {selectedMessage ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedMessage.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(selectedMessage.created_at), 'PPpp')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setIsComposeOpen(true)}>
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        setMessageToDelete(selectedMessage.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[400px] text-center">
              <Mail className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Select a message</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a message from the list to view its contents
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a message to a tenant or property manager
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <SearchableSelect
                options={recipientOptions}
                value={newMessage.recipient_id}
                onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}
                placeholder="Select recipient..."
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
              <Textarea
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sendMessage.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              {sendMessage.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
