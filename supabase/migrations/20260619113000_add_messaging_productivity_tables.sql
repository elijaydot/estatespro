-- Messaging productivity and collaboration model
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_by ON public.message_attachments(uploaded_by);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own message attachments" ON public.message_attachments;
DROP POLICY IF EXISTS "Users insert own message attachments" ON public.message_attachments;
DROP POLICY IF EXISTS "Users delete own message attachments" ON public.message_attachments;

CREATE POLICY "Users view own message attachments"
ON public.message_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_attachments.message_id
      AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid() OR m.user_id = auth.uid())
  )
);

CREATE POLICY "Users insert own message attachments"
ON public.message_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
  )
);

CREATE POLICY "Users delete own message attachments"
ON public.message_attachments FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipient_id UUID,
  subject TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_drafts_user_id ON public.message_drafts(user_id);
ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own message drafts" ON public.message_drafts;
DROP POLICY IF EXISTS "Users upsert own message drafts" ON public.message_drafts;
DROP POLICY IF EXISTS "Users delete own message drafts" ON public.message_drafts;

CREATE POLICY "Users view own message drafts"
ON public.message_drafts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users upsert own message drafts"
ON public.message_drafts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own message drafts"
ON public.message_drafts FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own message drafts"
ON public.message_drafts FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user_id ON public.scheduled_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON public.scheduled_messages(scheduled_for);
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users create own scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users update own scheduled messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users delete own scheduled messages" ON public.scheduled_messages;

CREATE POLICY "Users view own scheduled messages"
ON public.scheduled_messages FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users create own scheduled messages"
ON public.scheduled_messages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own scheduled messages"
ON public.scheduled_messages FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own scheduled messages"
ON public.scheduled_messages FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.message_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  thread_key TEXT NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_presence_actor_thread ON public.message_presence(actor_id, thread_key);
CREATE INDEX IF NOT EXISTS idx_message_presence_thread ON public.message_presence(thread_key);
ALTER TABLE public.message_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view message presence" ON public.message_presence;
DROP POLICY IF EXISTS "Users manage own message presence" ON public.message_presence;

CREATE POLICY "Users view message presence"
ON public.message_presence FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users manage own message presence"
ON public.message_presence FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid()::text);

CREATE POLICY "Users update own message presence"
ON public.message_presence FOR UPDATE TO authenticated
USING (actor_id = auth.uid()::text)
WITH CHECK (actor_id = auth.uid()::text);

CREATE POLICY "Users delete own message presence"
ON public.message_presence FOR DELETE TO authenticated
USING (actor_id = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_drafts_updated_at ON public.message_drafts;
CREATE TRIGGER trg_message_drafts_updated_at
BEFORE UPDATE ON public.message_drafts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_scheduled_messages_updated_at ON public.scheduled_messages;
CREATE TRIGGER trg_scheduled_messages_updated_at
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_message_presence_updated_at ON public.message_presence;
CREATE TRIGGER trg_message_presence_updated_at
BEFORE UPDATE ON public.message_presence
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
