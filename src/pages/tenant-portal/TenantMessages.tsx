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

interface MessageAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
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
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

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

  const renderedMessages = useMemo(() => {
    return messages.map((message) => {
      const extracted = extractAttachmentsMetadata(message.content || '');
      return {
        ...message,
        displayContent: extracted.cleanContent,
        attachments: extracted.attachments,
      };
    });
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return renderedMessages.filter((message) => {
      if (showUnreadOnly && (message.is_read || message.recipient_id !== tenantProfile?.id)) {
        return false;
      }

      if (!query) return true;
      return (
        (message.subject || '').toLowerCase().includes(query) ||
        (message.displayContent || '').toLowerCase().includes(query) ||
        message.attachments.some((attachment) => attachment.name.toLowerCase().includes(query))
      );
    });
  }, [renderedMessages, searchQuery, showUnreadOnly, tenantProfile?.id]);

  const unreadThreadCount = useMemo(
    () => messages.filter((message) => !message.is_read && message.recipient_id === tenantProfile?.id).length,
    [messages, tenantProfile?.id]
  );

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
            .upload(path, file, { cacheControl: '3600', upsert: false });

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

  const downloadAttachment = (attachment: MessageAttachment) => {
    const signedUrl = attachmentUrls[attachment.path];
    if (!signedUrl) {
      toast({ title: 'File unavailable', description: 'Attachment link expired. Please refresh and try again.' });
      return;
    }
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendMessage = async ({
    content,
    subject,
    attachments,
    closeComposer,
  }: {
    content: string;
    subject: string;
    attachments: MessageAttachment[];
    closeComposer?: boolean;
  }) => {
    if ((!content.trim() && !subject.trim()) && attachments.length === 0) return;
    if (!tenantProfile) return;

    setIsSending(true);
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
      created_at: new Date().toISOString(),
      subject: subject || (attachments.length > 0 ? 'Attachment' : 'Message'),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMessage].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ));

    try {
      const messageData = {
        client_message_id: clientMessageId,
        sender_id: tenantProfile.id,
        recipient_id: landlordId,
        user_id: landlordId,
        property_id: tenantProfile.property_id,
        content: body,
        subject: subject || (attachments.length > 0 ? 'Attachment' : 'Message'),
        is_read: false,
      };

      const { error } = await supabase.from('messages').insert([messageData]);
      if (error) throw error;
      setReplyMessage('');
      setComposeMessage('');
      setComposeSubject('');
      setReplyAttachments([]);
      setComposeAttachments([]);
      if (closeComposer) setIsNewMessageOpen(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-340px)] min-h-[560px] overflow-hidden">
        <Card className="card-shadow-md lg:col-span-1 flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Conversations</CardTitle>
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
                  placeholder="Search messages"
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
              {messages.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Conversations with property management will appear here.
                </div>
              ) : (
                <button type="button" className="w-full p-4 text-left border-b border-border bg-secondary/50 hover:bg-secondary/70 transition-colors">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">PM</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Property Management</span>
                        {messages[messages.length - 1] && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(messages[messages.length - 1].created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {extractAttachmentsMetadata(messages[messages.length - 1]?.content || '').cleanContent || 'No messages yet'}
                      </p>
                      {unreadThreadCount > 0 && (
                        <Badge variant="secondary" className="mt-2 text-xs">{unreadThreadCount} unread</Badge>
                      )}
                    </div>
                  </div>
                </button>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="card-shadow-md lg:col-span-2 flex min-h-0 flex-col overflow-hidden">
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
          <CardContent className="flex-1 p-0 flex min-h-0 flex-col">
            <ScrollArea className="flex-1 min-h-0 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>{searchQuery || showUnreadOnly ? 'No messages match this filter.' : 'No messages yet. Start a conversation!'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMessages.map((message) => {
                    const isMe = message.sender_id === tenantProfile?.id;
                    return (
                      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {message.subject && (
                            <div className={`mb-1 flex items-center gap-1 text-xs font-medium ${isMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              <AtSign className="h-3 w-3" />
                              {message.subject}
                            </div>
                          )}
                          <RenderContent content={message.displayContent} />
                          {message.attachments.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {message.attachments.map((attachment) => (
                                <button
                                  key={attachment.path}
                                  type="button"
                                  onClick={() => downloadAttachment(attachment)}
                                  className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs ${isMe ? 'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground' : 'border-border bg-background text-foreground'}`}
                                >
                                  <span className="truncate pr-2">{attachment.name}</span>
                                  <span className="inline-flex items-center gap-1 shrink-0">
                                    <Download className="h-3.5 w-3.5" />
                                    {formatBytes(attachment.size)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
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
            <div className="p-4 border-t border-border space-y-3">
              <RichTextEditor
                value={replyMessage}
                onChange={setReplyMessage}
                placeholder="Type your message... (Shift+Enter for new line)"
                onSubmit={() => {
                  void handleSendMessage({
                    content: replyMessage,
                    subject: 'Reply',
                    attachments: replyAttachments,
                  });
                }}
                minHeight="60px"
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
                    void handleSendMessage({
                      content: replyMessage,
                      subject: 'Reply',
                      attachments: replyAttachments,
                    });
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
                void handleSendMessage({
                  content: composeMessage,
                  subject: composeSubject,
                  attachments: composeAttachments,
                  closeComposer: true,
                });
              }}
              className="gap-2"
              disabled={isSending || ((!composeMessage.trim() && !composeSubject.trim()) && composeAttachments.length === 0)}
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
