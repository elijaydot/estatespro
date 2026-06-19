import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { toast } from '@/components/ui/use-toast';

export interface Broadcast {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  message: string;
  target_role: 'all' | 'landlord' | 'property_manager' | 'tenant';
  property_id: string | null;
  unit_id: string | null;
  created_at: string;
}

export function useBroadcastAnnouncements() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['broadcasts', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Broadcast[];
    },
  });
}

export function useSendBroadcast() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'Please try again.';
  };

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      message: string;
      targetRole: 'all' | 'landlord' | 'property_manager' | 'tenant';
      propertyId?: string | null;
      unitId?: string | null;
      companyId?: string;
    }) => {
      const companyId = payload.companyId || activeCompanyId;
      if (!companyId) {
        throw new Error('No active company selected.');
      }

      const { data, error } = await supabase.functions.invoke('send-broadcast', {
        body: {
          companyId,
          title: payload.title,
          message: payload.message,
          targetRole: payload.targetRole,
          propertyId: payload.propertyId || null,
          unitId: payload.unitId || null,
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      toast({ title: 'Broadcast sent', description: 'Announcement delivered to selected audience.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Failed to send broadcast', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}
