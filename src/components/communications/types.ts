export type CommunicationType = 'message' | 'email' | 'internal_note' | 'broadcast' | 'notice';

export interface MessageAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface ThreadMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  senderName: string;
  subject: string;
  content: string;
  displayContent: string;
  type: CommunicationType;
  created_at: string;
  is_read: boolean;
  isFromMe: boolean;
  parent_message_id?: string | null;
  client_message_id?: string | null;
  property_id?: string | null;
  attachments: MessageAttachment[];
  reactions?: Record<string, string[]>;
}

export interface ConversationThread {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId?: string | null;
  propertyName?: string;
  unitId?: string | null;
  unitNumber?: string;
  leaseId?: string | null;
  leaseStatus?: string;
  rentAmount?: number;
  paymentStatus?: 'paid' | 'overdue' | 'pending' | 'grace_period';
  balanceDue?: number;
  lastPaymentDate?: string;
  openMaintenanceCount?: number;
  lastMaintenanceTitle?: string;
  messages: ThreadMessage[];
  lastMessage: ThreadMessage;
  unreadCount: number;
  isPinned?: boolean;
  isFavorite?: boolean;
  needsReply?: boolean;
  lastActivityAt: string;
}

export interface CommunicationTemplate {
  id: string;
  title: string;
  category: 'finance' | 'leasing' | 'maintenance' | 'general';
  subject: string;
  content: string;
  tags: string[];
}

export interface ActionRequiredItem {
  id: string;
  residentId: string;
  residentName: string;
  unitNumber: string;
  propertyName: string;
  title: string;
  description: string;
  timeAgo: string;
  urgency: 'high' | 'medium' | 'urgent';
  actionLabel: string;
  actionType: 'reply' | 'review_lease' | 'maintenance' | 'payment_reminder';
}
