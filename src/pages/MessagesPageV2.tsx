import { useState, useMemo, useEffect, useRef } from 'react';
import { format, formatDistanceToNow, isThisYear, isToday } from 'date-fns';
import {
  Send,
  Mail,
  Search,
  ArrowLeft,
  Plus,
  Trash2,
  Paperclip,
  Download,
  X,
  Forward,
  CalendarClock,
  ChevronRight,
  Loader2,
  Check,
  CheckCheck,
  Radio,
  RefreshCcw,
  SlidersHorizontal,
  MoreHorizontal,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { useAuth } from '@/contexts/useAuth';
import { SuggestedReplies } from '@/components/ai/SuggestedReplies';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';

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

interface MessageAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

interface MessageAttachmentRecord {
  id: string;
  message_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

const dynamicFrom = (table: string) => supabase.from(table as never);

const ATTACHMENTS_META_PREFIX = '<!--ATTACHMENTS:';
const ATTACHMENTS_META_SUFFIX = '-->';
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatThreadDate(value: string) {
  const date = new Date(value);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

function appendAttachmentsMetadata(content: string, attachments: MessageAttachment[]) {
  if (!attachments.length) return content;
  return `${content}\n\n${ATTACHMENTS_META_PREFIX}${JSON.stringify(attachments)}${ATTACHMENTS_META_SUFFIX}`;
}

function extractAttachmentsMetadata(content: string) {
  const start = content.indexOf(ATTACHMENTS_META_PREFIX);
  if (start === -1) return { cleanContent: content, attachments: [] as MessageAttachment[] };

  const end = content.indexOf(ATTACHMENTS_META_SUFFIX, start);
  if (end === -1) return { cleanContent: content, attachments: [] as MessageAttachment[] };

  const raw = content.slice(start + ATTACHMENTS_META_PREFIX.length, end).trim();
  let attachments: MessageAttachment[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      attachments = parsed.filter((item): item is MessageAttachment => (
        item && typeof item === 'object' &&
        typeof item.path === 'string' &&
        typeof item.name === 'string' &&
        typeof item.size === 'number' &&
        typeof item.type === 'string'
      ));
    }
  } catch {
    attachments = [];
  }

  const cleanContent = `${content.slice(0, start)}${content.slice(end + ATTACHMENTS_META_SUFFIX.length)}`.trim();
  return { cleanContent, attachments };
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
  const { isLandlord } = useUserRole();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [composeScheduledFor, setComposeScheduledFor] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [composeAttachments, setComposeAttachments] = useState<MessageAttachment[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<MessageAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [presenceLabel, setPresenceLabel] = useState('Live conversation');
  const [attachmentsByMessage, setAttachmentsByMessage] = useState<Record<string, MessageAttachment[]>>({});
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    content: '',
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const key = 'messages-compose-draft-v1';
    const local = localStorage.getItem(key);
    if (!local) return;

    try {
      const parsed = JSON.parse(local) as {
        recipient_id?: string;
        subject?: string;
        content?: string;
        scheduledFor?: string;
      };

      setNewMessage((current) => ({
        recipient_id: parsed.recipient_id || current.recipient_id,
        subject: parsed.subject || current.subject,
        content: parsed.content || current.content,
      }));
      setComposeScheduledFor(parsed.scheduledFor || '');
    } catch {
      // Ignore malformed local drafts
    }
  }, []);

  useEffect(() => {
    const key = 'messages-compose-draft-v1';
    const timeout = window.setTimeout(async () => {
      const payload = {
        recipient_id: newMessage.recipient_id,
        subject: newMessage.subject,
        content: newMessage.content,
        scheduledFor: composeScheduledFor,
      };
      localStorage.setItem(key, JSON.stringify(payload));
      setDraftSavedAt(new Date().toISOString());

      if (!user?.id || (!newMessage.subject && !newMessage.content && !newMessage.recipient_id)) return;

      await dynamicFrom('message_drafts').upsert({
        user_id: user.id,
        recipient_id: newMessage.recipient_id || null,
        subject: newMessage.subject,
        content: newMessage.content,
        metadata: { scheduledFor: composeScheduledFor },
      } as never);
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [newMessage, composeScheduledFor, user?.id]);

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      const isMetaK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      const isSend = (event.ctrlKey || event.metaKey) && event.key === 'Enter';

      if (isMetaK) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (isSend) {
        event.preventDefault();
        if (isComposeOpen) {
          void handleSendMessage();
          return;
        }

        if (selectedThread) {
          void handleSendReply();
        }
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => {
      window.removeEventListener('keydown', handleShortcuts);
    };
  });

  useEffect(() => {
    if (!selectedThread?.tenantId || !user?.id) {
      setPresenceLabel('Live conversation');
      return;
    }

    const threadKey = [user.id, selectedThread.tenantId].sort().join('::');

    const pushPresence = async () => {
      await dynamicFrom('message_presence').upsert({
        actor_id: user.id,
        thread_key: threadKey,
        is_typing: Boolean(replyContent.trim()),
        last_seen_at: new Date().toISOString(),
      } as never);
    };

    const pullPresence = async () => {
      const { data } = await dynamicFrom('message_presence')
        .select('actor_id, is_typing, last_seen_at')
        .eq('thread_key', threadKey)
        .neq('actor_id', user.id)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const presence = data as { is_typing?: boolean; last_seen_at?: string } | null;
      if (!presence) {
        setPresenceLabel('Live conversation');
        return;
      }

      if (presence.is_typing) {
        setPresenceLabel('Typing...');
        return;
      }

      setPresenceLabel(`Last seen ${formatDistanceToNow(new Date(presence.last_seen_at || Date.now()), { addSuffix: true })}`);
    };

    void pushPresence();
    void pullPresence();

    const heartbeat = window.setInterval(() => {
      void pushPresence();
      void pullPresence();
    }, 12000);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [selectedThread?.tenantId, user?.id, replyContent]);

  const filteredThreads = threads.filter((thread) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || (
      (thread.tenantName || '').toLowerCase().includes(q) ||
      (thread.lastMessage.subject || '').toLowerCase().includes(q) ||
      thread.messages.some((msg) => {
        const extracted = extractAttachmentsMetadata(msg.content || '');
        return extracted.cleanContent.toLowerCase().includes(q) || extracted.attachments.some((a) => a.name.toLowerCase().includes(q));
      })
    );

    const threadDate = new Date(thread.lastMessage.created_at);
    const fromOk = !searchDateFrom || threadDate >= new Date(`${searchDateFrom}T00:00:00`);
    const toOk = !searchDateTo || threadDate <= new Date(`${searchDateTo}T23:59:59`);

    if (!matchesQuery) return false;
    if (!fromOk || !toOk) return false;
    if (!showUnreadOnly) return true;
    return thread.unreadCount > 0;
  });

  // Compose: use tenant.id as recipient (domain ID, not auth uid)
  const recipientOptions = tenantRows.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.email,
  }));

  const selectedThreadMessages = useMemo(() => {
    if (!selectedThread) return [];
    return selectedThread.messages.map((msg) => {
      const extracted = extractAttachmentsMetadata(msg.content || '');
      const relationalAttachments = attachmentsByMessage[msg.id] || [];
      return {
        ...msg,
        displayContent: extracted.cleanContent,
        attachments: relationalAttachments.length ? relationalAttachments : extracted.attachments,
      };
    });
  }, [selectedThread, attachmentsByMessage]);

  useEffect(() => {
    if (!selectedThread?.messages.length) {
      setAttachmentsByMessage({});
      return;
    }

    let cancelled = false;
    const messageIds = selectedThread.messages.map((msg) => msg.id);

    const loadRelationalAttachments = async () => {
      const { data, error } = await dynamicFrom('message_attachments')
        .select('id, message_id, file_path, file_name, file_size, mime_type')
        .in('message_id', messageIds);

      if (error || !data || cancelled) return;

      const grouped = (data as MessageAttachmentRecord[]).reduce<Record<string, MessageAttachment[]>>((acc, row) => {
        const list = acc[row.message_id] || [];
        list.push({
          path: row.file_path,
          name: row.file_name,
          size: Number(row.file_size || 0),
          type: row.mime_type || 'application/octet-stream',
        });
        acc[row.message_id] = list;
        return acc;
      }, {});

      setAttachmentsByMessage(grouped);
    };

    void loadRelationalAttachments();
    return () => {
      cancelled = true;
    };
  }, [selectedThread]);

  useEffect(() => {
    const attachmentPaths = Array.from(
      new Set(selectedThreadMessages.flatMap((msg) => msg.attachments.map((attachment) => attachment.path)))
    );
    if (!attachmentPaths.length) {
      setAttachmentUrls({});
      return;
    }

    let cancelled = false;
    const hydrateSignedUrls = async () => {
      const entries = await Promise.all(
        attachmentPaths.map(async (path) => {
          const { data, error } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(path, 60 * 60 * 6);
          if (error || !data?.signedUrl) return [path, ''] as const;
          return [path, data.signedUrl] as const;
        })
      );

      if (!cancelled) {
        setAttachmentUrls(Object.fromEntries(entries));
      }
    };

    void hydrateSignedUrls();
    return () => {
      cancelled = true;
    };
  }, [selectedThreadMessages]);

  const uploadDraftAttachments = async (files: FileList | null) => {
    if (!files?.length || !user?.id) return;

    setIsUploadingAttachment(true);
    try {
      const uploaded: MessageAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          toast({
            title: 'Attachment too large',
            description: `${file.name} exceeds the 10MB limit.`,
            variant: 'destructive',
          });
          continue;
        }

        const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
        const { error } = await supabase.storage
          .from('message-attachments')
          .upload(path, file, {
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          });

        if (error) {
          toast({
            title: 'Upload failed',
            description: `Could not upload ${file.name}.`,
            variant: 'destructive',
          });
          continue;
        }

        uploaded.push({
          path,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
      }

      return uploaded;
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const persistMessageAttachments = async (messageId: string, attachments: MessageAttachment[]) => {
    if (!attachments.length || !user?.id) return;

    await dynamicFrom('message_attachments').insert(
      attachments.map((attachment) => ({
        message_id: messageId,
        file_path: attachment.path,
        file_name: attachment.name,
        file_size: attachment.size,
        mime_type: attachment.type,
        uploaded_by: user.id,
      })) as never
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.recipient_id || !newMessage.subject || (!newMessage.content.trim() && !composeAttachments.length)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const scheduledAt = composeScheduledFor ? new Date(composeScheduledFor) : null;
      if (scheduledAt && scheduledAt.getTime() > Date.now()) {
        await dynamicFrom('scheduled_messages').insert({
          user_id: user?.id,
          recipient_id: newMessage.recipient_id,
          subject: newMessage.subject,
          content: newMessage.content,
          scheduled_for: scheduledAt.toISOString(),
          metadata: { attachments: composeAttachments },
        } as never);

        toast({
          title: 'Message scheduled',
          description: `Your message is queued for ${format(scheduledAt, 'MMM d, h:mm a')}.`,
        });

        setIsComposeOpen(false);
        setNewMessage({ recipient_id: '', subject: '', content: '' });
        setComposeAttachments([]);
        setComposeScheduledFor('');
        localStorage.removeItem('messages-compose-draft-v1');
        await dynamicFrom('message_drafts').delete().eq('user_id', user?.id);
        return;
      }

      const contentWithAttachments = appendAttachmentsMetadata(newMessage.content, composeAttachments);
      const sent = await sendMessage.mutateAsync({ ...newMessage, content: contentWithAttachments });
      await persistMessageAttachments(sent.id, composeAttachments);
      setIsComposeOpen(false);
      setNewMessage({ recipient_id: '', subject: '', content: '' });
      setComposeAttachments([]);
      setComposeScheduledFor('');
      localStorage.removeItem('messages-compose-draft-v1');
      await dynamicFrom('message_drafts').delete().eq('user_id', user?.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendReply = async () => {
    if ((!replyContent.trim() && !replyAttachments.length) || !selectedThread) return;

    // Reply to tenant using tenant.id as recipient
    try {
      const contentWithAttachments = appendAttachmentsMetadata(replyContent, replyAttachments);
      const sent = await sendMessage.mutateAsync({
        recipient_id: selectedThread.tenantId,
        subject: `Re: ${selectedThread.lastMessage.subject || 'Message'}`,
        content: contentWithAttachments,
        parent_message_id: selectedThread.lastMessage.id,
      });
      await persistMessageAttachments(sent.id, replyAttachments);
      setReplyContent('');
      setReplyAttachments([]);
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleComposeFileChange = async (files: FileList | null) => {
    const uploaded = await uploadDraftAttachments(files);
    if (!uploaded?.length) return;
    setComposeAttachments((current) => [...current, ...uploaded]);
  };

  const handleReplyFileChange = async (files: FileList | null) => {
    const uploaded = await uploadDraftAttachments(files);
    if (!uploaded?.length) return;
    setReplyAttachments((current) => [...current, ...uploaded]);
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tenant conversations, files, and follow-up in one inbox.</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><span>{threads.length} conversations</span><span aria-hidden="true">·</span><span className={unreadCount ? 'font-medium text-primary' : ''}>{unreadCount} unread</span><span aria-hidden="true">·</span><span>{allMessages.length} messages</span></div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant={showUnreadOnly ? 'default' : 'outline'}
            onClick={() => setShowUnreadOnly((current) => !current)}
            className="flex-1 gap-2 sm:flex-none"
          >
            <Mail className="h-4 w-4" />
            {showUnreadOnly ? 'Unread Only' : 'All Threads'}
          </Button>
          <Button onClick={() => setIsComposeOpen(true)} className="flex-1 gap-2 sm:flex-none">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

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

      <div className="grid min-h-[620px] grid-cols-1 gap-3 lg:h-[calc(100vh-175px)] lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Card className={`${selectedThread ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col overflow-hidden border-border/70`}>
          <CardHeader className="space-y-3 border-b border-border/60 p-3">
            <div className="flex gap-2"><div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-border/70 bg-background pl-9"
              />
            </div><Button variant={showSearchFilters ? 'secondary' : 'outline'} size="icon" className="h-9 w-9" aria-label="Conversation date filters" onClick={() => setShowSearchFilters((current) => !current)}><SlidersHorizontal className="h-4 w-4" /></Button></div>
            {showSearchFilters ? <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)} />
              <Input type="date" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} />
            </div> : null}
          </CardHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div>
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
                    className={`w-full border-b border-border/60 p-3 text-left transition-colors last:border-b-0 ${
                      selectedThread?.tenantId === thread.tenantId
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/50'
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
                          <p className={`min-w-0 flex-1 truncate font-medium ${thread.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {thread.tenantName}
                          </p>
                          <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground" title={format(new Date(thread.lastMessage.created_at), 'PPpp')}>
                            {formatThreadDate(thread.lastMessage.created_at)}
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

        <Card className={`${selectedThread ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col overflow-hidden border-border/70`}>
          {selectedThread ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" aria-label="Back to conversations" onClick={() => setSelectedThread(null)}><ArrowLeft className="h-4 w-4" /></Button>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedThread.tenantName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedThread.tenantName}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Radio className="h-3.5 w-3.5 text-success" />
                        {presenceLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      aria-label="Forward latest message"
                      title="Forward latest message"
                      onClick={() => {
                        const last = selectedThread.messages[selectedThread.messages.length - 1];
                        setNewMessage({
                          recipient_id: '',
                          subject: `Fwd: ${last?.subject || 'Message'}`,
                          content: `\n\n--- Forwarded message ---\nFrom: ${selectedThread.tenantName}\nDate: ${last ? format(new Date(last.created_at), 'PPPp') : ''}\n\n${extractAttachmentsMetadata(last?.content || '').cleanContent}`,
                        });
                        setIsComposeOpen(true);
                      }}
                    >
                      <Forward className="h-3.5 w-3.5" />
                    </Button>
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {selectedThread.messages.length} messages
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 min-h-0 p-4">
                <div className="space-y-4">
                  {selectedThreadMessages.map((msg) => (
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
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className={`text-xs font-medium ${msg.isFromMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {msg.senderName}
                          </p>
                          <div className="flex items-center gap-1">
                            <p className={`whitespace-nowrap text-xs ${msg.isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} title={format(new Date(msg.created_at), 'PPpp')}>
                              {format(new Date(msg.created_at), 'MMM d, yyyy · h:mm a')}
                            </p>
                            {isLandlord && msg.isFromMe && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className={`h-6 w-6 ${msg.isFromMe ? 'text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground' : ''}`} aria-label="Message actions">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setMessageToDelete(msg.id);
                                    setDeleteDialogOpen(true);
                                  }} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />Delete sent message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        {msg.subject && !msg.subject.startsWith('Re:') && (
                          <p className={`text-sm font-medium mb-1 ${msg.isFromMe ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {msg.subject}
                          </p>
                        )}
                        <RenderContent
                          content={msg.displayContent || ''}
                          className={msg.isFromMe ? 'text-primary-foreground' : 'text-foreground'}
                        />
                        {msg.attachments.length > 0 && (
                          <div className="mt-3 rounded-lg border border-border/60 bg-background/70 p-2.5 space-y-1.5">
                            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Attachments</p>
                            {msg.attachments.map((attachment) => {
                              const signedUrl = attachmentUrls[attachment.path];
                              const isImage = attachment.type.startsWith('image/');
                              return (
                                <div key={attachment.path} className="rounded-md border border-border/60 bg-background p-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium truncate text-foreground">{attachment.name}</p>
                                      <p className="text-muted-foreground">{formatBytes(attachment.size)}</p>
                                    </div>
                                    {signedUrl ? (
                                      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline" className="h-7 rounded-full px-2.5 gap-1">
                                          <Download className="h-3.5 w-3.5" />
                                          Open
                                        </Button>
                                      </a>
                                    ) : (
                                      <span className="text-muted-foreground">Preparing...</span>
                                    )}
                                  </div>
                                  {isImage && signedUrl && (
                                    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                      <img src={signedUrl} alt={attachment.name} className="max-h-40 rounded-md border border-border/60" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
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

              <div
                className="p-4 border-t"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleReplyFileChange(e.dataTransfer.files);
                }}
              >
                <SuggestedReplies
                  messages={selectedThread.messages as unknown as { [key: string]: unknown; role?: string; content?: string }[]}
                  tenantName={selectedThread.tenantName}
                  onSelect={(reply) => setReplyContent(reply)}
                />
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  <input
                    ref={replyFileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => void handleReplyFileChange(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 gap-1.5"
                    onClick={() => replyFileInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {isUploadingAttachment ? 'Uploading...' : 'Attach'}
                  </Button>
                  {['😀', '👍', '🙏', '🎉', '✅', '⚠️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="h-7 w-7 rounded-full hover:bg-muted text-base"
                      onClick={() => setReplyContent((current) => `${current}${emoji}`)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {replyAttachments.length > 0 && (
                  <div className="mb-2 rounded-lg border border-border/60 bg-muted/30 p-2 space-y-1">
                    {replyAttachments.map((attachment) => (
                      <div key={attachment.path} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-foreground">{attachment.name} • {formatBytes(attachment.size)}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setReplyAttachments((current) => current.filter((item) => item.path !== attachment.path))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                    disabled={(!replyContent.trim() && !replyAttachments.length) || sendMessage.isPending}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendMessage.isPending ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 min-h-[420px] flex flex-col items-center justify-center text-center">
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
          <div
            className="space-y-4 py-4"
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              void handleComposeFileChange(e.dataTransfer.files);
            }}
          >
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
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
                <span>{draftSavedAt ? `Draft saved ${formatDistanceToNow(new Date(draftSavedAt), { addSuffix: true })}` : 'Draft not saved yet'}</span>
                <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> You can schedule this message</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={composeFileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => void handleComposeFileChange(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 gap-1.5"
                  onClick={() => composeFileInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {isUploadingAttachment ? 'Uploading...' : 'Attach files'}
                </Button>
              </div>
              {composeAttachments.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-2 space-y-1">
                  {composeAttachments.map((attachment) => (
                    <div key={attachment.path} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-foreground">{attachment.name} • {formatBytes(attachment.size)}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setComposeAttachments((current) => current.filter((item) => item.path !== attachment.path))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <RichTextEditor
                value={newMessage.content}
                onChange={(val) => setNewMessage({ ...newMessage, content: val })}
                placeholder="Type your message here..."
                minHeight="120px"
              />
              <div className="space-y-1">
                <Label>Schedule send (optional)</Label>
                <Input
                  type="datetime-local"
                  value={composeScheduledFor}
                  onChange={(e) => setComposeScheduledFor(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} disabled={sendMessage.isPending || (!newMessage.content.trim() && !composeAttachments.length)} className="gap-2">
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
