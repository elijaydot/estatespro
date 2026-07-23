import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Helper for tables not yet in auto-generated types
const db = supabase;
import { useAuth } from '@/contexts/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { createCorrelationId, emitAuditEvent } from '@/lib/auditEvents';

export interface Company {
  id: string;
  name: string;
  owner_id: string;
  logo_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: { name: string; email: string; avatar_url: string | null } | null;
}

export interface PropertyAssignment {
  id: string;
  company_id: string;
  property_id: string;
  manager_id: string;
  assigned_by: string;
  created_at: string;
  properties?: { name: string; address: string } | null;
}

// Fetch all companies (for signup dropdown)
export function useAllCompanies() {
  return useQuery({
    queryKey: ['all_companies'],
    queryFn: async () => {
      const { data, error } = await db
        .from('companies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Pick<Company, 'id' | 'name'>[];
    },
  });
}

// Fetch companies owned by current user (landlord)
export function useMyCompanies() {
  const { user } = useAuth();
  const { role } = useUserRole();
  return useQuery({
    queryKey: ['my_companies', user?.id, role],
    queryFn: async () => {
      if (!user?.id) return [];

      if (role === 'super_admin') {
        const { data, error } = await db
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Company[];
      }

      const { data, error } = await db
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Company[];
    },
    enabled: !!user?.id && !!role,
  });
}

// Fetch company members for a company
export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company_members', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await db
        .from('company_members')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch profile info for each member
      const memberIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, avatar_url')
        .in('user_id', memberIds);
      
      return data.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.user_id === member.user_id) || null,
      })) as CompanyMember[];
    },
    enabled: !!companyId,
  });
}

// Fetch PM membership status for current user
export function useMyMembership() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await db
        .from('company_members')
        .select('*, companies:company_id(id, name)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Update member status (approve/reject/deactivate)
export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: string }) => {
      const { data, error } = await db
        .from('company_members')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_members'] });
      toast({ title: 'Success', description: 'Member status updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Assign PM to property
export function useAssignPMToProperty() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ companyId, propertyId, managerId }: { companyId: string; propertyId: string; managerId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await db
        .from('property_manager_assignments')
        .insert({
          company_id: companyId,
          property_id: propertyId,
          manager_id: managerId,
          assigned_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm_assignments'] });
      toast({ title: 'Success', description: 'Property manager assigned to property' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Remove PM from property
export function useRemovePMAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await db
        .from('property_manager_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm_assignments'] });
      toast({ title: 'Success', description: 'Assignment removed' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Fetch assignments for a company
export function usePMAssignments(companyId: string | undefined) {
  return useQuery({
    queryKey: ['pm_assignments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await db
        .from('property_manager_assignments')
        .select('*, properties:property_id(id, name, address)')
        .eq('company_id', companyId);
      if (error) throw error;
      return data as PropertyAssignment[];
    },
    enabled: !!companyId,
  });
}

// Create PM invite
export function useCreatePMInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ companyId, email }: { companyId: string; email: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const { data, error } = await db
        .from('pm_invites')
        .insert({
          company_id: companyId,
          email,
          token,
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select('id, company_id, email, invited_by, expires_at, used_at, created_at')
        .single();
      if (error) throw error;

      await emitAuditEvent({
        source: 'company_membership',
        eventType: 'company.pm_invite.created',
        severity: 'info',
        entityType: 'pm_invite',
        entityId: data.id,
        correlationId: createCorrelationId('pm-invite-create'),
        actorUserId: user.id,
        details: {
          company_id: companyId,
          email,
          expires_at: expiresAt.toISOString(),
        },
      });

      return { ...data, token };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm_invites'] });
      toast({ title: 'Success', description: 'Invite created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Fetch PM invites for a company
export function usePMInvites(companyId: string | undefined) {
  return useQuery({
    queryKey: ['pm_invites', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await db
        .from('pm_invites')
        .select('id, company_id, email, invited_by, expires_at, used_at, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// Remove a company member entirely
export function useRemoveCompanyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await db
        .from('company_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_members'] });
      queryClient.invalidateQueries({ queryKey: ['pm_assignments'] });
      toast({ title: 'Success', description: 'Property manager removed from company' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Create company
export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (companyData: { name: string; email?: string; phone?: string; address?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await db
        .from('companies')
        .insert({ ...companyData, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_companies'] });
      toast({ title: 'Success', description: 'Company created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update company
export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, data: updateData }: { companyId: string; data: { name?: string; email?: string | null; phone?: string | null; address?: string | null } }) => {
      const { data, error } = await db
        .from('companies')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', companyId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_companies'] });
      queryClient.invalidateQueries({ queryKey: ['all_companies'] });
      toast({ title: 'Success', description: 'Company updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete company
export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await db
        .from('companies')
        .delete()
        .eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_companies'] });
      queryClient.invalidateQueries({ queryKey: ['all_companies'] });
      toast({ title: 'Success', description: 'Company deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
