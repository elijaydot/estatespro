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
      
      const { data, error } = await supabase
        .from('tenant_invites')
        .select(`
          *,
          tenants:tenant_id(id, name, email, phone, property_id, unit_id)
        `)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}

export function useMarkInviteUsed() {
  return useMutation({
    mutationFn: async ({ token, tenantUserId }: { token: string; tenantUserId: string }) => {
      // Update the invite as used
      const { error: inviteError } = await supabase
        .from('tenant_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      if (inviteError) throw inviteError;

      // Get tenant_id from the invite
      const { data: invite, error: fetchError } = await supabase
        .from('tenant_invites')
        .select('tenant_id')
        .eq('token', token)
        .single();

      if (fetchError) throw fetchError;

      // Link the tenant to the user account
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ tenant_user_id: tenantUserId })
        .eq('id', invite.tenant_id);

      if (updateError) throw updateError;
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
