// src/hooks/useLeases.ts
// FishGate Design Constitution v1.0 - Extended Lease Architecture

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { calculateLeaseHealth } from '@/lib/leaseHealthModel';

export interface LeaseDocument {
  id: string;
  name: string;
  type: 'contract' | 'id_card' | 'guarantor' | 'insurance' | 'certificate' | 'addendum' | 'other';
  url: string;
  uploaded_at: string;
  file_size?: number;
}

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
  renewal_status: string | null;
  terms: string | null;
  special_conditions: string | null;
  landlord_signature_url: string | null;
  landlord_signed_at: string | null;
  tenant_signature_url: string | null;
  tenant_signed_at: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;

  // Extended Constitution v1.0 Fields
  lease_type?: string | null;
  lease_category?: string | null;
  lease_description?: string | null;
  move_in_date?: string | null;
  expected_move_out_date?: string | null;
  renewal_date?: string | null;
  notice_period_days?: number | null;
  grace_period_days?: number | null;
  occupancy_start_date?: string | null;
  occupancy_end_date?: string | null;
  advance_rent?: number | null;
  utility_charges?: number | null;
  parking_charges?: number | null;
  service_charges?: number | null;
  late_fee_amount?: number | null;
  billing_frequency?: string | null;
  annual_escalation_pct?: number | null;
  currency?: string | null;
  payment_terms?: string | null;
  is_renewable?: boolean | null;
  renewal_type?: string | null;
  renewal_period_months?: number | null;
  auto_renewal?: boolean | null;
  renewal_reminder_days?: number | null;
  renewal_notes?: string | null;
  pets_allowed?: boolean | null;
  subletting_allowed?: boolean | null;
  guest_policy?: string | null;
  parking_allocation?: string | null;
  property_restrictions?: string | null;
  custom_clauses?: string | null;
  health_score?: number | null;
  documents?: LeaseDocument[] | null;

  // Joined Relations
  company_id?: string;
  tenants?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  } | null;
  properties?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    company_id?: string;
    companies?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
  units?: {
    id: string;
    unit_number: string;
    rent_amount?: number;
    deposit_amount?: number;
  } | null;
}

export function useLeases() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['leases', activeCompanyId],
    queryFn: async (): Promise<Lease[]> => {
      if (!activeCompanyId) return [];
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, address, city, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, address, city, company_id, companies:company_id(id, name))';

      // Tier 1: Full rich relation query
      try {
        let query = supabase
          .from('leases')
          .select(`
            *,
            tenants:tenant_id(id, name, email, phone, avatar_url),
            ${propertiesRelation},
            units:unit_id(id, unit_number, rent_amount, deposit_amount)
          `);

        if (!isGlobal) {
          query = query.eq('properties.company_id', activeCompanyId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) return data as unknown as Lease[];
      } catch (err) {
        console.warn('Leases tier 1 query warning, trying tier 2 fallback:', err);
      }

      // Tier 2: Resilient query using company properties in-list
      try {
        let propIds: string[] = [];
        if (!isGlobal) {
          const { data: userProps } = await supabase
            .from('properties')
            .select('id')
            .eq('company_id', activeCompanyId);
          propIds = (userProps || []).map((p) => p.id);
          if (propIds.length === 0) return [];
        }

        let fallbackQuery = supabase
          .from('leases')
          .select(`
            *,
            tenants:tenant_id(id, name, email, phone),
            properties:property_id(id, name, city),
            units:unit_id(id, unit_number)
          `);

        if (!isGlobal && propIds.length > 0) {
          fallbackQuery = fallbackQuery.in('property_id', propIds);
        }

        const { data, error } = await fallbackQuery.order('created_at', { ascending: false });
        if (!error && data) return data as unknown as Lease[];
      } catch (err) {
        console.warn('Leases tier 2 query fallback failed:', err);
      }

      // Tier 3: Broad query
      const { data, error } = await supabase
        .from('leases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Lease[];
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useLease(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['leases', id, activeCompanyId],
    queryFn: async (): Promise<Lease> => {
      if (!activeCompanyId) throw new Error('Select an organization first');
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, address, city, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, address, city, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('leases')
        .select(`
          *,
          tenants:tenant_id(id, name, email, phone, avatar_url),
          ${propertiesRelation},
          units:unit_id(id, unit_number, rent_amount, deposit_amount)
        `)
        .eq('id', id);

      if (!isGlobal) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data as unknown as Lease;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rawLease: Partial<Lease>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Sanitize payload: strip relation objects and metadata
      const payload: Record<string, any> = { ...rawLease };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.tenants;
      delete payload.properties;
      delete payload.units;
      delete payload.companies;
      delete payload.company_id;

      // Auto-compute health score
      payload.health_score = calculateLeaseHealth(payload).score;
      payload.user_id = user.id;

      const { data, error } = await supabase
        .from('leases')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast({ title: 'Lease Created', description: 'Lease agreement created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Creation Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...rawLease }: Partial<Lease> & { id: string }) => {
      // Sanitize payload: remove relations that cause schema cache errors
      const payload: Record<string, any> = { ...rawLease };
      delete payload.id;
      delete payload.user_id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.tenants;
      delete payload.properties;
      delete payload.units;
      delete payload.companies;
      delete payload.company_id;

      // Update computed health score
      payload.health_score = calculateLeaseHealth(payload).score;

      const { data, error } = await supabase
        .from('leases')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', variables.id] });
      toast({ title: 'Lease Updated', description: 'Lease agreement updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
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
      toast({ title: 'Lease Removed', description: 'Lease agreement record removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSignLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leaseId,
      signatureUrl,
      signerType,
    }: {
      leaseId: string;
      signatureUrl: string;
      signerType: 'landlord' | 'tenant';
    }) => {
      const updateData =
        signerType === 'landlord'
          ? { landlord_signature_url: signatureUrl, landlord_signed_at: new Date().toISOString() }
          : { tenant_signature_url: signatureUrl, tenant_signed_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from('leases')
        .update(updateData)
        .eq('id', leaseId)
        .select()
        .single();

      if (error) throw error;

      // Check if both parties have signed to automatically activate lease
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
      toast({ title: 'Signed Successfully', description: 'Digital signature applied to lease contract.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Signature Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUploadSignature() {
  return useMutation({
    mutationFn: async ({ leaseId, signatureBlob }: { leaseId: string; signatureBlob: Blob }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${leaseId}_${Date.now()}.png`;

      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, signatureBlob, { contentType: 'image/png' });

      if (error) throw error;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('signatures')
        .createSignedUrl(data.path, 31536000); // 1 year validity

      if (signedUrlError) throw signedUrlError;
      return signedUrlData.signedUrl;
    },
  });
}

// Generate unique, enterprise-ready lease reference number
export function generateLeaseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LS-${year}-${random}`;
}
