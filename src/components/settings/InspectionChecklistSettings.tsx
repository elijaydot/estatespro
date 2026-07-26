import { useState } from 'react';
import { Plus, Trash2, Building2, Globe, Loader2, Home, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const db = supabase;

type ChecklistItem = {
  id: string;
  item_name: string;
  item_category: string;
  property_id?: string | null;
  unit_id?: string | null;
};

type PropertyOption = {
  id: string;
  name: string;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

const CATEGORIES = [
  { value: 'structure', label: '🏗️ Structure' },
  { value: 'electrical', label: '⚡ Electrical' },
  { value: 'plumbing', label: '🔧 Plumbing' },
  { value: 'appliances', label: '🏠 Appliances' },
  { value: 'general', label: '📋 General' },
];

export function InspectionChecklistSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const [scopeMode, setScopeMode] = useState<'global' | 'property' | 'unit'>('global');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('general');

  const { data: globalItems = [], isLoading: loadingGlobal } = useQuery({
    queryKey: ['checklist-global-items'],
    queryFn: async () => {
      const { data, error } = await db
        .from('default_inspection_checklist')
        .select('*')
        .eq('is_global', true)
        .order('item_category');
      if (error) throw error;
      return data;
    },
  });

  const { data: propertyItems = [], isLoading: loadingProperty } = useQuery({
    queryKey: ['checklist-property-items', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const { data, error } = await db
        .from('default_inspection_checklist')
        .select('*')
        .eq('property_id', selectedPropertyId)
        .eq('is_global', false)
        .is('unit_id', null)
        .order('item_category');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPropertyId,
  });

  const { data: unitItems = [], isLoading: loadingUnit } = useQuery({
    queryKey: ['checklist-unit-items', selectedUnitId],
    queryFn: async () => {
      if (!selectedUnitId) return [];
      const { data, error } = await db
        .from('default_inspection_checklist')
        .select('*')
        .eq('unit_id', selectedUnitId)
        .eq('is_global', false)
        .order('item_category');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUnitId,
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!newItemName.trim()) throw new Error('Item name is required');
      if (!user?.id) throw new Error('Not authenticated');
      const row: {
        item_name: string;
        item_category: string;
        user_id: string;
        is_global: boolean;
        property_id?: string;
        unit_id?: string;
      } = {
        item_name: newItemName.trim(),
        item_category: newItemCategory,
        user_id: user.id,
        is_global: scopeMode === 'global',
      };
      if (scopeMode === 'property' && selectedPropertyId) {
        row.property_id = selectedPropertyId;
      }
      if (scopeMode === 'unit' && selectedUnitId) {
        row.unit_id = selectedUnitId;
      }
      const { error } = await db.from('default_inspection_checklist').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-global-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-property-items', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['checklist-unit-items', selectedUnitId] });
      queryClient.invalidateQueries({ queryKey: ['default-checklist'] });
      setNewItemName('');
      toast({ title: 'Item Added', description: 'Checklist item has been added.' });
    },
    onError: (error: unknown) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await db.from('default_inspection_checklist').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-global-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-property-items', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['checklist-unit-items', selectedUnitId] });
      queryClient.invalidateQueries({ queryKey: ['default-checklist'] });
      toast({ title: 'Item Removed' });
    },
    onError: (error: unknown) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const items = (scopeMode === 'global' ? globalItems : scopeMode === 'property' ? propertyItems : unitItems) as ChecklistItem[];
  const isLoading = scopeMode === 'global' ? loadingGlobal : scopeMode === 'property' ? loadingProperty : loadingUnit;

  const unitOptions = (units as Array<{ id: string; unit_number: string; property_id: string }>).filter((u) => {
    if (!selectedPropertyId) return true;
    return u.property_id === selectedPropertyId;
  });

  // Group by category
  const grouped: Record<string, ChecklistItem[]> = {};
  (items || []).forEach((item) => {
    if (!grouped[item.item_category]) grouped[item.item_category] = [];
    grouped[item.item_category].push(item);
  });

  return (
    <Card className="border-border/70 card-shadow-md">
      <CardContent className="pt-6 space-y-5">
        <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Checklist Scopes</p>
          <p className="text-sm text-foreground mt-1">Define inventory checkpoints globally, per property, and per unit with inheritance.</p>
        </div>

        <Tabs defaultValue="global" onValueChange={(v) => setScopeMode(v as 'global' | 'property' | 'unit')}>
          <TabsList>
            <TabsTrigger value="global" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Global Defaults
            </TabsTrigger>
            <TabsTrigger value="property" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Per-Property
            </TabsTrigger>
            <TabsTrigger value="unit" className="gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Per-Unit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These items apply to all properties unless overridden by property-specific items.
            </p>
          </TabsContent>

          <TabsContent value="property" className="space-y-4">
            <div className="grid gap-2">
              <Label>Select Property</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a property..." />
                </SelectTrigger>
                <SelectContent>
                  {(properties as PropertyOption[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!selectedPropertyId && (
              <p className="text-sm text-muted-foreground italic">
                Select a property to manage its specific checklist items.
              </p>
            )}
          </TabsContent>

          <TabsContent value="unit" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Property</Label>
                <Select value={selectedPropertyId} onValueChange={(value) => {
                  setSelectedPropertyId(value);
                  setSelectedUnitId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(properties as PropertyOption[]).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Select Unit</Label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!selectedUnitId && (
              <p className="text-sm text-muted-foreground italic">
                Select a unit to define high-precision checklist overrides for that exact unit.
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Add new item form */}
        {(scopeMode === 'global' || (scopeMode === 'property' && selectedPropertyId) || (scopeMode === 'unit' && selectedUnitId)) && (
          <>
            <Separator />
            <div className="flex gap-2 items-end">
              <div className="flex-1 grid gap-1.5">
                <Label className="text-xs">Item Name</Label>
                <Input
                  placeholder="e.g., Kitchen sink faucet"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem.mutate()}
                />
              </div>
              <div className="w-40 grid gap-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => addItem.mutate()} disabled={addItem.isPending || !newItemName.trim()} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Layers3 className="h-3.5 w-3.5" />
              Scope: {scopeMode === 'global' ? 'Global' : scopeMode === 'property' ? 'Property' : 'Unit'}
            </div>
          </>
        )}

        {/* Items list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {scopeMode === 'global' ? 'No global checklist items yet. Add some above.' : 
              selectedPropertyId ? 'No property-specific items. Add some above or use global defaults.' : ''}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {CATEGORIES.find(c => c.value === category)?.label || category}
                </h4>
                <div className="space-y-1">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 hover:bg-muted/50">
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium">{item.item_name}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {item.unit_id ? 'Unit override' : item.property_id ? 'Property override' : 'Global default'}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove "{item.item_name}" from the checklist. This won't affect existing exit inspections.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteItem.mutate(item.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
