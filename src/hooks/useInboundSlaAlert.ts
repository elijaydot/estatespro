import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { chimePlayer } from '@/lib/audioAlert';
import { toast } from '@/components/ui/use-toast';

/**
 * Listens for real-time inbound lead routing events and triggers an audio chime
 * and urgent SLA outreach toast for the assigned agent.
 */
export function useInboundSlaAlert() {
  const { user } = useAuth();
  const seenNotificationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    // Set up Supabase Realtime channel on notifications table
    const channel = supabase
      .channel(`sla-alerts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
          };

          if (newNotif && !seenNotificationIds.current.has(newNotif.id)) {
            seenNotificationIds.current.add(newNotif.id);

            // If it's a lead assignment or SLA warning, play audio chime
            if (
              newNotif.title?.toLowerCase().includes('lead') ||
              newNotif.title?.toLowerCase().includes('sla') ||
              newNotif.title?.toLowerCase().includes('assigned')
            ) {
              chimePlayer.playInboundLeadChime();

              toast({
                title: `🚨 ${newNotif.title}`,
                description: `${newNotif.message} (2-Hour SLA Timer Running)`,
                variant: 'default',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
