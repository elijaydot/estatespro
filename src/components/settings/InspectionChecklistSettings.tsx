import { useState } from 'react';
import { Plus, Trash2, Building2, Globe, Loader2 } from 'lucide-react';
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
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('general');
  const [isGlobalMode, setIsGlobalMode] = useState(true);

  // Fetch global items
  const { data: globalItems = [], isLoading: loadingGlobal } = useQuery({
    queryKey: ['checklist-global'],
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

  // Fetch property-specific items
  const { data: propertyItems = [], isLoading: loadingProperty } = useQuery({
    queryKey: ['checklist-property', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const { data, error } = await db
        .from('default_inspection_checklist')
        .select('*')
        .eq('property_id', selectedPropertyId)
        .eq('is_global', false)
        .order('item_category');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPropertyId,
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
      } = {
        item_name: newItemName.trim(),
        item_category: newItemCategory,
        user_id: user.id,
        is_global: isGlobalMode,
      };
      if (!isGlobalMode && selectedPropertyId) {
        row.property_id = selectedPropertyId;
      }
      const { error } = await db.from('default_inspection_checklist').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-global'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-property', selectedPropertyId] });
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
      queryClient.invalidateQueries({ queryKey: ['checklist-global'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-property', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['default-checklist'] });
      toast({ title: 'Item Removed' });
    },
    onError: (error: unknown) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
  });

  const items = (isGlobalMode ? globalItems : propertyItems) as ChecklistItem[];
  const isLoading = isGlobalMode ? loadingGlobal : loadingProperty;

  // Group by category
  const grouped: Record<string, ChecklistItem[]> = {};
  (items || []).forEach((item) => {
    if (!grouped[item.item_category]) grouped[item.item_category] = [];
    grouped[item.item_category].push(item);
  });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Tabs defaultValue="global" onValueChange={(v) => setIsGlobalMode(v === 'global')}>
          <TabsList>
            <TabsTrigger value="global" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Global Defaults
            </TabsTrigger>
            <TabsTrigger value="property" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Per-Property
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
        </Tabs>

        {/* Add new item form */}
        {(isGlobalMode || selectedPropertyId) && (
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
          </>
        )}

        {/* Items list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {isGlobalMode ? 'No global checklist items yet. Add some above.' : 
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
                    <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50">
                      <span className="text-sm">{item.item_name}</span>
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
