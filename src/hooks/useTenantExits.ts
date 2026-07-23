import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { toast } from '@/components/ui/use-toast';
import { mergeScopedChecklistItems, type ScopedChecklistItem } from '@/lib/inspectionChecklist';

const db = supabase;

type DefaultChecklistItem = {
  id: string;
  item_name: string;
  item_category: string;
  is_global: boolean;
  property_id: string | null;
  unit_id: string | null;
  created_at: string;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

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
  baseline_condition: string;
  baseline_notes: string | null;
  baseline_photo_url: string | null;
  condition: string;
  damage_cost: number;
  notes: string | null;
  photo_url: string | null;
  checked_by: string | null;
  checked_at: string | null;
  created_at: string;
}

export interface LeaseInventorySnapshot {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  lease_id: string | null;
  exit_id: string | null;
  phase: 'move_in' | 'move_out';
  status: 'draft' | 'finalized';
  notes: string | null;
  captured_by: string | null;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseInventoryItem {
  id: string;
  snapshot_id: string;
  item_name: string;
  item_category: string;
  condition: string;
  notes: string | null;
  photo_url: string | null;
  damage_cost: number;
  created_at: string;
  updated_at: string;
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
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

// Update tenant exit
export function useUpdateTenantExit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ exitId, data: updateData }: { exitId: string; data: Record<string, unknown> }) => {
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
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
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
        .select('id, exit_id, item_name, item_category, baseline_condition, baseline_notes, baseline_photo_url, condition, damage_cost, notes, photo_url, checked_by, checked_at, created_at')
        .eq('exit_id', exitId)
        .order('item_category', { ascending: true });
      if (error) throw error;
      return data as ExitInspectionItem[];
    },
    enabled: !!exitId,
  });
}

export function useSeedExitInspectionItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exitId: string) => {
      const { data, error } = await db.rpc('seed_exit_inspection_items_from_scope' as never, {
        p_exit_id: exitId,
      } as never);
      if (error) throw error;
      return Number(data || 0);
    },
    onSuccess: (_, exitId) => {
      queryClient.invalidateQueries({ queryKey: ['exit-inspection-items', exitId] });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
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
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

// Update a single inspection item
export function useUpdateInspectionItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ itemId, exitId, data: updateData }: { itemId: string; exitId: string; data: Record<string, unknown> }) => {
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
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

// Fetch default inspection checklist for a property (global + property-specific)
export function useDefaultChecklist(propertyId: string | undefined, unitId?: string | undefined) {
  return useQuery({
    queryKey: ['default-checklist', propertyId, unitId],
    queryFn: async () => {
      const { data, error } = await db
        .from('default_inspection_checklist')
        .select('id, item_name, item_category, is_global, property_id, unit_id, created_at')
        .or([
          'is_global.eq.true',
          propertyId ? `property_id.eq.${propertyId}` : '',
          unitId ? `unit_id.eq.${unitId}` : '',
        ].filter(Boolean).join(','))
        .order('item_category');
      if (error) throw error;

      return mergeScopedChecklistItems((data || []) as ScopedChecklistItem[]);
    },
    enabled: true,
  });
}

export function useMoveInInventorySnapshot(tenantId: string | undefined, propertyId: string | undefined, unitId: string | undefined) {
  return useQuery({
    queryKey: ['move-in-inventory-snapshot', tenantId, propertyId, unitId],
    queryFn: async () => {
      if (!tenantId || !propertyId || !unitId) return null;
      const { data, error } = await db
        .from('lease_inventory_snapshots' as never)
        .select('id, tenant_id, property_id, unit_id, lease_id, exit_id, phase, status, notes, captured_by, captured_at, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('property_id', propertyId)
        .eq('unit_id', unitId)
        .eq('phase', 'move_in')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as LeaseInventorySnapshot | null;
    },
    enabled: !!tenantId && !!propertyId && !!unitId,
  });
}

export function useLeaseInventoryItems(snapshotId: string | undefined) {
  return useQuery({
    queryKey: ['lease-inventory-items', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return [];
      const { data, error } = await db
        .from('lease_inventory_items' as never)
        .select('id, snapshot_id, item_name, item_category, condition, notes, photo_url, damage_cost, created_at, updated_at')
        .eq('snapshot_id', snapshotId)
        .order('item_category', { ascending: true });
      if (error) throw error;
      return (data || []) as LeaseInventoryItem[];
    },
    enabled: !!snapshotId,
  });
}

export function useSeedMoveInInventorySnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenantId: string;
      propertyId: string;
      unitId: string;
      leaseId?: string | null;
    }) => {
      const { data, error } = await db.rpc('seed_move_in_inventory_snapshot' as never, {
        p_tenant_id: input.tenantId,
        p_property_id: input.propertyId,
        p_unit_id: input.unitId,
        p_lease_id: input.leaseId || null,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['move-in-inventory-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['lease-inventory-items'] });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

export function useUpdateLeaseInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, snapshotId, data: updateData }: { itemId: string; snapshotId: string; data: Record<string, unknown> }) => {
      const { data, error } = await db
        .from('lease_inventory_items' as never)
        .update({ ...updateData, updated_at: new Date().toISOString() } as never)
        .eq('id', itemId)
        .select('id, snapshot_id, item_name, item_category, condition, notes, photo_url, damage_cost, created_at, updated_at')
        .single();
      if (error) throw error;
      return data as LeaseInventoryItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lease-inventory-items', variables.snapshotId] });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

export function useFinalizeMoveInInventorySnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ snapshotId, notes }: { snapshotId: string; notes?: string }) => {
      const { data, error } = await db
        .from('lease_inventory_snapshots' as never)
        .update({
          status: 'finalized',
          notes: notes || null,
          captured_by: (await db.auth.getUser()).data.user?.id || null,
          captured_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', snapshotId)
        .select('id, tenant_id, property_id, unit_id, lease_id, exit_id, phase, status, notes, captured_by, captured_at, created_at, updated_at')
        .single();
      if (error) throw error;
      return data as LeaseInventorySnapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['move-in-inventory-snapshot'] });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}

export function useSyncCheckoutSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exitId: string) => {
      const { data, error } = await db.rpc('tenant_exit_sync_checkout_snapshot' as never, {
        p_exit_id: exitId,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, exitId) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-exit', exitId] });
    },
    onError: (error: unknown) => {
      toast({ title: 'Snapshot sync failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
}
