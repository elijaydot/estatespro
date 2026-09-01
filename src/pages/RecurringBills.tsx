import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Droplets, Shield, Zap, Wifi, Trash, MoreHorizontal, Search, RefreshCw, Home, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterBar } from '@/components/shared/FilterBar';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusPill } from '@/components/shared/StatusPill';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { useRecurringBills, useCreateRecurringBill, useUpdateRecurringBill, useDeleteRecurringBill, type RecurringBill } from '@/hooks/useRecurringBills';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';

type RecurringBillRow = RecurringBill & {
  properties?: {
    id: string;
    name: string;
  } | null;
  tenants?: {
    id: string;
    name: string;
  } | null;
};
const billTypeOptions = [
  { value: 'water', label: 'Water Bill', description: 'Monthly water utility charges' },
  { value: 'security', label: 'Security/Guard', description: 'Security guard services' },
  { value: 'electricity', label: 'Electricity', description: 'Electric utility charges' },
  { value: 'internet', label: 'Internet/WiFi', description: 'Internet service charges' },
  { value: 'garbage', label: 'Garbage Collection', description: 'Waste disposal services' },
  { value: 'maintenance', label: 'Maintenance Fee', description: 'General maintenance charges' },
  { value: 'parking', label: 'Parking Fee', description: 'Parking space charges' },
  { value: 'other', label: 'Other', description: 'Other recurring charges' },
];

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly', description: 'Billed every month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Billed every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Billed annually' },
];

const getBillIcon = (type: string) => {
  switch (type) {
    case 'water':
      return Droplets;
    case 'security':
      return Shield;
    case 'electricity':
      return Zap;
    case 'internet':
      return Wifi;
    case 'garbage':
      return Trash;
    default:
      return RefreshCw;
  }
};

interface BillFormData {
  name: string;
  bill_type: string;
  amount: number;
  frequency: string;
  property_id: string | null;
  tenant_id: string | null;
  description: string;
  is_active: boolean;
}

const defaultFormData: BillFormData = {
  name: '',
  bill_type: 'water',
  amount: 0,
  frequency: 'monthly',
  property_id: null,
  tenant_id: null,
  description: '',
  is_active: true,
};

export default function RecurringBills() {
  const { formatCurrency } = useSettings();
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-recurring-bills') as ViewMode) || 'table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<string | null>(null);
  const [formData, setFormData] = useState<BillFormData>(defaultFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('estatepro-view-recurring-bills', view);
  }, [view]);

  const { data: bills = [], isLoading } = useRecurringBills();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const createBill = useCreateRecurringBill();
  const updateBill = useUpdateRecurringBill();
  const deleteBill = useDeleteRecurringBill();

  const propertyOptions = properties.map(p => ({
    value: p.id,
    label: p.name,
    description: `${p.city}, ${p.country}`,
  }));

  const tenantOptions = tenants.map(t => ({
    value: t.id,
    label: t.name,
    description: t.email,
  }));

  const filteredBills = bills.filter(bill => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (bill.name || '').toLowerCase().includes(q) ||
      (bill.bill_type || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const paginatedBills = (filteredBills as RecurringBillRow[]).slice((page - 1) * pageSize, page * pageSize);

  const handleOpenDialog = (bill?: typeof bills[0]) => {
    if (bill) {
      setEditingBill(bill.id);
      setFormData({
        name: bill.name,
        bill_type: bill.bill_type,
        amount: bill.amount,
        frequency: bill.frequency,
        property_id: bill.property_id,
        tenant_id: bill.tenant_id,
        description: bill.description || '',
        is_active: bill.is_active,
      });
    } else {
      setEditingBill(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.bill_type || formData.amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingBill) {
        await updateBill.mutateAsync({
          id: editingBill,
          ...formData,
        });
      } else {
        await createBill.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      setEditingBill(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleDelete = async () => {
    if (!billToDelete) return;
    try {
      await deleteBill.mutateAsync(billToDelete);
      setDeleteDialogOpen(false);
      setBillToDelete(null);
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleToggleActive = async (bill: typeof bills[0]) => {
    try {
      await updateBill.mutateAsync({
        id: bill.id,
        is_active: !bill.is_active,
      });
    } catch (error) {
      console.error('Error toggling bill status:', error);
    }
  };

  const totalMonthlyAmount = bills
    .filter(b => b.is_active)
    .reduce((sum, b) => {
      if (b.frequency === 'monthly') return sum + b.amount;
      if (b.frequency === 'quarterly') return sum + (b.amount / 3);
      if (b.frequency === 'yearly') return sum + (b.amount / 12);
      return sum;
    }, 0);

  const activeBills = bills.filter(b => b.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Bills</h1>
          <p className="text-muted-foreground mt-1">Manage automated recurring charges for utilities, security, and services</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Recurring Bill
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard
          title="Total Active Bills"
          value={activeBills}
          icon={RefreshCw}
          accent="primary"
          subtitle={`${bills.length - activeBills} inactive`}
        />
        <MetricCard
          title="Est. Monthly Total"
          value={formatCurrency(totalMonthlyAmount)}
          icon={Zap}
          accent="success"
          subtitle="Across all properties"
        />
        <MetricCard
          title="Total Bill Types"
          value={new Set(bills.map(b => b.bill_type)).size}
          icon={Shield}
          accent="info"
          subtitle="Configured categories"
        />
      </div>

      {/* Filters & View Toggle */}
      <FilterBar className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recurring bills by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <ViewToggle view={view} onViewChange={setView} />
      </FilterBar>

      {/* 1. Cards / Grid View */}
      {!isLoading && view === 'cards' && paginatedBills.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedBills.map((bill) => {
              const IconComponent = getBillIcon(bill.bill_type);
              const property = bill.properties;
              const tenant = bill.tenants;

              return (
                <Card key={bill.id} className="p-5 card-shadow-md hover:card-shadow-lg transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{bill.name}</p>
                        <StatusPill variant="neutral" className="capitalize text-xs mt-1">
                          {bill.bill_type}
                        </StatusPill>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={bill.is_active}
                        onCheckedChange={() => handleToggleActive(bill as never)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(bill as never)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setBillToDelete(bill.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-secondary/40 space-y-1 text-xs">
                    {bill.description && (
                      <p className="text-muted-foreground truncate">{bill.description}</p>
                    )}
                    <div className="flex items-center justify-between text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> {property?.name || 'All Properties'}</span>
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {tenant?.name || 'All Tenants'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(bill.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">Billed {bill.frequency}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(bill as never)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredBills.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 2. Compact View */}
      {!isLoading && view === 'compact' && paginatedBills.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedBills.map((bill) => {
              const IconComponent = getBillIcon(bill.bill_type);
              const property = bill.properties;
              const tenant = bill.tenants;

              return (
                <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{bill.name}</span>
                        <StatusPill variant="neutral" className="capitalize text-xs">
                          {bill.bill_type}
                        </StatusPill>
                        <span className="text-xs text-muted-foreground capitalize font-medium">
                          ({bill.frequency})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {property?.name || 'All Properties'} • {tenant?.name || 'All Tenants'} {bill.description ? `• ${bill.description}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-foreground text-sm">{formatCurrency(bill.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{bill.frequency}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={bill.is_active}
                        onCheckedChange={() => handleToggleActive(bill as never)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(bill as never)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setBillToDelete(bill.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredBills.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 3. Table View */}
      {!isLoading && view === 'table' && paginatedBills.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Bill Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBills.map((bill) => {
                  const IconComponent = getBillIcon(bill.bill_type);
                  const property = bill.properties;
                  const tenant = bill.tenants;
                  
                  return (
                    <TableRow key={bill.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{bill.name}</p>
                            {bill.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {bill.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill variant="neutral" className="capitalize">
                          {bill.bill_type}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(bill.amount)}
                      </TableCell>
                      <TableCell className="capitalize">{bill.frequency}</TableCell>
                      <TableCell>
                        {property?.name || <span className="text-muted-foreground">All</span>}
                      </TableCell>
                      <TableCell>
                        {tenant?.name || <span className="text-muted-foreground">All</span>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={bill.is_active}
                          onCheckedChange={() => handleToggleActive(bill as never)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(bill as never)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setBillToDelete(bill.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredBills.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBills.length === 0 && (
        <EmptyState
          icon={RefreshCw}
          title={searchQuery ? 'No matching recurring bills' : 'No recurring bills yet'}
          description={searchQuery ? 'Try a different bill name or type.' : 'Create a recurring charge for utilities, services, or amenities.'}
          action={!searchQuery ? <Button size="sm" onClick={() => handleOpenDialog()}><Plus className="h-4 w-4" />Add Recurring Bill</Button> : undefined}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</DialogTitle>
            <DialogDescription>
              {editingBill
                ? 'Update the recurring bill details.'
                : 'Create a new recurring bill for amenities like water, security, etc.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Bill Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Water Bill"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Bill Type *</Label>
                <SearchableSelect
                  options={billTypeOptions}
                  value={formData.bill_type}
                  onValueChange={(value) => setFormData({ ...formData, bill_type: value })}
                  placeholder="Select type..."
                  searchPlaceholder="Search types..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Frequency *</Label>
                <SearchableSelect
                  options={frequencyOptions}
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  placeholder="Select frequency..."
                  searchPlaceholder="Search..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Property (Optional)</Label>
              <SearchableSelect
                options={propertyOptions}
                value={formData.property_id || ''}
                onValueChange={(value) => setFormData({ ...formData, property_id: value || null })}
                placeholder="All properties..."
                searchPlaceholder="Search properties..."
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all properties
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Tenant (Optional)</Label>
              <SearchableSelect
                options={tenantOptions}
                value={formData.tenant_id || ''}
                onValueChange={(value) => setFormData({ ...formData, tenant_id: value || null })}
                placeholder="All tenants..."
                searchPlaceholder="Search tenants..."
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all tenants at the property
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about this bill..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createBill.isPending || updateBill.isPending}
            >
              {createBill.isPending || updateBill.isPending
                ? 'Saving...'
                : editingBill
                ? 'Update Bill'
                : 'Create Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring bill? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
