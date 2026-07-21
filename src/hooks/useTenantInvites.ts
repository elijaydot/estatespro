import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { createCorrelationId, emitAuditEvent } from '@/lib/auditEvents';

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

      await emitAuditEvent({
        source: 'tenant_invites',
        eventType: 'tenant.invite.created',
        severity: 'info',
        entityType: 'tenant_invite',
        entityId: data.id,
        correlationId: createCorrelationId('tenant-invite-create'),
        actorUserId: user.id,
        details: {
          tenant_id: tenantId,
          email,
          expires_at: expiresAt.toISOString(),
        },
      });

      return { ...data, token };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_invites'] });
      toast({ title: 'Success', description: 'Tenant invite created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useValidateInviteToken(token: string | null) {
  return useQuery({
    queryKey: ['tenant_invite', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase.functions.invoke('invite-token', {
        body: { operation: 'validate_tenant', token },
      });

      if (error) throw error;
      if (!data?.invite) return null;

      const invite = data.invite;

      return {
        id: invite.id,
        tenant_id: invite.tenant_id,
        email: invite.email,
        expires_at: invite.expires_at,
        used_at: invite.used_at,
        created_at: invite.created_at,
        token, // Include token for use in the signup flow
        tenants: invite.tenants ? {
          id: invite.tenants.id,
          name: invite.tenants.name,
          email: invite.tenants.email,
          phone: invite.tenants.phone,
          property_id: invite.tenants.property_id,
          unit_id: invite.tenants.unit_id
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
      const { data: inviteRow } = await supabase
        .from('tenant_invites')
        .select('id, tenant_id, email')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('tenant_invites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await emitAuditEvent({
        source: 'tenant_invites',
        eventType: 'tenant.invite.deleted',
        severity: 'warning',
        entityType: 'tenant_invite',
        entityId: id,
        correlationId: createCorrelationId('tenant-invite-delete'),
        details: {
          tenant_id: inviteRow?.tenant_id || null,
          email: inviteRow?.email || null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_invites'] });
      toast({ title: 'Success', description: 'Invite deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
