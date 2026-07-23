import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/useTenants';
import { InventoryPhotoUploader } from '@/components/tenants/InventoryPhotoUploader';
import {
  useDefaultChecklist,
  useMoveInInventorySnapshot,
  useLeaseInventoryItems,
  useSeedMoveInInventorySnapshot,
  useUpdateLeaseInventoryItem,
  useFinalizeMoveInInventorySnapshot,
} from '@/hooks/useTenantExits';

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good', tone: 'bg-success/10 text-success border-success/20' },
  { value: 'fair', label: 'Fair', tone: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'damaged', label: 'Damaged', tone: 'bg-destructive/10 text-destructive border-destructive/20' },
  { value: 'not_checked', label: 'Not Checked', tone: 'bg-muted text-muted-foreground border-border' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  structure: 'Structure',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  appliances: 'Appliances',
  general: 'General',
};

export default function TenantInventoryBaseline() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');

  const { data: tenant, isLoading: loadingTenant } = useTenant(tenantId || '');
  const moveInSnapshot = useMoveInInventorySnapshot(tenantId, tenant?.property_id, tenant?.unit_id);
  const seedSnapshot = useSeedMoveInInventorySnapshot();
  const finalizeSnapshot = useFinalizeMoveInInventorySnapshot();

  const checklist = useDefaultChecklist(tenant?.property_id, tenant?.unit_id);
  const snapshotItems = useLeaseInventoryItems(moveInSnapshot.data?.id);
  const updateItem = useUpdateLeaseInventoryItem();

  useEffect(() => {
    if (moveInSnapshot.data?.notes) {
      setNotes(moveInSnapshot.data.notes);
    }
  }, [moveInSnapshot.data?.notes]);

  const grouped = (() => {
    const map = new Map<string, typeof snapshotItems.data>();
    (snapshotItems.data || []).forEach((item) => {
      const category = item.item_category || 'general';
      const current = map.get(category) || [];
      current.push(item);
      map.set(category, current);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  })();

  const checkedCount = (snapshotItems.data || []).filter((item) => item.condition !== 'not_checked').length;
  const totalCount = (snapshotItems.data || []).length;
  const damagedWithoutPhotoCount = (snapshotItems.data || []).filter((item) => item.condition === 'damaged' && !item.photo_url).length;

  const handleSeed = async () => {
    if (!tenant?.property_id || !tenant?.unit_id) {
      toast({ title: 'Missing assignment', description: 'Tenant must have a property and unit assigned.', variant: 'destructive' });
      return;
    }

    try {
      await seedSnapshot.mutateAsync({
        tenantId: tenant.id,
        propertyId: tenant.property_id,
        unitId: tenant.unit_id,
        leaseId: null,
      });
      await moveInSnapshot.refetch();
      toast({ title: 'Baseline started', description: 'Move-in inventory checklist was generated.' });
    } catch (error) {
      toast({
        title: 'Could not start baseline',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleFinalize = async () => {
    if (!moveInSnapshot.data?.id) return;
    if (!totalCount || checkedCount !== totalCount) {
      toast({ title: 'Checklist incomplete', description: 'Every baseline inventory item must be checked before finalizing.', variant: 'destructive' });
      return;
    }
    if (damagedWithoutPhotoCount > 0) {
      toast({
        title: 'Missing photo evidence',
        description: `Upload photos for all damaged items before finalizing (${damagedWithoutPhotoCount} remaining).`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await finalizeSnapshot.mutateAsync({ snapshotId: moveInSnapshot.data.id, notes });
      toast({ title: 'Baseline finalized', description: 'Move-in inventory is now locked and ready for move-out comparison.' });
      void moveInSnapshot.refetch();
    } catch (error) {
      toast({
        title: 'Finalize failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (loadingTenant || moveInSnapshot.isLoading || checklist.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  const scopeCount = checklist.data?.length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Move-in Inventory Baseline</h1>
          <p className="text-sm text-muted-foreground">
            {tenant.name} • Unit {tenant.units?.unit_number || 'N/A'} • {tenant.properties?.name || 'N/A'}
          </p>
        </div>
      </div>

      {!moveInSnapshot.data ? (
        <Card className="border-border/70 card-shadow-md">
          <CardHeader>
            <CardTitle>Initialize Baseline</CardTitle>
            <CardDescription>
              Generate checklist from global + property + unit scopes. Current scoped item count: {scopeCount}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void handleSeed()} disabled={seedSnapshot.isPending} className="gap-2">
              {seedSnapshot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Start Move-in Baseline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/70">
            <CardContent className="pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={moveInSnapshot.data.status === 'finalized' ? 'default' : 'secondary'}>
                  {moveInSnapshot.data.status === 'finalized' ? 'Finalized' : 'Draft'}
                </Badge>
                <span className="text-sm text-muted-foreground">{checkedCount}/{totalCount} items checked</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void moveInSnapshot.refetch()}>Refresh</Button>
                <Button onClick={() => void handleFinalize()} disabled={moveInSnapshot.data.status === 'finalized' || finalizeSnapshot.isPending} className="gap-2">
                  {finalizeSnapshot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Finalize Baseline
                </Button>
              </div>
            </CardContent>
          </Card>

          {damagedWithoutPhotoCount > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="pt-4">
                <p className="text-sm text-warning-foreground">
                  Upload photo evidence for all damaged baseline items before finalizing ({damagedWithoutPhotoCount} remaining).
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Inspector Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context about move-in baseline condition, exclusions, or handover remarks..."
                disabled={moveInSnapshot.data.status === 'finalized'}
              />
            </CardContent>
          </Card>

          {grouped.map(([category, items]) => (
            <Card key={category} className="border-border/70 card-shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{CATEGORY_LABELS[category] || category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(items || []).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/70 p-3 bg-card/80">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-sm">{item.item_name}</p>
                        <div className="flex flex-wrap gap-2">
                          {CONDITION_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              className={`px-2.5 py-1 rounded-full border text-xs ${item.condition === option.value ? option.tone : 'text-muted-foreground bg-card'}`}
                              disabled={moveInSnapshot.data?.status === 'finalized' || updateItem.isPending}
                              onClick={() => {
                                void updateItem.mutateAsync({
                                  itemId: item.id,
                                  snapshotId: item.snapshot_id,
                                  data: { condition: option.value },
                                });
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="w-32">
                        <Label className="text-xs">Est. Cost</Label>
                        <Input
                          type="number"
                          value={item.damage_cost || 0}
                          min={0}
                          disabled={moveInSnapshot.data?.status === 'finalized' || updateItem.isPending}
                          onChange={(e) => {
                            void updateItem.mutateAsync({
                              itemId: item.id,
                              snapshotId: item.snapshot_id,
                              data: { damage_cost: Number(e.target.value || 0) },
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      <InventoryPhotoUploader
                        value={item.photo_url}
                        tenantId={tenant.id}
                        scope="move_in"
                        recordId={item.id}
                        disabled={moveInSnapshot.data?.status === 'finalized' || updateItem.isPending}
                        onChange={async (nextValue) => {
                          await updateItem.mutateAsync({
                            itemId: item.id,
                            snapshotId: item.snapshot_id,
                            data: { photo_url: nextValue },
                          });
                        }}
                      />
                      <Input
                        value={item.notes || ''}
                        placeholder="Notes"
                        disabled={moveInSnapshot.data?.status === 'finalized' || updateItem.isPending}
                        onChange={(e) => {
                          void updateItem.mutateAsync({
                            itemId: item.id,
                            snapshotId: item.snapshot_id,
                            data: { notes: e.target.value || null },
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
