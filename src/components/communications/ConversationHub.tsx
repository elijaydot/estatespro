import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Pin,
  Star,
  Paperclip,
  Send,
  Smile,
  Lock,
  Mail,
  Megaphone,
  FileText,
  Check,
  CheckCheck,
  Clock,
  Download,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Trash2,
  ArrowLeft,
  Phone,
  Plus,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  MessageSquare,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ConversationThread, ThreadMessage, MessageAttachment, CommunicationTemplate } from './types';
import { TenantContextPanel } from './TenantContextPanel';

interface ConversationHubProps {
  threads: ConversationThread[];
  selectedThread: ConversationThread | null;
  onSelectThread: (thread: ConversationThread) => void;
  onSendMessage: (params: {
    recipientId: string;
    content: string;
    subject?: string;
    isInternalNote?: boolean;
    attachments?: MessageAttachment[];
  }) => Promise<void>;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onOpenTemplates: () => void;
  onViewLease?: (leaseId: string) => void;
  onLogPayment?: (tenantId: string) => void;
  onCreateMaintenance?: (tenantId: string) => void;
  onSendEmailDirect?: (email: string) => void;
  currentUserId?: string;
  isStaff?: boolean;
}

const QUICK_EMOJIS = ['✅', '📅', '🏠', '🔧', '📢', '💰', '📄', '⚠️', '👍', '🙏'];

export function ConversationHub({
  threads,
  selectedThread,
  onSelectThread,
  onSendMessage,
  onMarkAsRead,
  onOpenTemplates,
  onViewLease,
  onLogPayment,
  onCreateMaintenance,
  onSendEmailDirect,
  currentUserId,
  isStaff = true,
}: ConversationHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'needs_reply' | 'pinned' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'unread_first' | 'name'>('recent');
  const [pinnedTenantIds, setPinnedTenantIds] = useState<Set<string>>(() => new Set());
  const [favoriteTenantIds, setFavoriteTenantIds] = useState<Set<string>>(() => new Set());

  // Composer State
  const [composerMode, setComposerMode] = useState<'reply' | 'internal_note'>('reply');
  const [replyText, setReplyText] = useState('');
  const [composerAttachments, setComposerAttachments] = useState<MessageAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'thread'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (selectedThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread?.messages.length, selectedThread?.tenantId]);

  // Mark messages in selected thread as read
  useEffect(() => {
    if (selectedThread) {
      const unread = selectedThread.messages.filter((m) => !m.is_read && !m.isFromMe);
      unread.forEach((m) => {
        void onMarkAsRead(m.id);
      });
    }
  }, [selectedThread?.tenantId, selectedThread?.messages]);

  const togglePin = (tenantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTenantIds((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId);
      else next.add(tenantId);
      return next;
    });
  };

  const toggleFavorite = (tenantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteTenantIds((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId);
      else next.add(tenantId);
      return next;
    });
  };

  // Filtered & Sorted Threads
  const filteredThreads = useMemo(() => {
    let list = threads.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        t.tenantName.toLowerCase().includes(q) ||
        (t.propertyName || '').toLowerCase().includes(q) ||
        (t.unitNumber || '').toLowerCase().includes(q) ||
        (t.lastMessage?.displayContent || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeFilter === 'unread') return t.unreadCount > 0;
      if (activeFilter === 'needs_reply') return t.needsReply;
      if (activeFilter === 'pinned') return pinnedTenantIds.has(t.tenantId);
      if (activeFilter === 'favorites') return favoriteTenantIds.has(t.tenantId);

      return true;
    });

    list.sort((a, b) => {
      // Always put pinned at top if sorting by recent
      const aPinned = pinnedTenantIds.has(a.tenantId) ? 1 : 0;
      const bPinned = pinnedTenantIds.has(b.tenantId) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      if (sortBy === 'unread_first') {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      }
      if (sortBy === 'name') {
        return a.tenantName.localeCompare(b.tenantName);
      }

      return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
    });

    return list;
  }, [threads, searchQuery, activeFilter, sortBy, pinnedTenantIds, favoriteTenantIds]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const newAtts: MessageAttachment[] = files.map((f) => ({
      path: `attachments/${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }));
    setComposerAttachments((prev) => [...prev, ...newAtts]);
  };

  const removeComposerAttachment = (index: number) => {
    setComposerAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    setReplyText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!selectedThread || (!replyText.trim() && !composerAttachments.length)) return;

    try {
      setIsSending(true);
      await onSendMessage({
        recipientId: selectedThread.tenantId,
        content: replyText.trim(),
        subject: selectedThread.lastMessage?.subject || `Conversation with ${selectedThread.tenantName}`,
        isInternalNote: composerMode === 'internal_note',
        attachments: composerAttachments,
      });

      setReplyText('');
      setComposerAttachments([]);
      setComposerMode('reply');
    } catch (err: any) {
      toast({
        title: 'Send Error',
        description: err?.message || 'Failed to send message.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSend();
    }
  };

  // Group messages by date for clean timeline
  const groupedMessages = useMemo(() => {
    if (!selectedThread) return [];
    const groups: { dateLabel: string; messages: ThreadMessage[] }[] = [];

    selectedThread.messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      let dateLabel = format(msgDate, 'MMMM d, yyyy');
      if (isToday(msgDate)) dateLabel = 'Today';
      else if (isYesterday(msgDate)) dateLabel = 'Yesterday';

      let existing = groups.find((g) => g.dateLabel === dateLabel);
      if (!existing) {
        existing = { dateLabel, messages: [] };
        groups.push(existing);
      }
      existing.messages.push(msg);
    });

    return groups;
  }, [selectedThread?.messages]);

  return (
    <div className="w-full h-[720px] bg-white rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden">
      {/* =========================================================================
          LEFT PANEL: CONVERSATION LIST
          ========================================================================= */}
      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white shrink-0 ${
          mobileActiveView === 'thread' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Search & Shortcuts */}
        <div className="p-3.5 border-b border-slate-100 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search conversations... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-slate-50 border-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs no-scrollbar">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'needs_reply', label: 'Needs Reply' },
                { id: 'pinned', label: 'Pinned' },
                { id: 'favorites', label: 'Favorites' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors shrink-0 ${
                  activeFilter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No conversations found</p>
              <p className="text-[11px] text-slate-400">
                {searchQuery ? 'Try clearing your search query.' : 'Click "+ New Conversation" to connect with a resident.'}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = selectedThread?.tenantId === thread.tenantId;
              const isPinned = pinnedTenantIds.has(thread.tenantId);
              const isFav = favoriteTenantIds.has(thread.tenantId);
              const initials = thread.tenantName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={thread.tenantId}
                  onClick={() => {
                    onSelectThread(thread);
                    setMobileActiveView('thread');
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all duration-100 text-left relative ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-blue-600 shadow-xs'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0 mt-0.5 border border-slate-200 shadow-2xs">
                    <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {thread.tenantName}
                        </span>
                        {isPinned && <Pin className="w-3 h-3 text-blue-600 fill-blue-600 shrink-0" />}
                        {isFav && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {thread.lastActivityAt
                          ? formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: false })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                      <span>{thread.propertyName || 'Property'}</span>
                      <span>•</span>
                      <span>Unit {thread.unitNumber || 'N/A'}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1 mt-1 font-normal">
                      {thread.lastMessage?.displayContent || 'No messages yet.'}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                          {thread.unreadCount} new
                        </Badge>
                      )}
                      {thread.needsReply && (
                        <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-200 bg-rose-50 px-1.5 py-0 h-4">
                          Needs Reply
                        </Badge>
                      )}
                      {thread.paymentStatus === 'overdue' && (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50 px-1.5 py-0 h-4">
                          Rent Overdue
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions hover */}
                  <div className="flex flex-col gap-1 shrink-0 self-center opacity-60 hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => togglePin(thread.tenantId, e)}
                      className="p-1 hover:text-blue-600 text-slate-400"
                      title={isPinned ? 'Unpin thread' : 'Pin thread'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-blue-600 text-blue-600' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(thread.tenantId, e)}
                      className="p-1 hover:text-amber-500 text-slate-400"
                      title={isFav ? 'Remove favorite' : 'Star favorite'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          CENTER PANEL: CONVERSATION THREAD & MESSAGE COMPOSER
          ========================================================================= */}
      <div
        className={`flex-1 flex flex-col bg-slate-50/40 overflow-hidden ${
          mobileActiveView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs z-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 text-slate-600"
                  onClick={() => setMobileActiveView('list')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>

                <Avatar className="h-9 w-9 border border-slate-200 shadow-2xs">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-xs font-bold">
                    {selectedThread.tenantName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {selectedThread.tenantName}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-slate-50">
                      Unit {selectedThread.unitNumber || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedThread.propertyName || 'Portfolio Resident'} • {selectedThread.tenantEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedThread.tenantPhone && (
                  <a
                    href={`tel:${selectedThread.tenantPhone}`}
                    className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                    title="Direct Phone Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {onOpenTemplates && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1.5 text-slate-700"
                    onClick={onOpenTemplates}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Templates
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 text-slate-600 ${showRightPanel ? 'bg-slate-100 text-blue-600' : ''}`}
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  title="Toggle Resident Dossier"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Message Thread Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {groupedMessages.map((group) => (
                <div key={group.dateLabel} className="space-y-4">
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[11px] font-semibold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                      {group.dateLabel}
                    </span>
                  </div>

                  {group.messages.map((msg) => {
                    const isNote = msg.type === 'internal_note' || msg.content.includes('<!--TYPE:INTERNAL_NOTE-->');
                    const isEmail = msg.type === 'email' || msg.content.includes('<!--TYPE:EMAIL-->');
                    const isBroadcast = msg.type === 'broadcast';

                    // 1. Internal Staff Note Card
                    if (isNote) {
                      return (
                        <div key={msg.id} className="mx-auto max-w-xl my-3">
                          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 shadow-2xs">
                            <div className="flex items-center justify-between text-amber-900 pb-2 border-b border-amber-200/60 mb-2">
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <Lock className="w-3.5 h-3.5 text-amber-700" />
                                <span>Internal Staff Note</span>
                                <span className="font-normal text-amber-700">• Visible only to team</span>
                              </div>
                              <span className="text-[10px] text-amber-700 font-medium">
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                            </div>
                            <p className="text-xs text-amber-950 whitespace-pre-wrap leading-relaxed font-sans">
                              {msg.displayContent}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // 2. Email Timeline Card
                    if (isEmail) {
                      return (
                        <div key={msg.id} className="mx-auto max-w-xl my-3">
                          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 shadow-2xs">
                            <div className="flex items-center justify-between text-indigo-900 pb-2 border-b border-indigo-200/60 mb-2">
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <Mail className="w-3.5 h-3.5 text-indigo-700" />
                                <span>Official Email Sent</span>
                                <span className="font-normal text-indigo-700">• {msg.subject}</span>
                              </div>
                              <span className="text-[10px] text-indigo-600 font-medium">
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-950 whitespace-pre-wrap leading-relaxed font-sans">
                              {msg.displayContent}
                            </p>
                            {msg.attachments?.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-indigo-200/50">
                                {msg.attachments.map((att, i) => (
                                  <Badge key={i} variant="outline" className="bg-white text-indigo-800 text-[10px] gap-1">
                                    <FileText className="w-3 h-3 text-indigo-600" />
                                    {att.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // 3. Regular Conversation Message (Staff or Resident)
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!msg.isFromMe && (
                          <Avatar className="h-7 w-7 shrink-0 border border-slate-200">
                            <AvatarFallback className="bg-slate-800 text-white text-[10px] font-bold">
                              {selectedThread.tenantName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={`max-w-[78%] md:max-w-[68%] space-y-1.5`}>
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                              msg.isFromMe
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                            }`}
                          >
                            <p>{msg.displayContent}</p>

                            {/* Attachments */}
                            {msg.attachments?.length > 0 && (
                              <div className={`mt-2.5 space-y-1.5 pt-2 border-t ${msg.isFromMe ? 'border-blue-500/50' : 'border-slate-100'}`}>
                                {msg.attachments.map((att, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-center justify-between p-2 rounded-lg text-[11px] ${
                                      msg.isFromMe ? 'bg-blue-700/60 text-white' : 'bg-slate-50 text-slate-800 border border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <FileText className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate font-semibold">{att.name}</span>
                                    </div>
                                    <span className="text-[10px] opacity-75 shrink-0 ml-2">
                                      {(att.size / 1024).toFixed(0)} KB
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Timestamp & Status */}
                          <div
                            className={`flex items-center gap-1 text-[10px] text-slate-400 px-1 ${
                              msg.isFromMe ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span>{format(new Date(msg.created_at), 'h:mm a')}</span>
                            {msg.isFromMe && (
                              <span title={msg.is_read ? 'Read by resident' : 'Delivered'}>
                                {msg.is_read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-600 inline" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="p-4 bg-white border-t border-slate-200 space-y-2.5">
              {/* Mode Selector (Public Reply vs Staff Note) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setComposerMode('reply')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      composerMode === 'reply'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Reply to Resident
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode('internal_note')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                      composerMode === 'internal_note'
                        ? 'bg-amber-100 text-amber-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-amber-700" />
                    Internal Staff Note
                  </button>
                </div>

                {composerMode === 'internal_note' && (
                  <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Only visible to property team
                  </span>
                )}
              </div>

              {/* Textarea */}
              <div
                className={`rounded-xl border transition-all ${
                  composerMode === 'internal_note'
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
                }`}
              >
                <textarea
                  ref={textareaRef}
                  placeholder={
                    composerMode === 'internal_note'
                      ? 'Add a private note regarding this resident, maintenance record, or lease discussion...'
                      : `Message ${selectedThread.tenantName}... (Press ⌘+Enter to send)`
                  }
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full p-3 text-xs resize-none bg-transparent outline-none font-sans leading-relaxed"
                />

                {/* Attachments Preview */}
                {composerAttachments.length > 0 && (
                  <div className="px-3 pb-2 flex flex-wrap gap-2">
                    {composerAttachments.map((att, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-white border-slate-200 text-slate-700 text-[10px] py-0.5 px-2 gap-1.5"
                      >
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span className="max-w-[120px] truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => removeComposerAttachment(i)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Composer Toolbar */}
                <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-xl">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-slate-800"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file (PDF, Doc, Image)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    {/* Quick Professional Emojis Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-800"
                          title="Professional Emojis"
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="p-2 grid grid-cols-5 gap-1 w-44">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="p-1.5 text-base hover:bg-slate-100 rounded text-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {onOpenTemplates && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-blue-600 gap-1"
                        onClick={onOpenTemplates}
                      >
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        Insert Template
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 hidden sm:inline">⌘+Enter to send</span>
                    <Button
                      size="sm"
                      className={`h-7 px-3 text-xs font-semibold gap-1.5 ${
                        composerMode === 'internal_note'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      onClick={handleSend}
                      disabled={isSending || (!replyText.trim() && !composerAttachments.length)}
                    >
                      <Send className="w-3 h-3" />
                      {isSending ? 'Sending...' : composerMode === 'internal_note' ? 'Save Note' : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-700">Resident Communication Hub</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Select a conversation thread from the left to view resident history, send messages, or add internal notes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          RIGHT PANEL: TENANT CONTEXT DOSSIER
          ========================================================================= */}
      {selectedThread && showRightPanel && (
        <div className="w-80 lg:w-88 hidden lg:flex shrink-0">
          <TenantContextPanel
            thread={selectedThread}
            onClose={() => setShowRightPanel(false)}
            onViewLease={onViewLease}
            onLogPayment={onLogPayment}
            onCreateMaintenance={onCreateMaintenance}
            onSendEmail={onSendEmailDirect}
          />
        </div>
      )}
    </div>
  );
}
