import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Megaphone,
  Mail,
  FileText,
  Clock,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { PageContainer } from '@/design-system/LayoutFramework';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useMessages, useSendMessage, useMarkAsRead, type Message } from '@/hooks/useMessages';
import { useTenants, type Tenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useLeases } from '@/hooks/useLeases';
import { useInvoices } from '@/hooks/useInvoices';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useBroadcastAnnouncements, useSendBroadcast } from '@/hooks/useBroadcasts';
import { formatDistanceToNow } from 'date-fns';

// Specialized Communications Components
import { CommunicationOverview } from '@/components/communications/CommunicationOverview';
import { CommunicationActionRequired } from '@/components/communications/CommunicationActionRequired';
import { ConversationHub } from '@/components/communications/ConversationHub';
import { CommunicationInsights } from '@/components/communications/CommunicationInsights';
import { NewConversationModal } from '@/components/communications/NewConversationModal';
import { BroadcastComposerModal } from '@/components/communications/BroadcastComposerModal';
import { EmailComposerModal } from '@/components/communications/EmailComposerModal';
import { TemplateLibraryModal } from '@/components/communications/TemplateLibraryModal';
import {
  ConversationThread,
  ThreadMessage,
  MessageAttachment,
  ActionRequiredItem,
  CommunicationTemplate,
} from '@/components/communications/types';

const ATTACHMENTS_META_PREFIX = '<!--ATTACHMENTS:';
const ATTACHMENTS_META_SUFFIX = '-->';

function extractAttachments(content: string): { cleanContent: string; attachments: MessageAttachment[] } {
  const start = content.indexOf(ATTACHMENTS_META_PREFIX);
  if (start === -1) return { cleanContent: content, attachments: [] };

  const end = content.indexOf(ATTACHMENTS_META_SUFFIX, start);
  if (end === -1) return { cleanContent: content, attachments: [] };

  const raw = content.slice(start + ATTACHMENTS_META_PREFIX.length, end).trim();
  let attachments: MessageAttachment[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      attachments = parsed;
    }
  } catch {
    attachments = [];
  }

  const cleanContent = `${content.slice(0, start)}${content.slice(end + ATTACHMENTS_META_SUFFIX.length)}`.trim();
  return { cleanContent, attachments };
}

export default function Communications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLandlord, isManager } = useUserRole();

  // Queries
  const { data: allMessages = [], isLoading: messagesLoading } = useMessages();
  const { data: tenants = [] } = useTenants();
  const { data: properties = [] } = useProperties();
  const { data: rawLeases = [] } = useLeases();
  const { data: rawInvoices = [] } = useInvoices();
  const { data: rawMaintenance = [] } = useMaintenanceRequests();
  const { data: broadcasts = [] } = useBroadcastAnnouncements();

  // Mutations
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const sendBroadcastMutation = useSendBroadcast();

  // Dialog states
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Email specific modal prep
  const [emailRecipientData, setEmailRecipientData] = useState<{ email: string; name: string } | null>(null);

  // Construct Unified Conversation Threads organized by resident
  const threads = useMemo<ConversationThread[]>(() => {
    const threadMap = new Map<string, ConversationThread>();
    const currentUserId = user?.id;

    // 1. Initialize threads for tenants with their profile & property details
    tenants.forEach((tenant) => {
      const tenantLease = (rawLeases as any[]).find(
        (l) => l.tenant_id === tenant.id && (l.status === 'active' || l.status === 'signed')
      );
      const tenantInvoices = (rawInvoices as any[]).filter((inv) => inv.tenant_id === tenant.id);
      const unpaidInvoices = tenantInvoices.filter((inv) => inv.status !== 'paid');
      const balanceDue = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0) - Number(inv.paid_amount || 0), 0);
      const tenantMaintenance = (rawMaintenance as any[]).filter(
        (m) => m.tenant_id === tenant.id && m.status !== 'completed' && m.status !== 'cancelled'
      );

      const property = properties.find((p) => p.id === tenant.property_id);

      threadMap.set(tenant.id, {
        tenantId: tenant.id,
        tenantName: tenant.name || 'Valued Resident',
        tenantEmail: tenant.email || '',
        tenantPhone: tenant.phone || '',
        propertyId: tenant.property_id || null,
        propertyName: property?.name || 'Estate Property',
        unitId: tenant.unit_id || null,
        unitNumber: (tenant as any).unit_number || (tenantLease?.units as any)?.unit_number || 'Standard',
        leaseId: tenantLease?.id || null,
        leaseStatus: tenantLease?.status || 'active',
        rentAmount: tenantLease?.rent_amount || Number((tenant as any).rent_amount || 0),
        paymentStatus: balanceDue > 0 ? 'overdue' : 'paid',
        balanceDue: balanceDue,
        lastPaymentDate: 'Recent',
        openMaintenanceCount: tenantMaintenance.length,
        lastMaintenanceTitle: tenantMaintenance[0]?.title || undefined,
        messages: [],
        lastMessage: null as any,
        unreadCount: 0,
        needsReply: false,
        lastActivityAt: tenant.created_at || new Date().toISOString(),
      });
    });

    // 2. Map messages into corresponding resident threads
    (allMessages as Message[]).forEach((msg) => {
      const isFromMe = msg.sender_id === currentUserId;
      const otherPartyId = isFromMe ? msg.recipient_id : msg.sender_id;

      // Find tenant matching otherPartyId (domain id or auth uid)
      const tenant = tenants.find(
        (t) => t.id === otherPartyId || (t as any).tenant_user_id === otherPartyId
      );

      const tenantId = tenant?.id || otherPartyId;
      if (!threadMap.has(tenantId)) {
        threadMap.set(tenantId, {
          tenantId,
          tenantName: tenant?.name || msg.sender_name || 'Resident',
          tenantEmail: tenant?.email || '',
          tenantPhone: tenant?.phone || '',
          messages: [],
          lastMessage: null as any,
          unreadCount: 0,
          needsReply: false,
          lastActivityAt: msg.created_at,
        });
      }

      const thread = threadMap.get(tenantId)!;
      const { cleanContent, attachments } = extractAttachments(msg.content);

      let msgType: 'message' | 'email' | 'internal_note' | 'broadcast' | 'notice' = 'message';
      if (msg.content.includes('<!--TYPE:INTERNAL_NOTE-->') || msg.subject?.startsWith('[Internal Note]')) {
        msgType = 'internal_note';
      } else if (msg.content.includes('<!--TYPE:EMAIL-->') || msg.subject?.startsWith('[Email:')) {
        msgType = 'email';
      }

      const threadMsg: ThreadMessage = {
        id: msg.id,
        sender_id: msg.sender_id,
        recipient_id: msg.recipient_id,
        senderName: isFromMe ? 'You' : thread.tenantName,
        subject: msg.subject || 'Message',
        content: msg.content,
        displayContent: cleanContent,
        type: msgType,
        created_at: msg.created_at,
        is_read: msg.is_read,
        isFromMe,
        attachments,
      };

      thread.messages.push(threadMsg);

      if (!thread.lastMessage || new Date(msg.created_at) > new Date(thread.lastMessage.created_at)) {
        thread.lastMessage = threadMsg;
        thread.lastActivityAt = msg.created_at;
      }

      if (!msg.is_read && !isFromMe) {
        thread.unreadCount += 1;
      }
    });

    // Calculate needsReply: if last message was from resident and unread
    threadMap.forEach((thread) => {
      if (thread.lastMessage && !thread.lastMessage.isFromMe && !thread.lastMessage.is_read) {
        thread.needsReply = true;
      }
      thread.messages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    // Sort threads by latest activity descending
    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );
  }, [allMessages, tenants, properties, rawLeases, rawInvoices, rawMaintenance, user?.id]);

  // Selected thread state
  const selectedThread = useMemo(() => {
    if (!threads.length) return null;
    if (activeThreadId) {
      const match = threads.find((t) => t.tenantId === activeThreadId);
      if (match) return match;
    }
    return threads[0] || null;
  }, [threads, activeThreadId]);

  // KPIs
  const activeConversationsCount = threads.filter((t) => t.messages.length > 0).length || threads.length;
  const unreadMessagesCount = threads.reduce((sum, t) => sum + t.unreadCount, 0);
  const pendingResponsesCount = threads.filter((t) => t.needsReply).length;
  const broadcastDeliveriesCount = broadcasts.length;

  // Action Required Items
  const actionRequiredItems = useMemo<ActionRequiredItem[]>(() => {
    const list: ActionRequiredItem[] = [];

    // 1. Residents awaiting response
    threads
      .filter((t) => t.needsReply)
      .slice(0, 3)
      .forEach((t) => {
        list.push({
          id: `reply-${t.tenantId}`,
          residentId: t.tenantId,
          residentName: t.tenantName,
          unitNumber: t.unitNumber || 'N/A',
          propertyName: t.propertyName || 'Property',
          title: 'Unread Resident Inquiry',
          description: `Awaiting response on: "${t.lastMessage?.displayContent.slice(0, 75)}..."`,
          timeAgo: t.lastMessage?.created_at
            ? formatDistanceToNow(new Date(t.lastMessage.created_at), { addSuffix: true })
            : 'recently',
          urgency: 'urgent',
          actionLabel: 'Respond to Resident',
          actionType: 'reply',
        });
      });

    // 2. Lease renewal discussions
    (rawLeases as any[])
      .filter((l) => {
        if (l.status !== 'active' || !l.end_date) return false;
        const days = (new Date(l.end_date).getTime() - Date.now()) / (1000 * 3600 * 24);
        return days > 0 && days <= 60;
      })
      .slice(0, 2)
      .forEach((l) => {
        const tenant = tenants.find((t) => t.id === l.tenant_id);
        if (tenant && !list.some((item) => item.residentId === tenant.id)) {
          list.push({
            id: `lease-renew-${l.id}`,
            residentId: tenant.id,
            residentName: tenant.name,
            unitNumber: (l.units as any)?.unit_number || 'Standard',
            propertyName: (l.properties as any)?.name || 'Property',
            title: 'Upcoming Lease Expiration',
            description: `Lease expires in ${Math.round(
              (new Date(l.end_date).getTime() - Date.now()) / (1000 * 3600 * 24)
            )} days. Renewal terms discussion recommended.`,
            timeAgo: 'Expiring Soon',
            urgency: 'medium',
            actionLabel: 'Review Agreement',
            actionType: 'review_lease',
          });
        }
      });

    return list;
  }, [threads, rawLeases, tenants]);

  // Handler: Send Message or Staff Internal Note
  const handleSendMessage = async (params: {
    recipientId: string;
    content: string;
    subject?: string;
    isInternalNote?: boolean;
    attachments?: MessageAttachment[];
  }) => {
    let finalContent = params.content;
    let finalSubject = params.subject || 'Message';

    if (params.isInternalNote) {
      finalContent = `<!--TYPE:INTERNAL_NOTE-->${finalContent}`;
      finalSubject = `[Internal Note] ${finalSubject}`;
    }

    if (params.attachments && params.attachments.length > 0) {
      finalContent = `${finalContent}\n\n${ATTACHMENTS_META_PREFIX}${JSON.stringify(
        params.attachments
      )}${ATTACHMENTS_META_SUFFIX}`;
    }

    await sendMessageMutation.mutateAsync({
      recipient_id: params.recipientId,
      subject: finalSubject,
      content: finalContent,
    });
  };

  // Handler: Start New Conversation
  const handleStartConversation = async (recipientId: string, subject: string, content: string) => {
    await sendMessageMutation.mutateAsync({
      recipient_id: recipientId,
      subject,
      content,
    });
    setActiveThreadId(recipientId);
    toast({
      title: 'Conversation Started',
      description: 'Your message was delivered and the thread is active.',
    });
  };

  // Handler: Send Email
  const handleSendEmail = async (params: {
    recipientEmail: string;
    cc?: string;
    bcc?: string;
    subject: string;
    content: string;
    attachments: MessageAttachment[];
  }) => {
    const targetTenant = tenants.find((t) => t.email === params.recipientEmail);
    const recipientId = targetTenant ? targetTenant.id : selectedThread?.tenantId || (tenants[0]?.id ?? '');

    // 1. Dispatch actual email externally via Supabase Edge Function with Resend!
    let emailSentSuccess = false;
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.recipientEmail,
          subject: params.subject,
          content: params.content,
          cc: params.cc,
          bcc: params.bcc,
          fromName: selectedThread?.propertyName || 'FishGate Property Management',
        },
      });

      if (!error && data?.success) {
        emailSentSuccess = true;
      } else if (error) {
        console.warn('send-email edge function warning:', error);
      }
    } catch (edgeErr) {
      console.warn('Could not reach send-email edge function:', edgeErr);
    }

    // 2. Log in timeline as well
    let body = `<!--TYPE:EMAIL-->${params.content}`;
    if (params.cc || params.bcc) {
      body += `\n\n[Email Meta: CC: ${params.cc || 'None'} | BCC: ${params.bcc || 'None'}]`;
    }
    if (params.attachments.length > 0) {
      body += `\n\n${ATTACHMENTS_META_PREFIX}${JSON.stringify(params.attachments)}${ATTACHMENTS_META_SUFFIX}`;
    }

    await sendMessageMutation.mutateAsync({
      recipient_id: recipientId,
      subject: `[Email: ${params.subject}]`,
      content: body,
    });

    if (targetTenant) {
      setActiveThreadId(targetTenant.id);
    }

    if (emailSentSuccess) {
      toast({
        title: 'Email Dispatched',
        description: `Official email sent to ${params.recipientEmail} via Resend.`,
      });
    }
  };

  // Handler: Dispatch Broadcast
  const handleSendBroadcast = async (params: {
    title: string;
    message: string;
    targetRole: 'all' | 'tenant' | 'landlord' | 'property_manager';
    propertyId?: string | null;
  }) => {
    await sendBroadcastMutation.mutateAsync({
      title: params.title,
      message: params.message,
      targetRole: params.targetRole,
      propertyId: params.propertyId,
    });
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* =========================================================================
            SECTION 1: HEADER
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Communications
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage conversations, emails, announcements and resident engagement across your portfolio.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
              onClick={() => setNewConversationOpen(true)}
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => setBroadcastModalOpen(true)}
            >
              <Megaphone className="w-4 h-4 text-indigo-600" />
              Send Broadcast
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => {
                if (selectedThread) {
                  setEmailRecipientData({
                    email: selectedThread.tenantEmail,
                    name: selectedThread.tenantName,
                  });
                }
                setEmailModalOpen(true);
              }}
            >
              <Mail className="w-4 h-4 text-blue-600" />
              Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => setTemplateLibraryOpen(true)}
            >
              <FileText className="w-4 h-4 text-slate-600" />
              Template Library
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: COMMUNICATION OVERVIEW (KPIs)
            ========================================================================= */}
        <CommunicationOverview
          activeCount={activeConversationsCount}
          unreadCount={unreadMessagesCount}
          pendingResponseCount={pendingResponsesCount}
          broadcastCount={broadcastDeliveriesCount}
        />

        {/* =========================================================================
            SECTION 3: ACTION REQUIRED
            ========================================================================= */}
        <CommunicationActionRequired
          items={actionRequiredItems}
          onSelectResident={(residentId) => {
            setActiveThreadId(residentId);
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
          onOpenLeases={() => navigate('/leases')}
          onOpenMaintenance={() => navigate('/maintenance')}
        />

        {/* =========================================================================
            SECTION 4: CONVERSATION HUB (PRIMARY 3-COLUMN WORKSPACE)
            ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Resident Conversation Hub
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Unified Timeline: In-App Messages • Emails • Broadcasts • Notices
            </span>
          </div>

          <ConversationHub
            threads={threads}
            selectedThread={selectedThread}
            onSelectThread={(t) => setActiveThreadId(t.tenantId)}
            onSendMessage={handleSendMessage}
            onMarkAsRead={async (id) => {
              await markAsReadMutation.mutateAsync(id);
            }}
            onOpenTemplates={() => setTemplateLibraryOpen(true)}
            onViewLease={() => navigate('/leases')}
            onLogPayment={() => navigate('/payments')}
            onCreateMaintenance={() => navigate('/maintenance')}
            onSendEmailDirect={(email) => {
              if (selectedThread) {
                setEmailRecipientData({
                  email,
                  name: selectedThread.tenantName,
                });
              }
              setEmailModalOpen(true);
            }}
            currentUserId={user?.id}
            isStaff={Boolean(isLandlord || isManager)}
          />
        </div>

        {/* =========================================================================
            SECTION 7: COMMUNICATION INSIGHTS (HUMAN-CENTERED OBSERVATIONS)
            ========================================================================= */}
        <CommunicationInsights />
      </div>

      {/* =========================================================================
          MODALS & DIALOGS
          ========================================================================= */}
      {/* 1. New Conversation Modal */}
      <NewConversationModal
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        tenants={tenants}
        onStartConversation={handleStartConversation}
        onOpenTemplates={() => setTemplateLibraryOpen(true)}
      />

      {/* 2. Broadcast Composer Modal */}
      <BroadcastComposerModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        properties={properties}
        onSendBroadcast={handleSendBroadcast}
      />

      {/* 3. Email Composer Modal */}
      <EmailComposerModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        defaultRecipientEmail={emailRecipientData?.email || selectedThread?.tenantEmail || ''}
        defaultRecipientName={emailRecipientData?.name || selectedThread?.tenantName || ''}
        defaultSubject={selectedThread ? `Update regarding Unit ${selectedThread.unitNumber}` : ''}
        onSendEmail={handleSendEmail}
        onOpenTemplates={() => setTemplateLibraryOpen(true)}
      />

      {/* 4. Template Library Modal */}
      <TemplateLibraryModal
        open={templateLibraryOpen}
        onOpenChange={setTemplateLibraryOpen}
        currentResidentContext={{
          tenantName: selectedThread?.tenantName,
          propertyName: selectedThread?.propertyName,
          unitNumber: selectedThread?.unitNumber,
          rentAmount: selectedThread?.rentAmount
            ? `RWF ${Number(selectedThread.rentAmount).toLocaleString()}`
            : undefined,
          managerName: user?.email ? user.email.split('@')[0] : 'Property Management',
        }}
        onSelectTemplate={(template: CommunicationTemplate) => {
          if (selectedThread) {
            handleSendMessage({
              recipientId: selectedThread.tenantId,
              content: template.content,
              subject: template.subject,
            });
          }
        }}
      />
    </PageContainer>
  );
}
