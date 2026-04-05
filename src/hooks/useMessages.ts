import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

export interface Message {
  id: string;
  user_id: string;
  sender_id: string;
  recipient_id: string;
  property_id: string | null;
  subject: string;
  content: string;
  is_read: boolean;
  parent_message_id: string | null;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  recipient_name?: string;
}

/**
 * Core messaging hook with realtime subscription.
 * 
 * ID Convention:
 * - Landlord/PM sender_id & recipient_id = auth.uid()
 * - Tenant sender_id & recipient_id = tenant.id (domain record, NOT auth uid)
 * 
 * This means when landlord sends to tenant, recipient_id = tenant.id
 * When tenant sends to landlord, sender_id = tenant.id, recipient_id = landlord auth.uid()
 */
export function useMessages() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Message[];
    },
  });
}

export function useUnreadCount() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('unread-count-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      recipient_id: string;
      subject: string;
      content: string;
      property_id?: string;
      parent_message_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          sender_id: user.id,
          recipient_id: message.recipient_id,
          subject: message.subject,
          content: message.content,
          property_id: message.property_id || null,
          parent_message_id: message.parent_message_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({ title: 'Success', description: 'Message sent successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({ title: 'Success', description: 'Message deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
