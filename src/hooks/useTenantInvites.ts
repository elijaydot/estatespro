import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  user_id: string;
}

export function useTenantInvites() {
  return useQuery({
    queryKey: ['tenant_invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_invites')
        .select(`
          *,
          tenants:tenant_id(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTenantInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, email }: { tenantId: string; email: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate a secure random token
      const token = crypto.randomUUID() + '-' + Date.now().toString(36);
      
      // Set expiry to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('tenant_invites')
        .insert({
          tenant_id: tenantId,
          email,
          token,
          expires_at: expiresAt.toISOString(),
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, token };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_invites'] });
      toast({ title: 'Success', description: 'Tenant invite created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useValidateInviteToken(token: string | null) {
  return useQuery({
    queryKey: ['tenant_invite', token],
    queryFn: async () => {
      if (!token) return null;
      
      // Use the secure RPC function to validate tokens
      // This now includes tenant info from the join in the function
      const { data: inviteData, error: inviteError } = await supabase
        .rpc('validate_invite_token', { lookup_token: token });

      if (inviteError) throw inviteError;
      if (!inviteData || inviteData.length === 0) return null;

      const invite = inviteData[0];

      return {
        id: invite.id,
        tenant_id: invite.tenant_id,
        email: invite.email,
        expires_at: invite.expires_at,
        used_at: invite.used_at,
        created_at: invite.created_at,
        token, // Include token for use in the signup flow
        tenants: invite.tenant_name ? {
          id: invite.tenant_id,
          name: invite.tenant_name,
          email: invite.tenant_email,
          phone: invite.tenant_phone,
          property_id: invite.tenant_property_id,
          unit_id: invite.tenant_unit_id
        } : null
      };
    },
    enabled: !!token,
  });
}

export function useMarkInviteUsed() {
  return useMutation({
    mutationFn: async ({ token, tenantUserId }: { token: string; tenantUserId: string }) => {
      const { data, error } = await supabase.functions.invoke('accept-tenant-invite', {
        body: { token, tenantUserId }
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteTenantInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_invites')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_invites'] });
      toast({ title: 'Success', description: 'Invite deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
