import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';

export interface Lease {
  id: string;
  user_id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  lease_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  terms: string | null;
  special_conditions: string | null;
  landlord_signature_url: string | null;
  landlord_signed_at: string | null;
  tenant_signature_url: string | null;
  tenant_signed_at: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeases() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['leases', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('leases')
        .select(`
          *,
          tenants:tenant_id(id, name, email, phone),
          ${propertiesRelation},
          units:unit_id(id, unit_number)
        `);

      if (!isGlobal) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useLease(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['leases', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, address, city, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, address, city, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('leases')
        .select(`
          *,
          tenants:tenant_id(id, name, email, phone),
          ${propertiesRelation},
          units:unit_id(id, unit_number, rent_amount)
        `)
        .eq('id', id);

      if (!isGlobal) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lease: Omit<Lease, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('leases')
        .insert({ ...lease, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast({ title: 'Success', description: 'Lease created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...lease }: Partial<Lease> & { id: string }) => {
      const { data, error } = await supabase
        .from('leases')
        .update(lease)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', variables.id] });
      toast({ title: 'Success', description: 'Lease updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast({ title: 'Success', description: 'Lease deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSignLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leaseId, 
      signatureUrl, 
      signerType 
    }: { 
      leaseId: string; 
      signatureUrl: string; 
      signerType: 'landlord' | 'tenant' 
    }) => {
      const updateData = signerType === 'landlord' 
        ? { landlord_signature_url: signatureUrl, landlord_signed_at: new Date().toISOString() }
        : { tenant_signature_url: signatureUrl, tenant_signed_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from('leases')
        .update(updateData)
        .eq('id', leaseId)
        .select()
        .single();

      if (error) throw error;

      // Check if both parties have signed to update status to 'active'
      if (data.landlord_signed_at && data.tenant_signed_at) {
        await supabase.from('leases').update({ status: 'active' }).eq('id', leaseId);
      } else if (data.landlord_signed_at || data.tenant_signed_at) {
        await supabase.from('leases').update({ status: 'pending_signature' }).eq('id', leaseId);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', variables.leaseId] });
      toast({ title: 'Success', description: 'Lease signed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUploadSignature() {
  return useMutation({
    mutationFn: async ({ leaseId, signatureBlob }: { leaseId: string; signatureBlob: Blob }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${leaseId}_${Date.now()}.png`;
      
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, signatureBlob, { contentType: 'image/png' });

      if (error) throw error;

      // Use signed URL instead of public URL for better security
      // Signatures are sensitive biometric data and should use time-limited access
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('signatures')
        .createSignedUrl(data.path, 31536000); // 1 year expiry for stored signatures

      if (signedUrlError) throw signedUrlError;

      return signedUrlData.signedUrl;
    },
  });
}

// Generate a unique lease number
export function generateLeaseNumber(): string {
  const prefix = 'LSE';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
