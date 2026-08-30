import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  vendor_type: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  rating: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  company_id: string;
  document_type: 'insurance' | 'license' | 'certification' | 'contract' | 'other';
  storage_path: string;
  mime_type: string;
  expiry_date: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface VendorWorkOrder {
  id: string;
  vendor_id: string;
  title: string;
  status: string;
  priority: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
}

export type VendorInput = Pick<Vendor, 'name' | 'vendor_type' | 'contact_name' | 'phone' | 'email' | 'address' | 'status' | 'notes' | 'rating'>;

const vendorsKey = (companyId: string | null) => ['vendors', companyId] as const;
const vendorKey = (companyId: string | null, vendorId: string) => ['vendors', companyId, vendorId] as const;

function validateVendorRating(rating: number | null | undefined) {
  if (rating != null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
    throw new Error('Rating must be between 0 and 5');
  }
}

export function useVendors(status?: Vendor['status']) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: [...vendorsKey(activeCompanyId), status ?? 'all'],
    enabled: Boolean(activeCompanyId),
    queryFn: async () => {
      let query = supabase
        .from('vendors' as never)
        .select('*, companies:company_id(id, name)' as never);

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId as string);
      }

      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data as unknown as Vendor[];
    },
  });
}

export function useVendor(vendorId: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: vendorKey(activeCompanyId, vendorId),
    enabled: Boolean(activeCompanyId && vendorId),
    queryFn: async () => {
      let query = supabase
        .from('vendors' as never)
        .select('*, companies:company_id(id, name)' as never)
        .eq('id', vendorId);

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId as string);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data as unknown as Vendor;
    },
  });
}

export function useCreateVendor() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VendorInput) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      validateVendorRating(input.rating);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('vendors' as never)
        .insert({ ...input, company_id: activeCompanyId, created_by: user.id } as never)
        .select('*' as never)
        .single();
      if (error) throw error;
      return data as unknown as Vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKey(activeCompanyId) });
      toast({ title: 'Vendor created' });
    },
    onError: (error: Error) => toast({ title: 'Vendor creation failed', description: error.message, variant: 'destructive' }),
  });
}

export function useUpdateVendor() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<VendorInput> & { id: string }) => {
      validateVendorRating(input.rating);
      const { data, error } = await supabase
        .from('vendors' as never)
        .update(input as never)
        .eq('company_id', activeCompanyId as string)
        .eq('id', id)
        .select('*' as never)
        .single();
      if (error) throw error;
      return data as unknown as Vendor;
    },
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: vendorsKey(activeCompanyId) });
      queryClient.setQueryData(vendorKey(activeCompanyId, vendor.id), vendor);
      toast({ title: 'Vendor updated' });
    },
    onError: (error: Error) => toast({ title: 'Vendor update failed', description: error.message, variant: 'destructive' }),
  });
}

export function useVendorDocuments(vendorId: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['vendor-documents', activeCompanyId, vendorId],
    enabled: Boolean(activeCompanyId && vendorId),
    queryFn: async () => {
      let query = supabase
        .from('vendor_documents' as never)
        .select('*' as never)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId as string);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as VendorDocument[];
    },
  });
}

export function useCreateVendorDocument(vendorId: string) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Pick<VendorDocument, 'document_type' | 'storage_path' | 'mime_type' | 'expiry_date'>) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('vendor_documents' as never)
        .insert({ ...input, vendor_id: vendorId, company_id: activeCompanyId, uploaded_by: user.id } as never)
        .select('*' as never)
        .single();
      if (error) {
        await supabase.storage.from('vendor-documents').remove([input.storage_path]);
        throw error;
      }
      return data as unknown as VendorDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', activeCompanyId, vendorId] });
      toast({ title: 'Document added' });
    },
    onError: (error: Error) => toast({ title: 'Document metadata failed', description: error.message, variant: 'destructive' }),
  });
}

export function useDeleteVendorDocument(vendorId: string) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (document: Pick<VendorDocument, 'id' | 'storage_path'>) => {
      const { error } = await supabase
        .from('vendor_documents' as never)
        .delete()
        .eq('company_id', activeCompanyId as string)
        .eq('id', document.id);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from('vendor-documents').remove([document.storage_path]);
      return { storageError };
    },
    onSuccess: ({ storageError }) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', activeCompanyId, vendorId] });
      toast(storageError
        ? { title: 'Document record removed', description: 'The file could not be cleaned up from storage.', variant: 'destructive' }
        : { title: 'Document deleted' });
    },
    onError: (error: Error) => toast({ title: 'Document removal failed', description: error.message, variant: 'destructive' }),
  });
}

export function useVendorWorkOrders(vendorId: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['vendor-work-orders', activeCompanyId, vendorId],
    enabled: Boolean(activeCompanyId && vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests' as never)
        .select('id, vendor_id, title, status, priority, estimated_cost, actual_cost, created_at, properties!inner(company_id)' as never)
        .eq('vendor_id', vendorId)
        .eq('properties.company_id', activeCompanyId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as VendorWorkOrder[];
    },
  });
}