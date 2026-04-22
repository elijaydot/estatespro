import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

const QUERY_NOTIFICATIONS = ['notifications'] as const;
const QUERY_NOTIFICATIONS_UNREAD = ['notifications', 'unread-count'] as const;

function prependNotification(
  current: Notification[] | undefined,
  next: Notification
): Notification[] {
  const list = current || [];
  if (list.some((item) => item.id === next.id)) return list;
  return [next, ...list].slice(0, 50);
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Notification;
            queryClient.setQueryData<Notification[]>(QUERY_NOTIFICATIONS, (existing) =>
              prependNotification(existing, inserted)
            );
            queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
            return;
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Notification;
            queryClient.setQueryData<Notification[]>(QUERY_NOTIFICATIONS, (existing) => {
              if (!existing) return existing;
              return existing.map((item) => (item.id === updated.id ? updated : item));
            });
            queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
            return;
          }

          if (payload.eventType === 'DELETE') {
            const removed = payload.old as Notification;
            queryClient.setQueryData<Notification[]>(QUERY_NOTIFICATIONS, (existing) => {
              if (!existing) return existing;
              return existing.filter((item) => item.id !== removed.id);
            });
            queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_NOTIFICATIONS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadNotificationsCount() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications-unread-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_NOTIFICATIONS_UNREAD,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: { title: string; message: string; type?: string; link?: string; metadata?: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        link: notification.link || null,
        metadata: notification.metadata ? JSON.parse(JSON.stringify(notification.metadata)) : null,
        user_id: user.id,
        is_read: false,
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
      toast({ title: 'Success', description: 'All notifications marked as read' });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_NOTIFICATIONS_UNREAD });
      toast({ title: 'Success', description: 'All notifications cleared' });
    },
  });
}
