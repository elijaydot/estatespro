 import { useState, useMemo } from 'react';
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
   Circle,
   Users,
   ChevronRight,
   MessageCircle,
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Separator } from '@/components/ui/separator';
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
 } from '@/hooks/useMessages';
 import { useTenants } from '@/hooks/useTenants';
 import { useAuth } from '@/contexts/AuthContext';
 
 interface MessageThread {
   tenantId: string;
   tenantName: string;
   tenantEmail: string;
   messages: any[];
   lastMessage: any;
   unreadCount: number;
 }
 
 export default function MessagesPageV2() {
   const { user } = useAuth();
   const [isComposeOpen, setIsComposeOpen] = useState(false);
   const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
   const [searchQuery, setSearchQuery] = useState('');
   const [replyContent, setReplyContent] = useState('');
   const [newMessage, setNewMessage] = useState({
     recipient_id: '',
     subject: '',
     content: '',
   });
 
   const { data: allMessages = [], isLoading } = useMessages();
   const { data: unreadCount = 0 } = useUnreadCount();
   const { data: tenants = [] } = useTenants();
 
   const sendMessage = useSendMessage();
   const markAsRead = useMarkAsRead();
   const deleteMessage = useDeleteMessage();
 
   // Group messages by tenant (conversation threads)
   const threads = useMemo(() => {
     const threadMap = new Map<string, MessageThread>();
     const currentUserId = user?.id;
 
     allMessages.forEach((msg: any) => {
       // Determine the tenant in this conversation (the other party)
       const isFromTenant = msg.sender_id !== currentUserId;
       const tenantUserId = isFromTenant ? msg.sender_id : msg.recipient_id;
       
       // Find tenant info from our tenants list
       const tenant = tenants.find((t: any) => 
         t.tenant_user_id === tenantUserId || t.id === tenantUserId
       );
       
       const tenantId = tenant?.id || tenantUserId;
       const tenantName = tenant?.name || 'Unknown Tenant';
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
         isFromMe: msg.sender_id === currentUserId,
         senderName: msg.sender_id === currentUserId ? 'You' : tenantName,
       });
 
       // Update last message if this one is newer
       if (new Date(msg.created_at) > new Date(thread.lastMessage.created_at)) {
         thread.lastMessage = msg;
       }
 
       // Count unread messages from tenant
       if (!msg.is_read && msg.recipient_id === currentUserId) {
         thread.unreadCount++;
       }
     });
 
     // Sort messages within each thread by date (oldest first for display)
     threadMap.forEach((thread) => {
       thread.messages.sort((a, b) => 
         new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
       );
     });
 
     // Convert to array and sort by last message (newest first)
     return Array.from(threadMap.values()).sort((a, b) =>
       new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
     );
   }, [allMessages, tenants, user?.id]);
 
   const filteredThreads = threads.filter(
     (thread) =>
       thread.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
       thread.lastMessage.subject?.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const recipientOptions = tenants.map((t: any) => ({
     value: t.tenant_user_id || t.id,
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
 
     const tenant = tenants.find((t: any) => t.id === selectedThread.tenantId);
     const recipientId = tenant?.tenant_user_id || selectedThread.tenantId;
 
     try {
       await sendMessage.mutateAsync({
         recipient_id: recipientId,
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
     // Mark unread messages as read
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
     return name
       .split(' ')
       .map((n) => n[0])
       .join('')
       .toUpperCase()
       .slice(0, 2);
   };
 
   return (
     <div className="space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
           <h1 className="text-3xl font-bold text-foreground">Messages</h1>
           <p className="text-muted-foreground mt-1">Communicate with your tenants</p>
         </div>
         <Button onClick={() => setIsComposeOpen(true)} className="gap-2">
           <Plus className="h-4 w-4" />
           New Message
         </Button>
       </div>
 
       {/* Stats Cards */}
       <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
         <Card className="card-shadow-sm">
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
 
       {/* Main Content */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Thread List */}
         <Card className="lg:col-span-1 card-shadow-md">
           <CardHeader className="pb-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search conversations..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-10"
               />
             </div>
           </CardHeader>
           <ScrollArea className="h-[500px]">
             <div className="space-y-1 p-2">
               {isLoading ? (
                 <div className="p-4 text-center text-muted-foreground">Loading...</div>
               ) : filteredThreads.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground">
                   <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                   <p>No conversations yet</p>
                 </div>
               ) : (
                 filteredThreads.map((thread) => (
                   <button
                     key={thread.tenantId}
                     onClick={() => handleSelectThread(thread)}
                     className={`w-full text-left p-4 rounded-lg transition-colors ${
                       selectedThread?.tenantId === thread.tenantId
                         ? 'bg-primary/10 border border-primary/20'
                         : 'hover:bg-muted'
                     }`}
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
                           {thread.lastMessage.content?.substring(0, 50)}...
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
 
         {/* Conversation View */}
         <Card className="lg:col-span-2 card-shadow-md flex flex-col">
           {selectedThread ? (
             <>
               {/* Thread Header */}
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
                       <p className="text-sm text-muted-foreground">{selectedThread.tenantEmail}</p>
                     </div>
                   </div>
                   <Badge variant="outline">
                     {selectedThread.messages.length} messages
                   </Badge>
                 </div>
               </CardHeader>
 
               {/* Messages */}
               <ScrollArea className="flex-1 p-4" style={{ height: '350px' }}>
                 <div className="space-y-4">
                   {selectedThread.messages.map((msg) => (
                     <div
                       key={msg.id}
                       className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                     >
                       <div
                         className={`max-w-[80%] rounded-lg p-4 ${
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
                         {msg.subject && (
                           <p className={`text-sm font-medium mb-1 ${msg.isFromMe ? 'text-primary-foreground' : 'text-foreground'}`}>
                             {msg.subject}
                           </p>
                         )}
                         <p className={`text-sm whitespace-pre-wrap ${msg.isFromMe ? 'text-primary-foreground' : 'text-foreground'}`}>
                           {msg.content}
                         </p>
                       </div>
                     </div>
                   ))}
                 </div>
               </ScrollArea>
 
               {/* Reply Input */}
               <div className="p-4 border-t">
                 <div className="flex gap-2">
                   <Textarea
                     placeholder="Type your reply..."
                     value={replyContent}
                     onChange={(e) => setReplyContent(e.target.value)}
                     className="min-h-[80px]"
                   />
                 </div>
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
               Send a message to a tenant
             </DialogDescription>
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