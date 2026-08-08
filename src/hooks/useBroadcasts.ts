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
      if (!activeCompanyId) return [];
      const query = supabase
        .from('broadcasts')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Broadcast[];
    },
    enabled: Boolean(activeCompanyId),
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
      if (!activeCompanyId) {
        throw new Error('No active company selected.');
      }
      if (payload.companyId && payload.companyId !== activeCompanyId) {
        throw new Error('Broadcast company must match the active company.');
      }

      const { data, error } = await supabase.functions.invoke('send-broadcast', {
        body: {
          companyId: activeCompanyId,
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

export function useUpdateBroadcast() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Pick<Broadcast, 'id' | 'title' | 'message' | 'target_role' | 'property_id' | 'unit_id'>) => {
      if (!activeCompanyId) throw new Error('No active company selected.');
      const { data, error } = await supabase
        .from('broadcasts')
        .update(updates)
        .eq('id', id)
        .eq('company_id', activeCompanyId)
        .select()
        .single();
      if (error) throw error;
      return data as Broadcast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts', activeCompanyId] });
      toast({ title: 'Broadcast updated', description: 'The announcement record now reflects your changes.' });
    },
    onError: (error: Error) => toast({ title: 'Unable to update broadcast', description: error.message, variant: 'destructive' }),
  });
}

export function useDeleteBroadcast() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error('No active company selected.');
      const { error } = await supabase.from('broadcasts').delete().eq('id', id).eq('company_id', activeCompanyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts', activeCompanyId] });
      toast({ title: 'Broadcast deleted', description: 'The announcement was removed from broadcast history.' });
    },
    onError: (error: Error) => toast({ title: 'Unable to delete broadcast', description: error.message, variant: 'destructive' }),
  });
}
