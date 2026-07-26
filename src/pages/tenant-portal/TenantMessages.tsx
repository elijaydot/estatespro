import { useState, useEffect, useMemo, useRef } from 'react';
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
  Search,
  Filter,
  Paperclip,
  Download,
  X,
  AtSign,
  Star,
  Reply,
  Forward,
  CalendarClock,
  Radio,
  Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { format, formatDistanceToNow } from 'date-fns';
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
  parent_message_id?: string | null;
  client_message_id?: string | null;
}

interface MessageAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

interface MessageView extends TenantMessage {
  displayContent: string;
  attachments: MessageAttachment[];
}

interface MessageThread {
  id: string;
  title: string;
  messages: MessageView[];
  unreadCount: number;
  lastMessage: MessageView;
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

const ATTACHMENTS_META_PREFIX = '<!--ATTACHMENTS:';
const ATTACHMENTS_META_SUFFIX = '-->';
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const QUICK_REACTIONS = ['👍', '❤️', '🎉', '🙏', '🔥', '✅'];

const dynamicFrom = (table: string) => supabase.from(table as never);

function normalizeSubject(subject: string | null | undefined) {
  return (subject || 'message')
    .replace(/^(re|fwd):\s*/gi, '')
    .trim()
    .toLowerCase();
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [replyMessage, setReplyMessage] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeScheduledFor, setComposeScheduledFor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<MessageAttachment[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<MessageAttachment[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [presenceLabel, setPresenceLabel] = useState('Live conversation');
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, string[]>>({});
  const [starredByMessage, setStarredByMessage] = useState<Record<string, boolean>>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const renderedMessages = useMemo<MessageView[]>(() => {
    return messages.map((message) => {
      const extracted = extractAttachmentsMetadata(message.content || '');
      return {
        ...message,
        displayContent: extracted.cleanContent,
        attachments: extracted.attachments,
      };
    });
  }, [messages]);

  const threads = useMemo<MessageThread[]>(() => {
    if (!tenantProfile) return [];
    const byId = new Map(renderedMessages.map((item) => [item.id, item]));
    const resolveRoot = (message: MessageView) => {
      let current = message;
      let steps = 0;
      while (current.parent_message_id && byId.has(current.parent_message_id) && steps < 20) {
        current = byId.get(current.parent_message_id)!;
        steps += 1;
      }
      return current.id;
    };

    const map = new Map<string, MessageThread>();
    for (const message of renderedMessages) {
      const rootId = message.parent_message_id ? resolveRoot(message) : `subject:${normalizeSubject(message.subject)}`;
      if (!map.has(rootId)) {
        map.set(rootId, {
          id: rootId,
          title: message.subject || 'Message',
          messages: [],
          unreadCount: 0,
          lastMessage: message,
        });
      }

      const thread = map.get(rootId)!;
      thread.messages.push(message);
      if (new Date(message.created_at) > new Date(thread.lastMessage.created_at)) {
        thread.lastMessage = message;
      }
      if (!message.is_read && message.recipient_id === tenantProfile.id) {
        thread.unreadCount += 1;
      }
    }

    const rows = Array.from(map.values()).map((thread) => {
      thread.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const subject = thread.messages.find((m) => m.subject)?.subject || thread.lastMessage.subject || 'Message';
      return { ...thread, title: subject };
    });

    rows.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    return rows;
  }, [renderedMessages, tenantProfile]);

  const filteredThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return threads.filter((thread) => {
      if (showUnreadOnly && thread.unreadCount === 0) return false;
      if (!query) return true;
      return (
        thread.title.toLowerCase().includes(query) ||
        thread.messages.some((m) => m.displayContent.toLowerCase().includes(query))
      );
    });
  }, [threads, searchQuery, showUnreadOnly]);

  const selectedThread = useMemo(
    () => filteredThreads.find((thread) => thread.id === selectedThreadId) || filteredThreads[0] || null,
    [filteredThreads, selectedThreadId]
  );

  const unreadThreadCount = useMemo(
    () => threads.reduce((acc, thread) => acc + thread.unreadCount, 0),
    [threads]
  );

  useEffect(() => {
    if (selectedThread && selectedThreadId !== selectedThread.id) {
      setSelectedThreadId(selectedThread.id);
    }
  }, [selectedThread, selectedThreadId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread?.messages.length]);

  useEffect(() => {
    const savedReactions = localStorage.getItem('tenant-message-reactions-v1');
    const savedStarred = localStorage.getItem('tenant-message-starred-v1');
    if (savedReactions) {
      try {
        setReactionsByMessage(JSON.parse(savedReactions));
      } catch {
        setReactionsByMessage({});
      }
    }
    if (savedStarred) {
      try {
        setStarredByMessage(JSON.parse(savedStarred));
      } catch {
        setStarredByMessage({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tenant-message-reactions-v1', JSON.stringify(reactionsByMessage));
  }, [reactionsByMessage]);

  useEffect(() => {
    localStorage.setItem('tenant-message-starred-v1', JSON.stringify(starredByMessage));
  }, [starredByMessage]);

  useEffect(() => {
    const local = localStorage.getItem('tenant-compose-draft-v1');
    if (!local) return;
    try {
      const parsed = JSON.parse(local) as { subject?: string; content?: string; scheduledFor?: string };
      setComposeSubject(parsed.subject || '');
      setComposeMessage(parsed.content || '');
      setComposeScheduledFor(parsed.scheduledFor || '');
    } catch {
      // Ignore malformed draft
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (!user?.id) return;

      const payload = {
        subject: composeSubject,
        content: composeMessage,
        scheduledFor: composeScheduledFor,
      };

      localStorage.setItem('tenant-compose-draft-v1', JSON.stringify(payload));
      setDraftSavedAt(new Date().toISOString());

      if (!composeSubject && !composeMessage) return;

      await dynamicFrom('message_drafts').upsert({
        user_id: user.id,
        recipient_id: tenantProfile?.user_id || null,
        subject: composeSubject,
        content: composeMessage,
        metadata: {
          scheduledFor: composeScheduledFor,
          portal: 'tenant',
        },
      } as never);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [composeSubject, composeMessage, composeScheduledFor, user?.id, tenantProfile?.user_id]);

  useEffect(() => {
    const attachmentPaths = Array.from(
      new Set(renderedMessages.flatMap((message) => message.attachments.map((attachment) => attachment.path)))
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
  }, [renderedMessages]);

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
    if (!selectedThread?.id || !tenantProfile || !user?.id) {
      setPresenceLabel('Live conversation');
      return;
    }

    const threadKey = [tenantProfile.id, tenantProfile.user_id].sort().join('::');

    const pushPresence = async () => {
      await dynamicFrom('message_presence').upsert({
        actor_id: user.id,
        thread_key: threadKey,
        is_typing: Boolean(replyMessage.trim()),
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
        setPresenceLabel('Property management is typing...');
        return;
      }

      setPresenceLabel(`Last seen ${formatDistanceToNow(new Date(presence.last_seen_at || Date.now()), { addSuffix: true })}`);
    };

    void pushPresence();
    void pullPresence();

    const interval = window.setInterval(() => {
      void pushPresence();
      void pullPresence();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [selectedThread?.id, tenantProfile, user?.id, replyMessage]);

  useEffect(() => {
    if (!selectedThread || !tenantProfile) return;
    const unreadIds = selectedThread.messages
      .filter((message) => !message.is_read && message.recipient_id === tenantProfile.id)
      .map((message) => message.id);

    if (!unreadIds.length) return;

    void supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
  }, [selectedThread, tenantProfile]);

  const uploadDraftAttachments = async (files: FileList | null, target: 'compose' | 'reply') => {
    if (!files?.length || !user?.id) return;

    setIsUploadingAttachment(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new Error(`${file.name} exceeds the 10MB limit.`);
          }

          const path = `${user.id}/tenant-messages/${Date.now()}-${sanitizeFilename(file.name)}`;
          const { error } = await supabase.storage
            .from('message-attachments')
            .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' });

          if (error) throw error;

          return {
            path,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
          } satisfies MessageAttachment;
        })
      );

      if (target === 'compose') {
        setComposeAttachments((current) => [...current, ...uploaded]);
      } else {
        setReplyAttachments((current) => [...current, ...uploaded]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload attachment.';
      toast({ title: 'Attachment upload failed', description: message, variant: 'destructive' });
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const removeDraftAttachment = (target: 'compose' | 'reply', path: string) => {
    if (target === 'compose') {
      setComposeAttachments((current) => current.filter((attachment) => attachment.path !== path));
      return;
    }
    setReplyAttachments((current) => current.filter((attachment) => attachment.path !== path));
  };

  const toggleStar = (messageId: string) => {
    setStarredByMessage((current) => ({ ...current, [messageId]: !current[messageId] }));
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    setReactionsByMessage((current) => {
      const list = current[messageId] || [];
      const exists = list.includes(emoji);
      return {
        ...current,
        [messageId]: exists ? list.filter((item) => item !== emoji) : [...list, emoji],
      };
    });
  };

  const resetComposeState = async () => {
    setComposeMessage('');
    setComposeSubject('');
    setComposeAttachments([]);
    setComposeScheduledFor('');
    localStorage.removeItem('tenant-compose-draft-v1');
    if (user?.id) {
      await dynamicFrom('message_drafts').delete().eq('user_id', user.id);
    }
  };

  const sendNow = async ({
    content,
    subject,
    attachments,
    parentMessageId,
  }: {
    content: string;
    subject: string;
    attachments: MessageAttachment[];
    parentMessageId?: string | null;
  }) => {
    if (!tenantProfile) return;
    const landlordId = tenantProfile.user_id;
    const clientMessageId = crypto.randomUUID();
    const optimisticId = `temp-${Date.now()}`;
    const body = appendAttachmentsMetadata(content || subject, attachments);

    pendingClientIdsRef.current.add(clientMessageId);

    const optimisticMessage: TenantMessage = {
      id: optimisticId,
      client_message_id: clientMessageId,
      sender_id: tenantProfile.id,
      recipient_id: landlordId,
      content: body,
      subject,
      parent_message_id: parentMessageId || null,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMessage].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ));

    const { error } = await supabase.from('messages').insert([
      {
        client_message_id: clientMessageId,
        sender_id: tenantProfile.id,
        recipient_id: landlordId,
        user_id: landlordId,
        property_id: tenantProfile.property_id,
        content: body,
        subject,
        parent_message_id: parentMessageId || null,
        is_read: false,
      },
    ]);

    if (error) {
      pendingClientIdsRef.current.delete(clientMessageId);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      throw error;
    }
  };

  const scheduleMessage = async ({
    content,
    subject,
    attachments,
  }: {
    content: string;
    subject: string;
    attachments: MessageAttachment[];
  }) => {
    if (!tenantProfile || !user?.id) return;

    const scheduledAt = new Date(composeScheduledFor);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw new Error('Select a future date and time for scheduled send.');
    }

    await dynamicFrom('scheduled_messages').insert({
      user_id: user.id,
      recipient_id: tenantProfile.user_id,
      subject,
      content: appendAttachmentsMetadata(content, attachments),
      scheduled_for: scheduledAt.toISOString(),
      metadata: {
        attachments,
        sender_id: tenantProfile.id,
        property_id: tenantProfile.property_id,
        source: 'tenant-portal',
      },
    } as never);

    toast({
      title: 'Message scheduled',
      description: `Queued for ${format(scheduledAt, 'MMM d, h:mm a')}.`,
    });
  };

  const handleComposeSend = async () => {
    if ((!composeMessage.trim() && !composeSubject.trim()) && composeAttachments.length === 0) return;
    if (!tenantProfile) return;

    setIsSending(true);
    try {
      const subject = composeSubject || (composeAttachments.length ? 'Attachment' : 'Message');

      if (composeScheduledFor) {
        await scheduleMessage({ content: composeMessage, subject, attachments: composeAttachments });
      } else {
        await sendNow({ content: composeMessage, subject, attachments: composeAttachments });
        toast({ title: 'Message sent', description: 'Property management will receive it instantly.' });
      }

      await resetComposeState();
      setIsNewMessageOpen(false);
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Could not send message.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleReplySend = async () => {
    if ((!replyMessage.trim()) && replyAttachments.length === 0) return;
    if (!selectedThread) return;

    setIsSending(true);
    try {
      const subject = `Re: ${selectedThread.title}`;
      await sendNow({
        content: replyMessage,
        subject,
        attachments: replyAttachments,
        parentMessageId: selectedThread.lastMessage.id,
      });

      setReplyMessage('');
      setReplyAttachments([]);
    } catch {
      toast({ title: 'Error', description: 'Failed to send reply', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const forwardMessage = (message: MessageView) => {
    const forwarded = `${message.displayContent}\n\n--- Forwarded from Property Management ---\nSent: ${format(new Date(message.created_at), 'PPPp')}`;
    setComposeSubject(`Fwd: ${message.subject || selectedThread?.title || 'Message'}`);
    setComposeMessage(forwarded);
    setComposeScheduledFor('');
    setComposeAttachments([]);
    setIsNewMessageOpen(true);
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
            <p className="text-muted-foreground">FishGate conversation workspace for organized communication with property management.</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 border-primary/30 bg-primary/5 text-primary font-display">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Threaded Inbox
          </Badge>
        </div>
      </section>

      <div className="rounded-xl border border-border/70 bg-card/80 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">Use filters, thread views, and quick actions to manage messages without leaving this page.</p>
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
            New Thread
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-340px)] min-h-[560px] overflow-hidden">
        <Card className="card-shadow-md lg:col-span-1 flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Threads</CardTitle>
              {unreadThreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadThreadCount} unread</Badge>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search threads"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant={showUnreadOnly ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-center gap-2"
                onClick={() => setShowUnreadOnly((current) => !current)}
              >
                <Filter className="h-4 w-4" />
                {showUnreadOnly ? 'Showing unread only' : 'Filter unread'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 min-h-0 flex-1">
            <ScrollArea className="h-full">
              {filteredThreads.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {threads.length === 0 ? 'No conversations yet.' : 'No threads match this filter.'}
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={`w-full p-4 text-left border-b border-border transition-colors ${selectedThread?.id === thread.id ? 'bg-secondary/80' : 'bg-secondary/40 hover:bg-secondary/65'}`}
                    onClick={() => setSelectedThreadId(thread.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">PM</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{thread.title}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(thread.lastMessage.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {thread.lastMessage.displayContent || 'No message body'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{thread.messages.length} msgs</Badge>
                          {thread.unreadCount > 0 && (
                            <Badge variant="secondary" className="text-[10px]">{thread.unreadCount} unread</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="card-shadow-md lg:col-span-2 flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">PM</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate">{selectedThread?.title || 'Select a thread'}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Radio className="h-3.5 w-3.5 text-success" />
                    {presenceLabel}
                  </p>
                </div>
              </div>
              {selectedThread && (
                <Badge variant="outline" className="text-xs">{selectedThread.messages.length} messages</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex min-h-0 flex-col">
            <ScrollArea className="flex-1 min-h-0 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !selectedThread ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>Select a thread to open the conversation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedThread.messages.map((message) => {
                    const isMe = message.sender_id === tenantProfile?.id;
                    const messageReactions = reactionsByMessage[message.id] || [];
                    return (
                      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className={`inline-flex items-center gap-1 text-xs font-medium ${isMe ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                              <AtSign className="h-3 w-3" />
                              {message.subject || 'Message'}
                            </div>
                            <div className="inline-flex items-center gap-1">
                              <Button
                                size="icon"
                                type="button"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => setReplyMessage((current) => `${current}${current ? '\n' : ''}@PM `)}
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                type="button"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => forwardMessage(message)}
                              >
                                <Forward className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                type="button"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => toggleStar(message.id)}
                              >
                                <Star className={`h-3.5 w-3.5 ${starredByMessage[message.id] ? 'fill-current text-warning' : ''}`} />
                              </Button>
                            </div>
                          </div>

                          <RenderContent content={message.displayContent} />

                          {message.attachments.length > 0 && (
                            <div className="mt-3 grid gap-2">
                              {message.attachments.map((attachment) => {
                                const signedUrl = attachmentUrls[attachment.path];
                                const isImage = attachment.type.startsWith('image/');
                                return (
                                  <div key={attachment.path} className={`rounded-md border p-2 ${isMe ? 'border-primary-foreground/30 bg-primary-foreground/10' : 'border-border bg-background'}`}>
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <div className="min-w-0">
                                        <p className="truncate font-medium">{attachment.name}</p>
                                        <p className={isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}>{formatBytes(attachment.size)}</p>
                                      </div>
                                      {signedUrl ? (
                                        <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                          <Button variant="outline" size="sm" className="h-7 gap-1">
                                            <Download className="h-3.5 w-3.5" />
                                            Open
                                          </Button>
                                        </a>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">Preparing...</span>
                                      )}
                                    </div>
                                    {isImage && signedUrl && (
                                      <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                        <img src={signedUrl} alt={attachment.name} className="max-h-52 rounded-md border border-border/60" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className={`text-xs ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </p>
                            <div className="inline-flex items-center gap-1">
                              {messageReactions.map((emoji) => (
                                <button
                                  key={`${message.id}-${emoji}`}
                                  type="button"
                                  className="rounded-full border border-border/50 px-1.5 py-0.5 text-xs"
                                  onClick={() => toggleReaction(message.id, emoji)}
                                >
                                  {emoji}
                                </button>
                              ))}
                              {!messageReactions.length && <span className="text-xs text-muted-foreground">no reactions</span>}
                              {isMe && (
                                <span className="ml-1">
                                  {message.is_read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 inline-flex items-center gap-1.5">
                            <Smile className={`h-3.5 w-3.5 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={`${message.id}-quick-${emoji}`}
                                type="button"
                                className="text-sm hover:scale-110 transition-transform"
                                onClick={() => toggleReaction(message.id, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t border-border space-y-3">
              <RichTextEditor
                value={replyMessage}
                onChange={setReplyMessage}
                placeholder="Type your reply... (Shift+Enter for new line)"
                onSubmit={() => {
                  void handleReplySend();
                }}
                minHeight="68px"
              />
              <input
                ref={replyFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => void uploadDraftAttachments(event.target.files, 'reply')}
              />
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {replyAttachments.map((attachment) => (
                    <div key={attachment.path} className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="max-w-[220px] truncate">{attachment.name}</span>
                      <span className="text-muted-foreground">{formatBytes(attachment.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeDraftAttachment('reply', attachment.path)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between mt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => replyFileInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                >
                  {isUploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  Attach
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    void handleReplySend();
                  }}
                  disabled={isSending || ((!replyMessage.trim()) && replyAttachments.length === 0)}
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
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>New Message Thread</DialogTitle>
            <DialogDescription>Start a new conversation with property management.</DialogDescription>
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
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <RichTextEditor
                value={composeMessage}
                onChange={setComposeMessage}
                placeholder="Type your message here..."
                minHeight="120px"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule">Schedule Send (optional)</Label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={composeScheduledFor}
                  onChange={(event) => setComposeScheduledFor(event.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {draftSavedAt ? `Draft saved ${formatDistanceToNow(new Date(draftSavedAt), { addSuffix: true })}` : 'Draft autosaves while you type.'}
              </p>
            </div>
            <input
              ref={composeFileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void uploadDraftAttachments(event.target.files, 'compose')}
            />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => composeFileInputRef.current?.click()}
                disabled={isUploadingAttachment}
              >
                {isUploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                Add Attachment
              </Button>
              <span className="text-xs text-muted-foreground">Max 10MB per file</span>
            </div>
            {composeAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {composeAttachments.map((attachment) => (
                  <div key={attachment.path} className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="max-w-[220px] truncate">{attachment.name}</span>
                    <span className="text-muted-foreground">{formatBytes(attachment.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeDraftAttachment('compose', attachment.path)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewMessageOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleComposeSend();
              }}
              className="gap-2"
              disabled={isSending || ((!composeMessage.trim() && !composeSubject.trim()) && composeAttachments.length === 0)}
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {composeScheduledFor ? 'Schedule Message' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
