import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/security.ts';

type ScheduledMessageRow = {
  id: string;
  user_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  scheduled_for: string;
  metadata: unknown;
};

type AttachmentMeta = {
  path: string;
  name: string;
  size: number;
  type: string;
};

type ScheduledMetadata = {
  attachments?: AttachmentMeta[];
  sender_id?: string;
  property_id?: string | null;
};

function parseAttachments(metadata: unknown): AttachmentMeta[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const maybeAttachments = (metadata as { attachments?: unknown }).attachments;
  if (!Array.isArray(maybeAttachments)) return [];

  return maybeAttachments.filter((item): item is AttachmentMeta => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<AttachmentMeta>;
    return (
      typeof candidate.path === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.size === 'number' &&
      typeof candidate.type === 'string'
    );
  });
}

function parseMetadata(metadata: unknown): ScheduledMetadata {
  if (!metadata || typeof metadata !== 'object') return {};
  return metadata as ScheduledMetadata;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const cronSecret = Deno.env.get('MESSAGES_CRON_SECRET')?.trim();
  const incomingSecret = req.headers.get('x-messages-cron-secret')?.trim();

  if (cronSecret && incomingSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(Number(body?.batchSize ?? 50), 1), 200);

    const nowIso = new Date().toISOString();

    const { data: dueMessages, error: dueError } = await adminClient
      .from('scheduled_messages')
      .select('id, user_id, recipient_id, subject, content, scheduled_for, metadata')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true })
      .limit(batchSize);

    if (dueError) {
      throw dueError;
    }

    const rows = (dueMessages || []) as ScheduledMessageRow[];

    let sent = 0;
    let failed = 0;

    for (const scheduled of rows) {
      try {
        const metadata = parseMetadata(scheduled.metadata);
        const senderId = metadata.sender_id ?? scheduled.user_id;
        const propertyId = metadata.property_id ?? null;

        const { data: insertedMessage, error: insertError } = await adminClient
          .from('messages')
          .insert({
            client_message_id: crypto.randomUUID(),
            user_id: scheduled.user_id,
            sender_id: senderId,
            recipient_id: scheduled.recipient_id,
            subject: scheduled.subject,
            content: scheduled.content,
            property_id: propertyId,
            parent_message_id: null,
          })
          .select('id')
          .single();

        if (insertError || !insertedMessage?.id) {
          throw insertError || new Error('Failed to insert dispatched message');
        }

        const attachments = parseAttachments(scheduled.metadata);
        if (attachments.length > 0) {
          const { error: attachmentError } = await adminClient
            .from('message_attachments')
            .insert(
              attachments.map((attachment) => ({
                message_id: insertedMessage.id,
                file_path: attachment.path,
                file_name: attachment.name,
                file_size: attachment.size,
                mime_type: attachment.type,
                uploaded_by: scheduled.user_id,
              }))
            );

          if (attachmentError) {
            throw attachmentError;
          }
        }

        const nextMetadata = {
          ...(scheduled.metadata && typeof scheduled.metadata === 'object' ? scheduled.metadata as Record<string, unknown> : {}),
          dispatchedAt: new Date().toISOString(),
          dispatchedMessageId: insertedMessage.id,
        };

        const { error: updateError } = await adminClient
          .from('scheduled_messages')
          .update({ status: 'sent', metadata: nextMetadata })
          .eq('id', scheduled.id);

        if (updateError) {
          throw updateError;
        }

        sent += 1;
      } catch (error) {
        failed += 1;
        const nextMetadata = {
          ...(scheduled.metadata && typeof scheduled.metadata === 'object' ? scheduled.metadata as Record<string, unknown> : {}),
          failureAt: new Date().toISOString(),
          failureReason: error instanceof Error ? error.message : 'Unknown dispatch failure',
        };

        await adminClient
          .from('scheduled_messages')
          .update({ status: 'failed', metadata: nextMetadata })
          .eq('id', scheduled.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: rows.length,
        sent,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('process-scheduled-messages error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
