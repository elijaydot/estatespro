import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSendMaintenanceNotification() {
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      newStatus, 
      oldStatus 
    }: { 
      requestId: string; 
      newStatus: string; 
      oldStatus?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-maintenance-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ requestId, newStatus, oldStatus }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notification');
      }

      return response.json();
    },
  });
}
