import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSendMaintenanceNotification() {
  return useMutation({
    mutationFn: async ({
      requestId,
      newStatus,
      oldStatus,
    }: {
      requestId: string;
      newStatus: string;
      oldStatus?: string;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke(
        'send-maintenance-notification',
        {
          body: { requestId, newStatus, oldStatus },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to send notification');
      }

      return data;
    },
  });
}
