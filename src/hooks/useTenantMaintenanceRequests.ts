import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface TenantMaintenanceRequest {
  id: string;
  title: string;
  description: string;
  unit_id: string;
  property_id: string | null;
  tenant_id: string;
  priority: string;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantMaintenanceRequests(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant_maintenance_requests', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          units:unit_id(id, unit_number),
          properties:property_id(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateTenantMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      priority,
      unitId,
      propertyId,
      tenantId,
      imageFile,
    }: {
      title: string;
      description: string;
      priority: string;
      unitId: string;
      propertyId: string;
      tenantId: string;
      imageFile?: File;
    }) => {
      let imageUrl: string | null = null;

      if (imageFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('maintenance-photos')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('maintenance-photos')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          title,
          description,
          priority,
          unit_id: unitId,
          property_id: propertyId,
          tenant_id: tenantId,
          status: 'submitted',
          image_url: imageUrl,
          user_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data?.user_id) {
        await supabase.from('notifications').insert({
          title: 'New Maintenance Request',
          message: `New maintenance request: ${title}`,
          type: 'warning',
          link: '/maintenance',
          user_id: data.user_id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_maintenance_requests'] });
      toast({ title: 'Success', description: 'Maintenance request submitted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
