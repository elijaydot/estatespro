import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const db = supabase as any;

export interface TenantExit {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  initiated_by: string;
  exit_reason: string;
  status: string;
  inspection_date: string | null;
  inspection_notes: string | null;
  inspection_completed_by: string | null;
  deposit_amount: number;
  deduction_amount: number;
  refund_amount: number;
  deduction_reason: string | null;
  deposit_decision: string;
  landlord_approved_by: string | null;
  landlord_approved_at: string | null;
  refund_method: string | null;
  refund_reference: string | null;
  refund_processed_at: string | null;
  exit_date: string | null;
  portal_access_until: string | null;
  completed_at: string | null;
  email_sent_at: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  tenants?: { id: string; name: string; email: string; phone: string; security_deposit: number; monthly_rent: number; move_in_date: string | null } | null;
  units?: { id: string; unit_number: string } | null;
  properties?: { id: string; name: string } | null;
}

export interface ExitInspectionItem {
  id: string;
  exit_id: string;
  item_name: string;
  item_category: string;
  condition: string;
  damage_cost: number;
  notes: string | null;
  photo_url: string | null;
  checked_by: string | null;
  checked_at: string | null;
  created_at: string;
}

// Fetch a single tenant exit
export function useTenantExit(exitId: string) {
  return useQuery({
    queryKey: ['tenant-exit', exitId],
    queryFn: async () => {
      const { data, error } = await db
        .from('tenant_exits')
        .select('*, tenants:tenant_id(id, name, email, phone, security_deposit, monthly_rent, move_in_date), units:unit_id(id, unit_number), properties:property_id(id, name)')
        .eq('id', exitId)
        .single();
      if (error) throw error;
      return data as TenantExit;
    },
    enabled: !!exitId,
  });
}

// Fetch all exits for a tenant
export function useTenantExitsByTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-exits-by-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('tenant_exits')
        .select('*, tenants:tenant_id(id, name, email), units:unit_id(id, unit_number), properties:property_id(id, name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TenantExit[];
    },
    enabled: !!tenantId,
  });
}

// Fetch all exits
export function useTenantExits() {
  return useQuery({
    queryKey: ['tenant-exits'],
    queryFn: async () => {
      const { data, error } = await db
        .from('tenant_exits')
        .select('*, tenants:tenant_id(id, name, email), units:unit_id(id, unit_number), properties:property_id(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TenantExit[];
    },
  });
}

// Create a tenant exit
export function useCreateTenantExit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (exitData: {
      tenant_id: string;
      property_id: string;
      unit_id: string;
      exit_reason: string;
      deposit_amount: number;
      exit_date?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await db
        .from('tenant_exits')
        .insert({
          ...exitData,
          initiated_by: user.id,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-exits'] });
      toast({ title: 'Exit Process Initiated', description: 'Tenant exit workflow has been started.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update tenant exit
export function useUpdateTenantExit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ exitId, data: updateData }: { exitId: string; data: Record<string, any> }) => {
      const { data, error } = await db
        .from('tenant_exits')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', exitId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-exit', variables.exitId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-exits'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Fetch inspection items for an exit
export function useExitInspectionItems(exitId: string) {
  return useQuery({
    queryKey: ['exit-inspection-items', exitId],
    queryFn: async () => {
      const { data, error } = await db
        .from('exit_inspection_items')
        .select('*')
        .eq('exit_id', exitId)
        .order('item_category', { ascending: true });
      if (error) throw error;
      return data as ExitInspectionItem[];
    },
    enabled: !!exitId,
  });
}

// Bulk create inspection items from checklist
export function useCreateInspectionItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ exitId, items }: { exitId: string; items: { item_name: string; item_category: string }[] }) => {
      const rows = items.map(item => ({
        exit_id: exitId,
        item_name: item.item_name,
        item_category: item.item_category,
      }));
      const { data, error } = await db
        .from('exit_inspection_items')
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-inspection-items', variables.exitId] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update a single inspection item
export function useUpdateInspectionItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ itemId, exitId, data: updateData }: { itemId: string; exitId: string; data: Record<string, any> }) => {
      const { data, error } = await db
        .from('exit_inspection_items')
        .update({
          ...updateData,
          checked_by: user?.id,
          checked_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-inspection-items', variables.exitId] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Fetch default inspection checklist for a property (global + property-specific)
export function useDefaultChecklist(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['default-checklist', propertyId],
    queryFn: async () => {
      // Fetch global items
      const { data: globalItems, error: globalError } = await db
        .from('default_inspection_checklist')
        .select('*')
        .eq('is_global', true)
        .order('item_category');
      if (globalError) throw globalError;

      let propertyItems: any[] = [];
      if (propertyId) {
        const { data, error } = await db
          .from('default_inspection_checklist')
          .select('*')
          .eq('property_id', propertyId)
          .eq('is_global', false)
          .order('item_category');
        if (!error) propertyItems = data || [];
      }

      // Merge: property-specific items override globals with same name
      const propertyItemNames = new Set(propertyItems.map((i: any) => i.item_name));
      const merged = [
        ...globalItems.filter((g: any) => !propertyItemNames.has(g.item_name)),
        ...propertyItems,
      ];
      return merged;
    },
    enabled: true,
  });
}
