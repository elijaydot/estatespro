-- Messaging + notifications hardening
-- Phase 1: message-triggered notifications, realtime notifications, performance indexes
-- Phase 2: optimistic message reconciliation support

-- Add client_message_id for optimistic UI dedupe/reconciliation
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS client_message_id text;

CREATE INDEX IF NOT EXISTS idx_messages_client_message_id
ON public.messages (client_message_id)
WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread_created
ON public.messages (recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON public.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
ON public.notifications (user_id, is_read, created_at DESC);

-- Ensure notifications are available in realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Create in-app notification rows for message recipients
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_user_id uuid;
  sender_user_id uuid;
  sender_display_name text;
  notifications_enabled boolean;
BEGIN
  -- Resolve recipient to auth user id.
  -- In this app: recipient_id can be either auth.uid() (staff) or tenant.id (domain record).
  SELECT t.tenant_user_id
  INTO recipient_user_id
  FROM public.tenants t
  WHERE t.id = NEW.recipient_id
  LIMIT 1;

  -- If recipient is not a tenant domain record, accept only valid auth user ids.
  IF recipient_user_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.recipient_id) THEN
      recipient_user_id := NEW.recipient_id;
    END IF;
  END IF;

  -- No valid auth receiver to notify.
  IF recipient_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip self-notifications.
  IF NEW.sender_id = NEW.recipient_id THEN
    RETURN NEW;
  END IF;

  -- Resolve sender auth id where possible (tenant.id -> tenant_user_id fallback to sender_id).
  SELECT COALESCE(
    (SELECT t.tenant_user_id FROM public.tenants t WHERE t.id = NEW.sender_id LIMIT 1),
    NEW.sender_id
  )
  INTO sender_user_id;

  -- Respect per-user in_app_messages preference (default true when no settings row exists).
  SELECT COALESCE(s.in_app_messages, true)
    INTO notifications_enabled
  FROM public.app_settings s
  WHERE s.user_id = recipient_user_id
  LIMIT 1;

  IF notifications_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  -- Sender display name fallback chain.
  SELECT COALESCE(
    (SELECT p.name FROM public.profiles p WHERE p.user_id = NEW.sender_id LIMIT 1),
    (SELECT t.name FROM public.tenants t WHERE t.id = NEW.sender_id LIMIT 1),
    'New message'
  ) INTO sender_display_name;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    is_read,
    link,
    metadata
  ) VALUES (
    recipient_user_id,
    'New Message',
    sender_display_name || ': ' || COALESCE(NULLIF(LEFT(NEW.content, 120), ''), 'You received a new message.'),
    'info',
    false,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.recipient_id) THEN '/tenant/messages'
      ELSE '/messages'
    END,
    jsonb_build_object(
      'source', 'messages',
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'recipient_id', NEW.recipient_id,
      'property_id', NEW.property_id
    )
  );

  -- Sender-side activity notification (read by default; visible in history without noisy unread badges)
  IF sender_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      is_read,
      link,
      metadata
    ) VALUES (
      sender_user_id,
      'Message Sent',
      'Your message was sent successfully.',
      'success',
      true,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.sender_id) THEN '/tenant/messages'
        ELSE '/messages'
      END,
      jsonb_build_object(
        'source', 'messages',
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'recipient_id', NEW.recipient_id,
        'direction', 'outbound'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_create_notification ON public.messages;

CREATE TRIGGER messages_create_notification
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();
